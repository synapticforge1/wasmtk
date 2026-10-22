/**
 * verify_repros.ts — H12 Phase 0 audit verifier (2026-09-28)
 *
 * For every `.ts` in a directory: run it natively (Deno), compile it with `wasmtk wasic`, run the
 * wasm with `wasmtk run`, and classify:
 *   MATCH         same stdout and exit code: no bug shown (a FIXED repro reads MATCH)
 *   DIFFER        compiled, ran, printed something else: SILENT-WRONG
 *   COMPILE-FAIL  the compiler refused it: LOUD
 *   RUN-FAIL      compiled, but the wasm failed differently from native: LOUD
 * An audit claim is only a finding once this says so; tracing the code is not evidence.
 * Compiles IN PLACE (outputs are gitignored). Remember `i32`/`i64` are INTEGER types in wasic's
 * subset (README), so `const q: i32 = 7 / 2` printing 3 is the contract, not a bug.
 *
 * Usage:  bun scripts/phase0/verify_repros.ts scripts/phase0/round1/silent-wrong
 *
 * Runs on Bun. The native run stays `deno run` (the TypeScript reference is Deno's until the
 * Deno-exit plan's P6 / M2), and `wasmtk` runs as `deno run … main.ts` (the CLI is a Deno program
 * until P2).
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = process.argv[2]!;
const files = readdirSync(dir).filter((n) => n.endsWith(".ts")).sort();

// `wasmtk` as `deno run … main.ts` (what the installed shim runs), not the shim itself: on Windows
// the shim is a `.cmd`, and a time limit would kill only `cmd.exe` while a HANGING program kept
// running (ld33, 2026-10-09: `Math.atan2(0.5, 1e-310)` loops forever).
const repo = new URL("../../", import.meta.url);
const WASMTK = ["run", "-A", "--config", fileURLToPath(new URL("deno.json", repo)),
  fileURLToPath(new URL("main.ts", repo))];

function run(
  cmd: string,
  args: string[],
  ms = 30_000,
): { code: number; out: string; err: string } {
  if (cmd === "wasmtk") [cmd, args] = ["deno", [...WASMTK, ...args]];
  const o = spawnSync(cmd, args, { cwd: dir, encoding: "utf8", timeout: ms, maxBuffer: 1 << 28 });
  // A time limit kills the child and reports ETIMEDOUT (a killed child may still show an exit code).
  if ((o.error as { code?: string } | undefined)?.code === "ETIMEDOUT" || o.signal) {
    return { code: -1, out: "", err: `HANG: did not finish in ${ms / 1000} s` };
  }
  return { code: o.status ?? -1, out: (o.stdout ?? "").replace(/\r\n/g, "\n"), err: o.stderr ?? "" };
}

for (const f of files) {
  const base = f.replace(/\.ts$/, "");
  const native = run("deno", ["run", "-A", f]);
  const comp = run("wasmtk", ["wasic", f], 120_000);
  if (comp.code !== 0) {
    // the first report headline (`error[code]: …`, D6), else the first ⚠️ / ❌ line
    const lines = (comp.out + comp.err).split("\n");
    const diag = (lines.find((l) => /^error\[/.test(l)) ?? lines.find((l) => /⚠️|❌/.test(l)))
      ?.trim().slice(0, 110) ?? "";
    console.log(`COMPILE-FAIL  ${f}  :: ${diag}`);
    continue;
  }
  const wasm = run("wasmtk", ["run", `${base}.wasm`]);
  if (wasm.code !== native.code) {
    console.log(
      `RUN-FAIL      ${f}  :: native exit ${native.code}, wasm exit ${wasm.code} ${
        wasm.err.trim().slice(0, 80)
      }`,
    );
    continue;
  }
  if (wasm.out === native.out) {
    console.log(`MATCH         ${f}`);
    continue;
  }
  const a = native.out.split("\n"), b = wasm.out.split("\n");
  const i = a.findIndex((l, k) => l !== b[k]);
  console.log(
    `DIFFER        ${f}  :: line ${i + 1}: native ${JSON.stringify(a[i])} vs wasm ${
      JSON.stringify(b[i])
    }`,
  );
}
