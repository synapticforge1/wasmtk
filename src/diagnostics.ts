/**
 * The compile-error report (owner decision D6, 2026-10-13): when `wasmtk wasic` or `wasmtk modc`
 * refuses a program, each error says WHAT and WHERE, in the style of `tsc` / `rustc`:
 *
 * ```
 * error[int-division]: integer division 'total / count'
 *   --> app.ts:4:11
 *    |
 *  4 |   return (total / count) | 0;
 *    |           ^^^^^^^^^^^^^
 *    = TypeScript: gives a fraction (7 / 2 is 3.5)
 *    = wasm: truncates (3)
 *    = help: say which with wasMath: i32.div(total, count) for the truncated quotient, …
 *
 * ❌ wasic: 1 error in app.ts; no .wasm was written.
 * ```
 * (The last line is the CLI's, from the result's `error`.)
 *
 * The compiler's diagnostics stay strings (hundreds of sites); this module reads them:
 *   - the CODE from the message's wording (`classify`);
 *   - the LOCATION by finding the code the message quotes (`'…'`, or what follows "Unsupported
 *     expression: ") in the user's ORIGINAL files, read from disk, so lines are right even where the
 *     bundler rewrote the source (wasMath's `__wm_<ns>_<member>` is mapped back to `ns.member`);
 *     repeated quotes take successive occurrences, in source order;
 *   - the NOTES from the message's own lines: `TypeScript: …`, `wasm: …`, `help: …`.
 * A message whose code cannot be found is reported without a location, never dropped.
 *
 * Pure: no runtime APIs; the caller reads the files and prints.
 *
 * @module
 */

/** One source file the program was built from. */
export interface SourceFile {
  /** The path as shown to the user. */
  path: string;
  text: string;
}

/** What kind of refusal a diagnostic is. */
export type DiagnosticCode =
  | "int-division"
  | "float-to-int"
  | "float-index"
  | "untyped-declaration"
  | "loop-counter"
  | "bigint-in-math"
  | "bigint-unsigned-shift"
  | "undefined-name"
  | "console-argument"
  | "unsupported";

/** A located diagnostic. */
export interface Located {
  code: DiagnosticCode;
  headline: string;
  notes: string[];
  file?: string;
  line?: number;
  col?: number;
  length?: number;
  sourceLine?: string;
}

/** The kind of a diagnostic, from its wording. */
export function classify(msg: string): DiagnosticCode {
  if (/^integer division /.test(msg)) return "int-division";
  if (/^float stored as an integer /.test(msg)) return "float-to-int";
  if (/^float string index /.test(msg)) return "float-index";
  if (/^Declaration needs a type/.test(msg)) return "untyped-declaration";
  if (/^for-loop counter '/.test(msg)) return "loop-counter";
  if (/^Math\.\w+: a bigint argument/.test(msg)) return "bigint-in-math";
  if (/'>>>' on a bigint/.test(msg)) return "bigint-unsigned-shift";
  if (/Unknown function .* not declared/.test(msg)) return "undefined-name";
  if (/^console argument:/.test(msg)) return "console-argument";
  return "unsupported";
}

/** True for a code the user fixes in the source (no `wasmtk dync` hint): everything but the
 *  static subset's own limits. */
export function isSourceError(code: DiagnosticCode): boolean {
  return code !== "unsupported" && code !== "console-argument" && code !== "undefined-name";
}

const unWasMath = (s: string) => s.replace(/\b__wm_([a-z0-9]+)_(\w+)\b/g, "$1.$2");

/** The code a message quotes, most specific first. */
function quoted(msg: string): string[] {
  const out: string[] = [];
  for (const m of msg.matchAll(/'([^'\n]{2,})'/g)) out.push(m[1]);
  const un = msg.match(/^Unsupported [\w ]+?: (.+)$/m);
  if (un) out.push(un[1].trim());
  return out.map((q) => unWasMath(q.replace(/…$/, "").trim())).filter((q) => q.length >= 2);
}

/** The [start, end) offsets of `text`'s comments (`//…` and `/*…*\/`), skipping strings and
 *  template literals (a `"//"` in a string is not a comment). */
function commentRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  let q = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === "\\") i++;
      else if (c === q) q = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if (c === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i);
      out.push([i, end === -1 ? text.length : end]);
      i = end === -1 ? text.length : end;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      out.push([i, end === -1 ? text.length : end + 2]);
      i = end === -1 ? text.length : end + 1;
    }
  }
  return out;
}

