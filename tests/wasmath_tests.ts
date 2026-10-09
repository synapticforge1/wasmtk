/**
 * wasMath L1 battery: every function's TypeScript body against the REAL wasm instruction.
 *
 * For each function that has a wasm counterpart, a one-instruction (or, for the derived integer
 * functions, a short `select`) WAT function is assembled by binaryang and run by the engine's own
 * WebAssembly; the body must give the same bits on every input of a battery of edge values, and
 * must THROW exactly where the instruction TRAPS (owner decision T6). Functions wasm does not have
 * are checked against an independent reference (BigInt arithmetic, the spec's ToInt32).
 *
 * Not checked here: the f64 / f32 `Math` functions (sin, log, pow, …): their wasm side is wasic's
 * helper library, compared in L2 / L3 (cmem/wasm-number-types.md).
 *
 * Usage: deno run -A tests/wasmath_tests.ts
 */
import wabt from "wabt";
import { f32, f64, i32, i64, u32, u64 } from "../src/wasmath.ts";

type WT = "i32" | "i64" | "f32" | "f64";
type Fn = (...a: never[]) => unknown;
interface Case {
  name: string; // "i32.add"
  fn: Fn;
  params: WT[];
  result: WT;
  wat?: string; // the body of a WAT function over (local.get 0) / (local.get 1)
  ref?: (...a: never[]) => unknown; // an independent reference where wasm has no instruction
  args?: unknown[][]; // explicit inputs (else the battery's cross product)
}

// ── Inputs ──────────────────────────────────────────────────────────────────────────────────
const I32S = [
  0, 1, -1, 2, -2, 3, 7, -7, 31, 32, 33, 63, 64, 255, 256, -128, 65535, 65536, 123456789,
  -987654321, 0x55555555, 0x2aaaaaab, 2147483647, -2147483648, -2147483647, 0x40000000,
];
const I64S = [
  0n, 1n, -1n, 2n, -2n, 3n, 7n, -7n, 31n, 32n, 63n, 64n, 65n, 255n, -128n, 4294967295n,
  4294967296n, -4294967296n, 2147483648n, -2147483649n, 12345678901234567n, -9876543210987654n,
  0x5555555555555555n, 2n ** 63n - 1n, -(2n ** 63n), -(2n ** 63n) + 1n, 2n ** 53n + 1n,
  // Double-rounding traps for an integer → f32 conversion: rounded to f64 first, these land
  // EXACTLY on an f32 halfway point and then round to even the wrong way.
  2n ** 60n + 2n ** 36n + 1n, -(2n ** 60n + 2n ** 36n + 1n),
  BigInt.asIntN(64, 2n ** 63n + 2n ** 39n + 1n), // as u64: just above an f32 halfway point
];
const F64S = [
  0, -0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.5, -2.5, 3.5, -3.5, 0.1, -0.7, 1e-310, 5e-324, 1e300,
  -1e300, 2147483647, 2147483647.9, 2147483648, -2147483648, -2147483648.9, -2147483649, 4294967295,
  4294967295.5, 4294967296, -1.0000001, 9007199254740993, 2 ** 52 + 0.5, 4503599627370497.5,
  9.2e18, 9223372036854775807, -9223372036854775808, 1.8e19, 18446744073709551615, NaN, Infinity,
  -Infinity, 16777217, 3.4028235677973366e38, 1.401298464324817e-45, 123.456,
];
const F32S = F64S.map((x) => Math.fround(x));
const VALS: Record<WT, unknown[]> = { i32: I32S, i64: I64S, f32: F32S, f64: F64S };
const SMALL_EXP = [0, 1, 2, 3, 5, 10, 31, 32, 33];

// ── Cases ───────────────────────────────────────────────────────────────────────────────────
const L0 = "(local.get 0)", L1 = "(local.get 1)";
const bin = (ns: string, op: string) => `(${ns}.${op} ${L0} ${L1})`;
const un = (ns: string, op: string) => `(${ns}.${op} ${L0})`;

const C: Case[] = [];
const add = (c: Case) => C.push(c);

