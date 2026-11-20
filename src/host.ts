/**
 * src/host.ts — every call wasmtk makes to the system, in one module (workspace letter H39, owner
 * 2026-11-19: "one module named the same per project … all of the OS/platform specifics lives in
 * one place").
 *
 * Files (read, write — never half-written — directories, temp folders, stat), paths, the
 * environment, the arguments, standard streams, exit, and starting other programs (the producer
 * compilers, the engines) all go through the `host` object exported here. No other file in
 * `main.ts` or `src/` may import the runtime's file, path or process APIs or touch `Deno`, `Bun`
 * or `process` directly: `bun scripts/check-host.ts` fails when one does.
 *
 * It runs on Deno and on Bun (it was `src/rt.ts`, the runtime abstraction, until 2026-11-20).
 * `wasmtk --self-check` runs `selfCheck()` below: it tries each operation on the machine it runs on.
 */

// deno-lint-ignore-file no-explicit-any
import process from "node:process";
import { lstatSync, realpathSync, statSync } from "node:fs";
import * as fsp from "node:fs/promises";
import { basename, dirname, join, resolve } from "@std/path";

const isBun = typeof (globalThis as any).Bun !== "undefined";

/** Paths are the host's too: separators and case rules are the OS's. */
export { basename, dirname, join, resolve };

// ── File I/O ─────────────────────────────────────────────────────────────────

async function readFile(path: string): Promise<Uint8Array> {
  if (isBun) return new Uint8Array(await (globalThis as any).Bun.file(path).arrayBuffer());
  return Deno.readFile(path);
}

/**
 * A text input (a source, a `.wat`, a `.wit`) as UTF-8, or a named refusal (review H6 / H7,
 * 2026-11-20): a UTF-16 file was read byte by byte (one parse error per character, 7.8 MB of
 * them), and an invalid UTF-8 byte became U+FFFD silently, so the program printed what its source
 * did not say. A UTF-8 byte-order mark is dropped, as before.
 */
async function readTextFile(path: string): Promise<string> {
  const bytes = await readFile(path);
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    throw new Error(`${path}: the file is UTF-16; save it as UTF-8`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${path}: not valid UTF-8 (byte ${utf8ErrorAt(bytes)}); save it as UTF-8`);
  }
}

/** The offset of the first byte that is not valid UTF-8 (a linear scan; for the message only). */
function utf8ErrorAt(b: Uint8Array): number {
  for (let i = 0; i < b.length;) {
    const c = b[i];
    const n = c < 0x80
      ? 0
      : c >= 0xc2 && c < 0xe0
      ? 1
      : c >= 0xe0 && c < 0xf0
      ? 2
      : c >= 0xf0 && c < 0xf5
      ? 3
      : -1;
    if (n < 0) return i;
    for (let k = 1; k <= n; k++) if (i + k >= b.length || (b[i + k] & 0xc0) !== 0x80) return i;
    i += n + 1;
  }
  return b.length;
}

/**
 * True for a Windows SHARING VIOLATION — `os error 32`, "The process cannot access the file because
 * it is being used by another process". Transient by nature: a just-exited child process, an
 * indexer or an AV scanner still holds a handle for a few milliseconds after we are done with it.
 */
// [win-x64, win-arm64] the sharing-violation retry (cmem/platforms.md § win-x64)
function isWindowsSharingViolation(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /os error 32|being used by another process|EBUSY/i.test(m);
}

/**
 * Retry `op` briefly on a Windows sharing violation.
 *
 * ⚠️ **This is a RACE fix, not an error-swallowing one.** Only `os error 32` is retried; every other
 * failure propagates on the first attempt, and a violation that outlives ~1.2s still throws. The
 * point is that the file is genuinely writable a few milliseconds later — retrying converts a
 * spurious hard failure into the success it would have been.
 *
 * Why it exists (2026-08-27): `go_asyncify_tests` intermittently failed writing
 * `tests/go_fixtures/**​/main.wasm` — measured 11/1 then 12/12 on back-to-back runs with nothing
 * else running. A preceding run of the SAME suite is enough to trigger it.
 */
async function retryOnSharingViolation<T>(op: () => Promise<T>): Promise<T> {
  const DELAYS_MS = [15, 40, 100, 250, 800]; // ~1.2s total before giving up
  for (let attempt = 0;; attempt++) {
    try {
      return await op();
    } catch (e) {
      if (attempt >= DELAYS_MS.length || !isWindowsSharingViolation(e)) throw e;
      await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));
    }
  }
}

