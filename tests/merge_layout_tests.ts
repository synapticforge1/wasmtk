/**
 * merge_layout_tests.ts — merged and bundled modules keep their own data (2026-10-19).
 *
 *   sw109  `wasmbundle` seated every module's data at the same address (its data-extent regex
 *          missed binaryang 1.12's `(offset (i32.const N))`), so the second library's bytes were
 *          read at the first's address.
 *   sw110  a wasic merge seated the heap INSIDE a merged library's data (it advanced by global
 *          0's initial value, else 260), so the program's pushes overwrote the library's bytes.
 *   ld86   the merge scanners counted `(` / `)` inside data strings ("expected EOF, got )").
 *   ld81   `wasmbundle` made a 1-page bundle of a library whose cursor sat at 131072 (2026-10-22).
 *   ld84   the bundler handled neither `export class` nor `export { name }` (2026-10-22).
 *   ld85   two imports with one basename collided (`duplicate func $util_add`, 2026-10-22).
 *
 * Runs the INSTALLED wasmtk in a temp directory. Usage: deno run -A tests/merge_layout_tests.ts
 */
import { join } from "jsr:@std/path";

const dec = new TextDecoder();
let passed = 0, failed = 0;

async function wasmtk(args: string[], cwd: string): Promise<{ code: number; out: string }> {
  const o = await new Deno.Command("wasmtk", { args, cwd, stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, out: (dec.decode(o.stdout) + dec.decode(o.stderr)).replace(/\r\n/g, "\n") };
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKL"; // [40] = 'O' (79)
const libWat = (fn: string, text: string) =>
  `(module (memory 1) (func $${fn} (param $i i32) (result i32) local.get $i i32.const 300 i32.add i32.load8_u)\n` +
  `  (export "${fn}" (func $${fn})) (export "memory" (memory 0)) (data (i32.const 300) "${text}"))\n`;
const FILES: Record<string, string> = {
  "dlib.wat": libWat("getb", ALPHA),
  "elib.wat": libWat("getc", "zyxwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcbazyxwvutsrqpon"),
  "plib2.wat": `(module (memory 1) (func $get (result i32) i32.const 1024 i32.load8_u offset=1)\n` +
    `  (export "get" (func $get)) (export "memory" (memory 0)) (data (i32.const 1024) "x(y"))\n`,
  "used.ts": `type i32 = number;\nimport { getb } from "./dlib.wasm";\nconst before: i32 = getb(40);\n` +
    `const arr: i32[] = [];\nfor (let i: i32 = 0; i < 200; i++) {\n  arr.push(7);\n}\n` +
    `const after: i32 = getb(40);\nconsole.log(before, after, arr.length);\n`,
  "usep2.ts": `type i32 = number;\nimport { get } from "./plib2.wasm";\nconst g: i32 = get();\nconsole.log(g);\n`,
  // sw112: a dependency's PRIVATE top-level name equal to the entry's
  "dep.ts": `type i32 = number;\nconst scale: i32 = 3;\nexport function helper(n: i32): i32 {\n  return n * scale;\n}\n`,
  "entry2.ts": `type i32 = number;\nimport { helper } from "./dep.ts";\nconst scale: i32 = 100;\nconsole.log(helper(2), scale);\n`,
  // ...and no refusal when the names differ (`scale` private to the dependency only)
  "entry3.ts": `type i32 = number;\nimport { helper } from "./dep.ts";\nconst factor: i32 = 100;\nconsole.log(helper(2), factor);\n`,
  // ld81: a library whose mutable cursor sits at 131072, in the 3 pages it declares
  "stk.wat": `(module (memory 3) (global $sp (mut i32) (i32.const 131072))\n` +
    `  (func $put (param $v i32) (result i32) (i32.store (global.get $sp) (local.get $v)) (i32.load (global.get $sp)))\n` +
    `  (export "memory" (memory 0)) (export "put" (func $put)))\n`,
  // ld85: two imports with one basename
  "a/util.ts": `type i32 = number;\nexport function add(a: i32, b: i32): i32 {\n  return a + b;\n}\n`,
  "b/util.ts": `type i32 = number;\nexport function add(a: i32, b: i32): i32 {\n  return a * 10 + b;\n}\n`,
  "twoutil.ts": `type i32 = number;\nimport { add } from "./a/util.ts";\nimport { add as addB } from "./b/util.ts";\n` +
    `const x: i32 = add(2, 3);\nconst y: i32 = addB(2, 3);\nconsole.log(x, y);\n`,
  // ld84: `export class` and an export list (with an alias, and a class in it)
  "shapes.ts": `type i32 = number;\nexport class Box {\n  w: i32;\n  constructor(w: i32) {\n    this.w = w;\n  }\n` +
    `  area(): i32 {\n    return this.w * this.w;\n  }\n}\nclass Pt {\n  x: i32;\n  constructor(x: i32) {\n` +
    `    this.x = x;\n  }\n}\nfunction triple(n: i32): i32 {\n  return n * 3;\n}\nconst LIMIT: i32 = 7;\n` +
    `export { triple, LIMIT as MAX, Pt };\n`,
  "useshapes.ts": `type i32 = number;\nimport { Box, triple, MAX, Pt } from "./shapes.ts";\nconst b: Box = new Box(4);\n` +
    `const a: i32 = b.area();\nconst p: Pt = new Pt(6);\nconst px: i32 = p.x;\nconsole.log(a, triple(5), MAX, px);\n`,
};

/** One step's output must equal `want` (trimmed) with exit 0. */
async function expectOut(name: string, args: string[], dir: string, want: string): Promise<void> {
  const r = await wasmtk(args, dir);
  const got = r.out.trim().split("\n").filter((l) => !/^\s*(✅|ℹ️|\s*WAT:|\s*WIT:)/.test(l)).pop()?.trim() ?? "";
  if (r.code === 0 && got === want) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}: exit ${r.code}, got "${got}", want "${want}"\n      ${r.out.trim().split("\n").slice(-3).join("\n      ")}`);
  }
}

async function step(args: string[], dir: string): Promise<void> {
  const r = await wasmtk(args, dir);
  if (r.code !== 0) throw new Error(`wasmtk ${args.join(" ")} failed:\n${r.out}`);
}

const dir = await Deno.makeTempDir({ prefix: "wasmtk_layout_" });
try {
  for (const [f, body] of Object.entries(FILES)) {
    if (f.includes("/")) await Deno.mkdir(join(dir, f.slice(0, f.lastIndexOf("/"))), { recursive: true });
    await Deno.writeTextFile(join(dir, f), body);
  }
  for (const w of ["dlib", "elib", "plib2", "stk"]) await step(["convert", `${w}.wat`], dir);

  console.log("── merged and bundled modules keep their own data (sw109, sw110, ld86) ──");
  await step(["wasmbundle", "dlib.wasm", "elib.wasm", "-o", "de.wasm"], dir);
  await expectOut("wasmbundle: the first library reads its own data (sw109)", ["mod", "de.wasm", "getb", "0"], dir, "65");
  await expectOut("wasmbundle: the second library reads its own data (sw109)", ["mod", "de.wasm", "getc", "0"], dir, "122");
  await step(["wasic", "used.ts", "-o", "used.wasm"], dir);
  await expectOut("wasic merge: the heap is above the library's data (sw110)", ["run", "used.wasm"], dir, "79 79 200");
  await step(["wasic", "usep2.ts", "-o", "usep2.wasm"], dir);
  await expectOut("wasic merge: a `(` inside a data string (ld86)", ["run", "usep2.wasm"], dir, "40");
  await step(["wasmbundle", "plib2.wasm", "-o", "p2b.wasm"], dir);
  await expectOut("wasmbundle: a `(` inside a data string (ld86)", ["mod", "p2b.wasm", "get"], dir, "40");
  await step(["wasmbundle", "stk.wasm", "-o", "stkb.wasm"], dir);
  await expectOut("wasmbundle: a module's memory and its cursor at 131072 (ld81)", ["mod", "stkb.wasm", "put", "7"], dir, "7");

  // sw112: the same top-level value name in two files is refused (it was silently ONE name)
  const r = await wasmtk(["wasic", "entry2.ts", "-o", "entry2.wasm"], dir);
  if (r.code === 1 && /top-level name 'scale' is declared in both/.test(r.out)) {
    passed++;
    console.log("  ✓ bundler: a private top-level name equal to the entry's is refused (sw112)");
  } else {
    failed++;
    console.log(`  ✗ bundler: sw112 not refused: exit ${r.code}\n      ${r.out.trim().split("\n").slice(-2).join("\n      ")}`);
  }
  await step(["wasic", "entry3.ts", "-o", "entry3.wasm"], dir);
  await expectOut("bundler: a private name of its own still compiles (sw112)", ["run", "entry3.wasm"], dir, "6 100");

  // ld85: `a/util.ts` and `b/util.ts` each keep their `add` (both were `util_add`: refused)
  await step(["wasic", "twoutil.ts", "-o", "twoutil.wasm"], dir);
  await expectOut("bundler: two imports with one basename (ld85)", ["run", "twoutil.wasm"], dir, "5 23");
  // ld84: `export class`, and `export { a, b as c, Class }` without `from`
  await step(["wasic", "useshapes.ts", "-o", "useshapes.wasm"], dir);
  await expectOut("bundler: export class and an export list (ld84)", ["run", "useshapes.wasm"], dir, "16 15 7 6");
} finally {
  await Deno.remove(dir, { recursive: true });
}

console.log(`\n  merge layout: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
