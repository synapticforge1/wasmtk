/**
 * wasMath: WebAssembly's number types and operations, written in TypeScript so that a program
 * means the same thing under Deno as it does compiled to wasm.
 *
 * Each function's TypeScript body computes EXACTLY what the wasm instruction (or, for operations
 * wasm does not have, the defined wasm helper) computes. Deno runs the body; `wasmtk wasic`
 * compiles the call to the instruction. Where wasm TRAPS, the body THROWS a `RangeError` with the
 * spec's trap name, so both stop at the same point.
 *
 * The namespaces carry the type names, and each namespace shares its name with a type alias, so a
 * program reads naturally:
 *
 * ```ts
 * import { f64, i32 } from "@jrmarcum/wasmtk/wasMath";
 * const q: i32 = i32.div(7, 2);      // 3 in both; i32.div(1, 0) throws in both
 * const s: f64 = f64.sin(0.5);       // correctly rounded, the same bits in both
 * ```
 *
 * Representation: `i32`, `u32`, `f32` and `f64` values are `number`s (an `f32` is a number that
 * `Math.fround` leaves unchanged); `i64` and `u64` values are `bigint`s in their 64-bit range.
 * `u32` / `u64` are unsigned VIEWS of the same bits as `i32` / `i64`. Comparisons return
 * `boolean` (wasm's i32 0 / 1).
 *
 * The Math-style functions (`sin` … `pow`, `cbrt`) run wasmtk's correctly rounded math library in
 * Deno, the same library compiled programs link, so they agree to the bit; plain `Math.sin` in
 * Deno is V8's and may differ by one ulp. `wasmtk wasic` and `modc` lower every call.
 *
 * @module
 */

import { MATHLIB_BYTES } from "./wasm/mathlib_bytes.ts";

/** The math library that `wasmtk wasic` / `modc` link into every program using `Math`, run here
 *  too, so `f64.sin` and the rest give the SAME correctly rounded value in Deno as in wasm (owner
 *  decision "CR, in both", 2026-10-09). V8's own `Math.sin` & co. may differ by one ulp. Compiled
 *  on first use: a program that never calls them pays nothing. */
type MathLib =
  & Record<
    | "sin"
    | "cos"
    | "tan"
    | "asin"
    | "acos"
    | "atan"
    | "sinh"
    | "cosh"
    | "tanh"
    | "asinh"
    | "acosh"
    | "atanh"
    | "exp"
    | "expm1"
    | "log"
    | "log1p"
    | "log2"
    | "log10"
    | "cbrt",
    (a: number) => number
  >
  & Record<"atan2" | "pow", (a: number, b: number) => number>;
let mathlib: MathLib | undefined;
const ml = (): MathLib =>
  mathlib ??= new WebAssembly.Instance(new WebAssembly.Module(MATHLIB_BYTES))
    .exports as unknown as MathLib;

// ── Types (a type and a value may share a name: `const x: i32 = i32.add(a, b)`) ──────────────

/** A 32-bit two's-complement integer, held in a `number`. */
export type i32 = number;
/** The same 32 bits read as unsigned: a `number` in [0, 2³²). */
export type u32 = number;
/** A 64-bit two's-complement integer, held in a `bigint`. */
export type i64 = bigint;
/** The same 64 bits read as unsigned: a `bigint` in [0, 2⁶⁴). */
export type u64 = bigint;
/** An IEEE-754 single-precision value, held in a `number` that `Math.fround` leaves unchanged. */
export type f32 = number;
/** An IEEE-754 double-precision value: JavaScript's own `number`. */
export type f64 = number;

// ── Traps (the WebAssembly spec's trap names) ──────────────────────────────────────────────────

function trap(
  what: "integer divide by zero" | "integer overflow" | "invalid conversion to integer",
): never {
  throw new RangeError(what);
}

const I32_MIN = -2147483648;
const I32_MAX = 2147483647;
const I64_MIN = -(2n ** 63n);
const I64_MAX = 2n ** 63n - 1n;
const TWO_63 = 2 ** 63;
const TWO_64 = 2 ** 64;

const wrap64 = (x: bigint): bigint => BigInt.asIntN(64, x);
const wrapU64 = (x: bigint): bigint => BigInt.asUintN(64, x);