/**
 * A DEVICE rather than a file: written in place, never through a temporary file and a rename.
 * Windows reserves the names NUL, CON, PRN, AUX, COM1–9 and LPT1–9 in every folder and with any
 * extension or trailing dots / spaces / colon (`NUL`, `nul.txt`, `NUL:`); elsewhere `/dev/…`
 * and `/proc/self/fd/…` are devices.
 */
function isDevicePath(path: string): boolean {
  if (/^\/dev\/|^\/proc\/self\/fd\//.test(path)) return true;
  if (build.os !== "windows") return false;
  // [win-x64, win-arm64] Windows' reserved device names
  if (/^\\\\[.?]\\/.test(path)) return true; // \\.\NUL, \\?\…
  const stem = path.split(/[\\/]/).pop()!.split(".")[0].replace(/[ :]+$/, "");
  return /^(NUL|CON|PRN|AUX|COM[1-9]|LPT[1-9])$/i.test(stem);
}

/**
 * Write `data` to `path` ATOMICALLY: into a temporary file beside it, then a rename over it, so a
 * reader never sees a half-written file and a failure leaves the old file as it was (H39: "never
 * half-written"). A device is written in place. When the folder refuses a new file but `path`
 * already exists and is writable, it is overwritten in place, as before.
 */
async function writeAtomic(path: string, data: Uint8Array | string): Promise<void> {
  const direct = async () => {
    if (isBun) {
      await (globalThis as any).Bun.write(path, data);
      return;
    }
    if (typeof data === "string") await Deno.writeTextFile(path, data);
    else await Deno.writeFile(path, data);
  };
  if (isDevicePath(path)) {
    if (isBun) return direct();
    // Deno with an explicit `--allow-write` (as `deno task install` grants, not `-A`) refuses a bare
    // device name on Windows: `NUL` → os error 87, from its permission check; `\\.\NUL` works, and
    // truncating it is "Incorrect function". Found by `--self-check` 2026-11-20 (`wasmtk convert
    // x.wat -o NUL` failed the same way); measured under both permission forms. So: the `\\.\`
    // spelling, opened for writing only.
    let devicePath = path;
    // [win-x64, win-arm64] a device name through its `\\.\` form (ld136)
    if (build.os === "windows" && !/^\\\\[.?]\\/.test(path)) {
      const stem = path.split(/[\\/]/).pop()!.split(".")[0].replace(/[ :]+$/, "").toUpperCase();
      devicePath = `\\\\.\\${stem}`;
    }
    const f = await Deno.open(devicePath, { write: true });
    try {
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
      for (let off = 0; off < bytes.length;) off += await f.write(bytes.subarray(off));
    } finally {
      f.close();
    }
    return;
  }
  // What is at `path` now (review H15, 2026-11-20): a SYMLINK is written through, to the file it
  // names (the rename replaced the link itself); a file with several HARD LINKS is written in place,
  // so every name still sees it (the rename broke the links; atomicity is given up for it); an
  // existing file's mode bits are kept.
  let target = path;
  let mode: number | undefined;
  try {
    const l = lstatSync(path);
    if (l.isSymbolicLink()) target = realpathSync(path);
    else if (l.isFile() && l.nlink > 1) return retryOnSharingViolation(direct);
    const s = statSync(target);
    if (s.isFile()) mode = s.mode & 0o7777;
  } catch { /* nothing there yet */ }
  // The temporary file: a SHORT name (review H5: `.<name>.wasmtk-<pid>-<time>.tmp` was ~30 chars
  // longer than the target, so a legal 230-character name failed), RANDOM, and created EXCLUSIVELY
  // (review S2: a predictable name opened with create-or-truncate followed a symlink planted there,
  // so a write landed in any file the user can write).
  const tmp = join(dirname(target), `.wasmtk-${crypto.randomUUID().slice(0, 13)}.tmp`);
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  try {
    const fh = await fsp.open(tmp, "wx", mode ?? 0o666);
    try {
      for (let off = 0; off < bytes.length;) {
        off += (await fh.write(bytes, off, bytes.length - off)).bytesWritten;
      }
      await fh.sync(); // on disk before the rename, so a power cut cannot leave an empty target
    } finally {
      await fh.close();
    }
    if (mode !== undefined && build.os !== "windows") await fsp.chmod(tmp, mode);
  } catch (e) {
    await removeQuiet(tmp);
    // The folder may refuse a new file while the target itself is writable: write it in place.
    if (/permission|denied|EACCES|EPERM|os error 5\b/i.test(String(e)) && await exists(target)) {
      return retryOnSharingViolation(direct);
    }
    throw e;
  }
  try {
    await retryOnSharingViolation(() => rename(tmp, target));
  } catch (e) {
    await removeQuiet(tmp);
    throw e;
  }
}

async function writeFile(path: string, data: Uint8Array): Promise<void> {
  return writeAtomic(path, data);
}

async function writeTextFile(path: string, text: string): Promise<void> {
  return writeAtomic(path, text);
}

// ── File system ───────────────────────────────────────────────────────────────

async function rename(from: string, to: string): Promise<void> {
  if (isBun) {
    const { rename: fsRename } = await import("node:fs/promises");
    await fsRename(from, to);
    return;
  }
  return Deno.rename(from, to);
}

async function mkdir(path: string, opts?: { recursive?: boolean }): Promise<void> {
  if (isBun) {
    const { mkdir: fsMkdir } = await import("node:fs/promises");
    await fsMkdir(path, opts);
    return;
  }
  return Deno.mkdir(path, opts);
}

/** What `stat` reports, the same on both runtimes. */
export interface HostFileInfo {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
}

async function stat(path: string): Promise<HostFileInfo> {
  if (isBun) {
    const { stat: fsStat } = await import("node:fs/promises");
    const s = await fsStat(path);
    return { isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size };
  }
  const s = await Deno.stat(path);
  return { isFile: s.isFile, isDirectory: s.isDirectory, size: s.size };
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** One entry of a directory listing. */
export interface HostDirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}

async function* readDir(path: string): AsyncGenerator<HostDirEntry> {
  if (isBun) {
    const { readdir } = await import("node:fs/promises");
    for (const d of await readdir(path, { withFileTypes: true })) {
      yield { name: d.name, isFile: d.isFile(), isDirectory: d.isDirectory() };
    }
    return;
  }
  for await (const d of Deno.readDir(path)) {
    yield { name: d.name, isFile: d.isFile, isDirectory: d.isDirectory };
  }
}

async function realPath(path: string): Promise<string> {
  if (isBun) {
    const { realpath } = await import("node:fs/promises");
    return realpath(path);
  }
  return Deno.realPath(path);
}

async function remove(path: string, opts?: { recursive?: boolean }): Promise<void> {
  if (isBun) {
    const fs = await import("node:fs/promises");
    if (opts?.recursive) {
      await fs.rm(path, { recursive: true, force: true });
      return;
    }
    await fs.unlink(path);
    return;
  }
  return Deno.remove(path, opts);
}

async function removeQuiet(path: string): Promise<void> {
  try {
    await remove(path);
  } catch { /* already gone */ }
}

async function chmod(path: string, mode: number): Promise<void> {
  if (isBun) {
    const { chmod: fsChmod } = await import("node:fs/promises");
    await fsChmod(path, mode);
    return;
  }
  return Deno.chmod(path, mode);
}

/** A new, empty folder in the system's temp location; the caller removes it. */
async function makeTempDir(prefix: string): Promise<string> {
  if (isBun) {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    return mkdtemp(join(tmpdir(), prefix));
  }
  return Deno.makeTempDir({ prefix });
}

/**
 * True when `a` and `b` name the same file — the input-overwrite guard (sw113). By NAME as the OS
 * reads it, and, when both exist, by IDENTITY (device + inode: a hard link, a symlink, a short
 * name). Review H1 (2026-11-20): `-o "a.ts."` and `-o "a.ts "` passed the string compare and the
 * atomic rename replaced the source, because Win32 drops trailing dots and spaces from a name.
 */
function samePath(a: string, b: string): boolean {
  const name = (p: string): string => {
    const r = resolve(p);
    if (build.os !== "windows") return r;
    // [win-x64, win-arm64] case-insensitive, and each component without trailing dots / spaces
    return r.split(/[\\/]/).map((s) => s.replace(/[. ]+$/, "") || s).join("\\").toLowerCase();
  };
  if (name(a) === name(b)) return true;
  try {
    const sa = statSync(a), sb = statSync(b);
    return sa.ino !== 0 && sa.ino === sb.ino && sa.dev === sb.dev;
  } catch {
    return false; // one of them does not exist yet: different files
  }
}

// ── Process ───────────────────────────────────────────────────────────────────

function rtExit(code: number): never {
  process.exit(code);
}

const build = isBun
  ? {
    os: (process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
      ? "darwin"
      : "linux") as "windows" | "darwin" | "linux",
    arch: (process.arch === "arm64" ? "aarch64" : "x86_64") as "x86_64" | "aarch64",
  }
  : Deno.build;

const env = {
  get: (key: string): string | undefined => isBun ? process.env[key] : Deno.env.get(key),
  toObject: (): Record<string, string> =>
    isBun ? (process.env as Record<string, string>) : Deno.env.toObject(),
  set: (key: string, value: string): void =>
    isBun ? void (process.env[key] = value) : Deno.env.set(key, value),
};

function execPath(): string {
  return isBun ? process.execPath : Deno.execPath();
}

/** The command-line arguments after the script. */
function args(): string[] {
  return isBun ? process.argv.slice(2) : [...Deno.args];
}

/**
 * The command that runs a TypeScript file with the runtime running wasmtk: Deno needs `run -A`
 * (subcommand + all permissions); Bun runs a file directly, and `-A` is a parse error there.
 */
function scriptRunner(): string[] {
  return isBun ? [execPath()] : [execPath(), "run", "-A"];
}

/**
 * Write an executable LAUNCHER named `name` in `dir` that runs `command` with its own arguments
 * appended: a `.cmd` on Windows, a `#!/bin/sh` script (mode 755) elsewhere. Returns its path.
 */
async function writeLauncher(dir: string, name: string, command: string[]): Promise<string> {
  // Each argument QUOTED for its shell, so nothing in a path is expanded or run (review S1 / H16,
  // 2026-11-20: a project folder named `x$(cmd)y` ran `cmd` under sh, and one named `d%USERNAME%x`
  // broke the .cmd form — both from plain `"…"`).
  // [win-x64, win-arm64] a `.cmd` launcher; elsewhere a `#!/bin/sh` script, mode 755
  if (build.os === "windows") {
    // cmd expands `%…%` even inside double quotes: `%%` is a literal `%`; `"` cannot be in a name
    const q = command.map((c) => `"${c.replace(/%/g, "%%")}"`).join(" ");
    const p = join(dir, `${name}.cmd`);
    await writeTextFile(p, `@echo off\r\n${q} %*\r\n`);
    return p;
  }
  // sh expands nothing inside single quotes; a `'` itself is closed, escaped and reopened
  const q = command.map((c) => `'${c.replace(/'/g, `'\\''`)}'`).join(" ");
  const p = join(dir, name);
  await writeTextFile(p, `#!/bin/sh\nexec ${q} "$@"\n`);
  await chmod(p, 0o755);
  return p;
}

/**
 * Windows only: switch the console to UTF-8 (SetConsoleOutputCP 65001) so emoji and box-drawing
 * characters render; `chcp` is not enough because Deno writes to the console handle directly
 * (owner decision M7, deno-exit-plan.md: keep this fix). A no-op elsewhere and on Bun.
 */
function setupConsole(): void {
  // [win-x64, win-arm64] SetConsoleOutputCP(65001) through FFI
  if (build.os !== "windows" || isBun) return;
  try {
    const kernel32 = Deno.dlopen("kernel32.dll", {
      SetConsoleOutputCP: { parameters: ["u32"], result: "bool" },
    });
    kernel32.symbols.SetConsoleOutputCP(65001);
    kernel32.close();
  } catch { /* FFI unavailable in this build — silently continue */ }
}

// ── Streams ───────────────────────────────────────────────────────────────────

const stdout = {
  writeSync(buf: Uint8Array): number {
    if (isBun) {
      process.stdout.write(buf);
      return buf.length;
    }
    return Deno.stdout.writeSync(buf);
  },
  async write(buf: Uint8Array): Promise<number> {
    if (isBun) {
      process.stdout.write(buf);
      return buf.length;
    }
    return await Deno.stdout.write(buf);
  },
};

const stderr = {
  writeSync(buf: Uint8Array): number {
    if (isBun) {
      process.stderr.write(buf);
      return buf.length;
    }
    return Deno.stderr.writeSync(buf);
  },
  async write(buf: Uint8Array): Promise<number> {
    if (isBun) {
      process.stderr.write(buf);
      return buf.length;
    }
    return await Deno.stderr.write(buf);
  },
};

const stdin = {
  /** Synchronous read — returns null on Bun (no sync stdin API). */
  readSync(buf: Uint8Array): number | null {
    if (isBun) return null;
    return Deno.stdin.readSync(buf);
  },
  /** Async read. */
  async read(buf: Uint8Array): Promise<number | null> {
    if (isBun) return null;
    return await Deno.stdin.read(buf);
  },
};

// ── Command ───────────────────────────────────────────────────────────────────

/** How a started program's streams and environment are set up. */
export interface RtCommandOptions {
  args?: string[];
  stdin?: "piped" | "null" | "inherit";
  stdout?: "piped" | "null" | "inherit";
  stderr?: "piped" | "null" | "inherit";
  env?: Record<string, string>;
  cwd?: string;
  /** Kill the program and fail by name after this many ms (default: subprocessTimeoutMs()). */
  timeoutMs?: number;
}

/**
 * The time limit on every program wasmtk starts (review H2, 2026-11-20: none existed, so a hung
 * toolchain hung wasmtk forever): `WASMTK_SUBPROCESS_TIMEOUT_S` seconds, default 1800 (a cold
 * TinyGo or cargo build takes minutes); 0 = no limit. Anything else is refused by name.
 */
export function subprocessTimeoutMs(): number {
  const raw = env.get("WASMTK_SUBPROCESS_TIMEOUT_S");
  if (raw === undefined || raw.trim() === "") return 1800_000;
  const s = Number(raw);
  if (!Number.isFinite(s) || s < 0) {
    throw new Error(`WASMTK_SUBPROCESS_TIMEOUT_S=${raw} is not a number of seconds (0 = no limit)`);
  }
  return s * 1000;
}

function timedOut(cmd: string, ms: number): Error {
  return new Error(
    `${basename(cmd)} did not finish within ${ms / 1000} s and was stopped ` +
      `(set WASMTK_SUBPROCESS_TIMEOUT_S to change the limit; 0 = none)`,
  );
}

/** What a finished program returned. */
export interface RtCommandOutput {
  success: boolean;
  code: number;
  stdout: Uint8Array;
  stderr: Uint8Array;
}

/** Start another program (a producer compiler, an engine, a tool). */
export class RtCommand {
  private _cmd: string;
  private _opts: RtCommandOptions;

  constructor(cmd: string, opts: RtCommandOptions = {}) {
    this._cmd = cmd;
    this._opts = opts;
  }

  /**
   * Wait for `work`, but no longer than the limit. When the limit fires, the program and every
   * program it started are stopped and the wait ends at once with a named error. Review RH1:
   * stopping only the direct child left a grandchild (a `.cmd` shim's tool, a compiler's worker)
   * holding the piped output open, and the wait went on until that grandchild exited.
   */
  private bounded<T>(
    work: Promise<T>,
    pid: number,
    kill: () => void,
    release: () => void = () => {},
  ): Promise<T> {
    const ms = this._opts.timeoutMs ?? subprocessTimeoutMs();
    if (!(ms > 0)) return work;
    let t: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      t = setTimeout(() => {
        void killTree(pid, kill);
        // our ends of the pipes are let go too: a grandchild whose parent already exited is out
        // of taskkill's / pkill's reach and kept this process alive on them (re-review 2 of RH1)
        try {
          release();
        } catch { /* already closed */ }
        reject(timedOut(this._cmd, ms));
      }, ms);
    });
    work.catch(() => {}); // a late failure after the limit fired is not reported twice
    return Promise.race([work, expired]).finally(() => clearTimeout(t));
  }

  spawn(): { status: Promise<{ success: boolean; code: number }> } {
    if (isBun) {
      const bun = (globalThis as any).Bun;
      const proc = bun.spawn([this._cmd, ...(this._opts.args ?? [])], {
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
        env: this._opts.env,
        cwd: this._opts.cwd,
      });
      const work = proc.exited.then((code: number) => ({ success: code === 0, code: code ?? 0 }));
      return { status: this.bounded(work, proc.pid, () => proc.kill()) };
    }
    // env / cwd / stdin were dropped on Deno (review H, "other classes": a restricted env passed
    // to a child silently did not apply)
    const child = new Deno.Command(this._cmd, {
      args: this._opts.args,
      stdin: (this._opts.stdin ?? "inherit") as "piped" | "null" | "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: this._opts.env,
      cwd: this._opts.cwd,
    }).spawn();
    const work = child.status.then((s) => ({ success: s.success, code: s.code }));
    return { status: this.bounded(work, child.pid, () => child.kill("SIGKILL")) };
  }

  output(): Promise<RtCommandOutput> {
    if (isBun) {
      const bun = (globalThis as any).Bun;
      const bunStdout = this._opts.stdout === "piped"
        ? "pipe"
        : this._opts.stdout === "null"
        ? "ignore"
        : "inherit";
      const bunStderr = this._opts.stderr === "piped"
        ? "pipe"
        : this._opts.stderr === "null"
        ? "ignore"
        : "inherit";
      const proc = bun.spawn([this._cmd, ...(this._opts.args ?? [])], {
        stdout: bunStdout,
        stderr: bunStderr,
        stdin: "inherit",
        env: this._opts.env,
        cwd: this._opts.cwd,
      });
      // the pipes are read inside the bounded wait: a grandchild can hold them open after exit
      const cancels: (() => void)[] = [];
      const work = (async () => {
        const [code, outBuf, errBuf] = await Promise.all([
          proc.exited.then((c: number) => c ?? 0),
          this._opts.stdout === "piped" ? collect(proc.stdout, cancels) : new Uint8Array(0),
          this._opts.stderr === "piped" ? collect(proc.stderr, cancels) : new Uint8Array(0),
        ]);
        return { success: code === 0, code, stdout: outBuf, stderr: errBuf };
      })();
      return this.bounded(work, proc.pid, () => proc.kill(), () => {
        for (const c of cancels) c();
        proc.unref?.();
      });
    }
    // Deno's Command.output() defaults stdout / stderr to "piped"; spawn() does not, so say it
    const stdout = (this._opts.stdout ?? "piped") as "piped" | "null" | "inherit";
    const stderr = (this._opts.stderr ?? "piped") as "piped" | "null" | "inherit";
    const child = new Deno.Command(this._cmd, {
      args: this._opts.args,
      stdin: this._opts.stdin as "piped" | "null" | "inherit" | undefined,
      stdout,
      stderr,
      env: this._opts.env,
      cwd: this._opts.cwd,
    }).spawn();
    // each pipe read through a reader the limit can cancel (child.output() could not be let go)
    const cancels: (() => void)[] = [];
    const work = Promise.all([
      child.status,
      stdout === "piped" ? collect(child.stdout, cancels) : new Uint8Array(0),
      stderr === "piped" ? collect(child.stderr, cancels) : new Uint8Array(0),
    ]).then(([s, out, err]) => ({ success: s.success, code: s.code, stdout: out, stderr: err }));
    return this.bounded(work, child.pid, () => child.kill("SIGKILL"), () => {
      for (const c of cancels) c();
      child.unref();
    });
  }
}

