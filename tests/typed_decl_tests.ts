/**
 * typed_decl_tests.ts — the typed-declaration rule (owner ruling 2026-09-28)
 *
 * Every let/const/var states its type on its FIRST definition; a later assignment needs none. A
 * counting-`for` counter written without a type is an integer by standard, and anything that could
 * make it fractional is an error. This suite asserts the REASON each program is refused (the
 * diagnostic text, and the line it names in the file as written), so a program cannot pass here by
 * failing for some other cause. The accepted forms are checked by compiling AND running them.
 *
 *   refused: untyped number / string / `new` / call result; untyped array or object pattern;
 *            an arrow missing its return type or a parameter type; a counter that starts
 *            fractional, is updated with `/=`, or is assigned a fraction in the loop body
 *            (multi-line AND one-line `for`, which are parallel emitters in wasic); a plain `/`
 *            between integers anywhere (2026-10-09: TypeScript gives a fraction, wasm truncates)
 *   accepted: reassignment without a type; for-of / counting-for bindings; a typed pattern;
 *            a fully typed arrow or function expression; `Promise<…>`, an object type literal,
 *            a tuple from a call, a union alias from a member, a `T | null` destructured
 *   line:    the line number is the one in the file, even after a block comment
 *
 * Everything runs in a temp dir.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-run --allow-env tests/typed_decl_tests.ts
 *
 * @license MIT
 */

import { join } from "jsr:@std/path";

const WASMTK = "wasmtk";

