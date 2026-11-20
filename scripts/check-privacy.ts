// Copyright (c) 2026 Jon Marcum
// Licensed under the MIT License. See LICENSE-MIT in the repository root.
// Copied from binaryang's scripts/check-privacy.ts on 2026-11-20 (letter H37 (b)); wasmtk's
// changes: its manifests (deno.json, package.json), its KNOWN list, and CLAUDE.md as private.

/**
 * 🔒 The privacy rule, CHECKED (security review round 1, A3, 2026-11-13): "No secrets or personal
 * information are ever made public" (workspace working-rules § Records) — no token, key,
 * password, personal address or personal drive path in any committed file, commit message or
 * package. It was a rule people followed; nothing in CI or the release checked it.
 *
 * What it reads:
 *   - every tracked file (`git ls-files`), text only;
 *   - each directory named with `--dir` (the npm package's `dist/`, before it is packed);
 *   - with `--commits <range>`, the message of every commit in the range (`git log`).
 *
 * What it refuses:
 *   - a drive path that records one machine's layout: a drive letter then `Users` or `Programs`
 *     (either slash), the same under WSL's `/mnt/<letter>`, a macOS home (`/Users/<name>/`), a
 *     Linux home (`/home/<name>/`) — except `/home/runner/`, the CI runner's, which names nothing
 *     about a person (the test is "is it machine-specific?", owner 2026-10-23);
 *   - a private key block, and the token shapes of GitHub, npm, AWS and Slack (JSR and npm
 *     publish by OIDC here: no token of theirs exists to leak);
 *   - an email address, except a service's (`…@users.noreply.github.com`, `noreply@…`,
 *     `git@github.com`) and the ONE maintainer contact the rule allows — read from the manifests'
 *     own fields at run time, so this file never holds it — and only in a manifest.
 *
 * A hit is printed with its file and line and the match MASKED (its first three characters), and
 * exits 1. Never print a secret whole, even to say it was found.
 *
 * ```sh
 * bun scripts/check-privacy.ts [--dir dist] [--commits <range>]
 * ```
 *
 * @module
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** One finding: where, what kind, and the match masked. */
export interface Leak {
  where: string;
  kind: string;
  masked: string;
}

