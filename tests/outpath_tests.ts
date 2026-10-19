/**
 * outpath_tests.ts — no command may write over its own input (sw113, sw114; 2026-10-19).
 *
 * Every default output path was an extension `replace`; when the input's extension did not match
 * (`lib.bin`, `X.WASM`, `entry.mts`, `H2.WIT`, `calc.mjs`) the "output" WAS the input, and the
 * command overwrote its source and exited 0 (`jstyper calc.mjs` left an empty file). Each case runs
 * the INSTALLED wasmtk on a fresh copy of its input and checks: the input is byte-identical
 * afterwards, and the command either wrote the expected new file or failed with exit 1.
 *
 * Usage: deno run -A tests/outpath_tests.ts   (after `deno task install`)
 */
import { join } from "jsr:@std/path";

const WASMTK = "wasmtk";
const dec = new TextDecoder();
let passed = 0, failed = 0;

async function wasmtk(args: string[], cwd: string): Promise<{ code: number; out: string }> {
  const o = await new Deno.Command(WASMTK, { args, cwd, stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, out: dec.decode(o.stdout) + dec.decode(o.stderr) };
}

async function exists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Runs `args` in a temp dir holding `files`; `input` must be unchanged; then `expect` decides. */
async function check(
  name: string,
  files: Record<string, string | Uint8Array>,
  input: string,
  args: string[],
  expect: { code: 0 | 1; writes?: string },
): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "wasmtk_outpath_" });
  try {
    for (const [f, body] of Object.entries(files)) {
      typeof body === "string" ? await Deno.writeTextFile(join(dir, f), body) : await Deno.writeFile(join(dir, f), body);
    }
    const before = await Deno.readFile(join(dir, input));
    const r = await wasmtk(args, dir);
    const after = await Deno.readFile(join(dir, input));
    const same = before.length === after.length && before.every((b, i) => b === after[i]);
    const problems: string[] = [];
    if (!same) problems.push(`the input '${input}' was changed (${before.length} → ${after.length} bytes)`);
    if (r.code !== expect.code) problems.push(`exit ${r.code}, expected ${expect.code}`);
    if (expect.writes && !(await exists(join(dir, expect.writes)))) {
      problems.push(`'${expect.writes}' was not written`);
    }
    if (problems.length === 0) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}: ${problems.join("; ")}\n${r.out.trim().split("\n").slice(0, 4).map((l) => "      " + l).join("\n")}`);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

const WAT = `(module (func $add (param i32 i32) (result i32) local.get 0 local.get 1 i32.add) (export "add" (func $add)))`;
// a real binary to rename: build it once with `convert`
const seedDir = await Deno.makeTempDir({ prefix: "wasmtk_outpath_seed_" });
await Deno.writeTextFile(join(seedDir, "lib.wat"), WAT);
if ((await wasmtk(["convert", "lib.wat"], seedDir)).code !== 0) throw new Error("seed: convert lib.wat failed");
const WASM = await Deno.readFile(join(seedDir, "lib.wasm"));
await Deno.remove(seedDir, { recursive: true });

const WIT = `package local:hostlib;\n\nworld hostlib {\n  export big: func() -> s32;\n}\n`;

console.log("── no command writes over its input (sw113, sw114) ──");
await check("convert of a .bin binary appends .wat", { "lib.bin": WASM }, "lib.bin", ["convert", "lib.bin"], { code: 0, writes: "lib.bin.wat" });
await check("convert of an upper-case .WASM", { "X.WASM": WASM }, "X.WASM", ["convert", "X.WASM"], { code: 0, writes: "X.wat" });
await check("wasm2js of a .bin binary appends .js", { "lib.bin": WASM }, "lib.bin", ["wasm2js", "lib.bin"], { code: 0, writes: "lib.bin.js" });
await check("tsbundle of an .mts entry", { "entry.mts": `console.log(1);\n` }, "entry.mts", ["tsbundle", "entry.mts"], { code: 0, writes: "entry.bundled.ts" });
await check("bindgen of an upper-case .WIT", { "H2.WIT": WIT }, "H2.WIT", ["bindgen", "H2.WIT"], { code: 0, writes: "H2.bindings.ts" });
await check("jstyper --dts-only of an .mjs", { "calc.mjs": `export function add(a, b) { return a + b; }\n` }, "calc.mjs", ["jstyper", "calc.mjs", "--dts-only"], { code: 0, writes: "calc.d.ts" });
await check("jstyper of an .mjs with no .d.ts fails, source intact", { "calc.mjs": `export function add(a, b) { return a + b; }\n` }, "calc.mjs", ["jstyper", "calc.mjs"], { code: 1 });
await check("convert -o the input is refused", { "lib.wat": WAT }, "lib.wat", ["convert", "lib.wat", "-o", "lib.wat"], { code: 1 });
await check("bindgen -o the input is refused", { "h.wit": WIT }, "h.wit", ["bindgen", "h.wit", "-o", "h.wit"], { code: 1 });
await check("wasic -o the input .ts is refused", { "p.ts": `console.log(1);\n` }, "p.ts", ["wasic", "p.ts", "-o", "p.ts"], { code: 1 });
await check("wasic -o the input .wat is refused", { "lib.wat": WAT }, "lib.wat", ["wasic", "lib.wat", "-o", "lib.wat"], { code: 1 });
// sw114: an assembler error in a .wat compile exited 0
await check("wasic of a broken .wat exits 1", { "bad.wat": `(module (func i32.bogus_op))\n` }, "bad.wat", ["wasic", "bad.wat"], { code: 1 });

console.log(`\n  outpath: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
