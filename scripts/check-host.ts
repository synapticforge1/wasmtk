/**
 * scripts/check-host.ts — the `host` gate (workspace letter H39, owner 2026-11-19).
 *
 * Every call wasmtk makes to the system lives in `src/host.ts`. This gate fails when any other
 * file of the product (`main.ts` and everything under `src/`) reaches the system itself:
 *
 *   R1  imports a runtime's file, path, OS or process module: `node:*`, `@std/path`, `@std/fs`
 *       (with or without `jsr:`), statically, dynamically or re-exported;
 *   R2  names a runtime global as code: `Deno`, `Bun`, `process`, `require`;
 *   R3  branches on the platform through the host: `host.build` (the OS / CPU) is the host's own;
 *   R0  cannot be read as code (ends inside a template or with unbalanced braces): it fails
 *       rather than passing unread.
 *
 * It reads code, not text: comments, strings and regular expressions are skipped, so the program
 * text wasmtk GENERATES (host runners, shims — written as template literals) is not code here,
 * while the `${…}` expressions inside a template are. `tests/` and `scripts/` are not the product
 * and are not scanned.
 *
 * Usage: `bun scripts/check-host.ts` (exit 1 on a finding) · `bun scripts/check-host.ts --self-test`
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

/** A token the rules look at. */
interface Tok {
  kind: "ident" | "str" | "punct" | "num";
  value: string;
  line: number;
}

const REGEX_AFTER_KEYWORD = new Set([
  "return",
  "typeof",
  "case",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "instanceof",
  "yield",
  "await",
  "else",
  "do",
  "extends",
]);

/** Set by `tokenize`: false when a file ended inside a template or with unbalanced braces, i.e.
 *  the tokenizer lost track of what is code (then the file fails as R0, never passes silently). */
let lastBalanced = true;