const RULES: { kind: string; re: RegExp }[] = [
  { kind: "drive path", re: /\b[A-Za-z]:(?:\\\\?|\/)+(?:Users|Programs)(?:\\\\?|\/)[^\s'"`]*/g },
  { kind: "drive path", re: /\/mnt\/[a-z]\/(?:Users|Programs)\/[^\s'"`]*/g },
  // Git Bash / MSYS spells the same paths: a slash, the drive letter, a slash, then Users or
  // Programs (security review round 2).
  { kind: "drive path", re: /(?<![\w.:/])\/[a-z]\/(?:Users|Programs)\/[^\s'"`]*/g },
  { kind: "home path", re: /\/Users\/[A-Za-z][\w.-]*\/[^\s'"`]*/g },
  { kind: "home path", re: /\/home\/(?!runner\/)[a-z][\w.-]*\/[^\s'"`]*/g },
  // wasmtk (review P1, 2026-11-20): a Linux REMOVABLE drive — `/run/media/<user>/<volume>/…`,
  // `/media/<user>/…` — and Silverblue's `/var/home/<user>/…` name the user too; a `file:///`
  // URL of any of these is matched through its path. (Both history purges missed this form.)
  { kind: "home path", re: /\/(?:run\/media|media|var\/home)\/[a-z][\w.-]*\/[^\s'"`]*/g },
  { kind: "private key", re: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/g },
  { kind: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/g },
  { kind: "npm token", re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { kind: "AWS key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  // Round 2 (2026-11-13): shapes the first list missed.
  { kind: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "Stripe key", re: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/g },
  {
    kind: "JSON Web Token",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  // wasmtk (2026-11-20): a password in a URL, 8 characters or more (`user:pass@` is a placeholder).
  // The scheme is bounded (32): unbounded, `a.a.a.…` was scanned to the end from every position —
  // quadratic, 152 s on a 1 MB line (found by review H13's test, 2026-11-20). The user and password
  // parts are bounded too.
  {
    kind: "URL credentials",
    re: /\b[a-z][a-z0-9+.-]{0,31}:\/\/[^\s/@:]{1,256}:[^\s/@]{8,256}@/gi,
  },
  {
    kind: "secret assignment",
    re:
      /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"\s$]{8,}['"]/gi,
  },
];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
/**
 * A service's address, which names no person. `support@github.com` is the one Dependabot signs
 * its commits off with (`Signed-off-by: dependabot[bot] <…>`); a merged Dependabot pull request
 * carries it into the history (2026-11-19).
 */
const SERVICE =
  /^(?:[^@\s]+@users\.noreply\.github\.com|no-?reply@[^@\s]+|git@github\.com|support@github\.com)$/i;
/**
 * wasmtk (2026-11-20): an address at a domain RESERVED for examples (RFC 2606 / 6761:
 * `example.com` / `.net` / `.org`, and any name under `.example`, `.invalid`, `.test`,
 * `.localhost`) names nobody — the release self-tests commit as `t@example.invalid`.
 */
const RESERVED =
  /@(?:(?:[^@\s]+\.)?example\.(?:com|net|org)|[^@\s]+\.(?:example|invalid|test|localhost))$/i;
/** Files the maintainer contact may appear in: the manifests' own fields. */
const MANIFESTS = new Set(["deno.json", "package.json"]);

/**
 * Findings checked by hand and found to name nothing private, each by place and kind, with why.
 * Commit messages cannot be changed once pushed, so a false positive in one is listed here
 * rather than rewritten; a FILE's false positive is fixed in the file instead — except a file in
 * `cmem/archive/`, which is kept VERBATIM (letter H38).
 */
export const KNOWN: readonly { where: string; kind: string; why: string }[] = [
  {
    where: "cmem/archive/history-purge-2026-10-26.md:*",
    kind: "drive path",
    why:
      "quotes the std path library's own doc example (a user 'foo'), in the verbatim purge record",
  },
  {
    where: "cmem/history-purge-2026-10-26.md:*",
    kind: "drive path",
    why: "the same record at its path before the 2026-11-20 archive move (history blobs only)",
  },
];

/** The first three characters, then stars: enough to find it, never enough to use it. */
export function mask(s: string): string {
  return `${s.slice(0, 3)}${"*".repeat(Math.max(3, Math.min(12, s.length - 3)))}`;
}

/**
 * Every leak in `text`, named `name` (a path, or `commit <sha>`). `maintainer` is the one address
 * allowed, in a manifest only.
 */
/**
 * The email addresses in one line, found from each `@` outward: at most 64 characters of local
 * part (an address's limit) and 253 of domain. Linear in the line's length — the EMAIL regex run
 * over the whole line was quadratic on a long line with no `@` (2 MB ≈ 15 minutes; review H13,
 * 2026-11-20). Returns [address, index] pairs, as `matchAll` did.
 */
export function emailsIn(line: string): Array<[string, number] & { index: number }> {
  const out: Array<[string, number] & { index: number }> = [];
  const LOCAL = /[A-Za-z0-9._%+-]/;
  const DOMAIN = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
  for (let at = line.indexOf("@"); at >= 0; at = line.indexOf("@", at + 1)) {
    let s = at;
    while (s > 0 && at - s < 64 && LOCAL.test(line[s - 1])) s--;
    if (s === at) continue;
    const d = DOMAIN.exec(line.slice(at + 1, at + 1 + 253));
    if (!d) continue;
    const pair = [line.slice(s, at + 1 + d[0].length), s] as [string, number] & { index: number };
    pair.index = s;
    out.push(pair);
  }
  return out;
}

export function findLeaks(name: string, text: string, maintainer: string | undefined): Leak[] {
  const out: Leak[] = [];
  const lines = text.split("\n");
  const isManifest = MANIFESTS.has(name.replace(/\\/g, "/"));
  lines.forEach((line, i) => {
    const where = `${name}:${i + 1}`;
    for (const { kind, re } of RULES) {
      for (const m of line.matchAll(re)) {
        // wasmtk (2026-11-20): a PLACEHOLDER names no machine — the privacy rule itself writes
        // `C:\Users\<name>\…` and `D:\Programs\…` (a `<…>` or `…` right after the folder).
        if (/(?:Users|Programs)(?:\\\\?|\/)+(?:<|…|$)/.test(m[0])) continue;
        out.push({ where, kind, masked: mask(m[0]) });
      }
    }
    for (const m of emailsIn(line)) {
      const addr = m[0];
      if (SERVICE.test(addr) || RESERVED.test(addr)) continue;
      // `scheme://user:pass@host` is URL userinfo, not an address (wasmtk's URL-parsing test
      // program); a real password there is the 'URL credentials' rule's.
      if (/:\/\/[^\s/@:]*:$/.test(line.slice(0, m.index))) continue;
      if (
        maintainer !== undefined && addr.toLowerCase() === maintainer.toLowerCase() && isManifest
      ) {
        continue;
      }
      out.push({ where, kind: "email address", masked: mask(addr) });
    }
  });
  return out;
}

/** The leaks not in {@link KNOWN}. */
export function unknown(leaks: readonly Leak[]): Leak[] {
  // A history blob is named `blob <id> (<path>):<line>`: matched by its path and line, as a file.
  // A KNOWN entry ending `:*` matches every line of that path.
  const place = (w: string) => w.replace(/^blob \w+ \((.*)\)(:\d+)$/, "$1$2");
  return leaks.filter((l) =>
    !KNOWN.some((k) =>
      k.kind === l.kind &&
      (k.where === place(l.where) ||
        (k.where.endsWith(":*") && place(l.where).startsWith(k.where.slice(0, -1))))
    )
  );
}

/** The maintainer contact, from the manifests' own fields, if one is there. */
function maintainerAddress(root: string): string | undefined {
  for (const f of ["deno.json", "package.json"]) {
    try {
      const j = JSON.parse(readFileSync(join(root, f), "utf8")) as Record<string, unknown>;
      const people = [j["author"], ...((j["maintainers"] as unknown[]) ?? [])];
      for (const p of people) {
        const s = typeof p === "string" ? p : (p as { email?: string } | undefined)?.email;
        const m = s?.match(EMAIL);
        if (m) return m[0];
      }
    } catch {
      // no such manifest, or no address in it
    }
  }
  return undefined;
}

/**
 * What a file SAYS, whatever its encoding — EVERY file is read. 🔧 A NUL in the first 8 KiB meant
 * "binary, skip it", so a UTF-16 file, or a text file with one NUL early, was never scanned at all
 * (security review round 2, 2026-11-13). Now: UTF-16BE by its byte-order mark; UTF-8 when there is
 * no NUL; anything else (a binary, or UTF-16 without a mark) as BOTH Latin-1 and UTF-16LE, so a
 * secret written in either reading is seen. A finding's line number is then a line of that
 * reading.
 */
export function textOf(bytes: Uint8Array): string {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // (UTF-16LE needs no case of its own: its NULs send it to the both-readings case below, which
  // reads it as UTF-16LE — a mutant dropping that case changed nothing.)
  if (b[0] === 0xfe && b[1] === 0xff) {
    const swapped = Buffer.from(b.subarray(2));
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  if (!b.includes(0)) return b.toString("utf8");
  const even = b.length - (b.length % 2);
  return `${b.toString("latin1")}\n${b.subarray(0, even).toString("utf16le")}`;
}

function walk(dir: string, out: string[]): void {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

function git(args: string[]): string {
  const r = spawnSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

/** Parses `--dir D` (repeatable) and `--commits R`; anything else is refused. */
export function parseArgs(
  argv: string[],
): { dirs: string[]; commits: string | undefined; history: boolean } {
  const dirs: string[] = [];
  let commits: string | undefined;
  let history = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const v = argv[i + 1];
    if ((a === "--dir" || a === "--commits") && (v === undefined || v.startsWith("--"))) {
      throw new Error(`${a} needs a value`);
    }
    if (a === "--dir") dirs.push(argv[++i]!);
    else if (a === "--commits") commits = argv[++i]!;
    else if (a === "--history") history = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return { dirs, commits, history };
}

/**
 * `--history` (review P1, 2026-11-20): every blob reachable from EVERY ref, each once — a path
 * removed from HEAD is still published in history, and the gate read HEAD only. Each finding names
 * the blob and a path it had.
 */
function scanHistory(maintainer: string | undefined): { leaks: Leak[]; blobs: number } {
  const objs = git(["rev-list", "--all", "--objects"]).split("\n").filter(Boolean);
  const pathOf = new Map<string, string>();
  for (const line of objs) {
    const sp = line.indexOf(" ");
    if (sp > 0 && !pathOf.has(line.slice(0, sp))) pathOf.set(line.slice(0, sp), line.slice(sp + 1));
  }
  const types = spawnSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype)"], {
    input: [...pathOf.keys()].join("\n") + "\n",
    encoding: "utf8",
    maxBuffer: 1 << 28,
  }).stdout.split("\n").filter((l) => l.endsWith(" blob")).map((l) => l.split(" ")[0]);
  const leaks: Leak[] = [];
  let scanned = 0;
  // `node_modules/` was tracked by mistake in old commits: those blobs are the dependencies' own
  // PUBLISHED files (the std path library's doc examples, npm authors' addresses in their own
  // package.json) — not facts about this project's creator, and public already. Skipped, by name.
  const ids = types.filter((id) => !/(^|\/)node_modules\//.test(pathOf.get(id) ?? ""));
  // `git cat-file --batch`, 500 blobs a call (one call per blob took 9 minutes)
  for (let at = 0; at < ids.length; at += 500) {
    const batch = ids.slice(at, at + 500);
    const r = spawnSync("git", ["cat-file", "--batch"], {
      input: batch.join("\n") + "\n",
      maxBuffer: 1 << 30,
    });
    if (r.status !== 0) throw new Error(`git cat-file --batch failed: ${r.stderr}`);
    const out = r.stdout as Buffer;
    let p = 0;
    for (const id of batch) {
      const nl = out.indexOf(10, p);
      const header = out.subarray(p, nl).toString("latin1"); // "<id> blob <size>"
      const size = Number(header.split(" ")[2]);
      if (!header.startsWith(id) || !Number.isFinite(size)) {
        throw new Error(`git cat-file --batch: unexpected header "${header}"`);
      }
      const body = out.subarray(nl + 1, nl + 1 + size);
      p = nl + 1 + size + 1; // the content, then a newline
      leaks.push(
        ...findLeaks(`blob ${id.slice(0, 12)} (${pathOf.get(id)})`, textOf(body), maintainer),
      );
      scanned++;
    }
  }
  return { leaks, blobs: scanned };
}

/**
 * The PRIVATE files among `tracked` (paths as `git ls-files` prints them): the review issues file,
 * anything under `cmem/local/` or `.claude/`. Each is gitignored, but `git add -f` still commits
 * it — and an issues file on GitHub publishes every open finding (workspace review standard,
 * letter H37 § 10: "the privacy gate checks that it is untracked").
 */
export function privateFilesTracked(tracked: readonly string[]): string[] {
  return tracked.filter((f) =>
    f === "cmem/review-issues.md" || f.startsWith("cmem/local/") || f.startsWith(".claude/") ||
    f === "CLAUDE.md"
  );
}

if (import.meta.main) {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`check-privacy: ${(e as Error).message}`);
    process.exit(2);
  }
  const root = process.cwd();
  const maintainer = maintainerAddress(root);
  const leaks: Leak[] = [];
  let files = 0;
  const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
  const privateOnes = privateFilesTracked(tracked);
  if (privateOnes.length > 0) {
    console.error("check-privacy: private file(s) TRACKED — untrack them (git rm --cached):");
    for (const f of privateOnes) console.error(`  ${f}`);
    process.exit(1);
  }
  for (const f of tracked) {
    let text: string | undefined;
    try {
      text = textOf(readFileSync(join(root, f)));
    } catch (e) {
      // listed but deleted in the working tree: nothing to scan. Any OTHER failure (locked,
      // denied, a folder) is a file left unscanned — a finding, never a silent skip (review H14).
      if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
      console.error(`check-privacy: cannot read ${f}: ${(e as Error).message}`);
      process.exit(1);
    }
    files++;
    leaks.push(...findLeaks(f, text, maintainer));
  }
  for (const d of args.dirs) {
    const all: string[] = [];
    try {
      walk(join(root, d), all);
    } catch (e) {
      console.error(`check-privacy: --dir ${d}: ${(e as Error).message}`); // was a raw stack (H14)
      process.exit(1);
    }
    for (const p of all) {
      const text = textOf(readFileSync(p));
      files++;
      leaks.push(...findLeaks(p.slice(root.length + 1).replace(/\\/g, "/"), text, maintainer));
    }
  }
  let commits = 0;
  if (args.commits !== undefined) {
    for (const entry of git(["log", "--format=%H%n%B%x00", args.commits]).split("\0")) {
      const body = entry.trim();
      if (body === "") continue;
      commits++;
      const sha = body.slice(0, 12);
      leaks.push(...findLeaks(`commit ${sha}`, body.slice(body.indexOf("\n") + 1), undefined));
    }
  }
  if (files < 50) {
    console.error(
      `check-privacy: only ${files} files read — the listing is broken, not the tree clean`,
    );
    process.exit(1);
  }
  let blobs = 0;
  if (args.history) {
    const h = scanHistory(maintainer);
    leaks.push(...h.leaks);
    blobs = h.blobs;
  }
  const found = unknown(leaks);
  if (found.length > 0) {
    console.error(`check-privacy: ${found.length} finding(s) (masked):`);
    for (const l of found) console.error(`  ${l.where}: ${l.kind} ${l.masked}`);
    process.exit(1);
  }
  console.log(
    `check-privacy: clean — ${files} files${commits ? `, ${commits} commit messages` : ""}${
      blobs ? `, ${blobs} history blobs on every ref` : ""
    }`,
  );
}
