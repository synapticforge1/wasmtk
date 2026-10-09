/**
 * wasMath L2 battery: every wasMath function called from a real PROGRAM, compiled by
 * `wasmtk wasic` and run, against the same program run by Deno.
 *
 * Per function: one program prints the result of every input that does not throw; each input
 * that throws (at most 2 per function) gets a program of its own, and BOTH runs must stop there
 * with a non-zero exit and nothing printed (owner decision T6: "TypeScript and wasm stop the
 * same"). Inputs are the L1 battery's edge values.
 *
 * The `f64` / `f32` Math-style members (`sin` … `pow`) run wasmtk's correctly rounded math library
 * in Deno as well as in wasm (L3, owner decision "CR, in both", 2026-10-09), so they too must match
 * to the bit; until L3 they were "known" differences.
 *
 * Known, and reported separately rather than failed: a `u64` value ≥ 2⁶³ prints signed in wasm
 * (no unsigned i64 printer yet): such inputs are skipped and counted.
 *
 * Usage: deno run -A tests/wasmath_lower_tests.ts [<function filter regex>]
 */
import { join, toFileUrl } from "@std/path";
import * as WM from "../src/wasmath.ts";
import { WM_F32_TS, WM_F64_MATH, WM_WAT } from "../src/wasmath_lower.ts";

type T = "i32" | "i64" | "f32" | "f64";
const filter = Deno.args[0] ? new RegExp(Deno.args[0]) : null;
const wmUrl = toFileUrl(join(Deno.cwd(), "src", "wasmath.ts")).href;
const dir = await Deno.makeTempDir({ prefix: "wasmath_l2_" });

// ── Inputs (the L1 battery's, slightly trimmed for program size) ─────────────────────────────
const I32S = [0, 1, -1, 2, -2, 7, -7, 31, 32, 33, 255, -128, 65536, 123456789, -987654321,
  0x55555555, 2147483647, -2147483648];
const I64S = [0n, 1n, -1n, 2n, -2n, 7n, -7n, 63n, 64n, 65n, 4294967296n, -4294967296n,
  12345678901234567n, 2n ** 63n - 1n, -(2n ** 63n), 2n ** 60n + 2n ** 36n + 1n];
const F64S = [0, -0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.5, -2.5, 0.1, 1e-310, 1e300, -1e300,
  2147483647.9, 2147483648, -2147483649, 4294967295.5, 4294967296, 9007199254740993,
  9223372036854775807, 18446744073709551615, NaN, Infinity, -Infinity, 123.456];
const VALS: Record<T, unknown[]> = { i32: I32S, i64: I64S, f32: F64S.map((x) => Math.fround(x)), f64: F64S };

const lit = (v: unknown, t: T): string => {
  if (t === "i64") return `${v}n`;
  const n = v as number;
  if (Number.isNaN(n)) return "NaN";
  if (n === Infinity) return "Infinity";
  if (n === -Infinity) return "-Infinity";
  if (Object.is(n, -0)) return "-0";
  return String(n);
};

// ── The functions: [namespace, member, wasm param types] ─────────────────────────────────────
interface Fn { ns: string; member: string; params: T[] }
const FNS: Fn[] = [];
for (const [key, h] of Object.entries(WM_WAT)) {
  if (key === "toint32") continue;
  const [ns, member] = [key.slice(0, 3), key.slice(4)];
  FNS.push({ ns, member, params: h.params as T[] });
}
for (const m of WM_F64_MATH) {
  if (/^[A-Z]/.test(m)) continue; // constants: covered by the Math table
  const arity = ["atan2", "pow", "hypot"].includes(m) ? 2 : 1;
  FNS.push({ ns: "f64", member: m, params: Array(arity).fill("f64") });
}
for (const m of Object.keys(WM_F32_TS)) {
  const arity = ["atan2", "pow", "hypot"].includes(m) ? 2 : 1;
  FNS.push({ ns: "f32", member: m, params: Array(arity).fill("f64") });
}