// i32
for (const op of ["add", "sub", "mul", "and", "or", "xor", "shl", "rotl", "rotr"]) {
  add({ name: `i32.${op}`, fn: (i32 as Record<string, Fn>)[op], params: ["i32", "i32"], result: "i32", wat: bin("i32", op) });
}
add({ name: "i32.div", fn: i32.div as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "div_s") });
add({ name: "i32.rem", fn: i32.rem as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "rem_s") });
add({ name: "i32.shr", fn: i32.shr as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "shr_s") });
add({ name: "i32.shrU", fn: i32.shrU as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "shr_u") });
for (const op of ["clz", "ctz", "popcnt", "eqz"]) {
  add({ name: `i32.${op}`, fn: (i32 as Record<string, Fn>)[op], params: ["i32"], result: "i32", wat: un("i32", op) });
}
add({ name: "i32.extend8", fn: i32.extend8 as Fn, params: ["i32"], result: "i32", wat: un("i32", "extend8_s") });
add({ name: "i32.extend16", fn: i32.extend16 as Fn, params: ["i32"], result: "i32", wat: un("i32", "extend16_s") });
add({
  name: "i32.abs", fn: i32.abs as Fn, params: ["i32"], result: "i32",
  wat: `(select (i32.sub (i32.const 0) ${L0}) ${L0} (i32.lt_s ${L0} (i32.const 0)))`,
});
add({ name: "i32.min", fn: i32.min as Fn, params: ["i32", "i32"], result: "i32", wat: `(select ${L0} ${L1} (i32.lt_s ${L0} ${L1}))` });
add({ name: "i32.max", fn: i32.max as Fn, params: ["i32", "i32"], result: "i32", wat: `(select ${L0} ${L1} (i32.gt_s ${L0} ${L1}))` });
add({
  name: "i32.sign", fn: i32.sign as Fn, params: ["i32"], result: "i32",
  wat: `(i32.sub (i32.gt_s ${L0} (i32.const 0)) (i32.lt_s ${L0} (i32.const 0)))`,
});
add({
  name: "i32.pow", fn: i32.pow as Fn, params: ["i32", "i32"], result: "i32",
  ref: ((a: number, e: number) => {
    let r = 1n;
    for (let k = 0; k < e; k++) r = BigInt.asIntN(32, r * BigInt(a));
    return Number(r);
  }) as never,
  args: I32S.flatMap((a) => SMALL_EXP.map((e) => [a, e])),
});
add({ name: "i32.fromF64", fn: i32.fromF64 as Fn, params: ["f64"], result: "i32", wat: un("i32", "trunc_f64_s") });
add({ name: "i32.fromF64Sat", fn: i32.fromF64Sat as Fn, params: ["f64"], result: "i32", wat: un("i32", "trunc_sat_f64_s") });
const toInt32Ref = (x: number) =>
  Number.isFinite(x) ? Number(BigInt.asIntN(32, BigInt(Math.trunc(x)))) : 0; // the spec's ToInt32
add({ name: "i32.fromF64Wrap", fn: i32.fromF64Wrap as Fn, params: ["f64"], result: "i32", ref: toInt32Ref as never });
add({ name: "i32.fromF32", fn: i32.fromF32 as Fn, params: ["f32"], result: "i32", wat: un("i32", "trunc_f32_s") });
add({ name: "i32.fromF32Sat", fn: i32.fromF32Sat as Fn, params: ["f32"], result: "i32", wat: un("i32", "trunc_sat_f32_s") });
add({ name: "i32.fromI64", fn: i32.fromI64 as Fn, params: ["i64"], result: "i32", wat: un("i32", "wrap_i64") });

// u32
add({ name: "u32.from", fn: u32.from as Fn, params: ["i32"], result: "i32", wat: L0 });
for (const op of ["add", "sub", "mul"]) {
  add({ name: `u32.${op}`, fn: (u32 as Record<string, Fn>)[op], params: ["i32", "i32"], result: "i32", wat: bin("i32", op) });
}
add({ name: "u32.div", fn: u32.div as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "div_u") });
add({ name: "u32.rem", fn: u32.rem as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "rem_u") });
add({ name: "u32.shr", fn: u32.shr as Fn, params: ["i32", "i32"], result: "i32", wat: bin("i32", "shr_u") });
for (const op of ["lt", "gt", "le", "ge"]) {
  add({ name: `u32.${op}`, fn: (u32 as Record<string, Fn>)[op], params: ["i32", "i32"], result: "i32", wat: bin("i32", `${op}_u`) });
}
add({ name: "u32.min", fn: u32.min as Fn, params: ["i32", "i32"], result: "i32", wat: `(select ${L0} ${L1} (i32.lt_u ${L0} ${L1}))` });
add({ name: "u32.max", fn: u32.max as Fn, params: ["i32", "i32"], result: "i32", wat: `(select ${L0} ${L1} (i32.gt_u ${L0} ${L1}))` });
add({ name: "u32.toF64", fn: u32.toF64 as Fn, params: ["i32"], result: "f64", wat: un("f64", "convert_i32_u") });
add({ name: "u32.fromF64", fn: u32.fromF64 as Fn, params: ["f64"], result: "i32", wat: un("i32", "trunc_f64_u") });
add({ name: "u32.fromF64Sat", fn: u32.fromF64Sat as Fn, params: ["f64"], result: "i32", wat: un("i32", "trunc_sat_f64_u") });