// One scratch view for bit-level work (sign bits, reinterpretation).
const scratch = new DataView(new ArrayBuffer(8));

// ── f64 helpers that JavaScript does not have ──────────────────────────────────────────────────

/** `f64.nearest`: round to the nearest integer, ties to EVEN, keeping the sign of a zero. */
function nearest(x: number): number {
  if (!Number.isFinite(x) || Math.abs(x) >= 2 ** 52) return x; // NaN, ±Infinity, already integral
  const r = Math.round(x); // ties go UP here
  // A tie (exactly .5 away; the subtraction is exact by Sterbenz) that went to an odd integer
  // goes to the even one below instead.
  const res = r - x === 0.5 && r % 2 !== 0 ? r - 1 : r;
  return res === 0 ? (x < 0 || Object.is(x, -0) ? -0 : 0) : res;
}

/** `f64.copysign`: `x`'s magnitude with `y`'s SIGN BIT (−0 and a negative NaN count). */
function copysign64(x: number, y: number): number {
  scratch.setFloat64(0, y);
  const sign = scratch.getUint8(0) & 0x80;
  scratch.setFloat64(0, x);
  scratch.setUint8(0, (scratch.getUint8(0) & 0x7f) | sign);
  return scratch.getFloat64(0);
}

/** `f32.copysign`: as `copysign64`, on f32 bits. */
function copysign32(x: number, y: number): number {
  scratch.setFloat32(0, y);
  const sign = scratch.getUint8(0) & 0x80;
  scratch.setFloat32(0, x);
  scratch.setUint8(0, (scratch.getUint8(0) & 0x7f) | sign);
  return scratch.getFloat32(0);
}

/** A bigint rounded ONCE to f32 (nearest, ties to even), as `f32.convert_i64_*` does.
 *  `Math.fround(Number(b))` would round twice (to f64, then to f32) and can differ. */
function bigToF32(b: bigint): number {
  if (b === 0n) return 0;
  const neg = b < 0n;
  const m = neg ? -b : b;
  const bits = m.toString(2).length;
  if (bits <= 24) return neg ? -Number(m) : Number(m); // exact in f32
  const shift = BigInt(bits - 24);
  let q = m >> shift;
  const rem = m - (q << shift);
  const half = 1n << (shift - 1n);
  if (rem > half || (rem === half && (q & 1n) === 1n)) q += 1n;
  const r = Number(q) * 2 ** Number(shift); // q ≤ 2²⁴ and a power-of-two scale: exact
  return Math.fround(neg ? -r : r);
}

// ── Conversions from a float to an integer (shared by f64, f32, i32, u32, i64, u64) ─────────────

function truncToI32(x: number): number {
  if (Number.isNaN(x)) trap("invalid conversion to integer");
  const t = Math.trunc(x);
  if (t < I32_MIN || t > I32_MAX) trap("integer overflow");
  return t | 0; // `| 0` also turns a −0 into 0: wasm integers have no −0
}
function truncToI32Sat(x: number): number {
  if (Number.isNaN(x)) return 0;
  const t = Math.trunc(x);
  return t < I32_MIN ? I32_MIN : t > I32_MAX ? I32_MAX : t | 0;
}
function truncToU32(x: number): number {
  if (Number.isNaN(x)) trap("invalid conversion to integer");
  const t = Math.trunc(x);
  if (t < 0 || t > 4294967295) trap("integer overflow"); // trunc(−0.5) is −0, which passes
  return t >>> 0;
}
function truncToU32Sat(x: number): number {
  if (Number.isNaN(x)) return 0;
  const t = Math.trunc(x);
  return t < 0 ? 0 : t > 4294967295 ? 4294967295 : t >>> 0;
}
function truncToI64(x: number): bigint {
  if (Number.isNaN(x)) trap("invalid conversion to integer");
  const t = Math.trunc(x);
  if (t < -TWO_63 || t >= TWO_63) trap("integer overflow");
  return BigInt(t);
}
function truncToI64Sat(x: number): bigint {
  if (Number.isNaN(x)) return 0n;
  const t = Math.trunc(x);
  return t < -TWO_63 ? I64_MIN : t >= TWO_63 ? I64_MAX : BigInt(t);
}
function truncToU64(x: number): bigint {
  if (Number.isNaN(x)) trap("invalid conversion to integer");
  const t = Math.trunc(x);
  if (t < 0 || t >= TWO_64) trap("integer overflow");
  return BigInt(t);
}
function truncToU64Sat(x: number): bigint {
  if (Number.isNaN(x)) return 0n;
  const t = Math.trunc(x);
  return t < 0 ? 0n : t >= TWO_64 ? 2n ** 64n - 1n : BigInt(t);
}