/** Finds `snippet` in the files, whitespace-tolerant, skipping occurrences already used. An
 *  occurrence in CODE is preferred: a comment that quotes the failing code came first and took the
 *  location (ld109, 2026-10-23); a comment match is kept only when the code has none. */
function find(
  snippet: string,
  files: SourceFile[],
  used: Set<string>,
): { file: string; line: number; col: number; length: number; sourceLine: string } | undefined {
  const parts = snippet.split(/\s+/).filter(Boolean).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!parts.length) return undefined;
  const re = new RegExp(parts.join("\\s*"), "g");
  let fallback: { f: SourceFile; m: RegExpMatchArray; key: string } | undefined;
  for (const f of files) {
    const comments = commentRanges(f.text);
    const inComment = (at: number) => comments.some(([s, e]) => at >= s && at < e);
    for (const m of f.text.matchAll(re)) {
      const key = `${f.path}:${m.index}`;
      if (used.has(key)) continue;
      if (inComment(m.index ?? 0)) {
        fallback ??= { f, m, key };
        continue;
      }
      used.add(key);
      return located(f, m);
    }
  }
  if (fallback) {
    used.add(fallback.key);
    return located(fallback.f, fallback.m);
  }
  return undefined;
}

function located(
  f: SourceFile,
  m: RegExpMatchArray,
): { file: string; line: number; col: number; length: number; sourceLine: string } {
  const before = f.text.slice(0, m.index);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const sourceLine = f.text.slice(lineStart).split("\n")[0].replace(/\r$/, "");
  const col = (m.index ?? 0) - lineStart + 1;
  const length = Math.max(1, Math.min(m[0].split("\n")[0].length, sourceLine.length - col + 1));
  return { file: f.path, line, col, length, sourceLine };
}

/** Locates and splits every diagnostic, in the order given. */
export function locate(diagnostics: readonly string[], files: SourceFile[]): Located[] {
  const used = new Set<string>();
  return diagnostics.map((raw) => {
    let [first, ...rest] = unWasMath(raw).split("\n");
    // A one-line message that explains itself after its quote (`… 'let n = 5;'. Every let …`):
    // the explanation is the help.
    if (rest.length === 0) {
      const m = first.match(/^(.*?'[^'\n]*')\.\s+(.+)$/);
      if (m) [first, rest] = [m[1], [`help: ${m[2]}`]];
    }
    const code = classify(first);
    const loc = quoted(first).map((q) => find(q, files, used)).find((l) => l !== undefined);
    return { code, headline: first.trim(), notes: rest.map((r) => r.trim()).filter(Boolean), ...loc };
  });
}

/** The report, as text: one block per diagnostic. The caller prints the summary line. */
export function formatReport(diagnostics: readonly string[], files: SourceFile[]): string {
  const out: string[] = [];
  // In source order (file as listed, line, column); an error that could not be located goes last.
  const rank = (d: Located) => d.line === undefined
    ? [Infinity, 0, 0]
    : [files.findIndex((f) => f.path === d.file), d.line, d.col ?? 0];
  const sorted = locate(diagnostics, files).map((d, i) => ({ d, i, r: rank(d) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.r[2] - b.r[2] || a.i - b.i)
    .map((x) => x.d);
  for (const d of sorted) {
    out.push(`error[${d.code}]: ${d.headline}`);
    if (d.line !== undefined && d.sourceLine !== undefined && d.col !== undefined) {
      const n = String(d.line);
      const pad = " ".repeat(n.length);
      out.push(`${pad} --> ${d.file}:${d.line}:${d.col}`);
      out.push(`${pad}  |`);
      out.push(`${n}  | ${d.sourceLine}`);
      out.push(`${pad}  | ${" ".repeat(d.col - 1)}${"^".repeat(d.length ?? 1)}`);
      for (const note of d.notes) out.push(`${pad}  = ${note}`);
    } else {
      for (const note of d.notes) out.push(`   = ${note}`);
    }
    out.push("");
  }
  return out.join("\n");
}
