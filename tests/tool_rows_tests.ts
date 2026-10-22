/**
 * tool_rows_tests.ts — the silent TOOL rows of audit round 2 (2026-10-19).
 *
 *   sw111  a function exported under two names kept only the last name (bundle and wasic merge).
 *   sw115  `wasmtk run x.wasm one two` dropped the arguments; WASI `args_sizes_get` gave 0.
 *   sw116  `mod lib.wasm f abc` turned `abc` into 0 (also the `run` library-call branch).
 *   sw117  Go `modc -o out/x.wasm` (relative) wrote beside the SOURCE, success at the path given.
 *   sw118  witgen listed `fooBar` and `foo_bar` both as `foo-bar`; `package local:2048;` unchecked.
 *   ld82   a bindgen binding never linked a camelCase host import (`display_showValue`).
 *   ld83   the Deno binding could not load a relative path; a typed-array view lost its offset.
 *   ld87   `mod` / `run` could not call an i64 function: every argument was a Number.
 *   ld89   a failed `dync` left `<name>.__dync.ts` and printed the error twice (so did `wasic`).
 *   ld90   a bad flag value became its default; `-o` on run / info / mod was ignored; a command
 *          without its target printed help and exited 0. (Loud rows, 2026-10-22.)
 *
 * Runs the INSTALLED wasmtk in a temp directory. sw117 needs TinyGo and is skipped (and said so)
 * without it. Usage: deno run -A tests/tool_rows_tests.ts
 */
import { join } from "jsr:@std/path";

const dec = new TextDecoder();
let passed = 0, failed = 0, skipped = 0;