/** Tokenize TypeScript source enough for the rules: identifiers, string values, punctuators. */
export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let unterminated = false;
  let i = 0, line = 1;
  // Each entry: the brace depth at which a template's `${` was opened.
  const templateStack: number[] = [];
  let braceDepth = 0;
  const prevSignificant = (): Tok | undefined => out[out.length - 1];
  const regexAllowed = (): boolean => {
    const p = prevSignificant();
    if (!p) return true;
    if (p.kind === "num" || p.kind === "str") return false;
    if (p.kind === "ident") return REGEX_AFTER_KEYWORD.has(p.value);
    return !(p.value === ")" || p.value === "]" || p.value === "}");
  };
  const readTemplateChunk = (): void => {
    // At the character after "`" or after the "}" closing a `${`; read to "`" or "${".
    while (i < src.length) {
      const c = src[i];
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "\n") line++;
      if (c === "`") {
        i++;
        out.push({ kind: "str", value: "`template`", line });
        return;
      }
      if (c === "$" && src[i + 1] === "{") {
        i += 2;
        braceDepth++;
        templateStack.push(braceDepth);
        return;
      }
      i++;
    }
    unterminated = true; // the file ended inside a template
  };
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      for (let k = i; k < stop; k++) if (src[k] === "\n") line++;
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      const startLine = line;
      let v = "";
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === "\\") {
          v += src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === "\n") line++;
        v += src[i++];
      }
      i++;
      out.push({ kind: "str", value: v, line: startLine });
      continue;
    }
    if (c === "`") {
      i++;
      readTemplateChunk();
      continue;
    }
    if (c === "/" && regexAllowed()) {
      i++;
      let inClass = false;
      while (i < src.length) {
        const r = src[i];
        if (r === "\\") {
          i += 2;
          continue;
        }
        if (r === "\n") break; // not a regex after all; give up on the line
        if (r === "[") inClass = true;
        else if (r === "]") inClass = false;
        else if (r === "/" && !inClass) {
          i++;
          break;
        }
        i++;
      }
      while (i < src.length && /[a-z]/i.test(src[i])) i++;
      out.push({ kind: "str", value: "/regex/", line });
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      out.push({ kind: "ident", value: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[\w.]/.test(src[j])) j++;
      out.push({ kind: "num", value: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (c === "{") braceDepth++;
    if (c === "}") {
      if (templateStack.length && templateStack[templateStack.length - 1] === braceDepth) {
        templateStack.pop();
        braceDepth--;
        i++;
        readTemplateChunk();
        continue;
      }
      braceDepth--;
    }
    // `?.` and `...` matter for R2 / R3 (a member access), the rest one character at a time.
    if (c === "?" && src[i + 1] === "." && !/[0-9]/.test(src[i + 2] ?? "")) {
      out.push({ kind: "punct", value: "?.", line });
      i += 2;
      continue;
    }
    out.push({ kind: "punct", value: c, line });
    i++;
  }
  lastBalanced = !unterminated && braceDepth === 0 && templateStack.length === 0;
  return out;
}

/** One finding. */
export interface Finding {
  line: number;
  rule: "R0" | "R1" | "R2" | "R3";
  what: string;
}

const BANNED_MODULE = /^(node:|(jsr:)?@std\/(path|fs)\b)/;
const BANNED_GLOBALS = new Set(["Deno", "Bun", "process", "require"]);

/** Apply R1–R3 to one file's source. */
export function check(src: string): Finding[] {
  const t = tokenize(src);
  const found: Finding[] = [];
  if (!lastBalanced) {
    found.push({
      line: 0,
      rule: "R0",
      what: "could not be read as code (unbalanced braces or template)",
    });
  }
  for (let k = 0; k < t.length; k++) {
    const tok = t[k], prev = t[k - 1], prev2 = t[k - 2];
    if (tok.kind === "str" && BANNED_MODULE.test(tok.value)) {
      const isImport =
        (prev?.kind === "ident" && (prev.value === "from" || prev.value === "import")) ||
        (prev?.value === "(" && prev2?.kind === "ident" && prev2.value === "import");
      if (isImport) found.push({ line: tok.line, rule: "R1", what: `imports "${tok.value}"` });
    }
    if (tok.kind === "ident" && BANNED_GLOBALS.has(tok.value)) {
      const isMember = prev?.value === "." || prev?.value === "?.";
      const isKey = t[k + 1]?.value === ":" && (prev?.value === "{" || prev?.value === ",");
      if (!isMember && !isKey) {
        found.push({ line: tok.line, rule: "R2", what: `uses ${tok.value}` });
      }
    }
    if (
      tok.kind === "ident" && tok.value === "host" && t[k + 1]?.value === "." &&
      t[k + 2]?.value === "build" && prev?.value !== "."
    ) {
      found.push({ line: tok.line, rule: "R3", what: "branches on host.build (the OS / CPU)" });
    }
  }
  return found;
}

function productFiles(root: string): string[] {
  const files = [join(root, "main.ts")];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".ts")) files.push(p);
    }
  };
  walk(join(root, "src"));
  return files.filter((f) => relative(root, f).replace(/\\/g, "/") !== "src/host.ts");
}