/** Read a whole stream; `cancels` gets a function that stops the read and lets the stream go. */
function collect(stream: ReadableStream<Uint8Array>, cancels: (() => void)[]): Promise<Uint8Array> {
  const reader = stream.getReader();
  cancels.push(() => void reader.cancel().catch(() => {}));
  return (async () => {
    const parts: Uint8Array[] = [];
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      n += value.length;
    }
    const out = new Uint8Array(n);
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  })();
}

/**
 * Stop a program and the programs it started (review RH1). Windows: `taskkill /T /F` ends the
 * whole tree. Elsewhere: `pkill -KILL -P` ends the children, then the program itself is killed.
 * Best effort; the wait has already ended, so a failure here only leaves an orphan.
 */
async function killTree(pid: number, kill: () => void): Promise<void> {
  const [cmd, args] = build.os === "windows"
    ? ["taskkill", ["/T", "/F", "/PID", String(pid)]]
    : ["pkill", ["-KILL", "-P", String(pid)]];
  try {
    await new RtCommand(cmd, { args, stdout: "null", stderr: "null", timeoutMs: 10_000 }).output();
  } catch { /* the tool is missing or failed: fall back to the direct child */ }
  try {
    kill();
  } catch { /* already gone */ }
}

// ── Self-check ────────────────────────────────────────────────────────────────

