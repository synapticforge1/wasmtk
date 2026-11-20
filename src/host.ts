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
import { basename, dirname, join, resolve } from "@std/path";

const isBun = typeof (globalThis as any).Bun !== "undefined";

/** Paths are the host's too: separators and case rules are the OS's. */
export { basename, dirname, join, resolve };

// ── File I/O ─────────────────────────────────────────────────────────────────

async function readFile(path: string): Promise<Uint8Array> {
  if (isBun) return new Uint8Array(await (globalThis as any).Bun.file(path).arrayBuffer());
  return Deno.readFile(path);
}

async function readTextFile(path: string): Promise<string> {
  if (isBun) return await (globalThis as any).Bun.file(path).text();
  return Deno.readTextFile(path);
}

/**
 * True for a Windows SHARING VIOLATION — `os error 32`, "The process cannot access the file because
 * it is being used by another process". Transient by nature: a just-exited child process, an
 * indexer or an AV scanner still holds a handle for a few milliseconds after we are done with it.
 */
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
  if (/^\\\\[.?]\\/.test(path)) return true; // \\.\NUL, \\?\…
  const stem = path.split(/[\\/]/).pop()!.split(".")[0].replace(/[ :]+$/, "");
  return /^(NUL|CON|PRN|AUX|COM[1-9]|LPT[1-9])$/i.test(stem);
}

let tmpCounter = 0;

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
  const tmp = join(
    dirname(path),
    `.${basename(path)}.wasmtk-${process.pid}-${Date.now().toString(36)}-${tmpCounter++}.tmp`,
  );
  try {
    if (isBun) {
      await (globalThis as any).Bun.write(tmp, data);
    } else if (typeof data === "string") await Deno.writeTextFile(tmp, data);
    else await Deno.writeFile(tmp, data);
  } catch (e) {
    await removeQuiet(tmp);
    // The folder may refuse a new file while the target itself is writable: write it in place.
    if (/permission|denied|EACCES|EPERM|os error 5\b/i.test(String(e)) && await exists(path)) {
      return retryOnSharingViolation(direct);
    }
    throw e;
  }
  try {
    await retryOnSharingViolation(() => rename(tmp, path));
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

/** True when `a` and `b` name the same file (case-insensitively on Windows, as its file system). */
function samePath(a: string, b: string): boolean {
  const ra = resolve(a), rb = resolve(b);
  return build.os === "windows" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
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
  const quoted = command.map((c) => `"${c}"`).join(" ");
  if (build.os === "windows") {
    const p = join(dir, `${name}.cmd`);
    await writeTextFile(p, `@echo off\r\n${quoted} %*\r\n`);
    return p;
  }
  const p = join(dir, name);
  await writeTextFile(p, `#!/bin/sh\nexec ${quoted} "$@"\n`);
  await chmod(p, 0o755);
  return p;
}

/**
 * Windows only: switch the console to UTF-8 (SetConsoleOutputCP 65001) so emoji and box-drawing
 * characters render; `chcp` is not enough because Deno writes to the console handle directly
 * (owner decision M7, deno-exit-plan.md: keep this fix). A no-op elsewhere and on Bun.
 */
function setupConsole(): void {
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

  spawn(): { status: Promise<{ success: boolean; code: number }> } {
    if (isBun) {
      const bun = (globalThis as any).Bun;
      const proc = bun.spawn([this._cmd, ...(this._opts.args ?? [])], {
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
        env: this._opts.env,
      });
      return {
        status: proc.exited.then((code: number) => ({ success: code === 0, code: code ?? 0 })),
      };
    }
    const child = new Deno.Command(this._cmd, {
      args: this._opts.args,
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    return { status: child.status };
  }

  async output(): Promise<RtCommandOutput> {
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
      await proc.exited;
      const code: number = proc.exitCode ?? 0;
      const outBuf = this._opts.stdout === "piped"
        ? new Uint8Array(await new Response(proc.stdout).arrayBuffer())
        : new Uint8Array(0);
      const errBuf = this._opts.stderr === "piped"
        ? new Uint8Array(await new Response(proc.stderr).arrayBuffer())
        : new Uint8Array(0);
      return { success: code === 0, code, stdout: outBuf, stderr: errBuf };
    }
    const result = await new Deno.Command(this._cmd, {
      args: this._opts.args,
      stdin: this._opts.stdin as "piped" | "null" | "inherit" | undefined,
      stdout: this._opts.stdout as "piped" | "null" | "inherit" | undefined,
      stderr: this._opts.stderr as "piped" | "null" | "inherit" | undefined,
      env: this._opts.env,
      cwd: this._opts.cwd,
    }).output();
    return {
      success: result.success,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
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