function selfTest(root: string): boolean {
  const cases: [string, string, string[]][] = [
    // [name, source, expected rule list]
    ["static node import", `import { readFile } from "node:fs";`, ["R1"]],
    ["@std/path import", `import { join } from "@std/path";`, ["R1"]],
    ["jsr @std/fs import", `import { walk } from "jsr:@std/fs@1/walk";`, ["R1"]],
    ["dynamic import", `const fs = await import("node:fs/promises");`, ["R1"]],
    ["re-export", `export { join } from "@std/path";`, ["R1"]],
    ["side-effect import", `import "node:process";`, ["R1"]],
    ["the host import is fine", `import { host, join } from "./host.ts";`, []],
    ["Deno call", `await Deno.readFile("x");`, ["R2"]],
    ["Bun call", `Bun.write(p, d);`, ["R2"]],
    ["process global", `const a = process.argv;`, ["R2"]],
    ["require", `const fs = require("fs");`, ["R2"]],
    ["typeof Deno is still Deno", `if (typeof Deno !== "undefined") {}`, ["R2"]],
    ["Deno inside ${} is code", "const s = `x ${Deno.cwd()} y`;", ["R2"]],
    ["nested template in ${}", "const s = `a ${`b ${Bun.version}`} c`;", ["R2"]],
    ["host.build branch", `if (host.build.os === "windows") {}`, ["R3"]],
    ["string mentioning Deno", `const s = "Deno.exit(1) and node:fs";`, []],
    [
      "template text mentioning Deno",
      'const s = `await Deno.readFile(p); import x from "node:fs"`;',
      [],
    ],
    ["comment mentioning Deno", `// Deno.exit(1)\n/* process.exit */ const x = 1;`, []],
    ["regex mentioning Deno", `const r = /Deno\\.exit|process/g; r.test(s);`, []],
    ["regex with a slash in a class", `const r = /[/"]Deno/; const y = Deno;`, ["R2"]],
    ["division is not a regex", `const a = b / 2; const c = d / Deno.x;`, ["R2"]],
    ["member named process", `child.process.status; x?.Deno;`, []],
    ["object key named process", `const o = { process: 1, Bun: 2 };`, []],
    ["a template after code keeps the line", "const a = `x`;\nconst b = `y ${1}`;\nDeno.exit(0);", [
      "R2",
    ]],
    ["an unterminated template fails closed", "const s = `never closed ${a}", ["R0"]],
    ["unbalanced braces fail closed", "function f() { if (x) {", ["R0"]],
  ];
  let ok = true;
  for (const [name, src, want] of cases) {
    const got = check(src).map((f) => f.rule);
    const pass = got.join() === want.join();
    if (!pass) ok = false;
    console.log(`${pass ? "  ✓" : "  ✗"} ${name}${pass ? "" : ` — want [${want}] got [${got}]`}`);
  }
  // Mutants of the REAL tree: each injected line must be found, in the file it was put into.
  const mainSrc = readFileSync(join(root, "main.ts"), "utf8");
  const wastSrc = readFileSync(join(root, "src", "wast.ts"), "utf8");
  const mutants: [string, string, Finding["rule"]][] = [
    ["main.ts + Deno.exit", mainSrc + "\nDeno.exit(0);\n", "R2"],
    ["main.ts + node:fs import", `import { readFileSync } from "node:fs";\n` + mainSrc, "R1"],
    [
      "wast.ts: readDir straight from Deno",
      wastSrc.replace("host.readDir(dir)", "Deno.readDir(dir)"),
      "R2",
    ],
    ["wast.ts + a platform branch", wastSrc + '\nif (host.build.os === "linux") {}\n', "R3"],
  ];
  const base = check(mainSrc).length + check(wastSrc).length;
  if (base !== 0) {
    ok = false;
    console.log(`  ✗ the unmutated main.ts / wast.ts have ${base} finding(s)`);
  }
  for (const [name, src, rule] of mutants) {
    const got = check(src);
    const pass = got.length === 1 && got[0].rule === rule;
    if (!pass) ok = false;
    console.log(
      `${pass ? "  ✓" : "  ✗"} mutant: ${name}${pass ? "" : ` — got ${JSON.stringify(got)}`}`,
    );
  }
  console.log(ok ? "check-host self-test: all cases pass" : "check-host self-test: FAILED");
  return ok;
}

const root = join(import.meta.dirname ?? ".", "..");
if (process.argv.includes("--self-test")) {
  process.exit(selfTest(root) ? 0 : 1);
}
let total = 0;
const files = productFiles(root);
for (const f of files) {
  for (const x of check(readFileSync(f, "utf8"))) {
    total++;
    console.log(`${relative(root, f).replace(/\\/g, "/")}:${x.line}: ${x.rule} ${x.what}`);
  }
}
console.log(
  total
    ? `check-host: ${total} call(s) to the system outside src/host.ts (H39)`
    : `check-host: ${files.length} files, every system call is in src/host.ts`,
);
process.exit(total ? 1 : 0);