// ── Program generation ───────────────────────────────────────────────────────────────────────
const call = (f: Fn, args: unknown[]) =>
  (WM as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[f.ns][f.member](...args);
const throws = (f: Fn, args: unknown[]) => {
  try {
    call(f, args);
    return false;
  } catch {
    return true;
  }
};
/** A u64 result the wasm side cannot print unsigned yet. */
const unsignedWide = (f: Fn, args: unknown[]) => {
  if (!(f.ns === "u64" || /toU64/.test(f.member))) return false;
  try {
    const r = call(f, args);
    return typeof r === "bigint" && r >= 2n ** 63n;
  } catch {
    return false;
  }
};
const program = (f: Fn, inputs: unknown[][]) => {
  const lines = [`import { ${f.ns} } from "${wmUrl}";`, "type f64 = number;", "type f32 = number;",
    "type i32 = number;", "type i64 = bigint;"];
  inputs.forEach((args, k) => {
    args.forEach((a, j) => lines.push(`const a${k}_${j}: ${f.params[j]} = ${lit(a, f.params[j])};`));
    lines.push(`console.log(${f.ns}.${f.member}(${args.map((_, j) => `a${k}_${j}`).join(", ")}));`);
  });
  return lines.join("\n") + "\n";
};

/** `wasmtk` as `deno run … main.ts` (the code the installed shim runs), NOT through the shim: on
 *  Windows the shim is a `.cmd`, and a timeout would kill only `cmd.exe` while the real process
 *  kept running (the first two runs of this battery stalled on a hang, 2026-10-09, ld33). */
const WASMTK = [
  "run", "-A", "--config", join(Deno.cwd(), "deno.json"), join(Deno.cwd(), "main.ts"),
];
/** A child process with a time limit: a run that does not finish is a HANG (a failure), never a
 *  battery that waits forever. */
const run = async (cmd: string, args: string[], ms = 30_000) => {
  if (cmd === "wasmtk") [cmd, args] = [Deno.execPath(), [...WASMTK, ...args]];
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const o = await new Deno.Command(cmd, { args, cwd: dir, stdout: "piped", stderr: "piped", signal: ctl.signal })
      .output();
    // A killed child can RESOLVE (exit 1 on Windows) instead of throwing: ask the signal.
    if (ctl.signal.aborted) {
      return { code: -1, out: "", err: `HANG: ${args.at(-1)} did not finish in ${ms / 1000} s` };
    }
    return { code: o.code, out: new TextDecoder().decode(o.stdout), err: new TextDecoder().decode(o.stderr) };
  } catch {
    return { code: -1, out: "", err: `HANG: ${cmd} ${args.join(" ")} did not finish in ${ms / 1000} s` };
  } finally {
    clearTimeout(timer);
  }
};
interface Outcome { fn: string; lines: number; bad: string[]; skipped: number }
const runProgram = async (file: string, src: string) => {
  await Deno.writeTextFile(join(dir, file), src);
  const nat = await run("deno", ["run", "-A", file]);
  const c = await run("wasmtk", ["wasic", file], 120_000);
  if (c.code !== 0) {
    const why = (c.out + c.err).split("\n").find((l) => /⚠️|❌|HANG/.test(l))?.trim() ?? `exit ${c.code}`;
    return { nat, wasm: null, compileError: why.slice(0, 120) };
  }
  const wasm = await run("wasmtk", ["run", file.replace(/\.ts$/, ".wasm")]);
  return { nat, wasm, compileError: null };
};

const check = async (f: Fn, idx: number): Promise<Outcome> => {
  const name = `${f.ns}.${f.member}`;
  const all = f.params.length === 1
    ? VALS[f.params[0]].map((v) => [v])
    : VALS[f.params[0]].flatMap((a) => VALS[f.params[1]].map((b) => [a, b]));
  const inputs = (f.member === "pow" && (f.ns === "i32" || f.ns === "i64"))
    ? VALS[f.params[0]].flatMap((a) => [0, 1, 2, 3, 31, 63].map((e) => [a, f.ns === "i64" ? BigInt(e) : e]))
    : all;
  const wide = inputs.filter((a) => unsignedWide(f, a));
  const usable = inputs.filter((a) => !unsignedWide(f, a));
  const ok = usable.filter((a) => !throws(f, a));
  const traps = usable.filter((a) => throws(f, a)).slice(0, 2);
  const bad: string[] = [];
  // the non-throwing inputs, one program
  if (ok.length) {
    const r = await runProgram(`p${idx}.ts`, program(f, ok));
    if (r.compileError) bad.push(`compile error: ${r.compileError}`);
    else {
      const a = r.nat.out.trimEnd().split("\n"), b = r.wasm!.out.trimEnd().split("\n");
      ok.forEach((args, k) => {
        if (a[k] !== b[k]) {
          bad.push(`(${args.map((x) => typeof x === "bigint" ? `${x}n` : Object.is(x, -0) ? "-0" : String(x)).join(", ")}): deno ${a[k]} wasm ${b[k] ?? "<none>"}`);
        }
      });
      if (r.wasm!.code !== 0) {
        bad.push(`wasm exited ${r.wasm!.code}: ${(r.wasm!.out + r.wasm!.err).match(/RuntimeError[^\n]*|HANG[^\n]*/)?.[0] ?? ""}`);
      }
    }
  }
  // each throwing input: both must stop, printing nothing
  for (const [k, args] of traps.entries()) {
    const r = await runProgram(`p${idx}_t${k}.ts`, program(f, [args]));
    if (r.compileError) bad.push(`compile error (trap case): ${r.compileError}`);
    else if (!(r.nat.code !== 0 && r.wasm!.code !== 0 && r.wasm!.out.trim() === "")) {
      bad.push(`(${args.map(String).join(", ")}) should stop in both: deno exit ${r.nat.code}, wasm exit ${r.wasm!.code} "${r.wasm!.out.trim()}"`);
    }
  }
  return { fn: name, lines: ok.length + traps.length, bad, skipped: wide.length };
};

const todo = FNS.filter((f) => !filter || filter.test(`${f.ns}.${f.member}`));
const results: Outcome[] = [];
for (let i = 0; i < todo.length; i += 6) {
  results.push(...await Promise.all(todo.slice(i, i + 6).map((f, k) => check(f, i + k))));
}

const exact = results.filter((r) => r.bad.length === 0);
const failed = results.filter((r) => r.bad.length > 0);
for (const r of failed) console.log(`✗ ${r.fn}\n  ${r.bad.slice(0, 3).join("\n  ")}`);
const calls = results.reduce((s, r) => s + r.lines, 0);
const skipped = results.reduce((s, r) => s + r.skipped, 0);
console.log(
  `\n  wasMath L2: ${results.length} functions, ${calls} calls compiled and run; ${exact.length} exact, ` +
    `${failed.length} FAILED; ${skipped} u64 ≥ 2⁶³ inputs skipped (printing gap)`,
);
await Deno.remove(dir, { recursive: true });
if (failed.length > 0) Deno.exit(1);