// ── f64 ───────────────────────────────────────────────────────────────────────────────────────

/** Double-precision operations: JavaScript's own arithmetic and `Math`, plus the wasm operations
 *  JavaScript has no spelling for. In wasm the `Math` functions are bit-exact to V8's. */
export const f64 = {
  E: Math.E,
  LN10: Math.LN10,
  LN2: Math.LN2,
  LOG10E: Math.LOG10E,
  LOG2E: Math.LOG2E,
  PI: Math.PI,
  SQRT1_2: Math.SQRT1_2,
  SQRT2: Math.SQRT2,

  add: (a: number, b: number): number => a + b,
  sub: (a: number, b: number): number => a - b,
  mul: (a: number, b: number): number => a * b,
  div: (a: number, b: number): number => a / b,
  neg: (a: number): number => -a,
  abs: (a: number): number => Math.abs(a),
  sqrt: (a: number): number => Math.sqrt(a),
  min: (a: number, b: number): number => Math.min(a, b),
  max: (a: number, b: number): number => Math.max(a, b),
  ceil: (a: number): number => Math.ceil(a),
  floor: (a: number): number => Math.floor(a),
  trunc: (a: number): number => Math.trunc(a),
  /** Round to nearest, ties to EVEN (`f64.nearest`); `round` is JavaScript's ties-up. */
  nearest,
  copysign: copysign64,

  /** Correctly rounded, in Deno AND in wasm: wasmtk's math library (see `ml`). */
  sin: (a: number): number => ml().sin(a),
  cos: (a: number): number => ml().cos(a),
  tan: (a: number): number => ml().tan(a),
  asin: (a: number): number => ml().asin(a),
  acos: (a: number): number => ml().acos(a),
  atan: (a: number): number => ml().atan(a),
  atan2: (a: number, b: number): number => ml().atan2(a, b),
  sinh: (a: number): number => ml().sinh(a),
  cosh: (a: number): number => ml().cosh(a),
  tanh: (a: number): number => ml().tanh(a),
  asinh: (a: number): number => ml().asinh(a),
  acosh: (a: number): number => ml().acosh(a),
  atanh: (a: number): number => ml().atanh(a),
  exp: (a: number): number => ml().exp(a),
  expm1: (a: number): number => ml().expm1(a),
  log: (a: number): number => ml().log(a),
  log1p: (a: number): number => ml().log1p(a),
  log2: (a: number): number => ml().log2(a),
  log10: (a: number): number => ml().log10(a),
  pow: (a: number, b: number): number => ml().pow(a, b),
  cbrt: (a: number): number => ml().cbrt(a),
  hypot: (a: number, b: number): number => Math.hypot(a, b),
  round: Math.round,
  sign: Math.sign,

  fromI32: (a: number): number => a | 0,
  fromU32: (a: number): number => a >>> 0,
  fromI64: (a: bigint): number => Number(wrap64(a)), // round to nearest, ties to even
  fromU64: (a: bigint): number => Number(wrapU64(a)),
  fromF32: (a: number): number => Math.fround(a),
  /** `i32.trunc_f64_s`: throws where wasm traps (NaN, out of range). */
  toI32: truncToI32,
  /** `i32.trunc_sat_f64_s`: NaN → 0, clamped. */
  toI32Sat: truncToI32Sat,
  /** JavaScript's ToInt32, `x | 0`: wraps modulo 2³²; NaN and ±Infinity → 0. */
  toI32Wrap: (a: number): number => a | 0,
  toU32: truncToU32,
  toU32Sat: truncToU32Sat,
  toI64: truncToI64,
  toI64Sat: truncToI64Sat,
  toU64: truncToU64,
  toU64Sat: truncToU64Sat,
  /** `i64.reinterpret_f64`. */
  bits: (a: number): bigint => {
    scratch.setFloat64(0, a, true);
    return scratch.getBigInt64(0, true);
  },
  /** `f64.reinterpret_i64`. */
  fromBits: (b: bigint): number => {
    scratch.setBigInt64(0, wrap64(b), true);
    return scratch.getFloat64(0, true);
  },
};