/**
 * `wasmtk --self-check` (H39 (3)): try every operation above on the machine this runs on, in a temp
 * folder that is removed afterwards, and print `ok` or `FAIL` for each. Nothing is skipped: a step
 * that cannot apply on this OS says why. Returns false when any step failed.
 */
export async function selfCheck(log: (line: string) => void = console.log): Promise<boolean> {
  let failed = 0;
  const step = async (name: string, fn: () => Promise<string | void>) => {
    try {
      const note = await fn();
      log(`  ok    ${name}${note ? ` — ${note}` : ""}`);
    } catch (e) {
      failed++;
      log(`  FAIL  ${name} — ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const must = (cond: boolean, what: string) => {
    if (!cond) throw new Error(what);
  };
  log(`wasmtk self-check: ${isBun ? "Bun" : "Deno"} on ${build.os}-${build.arch}`);
  let dir = "";
  await step("make a temp folder", async () => {
    dir = await makeTempDir("wasmtk-selfcheck-");
    must((await stat(dir)).isDirectory, "the temp folder is not a directory");
  });
  if (!dir) {
    log("  (no temp folder: the remaining steps need one)");
    return false;
  }
  const sub = join(dir, "a", "b");
  await step("make nested folders", async () => {
    await mkdir(sub, { recursive: true });
    must((await stat(sub)).isDirectory, "not created");
  });
  const bin = join(sub, "x.wasm");
  const bytes = new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
  await step("write and read bytes", async () => {
    await writeFile(bin, bytes);
    const back = await readFile(bin);
    must(back.length === bytes.length && back.every((b, i) => b === bytes[i]), "bytes differ");
  });
  const txt = join(sub, "t.txt");
  const text = "UTF-8 ✓ — λ ∑ 😀\n";
  await step("write and read UTF-8 text", async () => {
    await writeTextFile(txt, text);
    must((await readTextFile(txt)) === text, "text differs");
  });
  await step("overwrite atomically, no temporary file left", async () => {
    await writeTextFile(txt, "second\n");
    must((await readTextFile(txt)) === "second\n", "content is not the second write");
    const names: string[] = [];
    for await (const e of readDir(sub)) names.push(e.name);
    must(names.sort().join(",") === "t.txt,x.wasm", `folder holds: ${names.join(", ")}`);
  });
  await step("stat a file", async () => {
    const s = await stat(bin);
    must(s.isFile && !s.isDirectory && s.size === bytes.length, "wrong file info");
  });
  await step("list a folder", async () => {
    const seen: string[] = [];
    for await (const e of readDir(join(dir, "a"))) seen.push(`${e.name}:${e.isDirectory}`);
    must(seen.join() === "b:true", `listed ${seen.join()}`);
  });
  await step("resolve a real path", async () => {
    const r = await realPath(bin);
    must(samePath(r, bin) || basename(r) === "x.wasm", `got ${r}`);
  });
  await step("compare paths (the input-overwrite guard)", async () => {
    must(samePath(bin, join(sub, ".", "x.wasm")), "the same file read as different");
    must(!samePath(bin, txt), "different files read as the same");
    if (build.os === "windows") {
      must(samePath(bin, bin.toUpperCase()), "case variant read as different");
      return "case-insensitive, as Windows";
    }
    return "case-sensitive";
  });
  await step("write to the null device", async () => {
    const nul = build.os === "windows" ? "NUL" : "/dev/null";
    must(isDevicePath(nul) && !isDevicePath(bin), "device recognition is wrong");
    await writeTextFile(nul, "discarded\n");
    return `${nul}, written in place`;
  });
  await step("environment", async () => {
    const p = env.get("PATH") ?? env.get("Path");
    must(typeof p === "string" && p.length > 0, "PATH is not readable");
  });
  await step("start a program (the runtime itself)", async () => {
    const r = await new RtCommand(execPath(), {
      args: ["--version"],
      stdout: "piped",
      stderr: "piped",
    })
      .output();
    must(r.success, `exit ${r.code}`);
    return new TextDecoder().decode(r.stdout).split("\n")[0].trim();
  });
  await step("write and run a launcher", async () => {
    const l = await writeLauncher(sub, "launch", [execPath()]);
    const r = await new RtCommand(l, { args: ["--version"], stdout: "piped", stderr: "piped" })
      .output();
    must(r.success, `exit ${r.code}: ${new TextDecoder().decode(r.stderr).trim()}`);
    return basename(l);
  });
  await step("set file mode bits", async () => {
    if (build.os === "windows") {
      return "not applicable on Windows (no mode bits; launchers are .cmd)";
    }
    await chmod(txt, 0o644);
  });
  await step("remove a folder tree", async () => {
    await remove(dir, { recursive: true });
    must(!(await exists(dir)), "the temp folder is still there");
  });
  log(failed ? `self-check: ${failed} step(s) FAILED` : "self-check: every step ok");
  return failed === 0;
}

// ── Export ────────────────────────────────────────────────────────────────────

const hostImpl = {
  readFile,
  readTextFile,
  writeFile,
  writeTextFile,
  mkdir,
  stat,
  exists,
  readDir,
  realPath,
  remove,
  chmod,
  makeTempDir,
  samePath,
  isDevice: isDevicePath,
  /** End the process. A method with its return type written out, so `host.exit(…)` ends the code
   *  path for the type checker (TS2534 otherwise). */
  exit(code: number): never {
    return rtExit(code);
  },
  build,
  env,
  execPath,
  args,
  scriptRunner,
  writeLauncher,
  setupConsole,
  stdout,
  stderr,
  stdin,
  Command: RtCommand,
};

/**
 * The one object through which wasmtk reaches the system. Declared with an explicit type so that a
 * call to `host.exit(…)` (which returns `never`) ends the code path for the type checker.
 */
export const host: typeof hostImpl = hostImpl;