let passed = 0;
let failed = 0;
function ok(desc: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ ${desc}${detail ? `\n${detail}` : ""}`);
  }
}

async function run(args: string[], cwd: string): Promise<{ code: number; text: string }> {
  const out = await new Deno.Command(WASMTK, { args, cwd, stdout: "piped", stderr: "piped" })
    .output();
  const dec = new TextDecoder();
  return { code: out.code, text: dec.decode(out.stdout) + dec.decode(out.stderr) };
}

const H = "type i32 = number;\ntype f64 = number;\n";

// [name, source, expected fragment(s)]. The source is ONE fault, so the fragments are its cause and,
// since the D6 report (2026-10-13), where it is: `--> <file>:<line>:<col>` in the file as written
// (the header H is lines 1–2, so the body starts on line 3).
const at = (name: string, line: number, col = 1) =>
  `--> r_${name.replace(/\W+/g, "_")}.ts:${line}:${col}`;
const REFUSED: [string, string, string | string[]][] = [
  [
    "untyped number",
    `let a = 100000;\nconsole.log(a);`,
    ["error[untyped-declaration]: Declaration needs a type: 'let a = 100000;'", at("untyped number", 3)],
  ],
  [
    "untyped string",
    `const s = "hi";\nconsole.log(s);`,
    ["Declaration needs a type: 'const s = \"hi\";'", at("untyped string", 3)],
  ],
  [
    // ld109 (2026-10-23): a comment quoting the failing code came first and took the location
    "located past a comment",
    `// let a = 100000; is refused below\n/* and here: let a = 100000; */\nlet a = 100000;\nconsole.log(a);`,
    ["Declaration needs a type: 'let a = 100000;'", at("located past a comment", 5)],
  ],
  [
    "untyped new",
    `const m = new Map<string, i32>();\nconsole.log(m.size);`,
    ["Declaration needs a type", at("untyped new", 3)],
  ],
  [
    "untyped call result",
    `function f(): i32 { return 1; }\nconst v = f();\nconsole.log(v);`,
    ["Declaration needs a type: 'const v = f();'", at("untyped call result", 4)],
  ],
  [
    "untyped array pattern",
    `const p: [i32, i32] = [1, 2];\nconst [x, y] = p;\nconsole.log(x + y);`,
    "Type the pattern, e.g. 'const [a, b]: [i32, i32] = …'",
  ],
  [
    "untyped object pattern",
    `interface P { x: i32; y: i32; }\nconst p: P = { x: 1, y: 2 };\nconst { x, y } = p;\nconsole.log(x + y);`,
    "Type the pattern, e.g. 'const { x, y }: Point = …'",
  ],
  [
    "arrow without return type",
    `const k: i32 = 3;\nconst f = (x: i32) => x + k;\nconsole.log(f(1));`,
    ["Declaration needs a type", at("arrow without return type", 4)],
  ],
  [
    "arrow with untyped param",
    `const g = (x): i32 => x;\nconsole.log(g(1));`,
    ["Declaration needs a type", at("arrow with untyped param", 3)],
  ],
  [
    "counter starts fractional",
    `for (let i = 0.5; i < 3; i++) {\n  console.log(i);\n}`,
    "for-loop counter 'i' must stay an integer: it starts as '0.5'",
  ],
  [
    "counter divided",
    `for (let i = 64; i > 1; i /= 2) {\n  console.log(i);\n}`,
    "for-loop counter 'i' must stay an integer: 'i /= …'",
  ],
  [
    "counter given a fraction",
    `for (let i = 0; i < 3; i++) {\n  i += 0.5;\n  console.log(i);\n}`,
    "for-loop counter 'i' must stay an integer: it is assigned '0.5'",
  ],
  [
    "one-line loop, fractional start",
    `for (let i = 0.5; i < 3; i++) console.log(i);`,
    "it starts as '0.5'",
  ],
  ["one-line loop, divided", `for (let i = 64; i > 1; i /= 2) console.log(i);`, "'i /= …'"],
  // A plain `/` between integers (owner decision 2026-10-09; closes sw36 / sw37): TypeScript
  // gives a fraction, wasm truncates, so the program must say which with wasMath. Both emitters.
  ["i32 division, declared f64 (sw36)", `const m: i32 = 5;\nconst n: i32 = 3;\nconst r: f64 = m / n;\nconsole.log(r);`, "integer division 'm / n'"],
  ["i32 division inside Math (sw37)", `const a: i32 = -7;\nconst b: i32 = 2;\nconst f: f64 = Math.floor(a / b);\nconsole.log(f);`, "integer division 'a / b'"],
  ["i32 division in a function", `function q(a: i32, b: i32): i32 { return a / b; }\nconsole.log(q(7, 2));`, "integer division 'a / b'"],
  ["i32 division, the | 0 idiom", `const a: i32 = 7;\nconst b: i32 = 2;\nconst q: i32 = (a / b) | 0;\nconsole.log(q);`, "integer division 'a / b'"],
  ["i32 /= ", `let a: i32 = 7;\na /= 2;\nconsole.log(a);`, "integer division 'a /= 2'"],
  ["i32 division in console.log", `const a: i32 = 7;\nconst b: i32 = 2;\nconsole.log(a / b);`, "integer division 'a / b'"],
  // D3 (owner, 2026-10-13): a float STORED into a declared integer, and `as i32` on a float.
  ["float into an i32 declaration", `const f: f64 = 3.7;\nconst x: i32 = f;\nconsole.log(x);`, "float stored as an integer in 'const x: i32 = f;' (stored into 'x')"],
  ["Math result into an i32", `const y: f64 = 3.7;\nconst q: i32 = Math.floor(y);\nconsole.log(q);`, "float stored as an integer in 'const q: i32 = Math.floor(y);'"],
  ["float assigned to an i32", `let n: i32 = 0;\nconst f: f64 = 2.5;\nn = f;\nconsole.log(n);`, "float stored as an integer in 'n = f;'"],
  ["float returned as an i32", `function g(f: f64): i32 { return f; }\nconsole.log(g(2.5));`, "returned from an integer function"],
  ["float passed to an i32 parameter", `function h(n: i32): i32 { return n + 1; }\nconst f: f64 = 2.5;\nconsole.log(h(f));`, "passed to 'h'"],
  ["float into an i32 field", `interface P { n: i32; }\nconst f: f64 = 2.5;\nconst p: P = { n: 0 };\np.n = f;\nconsole.log(p.n);`, "float stored as an integer in 'p.n = f;'"],
  ["f as i32", `const f: f64 = 2.5;\nconst x: i32 = f as i32;\nconsole.log(x);`, "'as i32' on a float"],
  // A float LITERAL in an integer slot (found with sw69): `(i32.const 1.5)` failed in the
  // assembler, with no location; D3 reports it. Arrays and fields were silently truncated before.
  ["float literal into an i32", `const z: i32 = 1.5;\nconsole.log(z);`, ["the literal 1.5 as i32", at("float literal into an i32", 3, 16)]],
  ["float literal in an i32[]", `const a: i32[] = [1, 2.5];\nconsole.log(a[1]);`, "float stored as an integer in 'const a: i32[] = [1, 2.5];' (the literal 2.5 as i32)"],
  ["float literal into an i32 field", `interface Q { n: i32; }\nconst q: Q = { n: 1.5 };\nconsole.log(q.n);`, "float stored as an integer in 'const q: Q = { n: 1.5 };' (the literal 1.5 as i32)"],
  [
    "float passed to a wasMath i32 function",
    `import { f64, i32 } from "${new URL("../src/wasmath.ts", import.meta.url).href}";\nconst f: f64 = 2.5;\nconst x: i32 = i32.add(f, 1);\nconsole.log(x);`,
    "passed to 'i32.add'",
  ],
  // `>>>` on a bigint is a TypeError in JavaScript (wasMath L4, 2026-10-13).
  ["bigint >>>", `const a: bigint = 7n;\nconst s: bigint = a >>> 1n;\nconsole.log(s);`, "'>>>' on a bigint is a TypeError"],
  // A string index is an integer (owner, 2026-10-15): JavaScript gives undefined for s[1.5],
  // wasm would truncate. Refused in console.log, a declaration, a concat and a comparison.
  ["float string index in console.log", `const s: string = "hello";\nconst p: f64 = 1.5;\nconsole.log(s[p]);`, ["error[float-index]: float string index 's[p]'", "f64.toI32(p)"]],
  ["float string index in a declaration", `const s: string = "hello";\nconst p: f64 = 1;\nconst c: string = s[p];\nconsole.log(c);`, "float string index 's[p]'"],
  ["float string index in a concat", `const s: string = "hello";\nconst p: f64 = 1;\nconst c: string = "x" + s[p];\nconsole.log(c);`, "float string index 's[p]'"],
  ["float string index in a comparison", `const s: string = "hello";\nconst p: f64 = 1;\nconst ok: boolean = s[p] === "e";\nconsole.log(ok);`, "float string index 's[p]'"],
  [
    "line number counts a block comment",
    `/**\n * four\n * lines\n */\nconst ok: i32 = 1;\nlet n = 5; // the fault\nconsole.log(ok + n);`,
    ["Declaration needs a type: 'let n = 5;'", at("line number counts a block comment", 8)],
  ],
  [
    // the off-by-one D6 fixed: an import the bundler drops must not shift the line
    "line number after a wasMath import",
    `import { i32 } from "${new URL("../src/wasmath.ts", import.meta.url).href}";\nconst ok: i32 = 1;\nlet n = 5;\nconsole.log(ok + n);`,
    ["Declaration needs a type: 'let n = 5;'", at("line number after a wasMath import", 3)],
  ],
  [
    "the report: notes and a column inside the line",
    `function avg(t: i32, c: i32): i32 {\n  return (t / c) | 0;\n}\nconsole.log(avg(7, 2));`,
    [
      "error[int-division]: integer division 't / c'",
      at("the report: notes and a column inside the line", 4, 11),
      "= TypeScript: divides as floats",
      "= help: say which with wasMath: i32.div(t, c)",
      "1 error in r_the_report_notes_and_a_column_inside_the_line.ts; no .wasm was written.",
    ],
  ],
];