// ── f32 ───────────────────────────────────────────────────────────────────────────────────────

const fr = Math.fround;

/** Single-precision operations. `add` `sub` `mul` `div` `sqrt` are exact (an f64 result rounded
 *  to f32 equals the f32 operation for these five); the functions wasm does not have are DEFINED
 *  as the f64 result rounded to f32, in both. */
export const f32 = {
  /** An f32 value: `x` rounded once to single precision (`f32.demote_f64`). */
  from: (a: number): number => fr(a),
  add: (a: number, b: number): number => fr(fr(a) + fr(b)),
  sub: (a: number, b: number): number => fr(fr(a) - fr(b)),
  mul: (a: number, b: number): number => fr(fr(a) * fr(b)),
  div: (a: number, b: number): number => fr(fr(a) / fr(b)),
  sqrt: (a: number): number => fr(Math.sqrt(fr(a))),
  neg: (a: number): number => -fr(a),
  abs: (a: number): number => Math.abs(fr(a)),
  min: (a: number, b: number): number => Math.min(fr(a), fr(b)),
  max: (a: number, b: number): number => Math.max(fr(a), fr(b)),
  ceil: (a: number): number => Math.ceil(fr(a)),
  floor: (a: number): number => Math.floor(fr(a)),
  trunc: (a: number): number => Math.trunc(fr(a)),
  nearest: (a: number): number => nearest(fr(a)),
  copysign: (a: number, b: number): number => copysign32(fr(a), fr(b)),

  sin: (a: number): number => fr(f64.sin(fr(a))),
  cos: (a: number): number => fr(f64.cos(fr(a))),
  tan: (a: number): number => fr(f64.tan(fr(a))),
  asin: (a: number): number => fr(f64.asin(fr(a))),
  acos: (a: number): number => fr(f64.acos(fr(a))),
  atan: (a: number): number => fr(f64.atan(fr(a))),
  atan2: (a: number, b: number): number => fr(f64.atan2(fr(a), fr(b))),
  sinh: (a: number): number => fr(f64.sinh(fr(a))),
  cosh: (a: number): number => fr(f64.cosh(fr(a))),
  tanh: (a: number): number => fr(f64.tanh(fr(a))),
  asinh: (a: number): number => fr(f64.asinh(fr(a))),
  acosh: (a: number): number => fr(f64.acosh(fr(a))),
  atanh: (a: number): number => fr(f64.atanh(fr(a))),
  exp: (a: number): number => fr(f64.exp(fr(a))),
  expm1: (a: number): number => fr(f64.expm1(fr(a))),
  log: (a: number): number => fr(f64.log(fr(a))),
  log1p: (a: number): number => fr(f64.log1p(fr(a))),
  log2: (a: number): number => fr(f64.log2(fr(a))),
  log10: (a: number): number => fr(f64.log10(fr(a))),
  pow: (a: number, b: number): number => fr(f64.pow(fr(a), fr(b))),
  cbrt: (a: number): number => fr(f64.cbrt(fr(a))),
  hypot: (a: number, b: number): number => fr(Math.hypot(fr(a), fr(b))),
  round: (a: number): number => Math.round(fr(a)),
  sign: (a: number): number => Math.sign(fr(a)),

  fromI32: (a: number): number => fr(a | 0), // i32 → f64 is exact, so one rounding
  fromU32: (a: number): number => fr(a >>> 0),
  fromI64: (a: bigint): number => bigToF32(wrap64(a)),
  fromU64: (a: bigint): number => bigToF32(wrapU64(a)),
  toI32: (a: number): number => truncToI32(fr(a)),
  toI32Sat: (a: number): number => truncToI32Sat(fr(a)),
  toU32: (a: number): number => truncToU32(fr(a)),
  toU32Sat: (a: number): number => truncToU32Sat(fr(a)),
  toI64: (a: number): bigint => truncToI64(fr(a)),
  toI64Sat: (a: number): bigint => truncToI64Sat(fr(a)),
  toU64: (a: number): bigint => truncToU64(fr(a)),
  toU64Sat: (a: number): bigint => truncToU64Sat(fr(a)),
  /** `i32.reinterpret_f32`. */
  bits: (a: number): number => {
    scratch.setFloat32(0, a, true);
    return scratch.getInt32(0, true);
  },
  /** `f32.reinterpret_i32`. */
  fromBits: (b: number): number => {
    scratch.setInt32(0, b | 0, true);
    return scratch.getFloat32(0, true);
  },
};