// i64
add({ name: "i64.from", fn: i64.from as Fn, params: ["i64"], result: "i64", wat: L0 });
for (const op of ["add", "sub", "mul", "and", "or", "xor", "shl", "rotl", "rotr"]) {
  add({ name: `i64.${op}`, fn: (i64 as Record<string, Fn>)[op], params: ["i64", "i64"], result: "i64", wat: bin("i64", op) });
}
add({ name: "i64.div", fn: i64.div as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "div_s") });
add({ name: "i64.rem", fn: i64.rem as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "rem_s") });
add({ name: "i64.shr", fn: i64.shr as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "shr_s") });
add({ name: "i64.shrU", fn: i64.shrU as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "shr_u") });
for (const op of ["clz", "ctz", "popcnt"]) {
  add({ name: `i64.${op}`, fn: (i64 as Record<string, Fn>)[op], params: ["i64"], result: "i64", wat: un("i64", op) });
}
add({ name: "i64.eqz", fn: i64.eqz as Fn, params: ["i64"], result: "i32", wat: un("i64", "eqz") });
for (const [op, w] of [["extend8", "extend8_s"], ["extend16", "extend16_s"], ["extend32", "extend32_s"]]) {
  add({ name: `i64.${op}`, fn: (i64 as Record<string, Fn>)[op], params: ["i64"], result: "i64", wat: un("i64", w) });
}
add({
  name: "i64.abs", fn: i64.abs as Fn, params: ["i64"], result: "i64",
  wat: `(select (i64.sub (i64.const 0) ${L0}) ${L0} (i64.lt_s ${L0} (i64.const 0)))`,
});
add({ name: "i64.min", fn: i64.min as Fn, params: ["i64", "i64"], result: "i64", wat: `(select ${L0} ${L1} (i64.lt_s ${L0} ${L1}))` });
add({ name: "i64.max", fn: i64.max as Fn, params: ["i64", "i64"], result: "i64", wat: `(select ${L0} ${L1} (i64.gt_s ${L0} ${L1}))` });
add({
  name: "i64.sign", fn: i64.sign as Fn, params: ["i64"], result: "i64",
  wat: `(i64.extend_i32_s (i32.sub (i64.gt_s ${L0} (i64.const 0)) (i64.lt_s ${L0} (i64.const 0))))`,
});
add({
  name: "i64.pow", fn: i64.pow as Fn, params: ["i64", "i64"], result: "i64",
  ref: ((a: bigint, e: bigint) => {
    let r = 1n;
    for (let k = 0n; k < e; k++) r = BigInt.asIntN(64, r * a);
    return r;
  }) as never,
  args: I64S.flatMap((a) => SMALL_EXP.map((e) => [a, BigInt(e)])),
});
add({ name: "i64.fromI32", fn: i64.fromI32 as Fn, params: ["i32"], result: "i64", wat: un("i64", "extend_i32_s") });
add({ name: "i64.fromU32", fn: i64.fromU32 as Fn, params: ["i32"], result: "i64", wat: un("i64", "extend_i32_u") });
add({ name: "i64.fromF64", fn: i64.fromF64 as Fn, params: ["f64"], result: "i64", wat: un("i64", "trunc_f64_s") });
add({ name: "i64.fromF64Sat", fn: i64.fromF64Sat as Fn, params: ["f64"], result: "i64", wat: un("i64", "trunc_sat_f64_s") });
add({ name: "i64.fromF32", fn: i64.fromF32 as Fn, params: ["f32"], result: "i64", wat: un("i64", "trunc_f32_s") });
add({ name: "i64.fromF32Sat", fn: i64.fromF32Sat as Fn, params: ["f32"], result: "i64", wat: un("i64", "trunc_sat_f32_s") });