// [name, source, expected stdout]. Each is compiled and RUN, so acceptance is also correctness.
const ACCEPTED: [string, string, string][] = [
  [
    // the float string index said as a conversion, and out of range undefined (2026-10-15)
    "string index from f64.toI32, out of range undefined",
    `import { f64 } from "${new URL("../src/wasmath.ts", import.meta.url).href}";
const s: string = "hello";
const p: f64 = 1.5;
const far: i32 = 9;
console.log(s[f64.toI32(p)], s[far], s[far] === undefined);`,
    "e undefined true",
  ],
  [
    "reassignment, loops, typed pattern, typed function values",
    `let total: number = 0;
total = total + 2.5;
const nums: number[] = [1, 2, 3];
for (const v of nums) { total = total + v; }
for (let i = 0; i < 3; i++) { total = total + i; }
const pair: [i32, i32] = [4, 5];
const [a, b]: [i32, i32] = pair;
const add = (x: i32, y: i32): i32 => x + y;
const twice = function (n: number): number { return n * 2; };
total = total + add(1, 2) + twice(1.5);
console.log(total, a + b);`,
    "17.5 9",
  ],
  [
    "Promise<T> on a promise-holding variable",
    `async function c(n: i32): Promise<i32> { return n * 2; }
async function main(): Promise<void> {
  const p: Promise<i32> = c(3);
  const v: i32 = await p;
  console.log(v);
}
main();`,
    "6",
  ],
  [
    "union alias from a member",
    `interface AddOp { type: "add"; value: i32; }
interface MulOp { type: "mul"; value: i32; }
type MathOp = AddOp | MulOp;
interface Ok { ok: true; operation: MathOp; }
function f(res: Ok): i32 {
  const op: MathOp = res.operation;
  if (op.type === "add") return op.value + 1;
  return op.value * 2;
}
const r: Ok = { ok: true, operation: { type: "mul", value: 4 } };
console.log(f(r));`,
    "8",
  ],
  [
    "T | null tuple alias, then a typed pattern",
    `type NT = [i32 | null, f64];
function g(flag: boolean): NT | null { if (!flag) return null; return [7, 0.5]; }
const v: NT | null = g(true);
if (v !== null) {
  const [a, b]: NT = v;
  console.log(a, b);
}`,
    "7 0.5",
  ],
  [
    "division that agrees: f64, bigint, and wasMath's i32.div / f64.div",
    `import { f64, i32 } from "${new URL("../src/wasmath.ts", import.meta.url).href}";
type i64 = bigint;
const x: f64 = 7;
const y: f64 = 2;
const p: i64 = 7n;
const s: i64 = 2n;
const a: i32 = 7;
const b: i32 = -2;
console.log(x / y, p / s, i32.div(a, b), f64.div(a, b));`,
    "3.5 3n -3 -3.5",
  ],
  [
    "D3's accepted forms: an index or position from a number, wasMath's conversions, x | 0",
    `import { f64, i32 } from "${new URL("../src/wasmath.ts", import.meta.url).href}";
const arr: i32[] = [10, 20, 30];
const s: string = "hello";
let total: i32 = 0;
for (let i: number = 0; i < 3; i++) total = total + arr[i];
const pos: number = 1;
const y: f64 = 3.7;
const big: f64 = 1e10;
const a: i32 = f64.toI32(Math.floor(y));
const b: i32 = f64.toI32Sat(big);
const c: i32 = f64.toI32Wrap(big);
const d: i32 = big | 0;
// a STRING index is an integer since 2026-10-15 (the owner): said with wasMath, not converted
const ch: string = s[f64.toI32(pos)];
console.log(total, ch, s.indexOf("l", pos), a, b, c, d);`,
    "60 e 2 3 2147483647 1410065408 1410065408",
  ],
];