// ── i32 ───────────────────────────────────────────────────────────────────────────────────────

/** `x` raised to `e` (≥ 0) modulo 2³², by squaring with `Math.imul`. wasm has no integer power;
 *  this IS the definition in both. */
function powI32(x: number, e: number): number {
  if (e < 0) throw new RangeError("negative exponent");
  let base = x | 0, exp = e >>> 0, r = 1;
  while (exp !== 0) {
    if (exp & 1) r = Math.imul(r, base);
    base = Math.imul(base, base);
    exp >>>= 1;
  }
  return r;
}

/** 32-bit integer operations on `number`s. Arguments are taken as int32 (`| 0`). */
export const i32 = {
  add: (a: number, b: number): number => ((a | 0) + (b | 0)) | 0,
  sub: (a: number, b: number): number => ((a | 0) - (b | 0)) | 0,
  mul: (a: number, b: number): number => Math.imul(a, b),
  /** `i32.div_s`: truncates; throws on division by zero and on −2³¹ / −1, as wasm traps. */
  div: (a: number, b: number): number => {
    a |= 0;
    b |= 0;
    if (b === 0) trap("integer divide by zero");
    if (a === I32_MIN && b === -1) trap("integer overflow");
    return Math.trunc(a / b) | 0; // exact for int32 operands
  },
  /** `i32.rem_s`: the sign of the dividend; throws on division by zero. −2³¹ % −1 is 0. */
  rem: (a: number, b: number): number => {
    a |= 0;
    b |= 0;
    if (b === 0) trap("integer divide by zero");
    return (a % b) | 0;
  },
  and: (a: number, b: number): number => a & b,
  or: (a: number, b: number): number => a | b,
  xor: (a: number, b: number): number => a ^ b,
  /** Shift counts are taken modulo 32, as in both JavaScript and wasm. */
  shl: (a: number, k: number): number => a << k,
  shr: (a: number, k: number): number => a >> k,
  /** `i32.shr_u`, the result read as i32; `u32.shr` gives the unsigned value. */
  shrU: (a: number, k: number): number => (a >>> k) | 0,
  rotl: (a: number, k: number): number => {
    k &= 31;
    return ((a << k) | (a >>> (32 - k))) | 0;
  },
  rotr: (a: number, k: number): number => {
    k &= 31;
    return ((a >>> k) | (a << (32 - k))) | 0;
  },
  clz: (a: number): number => Math.clz32(a),
  ctz: (a: number): number => {
    a |= 0;
    return a === 0 ? 32 : 31 - Math.clz32(a & -a);
  },
  popcnt: (a: number): number => {
    let x = a | 0;
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    x = (x + (x >>> 4)) & 0x0f0f0f0f;
    return Math.imul(x, 0x01010101) >>> 24;
  },
  eqz: (a: number): boolean => (a | 0) === 0,
  extend8: (a: number): number => (a << 24) >> 24,
  extend16: (a: number): number => (a << 16) >> 16,
  /** Wraps: `abs(−2³¹)` is −2³¹ (two's complement). */
  abs: (a: number): number => (a < 0 ? -a | 0 : a | 0),
  min: (a: number, b: number): number => Math.min(a | 0, b | 0),
  max: (a: number, b: number): number => Math.max(a | 0, b | 0),
  sign: (a: number): number => ((a | 0) > 0 ? 1 : (a | 0) < 0 ? -1 : 0),
  /** Integer power modulo 2³²; throws for a negative exponent. */
  pow: powI32,

  fromF64: truncToI32,
  fromF64Sat: truncToI32Sat,
  fromF64Wrap: (a: number): number => a | 0,
  fromF32: (a: number): number => truncToI32(fr(a)),
  fromF32Sat: (a: number): number => truncToI32Sat(fr(a)),
  /** `i32.wrap_i64`: the low 32 bits. */
  fromI64: (a: bigint): number => Number(BigInt.asIntN(32, a)),
};