// u64
add({ name: "u64.from", fn: u64.from as Fn, params: ["i64"], result: "i64", wat: L0 });
add({ name: "u64.div", fn: u64.div as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "div_u") });
add({ name: "u64.rem", fn: u64.rem as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "rem_u") });
add({ name: "u64.shr", fn: u64.shr as Fn, params: ["i64", "i64"], result: "i64", wat: bin("i64", "shr_u") });
for (const op of ["lt", "gt", "le", "ge"]) {
  add({ name: `u64.${op}`, fn: (u64 as Record<string, Fn>)[op], params: ["i64", "i64"], result: "i32", wat: bin("i64", `${op}_u`) });
}
add({ name: "u64.min", fn: u64.min as Fn, params: ["i64", "i64"], result: "i64", wat: `(select ${L0} ${L1} (i64.lt_u ${L0} ${L1}))` });
add({ name: "u64.max", fn: u64.max as Fn, params: ["i64", "i64"], result: "i64", wat: `(select ${L0} ${L1} (i64.gt_u ${L0} ${L1}))` });
add({ name: "u64.toF64", fn: u64.toF64 as Fn, params: ["i64"], result: "f64", wat: un("f64", "convert_i64_u") });
add({ name: "u64.toF32", fn: u64.toF32 as Fn, params: ["i64"], result: "f32", wat: un("f32", "convert_i64_u") });
add({ name: "u64.fromF64", fn: u64.fromF64 as Fn, params: ["f64"], result: "i64", wat: un("i64", "trunc_f64_u") });
add({ name: "u64.fromF64Sat", fn: u64.fromF64Sat as Fn, params: ["f64"], result: "i64", wat: un("i64", "trunc_sat_f64_u") });

// f64 and f32 instructions (shared shape)
for (const [ns, lib] of [["f64", f64], ["f32", f32]] as const) {
  const t = ns as WT;
  for (const op of ["add", "sub", "mul", "div", "min", "max", "copysign"]) {
    add({ name: `${ns}.${op}`, fn: (lib as Record<string, Fn>)[op], params: [t, t], result: t, wat: bin(ns, op) });
  }
  for (const op of ["neg", "abs", "sqrt", "ceil", "floor", "trunc", "nearest"]) {
    add({ name: `${ns}.${op}`, fn: (lib as Record<string, Fn>)[op], params: [t], result: t, wat: un(ns, op) });
  }
  const it = ns === "f64" ? "i64" : "i32";
  add({ name: `${ns}.bits`, fn: lib.bits as Fn, params: [t], result: it, wat: un(it, `reinterpret_${ns}`) });
  add({ name: `${ns}.fromBits`, fn: lib.fromBits as Fn, params: [it], result: t, wat: un(ns, `reinterpret_${it}`) });
  add({ name: `${ns}.fromI32`, fn: lib.fromI32 as Fn, params: ["i32"], result: t, wat: un(ns, "convert_i32_s") });
  add({ name: `${ns}.fromU32`, fn: lib.fromU32 as Fn, params: ["i32"], result: t, wat: un(ns, "convert_i32_u") });
  add({ name: `${ns}.fromI64`, fn: lib.fromI64 as Fn, params: ["i64"], result: t, wat: un(ns, "convert_i64_s") });
  add({ name: `${ns}.fromU64`, fn: lib.fromU64 as Fn, params: ["i64"], result: t, wat: un(ns, "convert_i64_u") });
  for (const [op, w, rt] of [
    ["toI32", "i32.trunc", "i32"], ["toI32Sat", "i32.trunc_sat", "i32"], ["toU32", "i32.trunc", "i32"],
    ["toU32Sat", "i32.trunc_sat", "i32"], ["toI64", "i64.trunc", "i64"], ["toI64Sat", "i64.trunc_sat", "i64"],
    ["toU64", "i64.trunc", "i64"], ["toU64Sat", "i64.trunc_sat", "i64"],
  ] as const) {
    const sfx = op.startsWith("toU") ? "u" : "s";
    add({ name: `${ns}.${op}`, fn: (lib as Record<string, Fn>)[op], params: [t], result: rt, wat: `(${w}_${ns}_${sfx} ${L0})` });
  }
}
add({ name: "f64.fromF32", fn: f64.fromF32 as Fn, params: ["f32"], result: "f64", wat: un("f64", "promote_f32") });
add({ name: "f64.toI32Wrap", fn: f64.toI32Wrap as Fn, params: ["f64"], result: "i32", ref: toInt32Ref as never });
add({ name: "f32.from", fn: f32.from as Fn, params: ["f64"], result: "f32", wat: un("f32", "demote_f64") });

