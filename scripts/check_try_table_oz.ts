/**
 * check_try_table_oz.ts — decides whether the binaryen `-Oz` skip for `try_table` modules in
 * `src/wasic.ts` may be lifted.
 *
 * Assembles `eh_try_table_live_local_fixture.wat` ONCE, then runs the result both **before** and
 * **after** `-Oz`. One variable, one comparison. The fixture keeps two locals live across a catch
 * edge and exits 42; `-Oz` CoalesceLocals miscompiles exactly that, so a post-`-Oz` exit that is
 * not 42 means the optimiser is still unsafe for the standard exception proposal.
 *
 * Usage:  deno run -A scripts/check_try_table_oz.ts
 *
 * The one script still RUN with Deno (2026-10-21): it imports binaryang (`wabt`, `src/binaryen.ts`)
 * through deno.json's import map, which Bun does not read. It is written on `node:` builtins, so it
 * moves to `bun` once binaryang resolves by bare name (cmem/deno-exit-plan.md P2, "dependencies by
 * bare name").
 *
 * Exit 0 = both sides 42, the skip in `src/wasic.ts` may be removed (re-run the full gate after).
 * Exit 1 = post-`-Oz` is wrong, the skip must stay.
 * Exit 2 = pre-`-Oz` is wrong — the fixture or the assembler broke; this says NOTHING about `-Oz`.
 *
 * ⚠️ Passing here is necessary, not sufficient. The real acceptance gate is `15_Exceptions` +
 * `15_LexicalShadowing_Stress` in `wasi_tests`, which is what caught this when a green fixture did
 * not. See cmem/compiler-bugs.md.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import wabt from "wabt";
import binaryen from "../src/binaryen.ts";

const WANT = 42;
const wat = "scripts/eh_try_table_live_local_fixture.wat";

interface WabtModule {
  parseWat(
    f: string,
    s: string,
    o: unknown,
  ): { toBinary(o: unknown): { buffer: Uint8Array }; destroy(): void };
}

async function runExit(bytes: Uint8Array, tag: string): Promise<number> {
  const dir = await mkdtemp(join(tmpdir(), "wasmtk_oz_"));
  const tmp = join(dir, "m.wasm");
  await writeFile(tmp, bytes);
  try {
    const code = spawnSync("wasmtime", ["run", tmp], { stdio: "ignore" }).status ?? 1;
    console.log(
      `  ${tag.padEnd(9)} ${bytes.length.toString().padStart(5)} bytes -> exit ${code}`,
    );
    return code;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const src = await readFile(wat, "utf8");
const w = await (wabt as unknown as () => Promise<WabtModule>)();
const parsed = w.parseWat(wat, src, { enable_all: true, exceptions: true });
const raw = new Uint8Array(parsed.toBinary({}).buffer);
parsed.destroy();

const preCode = await runExit(raw, "pre-Oz");
if (preCode !== WANT) {
  console.error(
    `\n[2] pre-Oz exited ${preCode}, want ${WANT} — the fixture or the assembler is broken.`,
  );
  console.error("    This says NOTHING about -Oz. Fix this first.");
  process.exit(2);
}

const m = binaryen.readBinary(raw);
const feat = (binaryen as unknown as Record<string, Record<string, number>>)["Features"];
(m as unknown as { setFeatures(n: number): void }).setFeatures(feat?.["All"] ?? 0x7FFFFFFF);
binaryen.setShrinkLevel(2);
binaryen.setOptimizeLevel(2);
m.optimize();
const oz: Uint8Array = m.emitBinary();
m.dispose();

const ozCode = await runExit(oz, "post-Oz");
if (ozCode !== WANT) {
  console.error(`\n[1] -Oz MISCOMPILES try_table: exit ${ozCode}, want ${WANT}.`);
  console.error('    Keep the `watSource.includes("try_table")` skip in src/wasic.ts.');
  process.exit(1);
}

console.log(`\n[0] -Oz is safe for try_table (both sides exit ${WANT}).`);
console.log("    The skip in src/wasic.ts may be removed — then run the FULL gate,");
console.log("    because 15_Exceptions / 15_LexicalShadowing_Stress are the real acceptance test.");