// ── u32 (the unsigned view of i32) ───────────────────────────────────────────────────────────

/** The unsigned view of the same 32 bits: results are `number`s in [0, 2³²). */
export const u32 = {
  /** The same bits read unsigned: `x >>> 0`. */
  from: (a: number): number => a >>> 0,
  add: (a: number, b: number): number => ((a >>> 0) + (b >>> 0)) >>> 0,
  sub: (a: number, b: number): number => ((a >>> 0) - (b >>> 0)) >>> 0,
  mul: (a: number, b: number): number => Math.imul(a, b) >>> 0,
  /** `i32.div_u`: throws on division by zero. */
  div: (a: number, b: number): number => {
    const x = a >>> 0, y = b >>> 0;
    if (y === 0) trap("integer divide by zero");
    return Math.trunc(x / y) >>> 0;
  },
  /** `i32.rem_u`: throws on division by zero. */
  rem: (a: number, b: number): number => {
    const x = a >>> 0, y = b >>> 0;
    if (y === 0) trap("integer divide by zero");
    return (x % y) >>> 0;
  },
  shr: (a: number, k: number): number => a >>> k,
  lt: (a: number, b: number): boolean => a >>> 0 < b >>> 0,
  gt: (a: number, b: number): boolean => a >>> 0 > b >>> 0,
  le: (a: number, b: number): boolean => a >>> 0 <= b >>> 0,
  ge: (a: number, b: number): boolean => a >>> 0 >= b >>> 0,
  min: (a: number, b: number): number => Math.min(a >>> 0, b >>> 0),
  max: (a: number, b: number): number => Math.max(a >>> 0, b >>> 0),
  toF64: (a: number): number => a >>> 0,
  fromF64: truncToU32,
  fromF64Sat: truncToU32Sat,
};

// ── i64 ───────────────────────────────────────────────────────────────────────────────────────

function powI64(x: bigint, e: bigint): bigint {
  if (e < 0n) throw new RangeError("negative exponent");
  let base = wrap64(x), exp = e, r = 1n;
  while (exp > 0n) {
    if (exp & 1n) r = wrap64(r * base);
    base = wrap64(base * base);
    exp >>= 1n;
  }
  return r;
}

/** 64-bit integer operations on `bigint`s, wrapped to 64 bits (`BigInt.asIntN(64, …)`).
 *  JavaScript's bigint is unbounded; these are not. */
