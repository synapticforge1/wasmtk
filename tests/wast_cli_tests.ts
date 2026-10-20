/**
 * wast_cli_tests.ts — `wasmtk wast`'s exit code (the owner's rule 3 of 2026-10-19, ld88).
 *
 *   A run exits 1 when a module does not build and its file is not on the known-unbuilt list
 *   (src/wast_known_unbuilt.ts), or when it finds no `.wast` file. Both exited 0 with ✅.
 *   A clean file exits 0; a corpus file within its known-unbuilt count exits 0.
 *
 * Runs the INSTALLED wasmtk. Usage: deno run -A tests/wast_cli_tests.ts
 */
import { join } from "jsr:@std/path";

const dec = new TextDecoder();
let passed = 0, failed = 0;

async function wast(target: string): Promise<{ code: number; out: string }> {
  const o = await new Deno.Command("wasmtk", { args: ["wast", target], stdout: "piped", stderr: "piped" })
    .output();
  return { code: o.code, out: dec.decode(o.stdout) + dec.decode(o.stderr) };
}

async function expect(name: string, target: string, code: number, re?: RegExp): Promise<void> {
  const r = await wast(target);
  if (r.code === code && (!re || re.test(r.out))) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}: exit ${r.code} (want ${code})\n      ${r.out.trim().split("\n").slice(-2).join("\n      ")}`);
  }
}

const corpus = new URL("./module/wasm_wast/testsuite-main/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const dir = await Deno.makeTempDir({ prefix: "wasmtk_wastcli_" });
try {
  const empty = join(dir, "empty");
  await Deno.mkdir(empty);
  // a memory with a custom page size: V8 does not implement the proposal, so it does not build
  const mine = join(dir, "mine.wast");
  await Deno.writeTextFile(mine, `(module (memory 1 (pagesize 1)))\n`);
  const good = join(dir, "good.wast");
  await Deno.writeTextFile(
    good,
    `(module (func (export "two") (result i32) i32.const 2))\n(assert_return (invoke "two") (i32.const 2))\n`,
  );

  console.log("── `wasmtk wast` exit codes (ld88) ──");
  await expect("a clean file exits 0", good, 0, /✅ wast: 1 file/);
  await expect("an unbuilt module not on the known list exits 1", mine, 1, /not on the\s+known-unbuilt list/);
  await expect("a directory with no .wast file exits 1", empty, 1, /no \.wast file found/);
  await expect("a known-unbuilt corpus file within its count exits 0", join(corpus, "table.wast"), 0);
} finally {
  await Deno.remove(dir, { recursive: true });
}

console.log(`\n  wast CLI: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