const dir = await Deno.makeTempDir({ prefix: "wasmtk_typed_decl_" });
try {
  console.log("\n  refused, for the stated reason:");
  for (const [name, body, frag] of REFUSED) {
    const file = `r_${name.replace(/\W+/g, "_")}.ts`;
    await Deno.writeTextFile(join(dir, file), (body.startsWith("import") ? "" : H) + body + "\n");
    const r = await run(["wasic", file], dir);
    ok(
      `${name}`,
      r.code !== 0 && [frag].flat().every((f) => r.text.includes(f)),
      `    exit ${r.code}; wanted: ${[frag].flat().join(" + ")}\n${r.text}`,
    );
  }
  console.log("\n  accepted, and correct when run:");
  for (const [name, body, want] of ACCEPTED) {
    const file = `a_${name.replace(/\W+/g, "_")}.ts`;
    // A program importing wasMath takes its types from it, not from the header.
    await Deno.writeTextFile(join(dir, file), (body.startsWith("import") ? "" : H) + body + "\n");
    const c = await run(["wasic", file], dir);
    if (c.code !== 0) {
      ok(name, false, `    compile failed:\n${c.text}`);
      continue;
    }
    const r = await run(["run", file.replace(/\.ts$/, ".wasm")], dir);
    const got = r.text.replace(/\r\n/g, "\n").trim();
    ok(name, r.code === 0 && got === want, `    exit ${r.code}; wanted "${want}", got "${got}"`);
  }
} finally {
  await Deno.remove(dir, { recursive: true });
}

console.log(`\n  typed-declaration rule: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