// ── Assemble one module with every reference function ───────────────────────────────────────
const withWat = C.filter((c) => c.wat);
const watSrc = "(module\n" + withWat.map((c) =>
  `  (func (export "${c.name}") ${c.params.length ? `(param ${c.params.join(" ")})` : ""} (result ${c.result}) ${c.wat})`
).join("\n") + "\n)";
// deno-lint-ignore no-explicit-any
const wabtMod = await (wabt as unknown as () => Promise<any>)();
const parsed = wabtMod.parseWat("wasmath_ref.wat", watSrc, { enable_all: true });
const { buffer } = parsed.toBinary({});
parsed.destroy();
const instance = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(buffer)));
const ex = instance.exports as Record<string, (...a: unknown[]) => unknown>;

// ── Compare ─────────────────────────────────────────────────────────────────────────────────
const TRAP = Symbol("trap");
const callSafe = (f: (...a: unknown[]) => unknown, args: unknown[]) => {
  try {
    return f(...args);
  } catch (e) {
    if (e instanceof RangeError || e instanceof WebAssembly.RuntimeError) return TRAP;
    throw e;
  }
};
/** The WASM side's result in comparable terms (it is always a valid value of its type). */
const normWasm = (v: unknown, t: WT): unknown => (v === TRAP || t !== "i64" ? v : BigInt.asIntN(64, v as bigint));
/** The BODY's result, checked to be a valid value of its type FIRST (an i32 body returning −0,
 *  3.5 or 2³¹, an f32 body returning an unrounded double, an i64 body out of range is a failure,
 *  never normalised into a match). The `u32` / `u64` views and the `toU32` / `toU64` conversions
 *  return unsigned values, which are then read as the same bits. Booleans are wasm's 0 / 1. */
const normBody = (v: unknown, t: WT, name: string): unknown => {
  if (v === TRAP) return TRAP;
  const bad = (why: string) => `INVALID ${why}: ${typeof v === "bigint" ? `${v}n` : Object.is(v, -0) ? "-0" : String(v)}`;
  if (t === "i32") {
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v !== "number") return bad("not a number");
    if (name.startsWith("u32.") || /\.toU32/.test(name)) {
      return Number.isInteger(v) && !Object.is(v, -0) && v >= 0 && v < 2 ** 32 ? v | 0 : bad("not a u32");
    }
    return Object.is(v, v | 0) ? v : bad("not an i32");
  }
  if (t === "i64") {
    if (typeof v === "boolean") return v ? 1n : 0n;
    if (typeof v !== "bigint") return bad("not a bigint");
    if (name.startsWith("u64.") || /\.toU64/.test(name)) return v >= 0n && v < 2n ** 64n ? BigInt.asIntN(64, v) : bad("not a u64");
    return v === BigInt.asIntN(64, v) ? v : bad("not an i64");
  }
  if (typeof v !== "number") return bad("not a number");
  if (t === "f32" && !Object.is(v, Math.fround(v)) && !Number.isNaN(v)) return bad("not an f32");
  return v;
};
const same = (a: unknown, b: unknown): boolean =>
  a === b || (typeof a === "number" && typeof b === "number" && Object.is(a, b)) ||
  (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b));
const show = (v: unknown) => v === TRAP ? "trap" : typeof v === "bigint" ? `${v}n` : Object.is(v, -0) ? "-0" : String(v);

let total = 0, failed = 0;
const failures: string[] = [];
for (const c of C) {
  const inputs = c.args ??
    (c.params.length === 1
      ? VALS[c.params[0]].map((v) => [v])
      : VALS[c.params[0]].flatMap((a) => VALS[c.params[1]].map((b) => [a, b])));
  const ref = c.wat ? ex[c.name] : (c.ref as (...a: unknown[]) => unknown);
  let bad = 0;
  for (const args of inputs) {
    const want = normWasm(callSafe(ref, args), c.result);
    const got = normBody(callSafe(c.fn as (...a: unknown[]) => unknown, args), c.result, c.name);
    if (!same(want, got)) {
      bad++;
      if (bad <= 3) failures.push(`  ${c.name}(${args.map(show).join(", ")}): wasm ${show(want)}, body ${show(got)}`);
    }
  }
  total += inputs.length;
  if (bad > 0) {
    failed++;
    failures.push(`✗ ${c.name}: ${bad}/${inputs.length} differ`);
  }
}
if (failures.length) console.log(failures.join("\n"));
console.log(`\n  wasMath L1: ${C.length} functions, ${total} calls; ${C.length - failed} exact, ${failed} differ`);
if (failed > 0) Deno.exit(1);