export const i64 = {
  /** An i64 value: `x` wrapped to 64 bits. */
  from: (a: bigint): bigint => wrap64(a),
  add: (a: bigint, b: bigint): bigint => wrap64(a + b),
  sub: (a: bigint, b: bigint): bigint => wrap64(a - b),
  mul: (a: bigint, b: bigint): bigint => wrap64(a * b),
  /** `i64.div_s`: truncates (as bigint `/` does); throws on division by zero and on −2⁶³ / −1
   *  (where bigint itself would NOT throw: it would give 2⁶³). */
  div: (a: bigint, b: bigint): bigint => {
    a = wrap64(a);
    b = wrap64(b);
    if (b === 0n) trap("integer divide by zero");
    if (a === I64_MIN && b === -1n) trap("integer overflow");
    return wrap64(a / b);
  },
  rem: (a: bigint, b: bigint): bigint => {
    a = wrap64(a);
    b = wrap64(b);
    if (b === 0n) trap("integer divide by zero");
    return wrap64(a % b);
  },
  and: (a: bigint, b: bigint): bigint => wrap64(a & b),
  or: (a: bigint, b: bigint): bigint => wrap64(a | b),
  xor: (a: bigint, b: bigint): bigint => wrap64(a ^ b),
  /** Shift counts are taken modulo 64, as wasm does (bigint shifts are not masked). */
  shl: (a: bigint, k: bigint): bigint => wrap64(a << BigInt.asUintN(6, k)),
  shr: (a: bigint, k: bigint): bigint => wrap64(wrap64(a) >> BigInt.asUintN(6, k)),
  shrU: (a: bigint, k: bigint): bigint => wrap64(wrapU64(a) >> BigInt.asUintN(6, k)),
  rotl: (a: bigint, k: bigint): bigint => {
    const n = BigInt.asUintN(6, k), u = wrapU64(a);
    return wrap64((u << n) | (u >> ((64n - n) & 63n)));
  },
  rotr: (a: bigint, k: bigint): bigint => {
    const n = BigInt.asUintN(6, k), u = wrapU64(a);
    return wrap64((u >> n) | (u << ((64n - n) & 63n)));
  },
  clz: (a: bigint): bigint => {
    const u = wrapU64(a);
    return u === 0n ? 64n : BigInt(64 - u.toString(2).length);
  },
  ctz: (a: bigint): bigint => {
    let u = wrapU64(a);
    if (u === 0n) return 64n;
    let n = 0n;
    while ((u & 1n) === 0n) {
      u >>= 1n;
      n++;
    }
    return n;
  },
  popcnt: (a: bigint): bigint => {
    let u = wrapU64(a), n = 0n;
    while (u !== 0n) {
      n += u & 1n;
      u >>= 1n;
    }
    return n;
  },
  eqz: (a: bigint): boolean => wrap64(a) === 0n,
  extend8: (a: bigint): bigint => BigInt.asIntN(8, a),
  extend16: (a: bigint): bigint => BigInt.asIntN(16, a),
  extend32: (a: bigint): bigint => BigInt.asIntN(32, a),
  /** Wraps: `abs(−2⁶³)` is −2⁶³. */
  abs: (a: bigint): bigint => {
    a = wrap64(a);
    return wrap64(a < 0n ? -a : a);
  },
  min: (a: bigint, b: bigint): bigint => (wrap64(a) < wrap64(b) ? wrap64(a) : wrap64(b)),
  max: (a: bigint, b: bigint): bigint => (wrap64(a) > wrap64(b) ? wrap64(a) : wrap64(b)),
  sign: (a: bigint): bigint => (wrap64(a) > 0n ? 1n : wrap64(a) < 0n ? -1n : 0n),
  /** Integer power modulo 2⁶⁴; throws for a negative exponent. */
  pow: powI64,

  /** `i64.extend_i32_s`. */
  fromI32: (a: number): bigint => BigInt(a | 0),
  /** `i64.extend_i32_u`. */
  fromU32: (a: number): bigint => BigInt(a >>> 0),
  fromF64: truncToI64,
  fromF64Sat: truncToI64Sat,
  fromF32: (a: number): bigint => truncToI64(fr(a)),
  fromF32Sat: (a: number): bigint => truncToI64Sat(fr(a)),
};

// ── u64 (the unsigned view of i64) ───────────────────────────────────────────────────────────

/** The unsigned view of the same 64 bits: results are `bigint`s in [0, 2⁶⁴). */
export const u64 = {
  /** The same bits read unsigned: `BigInt.asUintN(64, x)`. */
  from: (a: bigint): bigint => wrapU64(a),
  /** `i64.div_u`: throws on division by zero. */
  div: (a: bigint, b: bigint): bigint => {
    const x = wrapU64(a), y = wrapU64(b);
    if (y === 0n) trap("integer divide by zero");
    return x / y;
  },
  /** `i64.rem_u`: throws on division by zero. */
  rem: (a: bigint, b: bigint): bigint => {
    const x = wrapU64(a), y = wrapU64(b);
    if (y === 0n) trap("integer divide by zero");
    return x % y;
  },
  shr: (a: bigint, k: bigint): bigint => wrapU64(a) >> BigInt.asUintN(6, k),
  lt: (a: bigint, b: bigint): boolean => wrapU64(a) < wrapU64(b),
  gt: (a: bigint, b: bigint): boolean => wrapU64(a) > wrapU64(b),
  le: (a: bigint, b: bigint): boolean => wrapU64(a) <= wrapU64(b),
  ge: (a: bigint, b: bigint): boolean => wrapU64(a) >= wrapU64(b),
  min: (a: bigint, b: bigint): bigint => (wrapU64(a) < wrapU64(b) ? wrapU64(a) : wrapU64(b)),
  max: (a: bigint, b: bigint): bigint => (wrapU64(a) > wrapU64(b) ? wrapU64(a) : wrapU64(b)),
  toF64: (a: bigint): number => Number(wrapU64(a)),
  toF32: (a: bigint): number => bigToF32(wrapU64(a)),
  fromF64: truncToU64,
  fromF64Sat: truncToU64Sat,
};