async function wasmtk(args: string[], cwd: string): Promise<{ code: number; out: string }> {
  const o = await new Deno.Command("wasmtk", { args, cwd, stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, out: (dec.decode(o.stdout) + dec.decode(o.stderr)).replace(/\r\n/g, "\n") };
}

function check(name: string, ok: boolean, detail: string): void {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}: ${detail}`);
  }
}

/** The last line of output that is not a ✅/ℹ️/↪ progress line. */
function lastLine(out: string): string {
  return out.trim().split("\n").filter((l) => !/^\s*(✅|ℹ️|↪|WAT:|WIT:)/.test(l)).pop()?.trim() ?? "";
}

async function expectOut(name: string, args: string[], dir: string, want: string): Promise<void> {
  const r = await wasmtk(args, dir);
  const got = lastLine(r.out);
  check(name, r.code === 0 && got === want, `exit ${r.code}, got "${got}", want "${want}"`);
}

async function expectExit(name: string, args: string[], dir: string, want: number, re?: RegExp): Promise<void> {
  const r = await wasmtk(args, dir);
  const ok = r.code === want && (!re || re.test(r.out));
  check(name, ok, `exit ${r.code} (want ${want})\n      ${r.out.trim().split("\n").slice(-2).join("\n      ")}`);
}

/** A build step. A failure is COUNTED and the run goes on, so every row is reported. */
async function step(args: string[], dir: string): Promise<void> {
  const r = await wasmtk(args, dir);
  if (r.code !== 0) {
    check(`wasmtk ${args.join(" ")}`, false, `exit ${r.code}\n      ${r.out.trim().split("\n").slice(-2).join("\n      ")}`);
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    return (await Deno.stat(p)).isFile;
  } catch {
    return false;
  }
}

const WASI = `"wasi_snapshot_preview1"`;
const FILES: Record<string, string> = {
  // sw111: one function, two export names
  "dual.wat": `(module (memory 1) (func $f (param $x i32) (result i32) local.get $x i32.const 2 i32.mul)\n` +
    `  (export "twice" (func $f)) (export "double" (func $f)) (export "memory" (memory 0)))\n`,
  "usedual.ts": `type i32 = number;\nimport { twice, double } from "./dual.wasm";\n` +
    `const a: i32 = twice(3);\nconst b: i32 = double(4);\nconsole.log(a, b);\n`,
  // sw115: exit with argc, and with argv[1]'s first byte
  "argc.wat": `(module (import ${WASI} "args_sizes_get" (func $sz (param i32 i32) (result i32)))\n` +
    `  (import ${WASI} "proc_exit" (func $exit (param i32))) (memory 1) (export "memory" (memory 0))\n` +
    `  (func $start (drop (call $sz (i32.const 0) (i32.const 4))) (call $exit (i32.load (i32.const 0))))\n` +
    `  (export "_start" (func $start)))\n`,
  "argv1.wat": `(module (import ${WASI} "args_get" (func $get (param i32 i32) (result i32)))\n` +
    `  (import ${WASI} "proc_exit" (func $exit (param i32))) (memory 1) (export "memory" (memory 0))\n` +
    `  (func $start (drop (call $get (i32.const 16) (i32.const 64)))\n` +
    `    (call $exit (i32.load8_u (i32.load (i32.const 20)))))\n  (export "_start" (func $start)))\n`,
  // sw116: a library whose export takes a number
  "inc.wat": `(module (func $inc (param $x i32) (result i32) local.get $x i32.const 1 i32.add)\n` +
    `  (export "inc" (func $inc)))\n`,
  // sw118: two exports that kebab to one WIT name, in a file whose name is not a WIT identifier
  "2048.wat": `(module (func $a (result i32) i32.const 1) (func $b (result i32) i32.const 2)\n` +
    `  (export "fooBar" (func $a)) (export "foo_bar" (func $b)))\n`,
  // ld87: an i64 library function
  "i64.wat": `(module (func $add64 (param $a i64) (param $b i64) (result i64) local.get $a local.get $b i64.add)\n` +
    `  (export "add64" (func $add64)))\n`,
  // ld82 / ld83: a library calling a camelCase host method, driven through its Deno binding by a
  // relative path and by a typed-array view with an offset
  "hostlib.ts": `type i32 = number;\ndeclare interface Display {\n  showValue(value: i32): void;\n}\n` +
    `declare const display: Display;\nexport function go(n: i32): void {\n  display.showValue(n * 2);\n}\n`,
  "drive.ts": `import { loadModule } from "./hostlib.bindings.ts";\nconst got: number[] = [];\n` +
    `const host = { env: { displayShowValue: (v: number) => { got.push(v); } } };\n` +
    `const m1 = await loadModule("hostlib.wasm", host);\nm1.go(1);\n` +
    `const bytes = await Deno.readFile("hostlib.wasm");\nconst padded = new Uint8Array(bytes.length + 16);\n` +
    `padded.set(bytes, 16);\nconst m2 = await loadModule(padded.subarray(16), host);\nm2.go(2);\n` +
    `console.log(got.join(" "));\n`,
  // ld89: a dync program (its compile is made to fail by an output path that is a directory)
  "prog.js": `console.log("hello", 1 + 2);\n`,
};

const GO_LIB = `package main\n\n//go:wasmexport add\nfunc add(a, b int32) int32 {\n\treturn a + b\n}\n\n` +
  `func main() {}\n`;

const dir = await Deno.makeTempDir({ prefix: "wasmtk_toolrows_" });
try {
  for (const [f, body] of Object.entries(FILES)) await Deno.writeTextFile(join(dir, f), body);
  for (const w of ["dual", "argc", "argv1", "inc", "2048", "i64"]) await step(["convert", `${w}.wat`], dir);

  console.log("── a function exported under two names keeps both (sw111) ──");
  await step(["wasmbundle", "dual.wasm", "-o", "db.wasm"], dir);
  await expectOut("wasmbundle: the first name", ["mod", "db.wasm", "twice", "3"], dir, "6");
  await expectOut("wasmbundle: the second name", ["mod", "db.wasm", "double", "4"], dir, "8");
  await step(["wasic", "usedual.ts", "-o", "usedual.wasm"], dir);
  await expectOut("wasic merge: both names import", ["run", "usedual.wasm"], dir, "6 8");

  console.log("── `run` passes the arguments to the program (sw115) ──");
  await expectExit("argc counts the program name and two arguments", ["run", "argc.wasm", "one", "two"], dir, 3);
  await expectExit("argv[1] is the first argument ('o' = 111)", ["run", "argv1.wasm", "one", "two"], dir, 111);

  console.log("── a non-numeric argument is refused (sw116) ──");
  await expectOut("mod: a number still works", ["mod", "inc.wasm", "inc", "41"], dir, "42");
  await expectExit("mod: 'abc' is refused", ["mod", "inc.wasm", "inc", "abc"], dir, 1, /'abc' is not a number/);
  await expectOut("run (library call): a number still works", ["run", "inc.wasm", "inc", "41"], dir, "42");
  await expectExit("run (library call): 'abc' is refused", ["run", "inc.wasm", "inc", "abc"], dir, 1, /'abc' is not a number/);

  console.log("── witgen writes a valid WIT (sw118) ──");
  const wit = await Deno.readTextFile(join(dir, "2048.wit")).catch(() => "(no 2048.wit)");
  check("the package name is a WIT identifier", /^package local:m2048;$/m.test(wit), wit);
  check("`foo-bar` is exported once", (wit.match(/^ {2}export foo-bar:/gm) ?? []).length === 1, wit);
  check("the colliding export is listed as skipped", /^\/\/ skipped export foo_bar: its WIT name 'foo-bar'/m.test(wit), wit);

  console.log("── a bad flag value, a stray -o, a missing target exit 1 (ld90) ──");
  for (const [flag, cmd] of [
    ["--runtime=nodee", "bindgen"],
    ["--any-policy=loud", "jstyper"],
    ["--on-conflict=merge", "wasmbundle"],
    ["--go-runtime=gccgo", "run"],
    ["--go-target=wasi", "modc"],
  ]) {
    await expectExit(`${flag} is refused`, [cmd, "inc.wasm", flag], dir, 1, /is not a value it takes/);
  }
  await expectExit("--go-runtime is case-insensitive", ["mod", "inc.wasm", "inc", "1", "--go-runtime=STD"], dir, 0);
  for (const cmd of ["info", "mod"]) {
    await expectExit(`${cmd} -o is refused`, [cmd, "inc.wasm", "-o", "x.txt"], dir, 1, /writes no file/);
  }
  await expectExit("run x.wasm -o is refused", ["run", "argc.wasm", "-o", "x.txt"], dir, 1, /writes no file/);
  await expectExit("a command without its target exits 1", ["wasic"], dir, 1, /expected a target/);
  await expectExit("--help exits 0", ["--help"], dir, 0);

  console.log("── an i64 function takes BigInt arguments (ld87) ──");
  await expectOut("mod: i64 add, beyond 2^53", ["mod", "i64.wasm", "add64", "9007199254740993", "1"], dir, "9007199254740994");
  await expectOut("run (library call): i64 add", ["run", "i64.wasm", "add64", "2", "3"], dir, "5");
  await expectExit("mod: a fraction for an i64 is refused", ["mod", "i64.wasm", "add64", "2.5", "1"], dir, 1, /is not an integer/);

  console.log("── a bindgen binding links a camelCase host import and loads a path or a view (ld82, ld83) ──");
  await step(["modc", "hostlib.ts"], dir);
  await step(["bindgen", "hostlib.wit"], dir);
  {
    const o = await new Deno.Command("deno", { args: ["run", "-A", "drive.ts"], cwd: dir, stdout: "piped", stderr: "piped" })
      .output();
    const out = (dec.decode(o.stdout) + dec.decode(o.stderr)).trim();
    check("the host method is called, from a path and from an offset view", o.code === 0 && out === "2 4", out);
  }

  console.log("── a failed dync removes its scaffold and reports once (ld89) ──");
  await Deno.mkdir(join(dir, "adir"));
  {
    const r = await wasmtk(["dync", "prog.js", "-o", "adir"], dir);
    check("dync exits 1", r.code === 1, `exit ${r.code}`);
    check("no prog.__dync.ts is left", !(await exists(join(dir, "prog.__dync.ts"))), "left behind");
    const errs = r.out.split("\n").filter((l) => l.startsWith("❌"));
    check("the error is printed once", errs.length === 1, errs.join(" | "));
  }

  console.log("── Go: a relative -o is relative to the working directory (sw117) ──");
  const hasTinyGo = await new Deno.Command("tinygo", { args: ["version"], stdout: "null", stderr: "null" })
    .output().then((o) => o.success, () => false);
  if (!hasTinyGo) {
    skipped++;
    console.log("  - skipped: TinyGo is not installed");
  } else {
    await Deno.mkdir(join(dir, "src"));
    await Deno.mkdir(join(dir, "out"));
    await Deno.writeTextFile(join(dir, "src", "golib.go"), GO_LIB);
    const r = await wasmtk(["modc", "src/golib.go", "-o", "out/golib.wasm"], dir);
    check("modc exits 0", r.code === 0, `exit ${r.code}\n      ${r.out.trim().split("\n").slice(-2).join("\n      ")}`);
    check("the module is at out/golib.wasm", await exists(join(dir, "out", "golib.wasm")), "absent");
    check("nothing was written under src/out/", !(await exists(join(dir, "src", "out", "golib.wasm"))), "written there");
    await expectOut("the module works", ["mod", "out/golib.wasm", "add", "2", "3"], dir, "5");
  }
} finally {
  await Deno.remove(dir, { recursive: true });
}

console.log(`\n  tool rows: ${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}`);
if (failed > 0) Deno.exit(1);
