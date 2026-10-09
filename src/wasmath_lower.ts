/**
 * wasMath L2: how `wasmtk wasic` lowers calls to the `wasMath` library (`src/wasmath.ts`).
 *
 * The bundler (tsbundler.ts) recognises an import of wasMath and, instead of inlining the
 * TypeScript, rewrites each `ns.member` it names:
 *
 *   - most members  → `__wm_<ns>_<member>`, a helper whose body is the wasm instruction(s), from
 *     `WM_WAT` below; WasicTranspiler registers every helper the program uses as an ordinary
 *     function (typed params and result), so calls, conversions and printing need no new path;
 *   - `f64` `Math`-style members and constants → `Math.<name>`, so `f64.*` and `Math.*` share one
 *     implementation (the design: one V8-exact library, wasm-number-types.md Track M);
 *   - `f32` `Math`-style members → `__wm_f32_<name>`, a small TypeScript helper (`WM_F32_TS`) that
 *     is EXACTLY the TypeScript body: `Math.fround(Math.sin(Math.fround(a)))`.
 *
 * Representation in wasic, chosen to match TypeScript's: `i32` → i32, `i64` / `u64` → i64,
 * `f32` → f32, `f64` → f64, and `u32` → f64 (a u32 IS a `number` in [0, 2³²) in TypeScript, so
 * carrying it as an exact f64 prints and computes as Deno does; the helpers take the bits with
 * ToInt32 and give back an f64). Comparisons return `bool` (printed `true` / `false`).
 *
 * Known gaps (wasm-number-types.md): a `u64` value ≥ 2⁶³ prints signed (no unsigned i64 printer
 * yet); an `i32`-namespace argument that is an f64 OUT of the int32 range traps (wasic's f64 → i32
 * rule) where the TypeScript wraps (`| 0`).
 *
 * @module
 */

/** True for an import specifier that names the wasMath module. */
export function isWasMathSpecifier(spec: string): boolean {
  return /(^|[/:])wasMath$/.test(spec) || /(^|[/])wasmath\.ts$/i.test(spec);
}

type T = "i32" | "i64" | "f32" | "f64";
/** One wasm helper: params, result (`bool` = an i32 0 / 1 printed as a boolean), body over
 *  `(local.get N)`, extra locals, and other helpers it calls. */
export interface WmHelper {
  params: T[];
  result: T | "bool";
  body: string;
  locals?: string;
  uses?: string[];
}

const L0 = "(local.get 0)", L1 = "(local.get 1)";
const bin = (op: string): string => `(${op} ${L0} ${L1})`;
const un = (op: string): string => `(${op} ${L0})`;
/** The i32 bits of a u32 carried as an f64 (ToUint32 and ToInt32 give the same bits). */
const U0 = `(call $__wm_toint32 ${L0})`, U1 = `(call $__wm_toint32 ${L1})`;
const asU32 = (i32wat: string): string => `(f64.convert_i32_u ${i32wat})`;

/** `$__wm_toint32`: JavaScript's ToInt32 on an f64 (NaN, ±Infinity → 0; else trunc mod 2³²).
 *  `t − trunc(t / 2³²) · 2³²` is exact for every finite t and lies in (−2³², 2³²). */
const TOINT32: WmHelper = {
  params: ["f64"],
  result: "i32",
  body: `(if (result i32) (f64.ne (f64.sub ${L0} ${L0}) (f64.const 0))
      (then (i32.const 0))
      (else (i32.wrap_i64 (i64.trunc_f64_s (f64.sub (f64.trunc ${L0})
        (f64.mul (f64.trunc (f64.div (f64.trunc ${L0}) (f64.const 4294967296))) (f64.const 4294967296)))))))`,
};

/** Integer power modulo 2ⁿ by squaring (wasm has none; this IS the definition, as in the
 *  TypeScript body); a negative exponent traps where the body throws. */
const powLoop = (t: "i32" | "i64"): WmHelper => {
  const lowBit = t === "i64"
    ? "(i32.wrap_i64 (i64.and (local.get $e) (i64.const 1)))"
    : "(i32.and (local.get $e) (i32.const 1))";
  return {
    params: [t, t],
    result: t,
    locals: `(local $r ${t}) (local $b ${t}) (local $e ${t})`,
    body: `(if (${t}.lt_s ${L1} (${t}.const 0)) (then (unreachable)))
    (local.set $r (${t}.const 1)) (local.set $b ${L0}) (local.set $e ${L1})
    (block $done (loop $next
      (br_if $done (${t}.eqz (local.get $e)))
      (if ${lowBit} (then (local.set $r (${t}.mul (local.get $r) (local.get $b)))))
      (local.set $b (${t}.mul (local.get $b) (local.get $b)))
      (local.set $e (${t}.shr_u (local.get $e) (${t}.const 1)))
      (br $next)))
    (local.get $r)`,
  };
};

const sel = (t: T, cmp: string): string => `(select ${L0} ${L1} (${t}.${cmp} ${L0} ${L1}))`;

/** Every wasm helper, keyed `<ns>_<member>`. */
export const WM_WAT: Record<string, WmHelper> = {
  toint32: TOINT32,

  // ── i32 ────────────────────────────────────────────────────────────────────────────────────
  i32_add: { params: ["i32", "i32"], result: "i32", body: bin("i32.add") },
  i32_sub: { params: ["i32", "i32"], result: "i32", body: bin("i32.sub") },
  i32_mul: { params: ["i32", "i32"], result: "i32", body: bin("i32.mul") },
  i32_div: { params: ["i32", "i32"], result: "i32", body: bin("i32.div_s") },
  i32_rem: { params: ["i32", "i32"], result: "i32", body: bin("i32.rem_s") },
  i32_and: { params: ["i32", "i32"], result: "i32", body: bin("i32.and") },
  i32_or: { params: ["i32", "i32"], result: "i32", body: bin("i32.or") },
  i32_xor: { params: ["i32", "i32"], result: "i32", body: bin("i32.xor") },
  i32_shl: { params: ["i32", "i32"], result: "i32", body: bin("i32.shl") },
  i32_shr: { params: ["i32", "i32"], result: "i32", body: bin("i32.shr_s") },
  i32_shrU: { params: ["i32", "i32"], result: "i32", body: bin("i32.shr_u") },
  i32_rotl: { params: ["i32", "i32"], result: "i32", body: bin("i32.rotl") },
  i32_rotr: { params: ["i32", "i32"], result: "i32", body: bin("i32.rotr") },
  i32_clz: { params: ["i32"], result: "i32", body: un("i32.clz") },
  i32_ctz: { params: ["i32"], result: "i32", body: un("i32.ctz") },
  i32_popcnt: { params: ["i32"], result: "i32", body: un("i32.popcnt") },
  i32_eqz: { params: ["i32"], result: "bool", body: un("i32.eqz") },
  i32_extend8: { params: ["i32"], result: "i32", body: un("i32.extend8_s") },
  i32_extend16: { params: ["i32"], result: "i32", body: un("i32.extend16_s") },
  i32_abs: {
    params: ["i32"], result: "i32",
    body: `(select (i32.sub (i32.const 0) ${L0}) ${L0} (i32.lt_s ${L0} (i32.const 0)))`,
  },
  i32_min: { params: ["i32", "i32"], result: "i32", body: sel("i32", "lt_s") },
  i32_max: { params: ["i32", "i32"], result: "i32", body: sel("i32", "gt_s") },
  i32_sign: {
    params: ["i32"], result: "i32",
    body: `(i32.sub (i32.gt_s ${L0} (i32.const 0)) (i32.lt_s ${L0} (i32.const 0)))`,
  },
  i32_pow: powLoop("i32"),
  i32_fromF64: { params: ["f64"], result: "i32", body: un("i32.trunc_f64_s") },
  i32_fromF64Sat: { params: ["f64"], result: "i32", body: un("i32.trunc_sat_f64_s") },
  i32_fromF64Wrap: { params: ["f64"], result: "i32", body: `(call $__wm_toint32 ${L0})`, uses: ["toint32"] },
  i32_fromF32: { params: ["f32"], result: "i32", body: un("i32.trunc_f32_s") },
  i32_fromF32Sat: { params: ["f32"], result: "i32", body: un("i32.trunc_sat_f32_s") },
  i32_fromI64: { params: ["i64"], result: "i32", body: un("i32.wrap_i64") },

  // ── u32 (carried as an exact f64) ──────────────────────────────────────────────────────────
  u32_from: { params: ["f64"], result: "f64", body: asU32(U0), uses: ["toint32"] },
  u32_add: { params: ["f64", "f64"], result: "f64", body: asU32(`(i32.add ${U0} ${U1})`), uses: ["toint32"] },
  u32_sub: { params: ["f64", "f64"], result: "f64", body: asU32(`(i32.sub ${U0} ${U1})`), uses: ["toint32"] },
  u32_mul: { params: ["f64", "f64"], result: "f64", body: asU32(`(i32.mul ${U0} ${U1})`), uses: ["toint32"] },
  u32_div: { params: ["f64", "f64"], result: "f64", body: asU32(`(i32.div_u ${U0} ${U1})`), uses: ["toint32"] },
  u32_rem: { params: ["f64", "f64"], result: "f64", body: asU32(`(i32.rem_u ${U0} ${U1})`), uses: ["toint32"] },
  u32_shr: { params: ["f64", "f64"], result: "f64", body: asU32(`(i32.shr_u ${U0} ${U1})`), uses: ["toint32"] },
  u32_lt: { params: ["f64", "f64"], result: "bool", body: `(i32.lt_u ${U0} ${U1})`, uses: ["toint32"] },
  u32_gt: { params: ["f64", "f64"], result: "bool", body: `(i32.gt_u ${U0} ${U1})`, uses: ["toint32"] },
  u32_le: { params: ["f64", "f64"], result: "bool", body: `(i32.le_u ${U0} ${U1})`, uses: ["toint32"] },
  u32_ge: { params: ["f64", "f64"], result: "bool", body: `(i32.ge_u ${U0} ${U1})`, uses: ["toint32"] },
  u32_min: {
    params: ["f64", "f64"], result: "f64", uses: ["toint32"],
    body: asU32(`(select ${U0} ${U1} (i32.lt_u ${U0} ${U1}))`),
  },
  u32_max: {
    params: ["f64", "f64"], result: "f64", uses: ["toint32"],
    body: asU32(`(select ${U0} ${U1} (i32.gt_u ${U0} ${U1}))`),
  },
  u32_toF64: { params: ["f64"], result: "f64", body: asU32(U0), uses: ["toint32"] },
  u32_fromF64: { params: ["f64"], result: "f64", body: asU32(un("i32.trunc_f64_u")) },
  u32_fromF64Sat: { params: ["f64"], result: "f64", body: asU32(un("i32.trunc_sat_f64_u")) },

  // ── i64 ────────────────────────────────────────────────────────────────────────────────────
  i64_from: { params: ["i64"], result: "i64", body: L0 },
  i64_add: { params: ["i64", "i64"], result: "i64", body: bin("i64.add") },
  i64_sub: { params: ["i64", "i64"], result: "i64", body: bin("i64.sub") },
  i64_mul: { params: ["i64", "i64"], result: "i64", body: bin("i64.mul") },
  i64_div: { params: ["i64", "i64"], result: "i64", body: bin("i64.div_s") },
  i64_rem: { params: ["i64", "i64"], result: "i64", body: bin("i64.rem_s") },
  i64_and: { params: ["i64", "i64"], result: "i64", body: bin("i64.and") },
  i64_or: { params: ["i64", "i64"], result: "i64", body: bin("i64.or") },
  i64_xor: { params: ["i64", "i64"], result: "i64", body: bin("i64.xor") },
  i64_shl: { params: ["i64", "i64"], result: "i64", body: bin("i64.shl") },
  i64_shr: { params: ["i64", "i64"], result: "i64", body: bin("i64.shr_s") },
  i64_shrU: { params: ["i64", "i64"], result: "i64", body: bin("i64.shr_u") },
  i64_rotl: { params: ["i64", "i64"], result: "i64", body: bin("i64.rotl") },
  i64_rotr: { params: ["i64", "i64"], result: "i64", body: bin("i64.rotr") },
  i64_clz: { params: ["i64"], result: "i64", body: un("i64.clz") },
  i64_ctz: { params: ["i64"], result: "i64", body: un("i64.ctz") },
  i64_popcnt: { params: ["i64"], result: "i64", body: un("i64.popcnt") },
  i64_eqz: { params: ["i64"], result: "bool", body: un("i64.eqz") },
  i64_extend8: { params: ["i64"], result: "i64", body: un("i64.extend8_s") },
  i64_extend16: { params: ["i64"], result: "i64", body: un("i64.extend16_s") },
  i64_extend32: { params: ["i64"], result: "i64", body: un("i64.extend32_s") },
  i64_abs: {
    params: ["i64"], result: "i64",
    body: `(select (i64.sub (i64.const 0) ${L0}) ${L0} (i64.lt_s ${L0} (i64.const 0)))`,
  },
  i64_min: { params: ["i64", "i64"], result: "i64", body: sel("i64", "lt_s") },
  i64_max: { params: ["i64", "i64"], result: "i64", body: sel("i64", "gt_s") },
  i64_sign: {
    params: ["i64"], result: "i64",
    body: `(i64.extend_i32_s (i32.sub (i64.gt_s ${L0} (i64.const 0)) (i64.lt_s ${L0} (i64.const 0))))`,
  },
  i64_pow: powLoop("i64"),
  i64_fromI32: { params: ["i32"], result: "i64", body: un("i64.extend_i32_s") },
  i64_fromU32: { params: ["f64"], result: "i64", body: `(i64.extend_i32_u ${U0})`, uses: ["toint32"] },
  i64_fromF64: { params: ["f64"], result: "i64", body: un("i64.trunc_f64_s") },
  i64_fromF64Sat: { params: ["f64"], result: "i64", body: un("i64.trunc_sat_f64_s") },
  i64_fromF32: { params: ["f32"], result: "i64", body: un("i64.trunc_f32_s") },
  i64_fromF32Sat: { params: ["f32"], result: "i64", body: un("i64.trunc_sat_f32_s") },

  // ── u64 (the same i64 bits; values ≥ 2⁶³ print signed: a known gap) ───────────────────────
  u64_from: { params: ["i64"], result: "i64", body: L0 },
  u64_div: { params: ["i64", "i64"], result: "i64", body: bin("i64.div_u") },
  u64_rem: { params: ["i64", "i64"], result: "i64", body: bin("i64.rem_u") },
  u64_shr: { params: ["i64", "i64"], result: "i64", body: bin("i64.shr_u") },
  u64_lt: { params: ["i64", "i64"], result: "bool", body: bin("i64.lt_u") },
  u64_gt: { params: ["i64", "i64"], result: "bool", body: bin("i64.gt_u") },
  u64_le: { params: ["i64", "i64"], result: "bool", body: bin("i64.le_u") },
  u64_ge: { params: ["i64", "i64"], result: "bool", body: bin("i64.ge_u") },
  u64_min: { params: ["i64", "i64"], result: "i64", body: sel("i64", "lt_u") },
  u64_max: { params: ["i64", "i64"], result: "i64", body: sel("i64", "gt_u") },
  u64_toF64: { params: ["i64"], result: "f64", body: un("f64.convert_i64_u") },
  u64_toF32: { params: ["i64"], result: "f32", body: un("f32.convert_i64_u") },
  u64_fromF64: { params: ["f64"], result: "i64", body: un("i64.trunc_f64_u") },
  u64_fromF64Sat: { params: ["f64"], result: "i64", body: un("i64.trunc_sat_f64_u") },
};

// f64 and f32 instruction-level members share one shape.
for (const t of ["f64", "f32"] as const) {
  const it = t === "f64" ? "i64" : "i32";
  for (const op of ["add", "sub", "mul", "div", "min", "max", "copysign"]) {
    WM_WAT[`${t}_${op}`] = { params: [t, t], result: t, body: bin(`${t}.${op}`) };
  }
  for (const op of ["neg", "abs", "sqrt", "ceil", "floor", "trunc", "nearest"]) {
    WM_WAT[`${t}_${op}`] = { params: [t], result: t, body: un(`${t}.${op}`) };
  }
  WM_WAT[`${t}_bits`] = { params: [t], result: it, body: un(`${it}.reinterpret_${t}`) };
  WM_WAT[`${t}_fromBits`] = { params: [it], result: t, body: un(`${t}.reinterpret_${it}`) };
  WM_WAT[`${t}_fromI32`] = { params: ["i32"], result: t, body: un(`${t}.convert_i32_s`) };
  WM_WAT[`${t}_fromU32`] = { params: ["f64"], result: t, body: `(${t}.convert_i32_u ${U0})`, uses: ["toint32"] };
  WM_WAT[`${t}_fromI64`] = { params: ["i64"], result: t, body: un(`${t}.convert_i64_s`) };
  WM_WAT[`${t}_fromU64`] = { params: ["i64"], result: t, body: un(`${t}.convert_i64_u`) };
  WM_WAT[`${t}_toI32`] = { params: [t], result: "i32", body: un(`i32.trunc_${t}_s`) };
  WM_WAT[`${t}_toI32Sat`] = { params: [t], result: "i32", body: un(`i32.trunc_sat_${t}_s`) };
  WM_WAT[`${t}_toU32`] = { params: [t], result: "f64", body: asU32(un(`i32.trunc_${t}_u`)) };
  WM_WAT[`${t}_toU32Sat`] = { params: [t], result: "f64", body: asU32(un(`i32.trunc_sat_${t}_u`)) };
  WM_WAT[`${t}_toI64`] = { params: [t], result: "i64", body: un(`i64.trunc_${t}_s`) };
  WM_WAT[`${t}_toI64Sat`] = { params: [t], result: "i64", body: un(`i64.trunc_sat_${t}_s`) };
  WM_WAT[`${t}_toU64`] = { params: [t], result: "i64", body: un(`i64.trunc_${t}_u`) };
  WM_WAT[`${t}_toU64Sat`] = { params: [t], result: "i64", body: un(`i64.trunc_sat_${t}_u`) };
}
WM_WAT.f64_fromF32 = { params: ["f32"], result: "f64", body: un("f64.promote_f32") };
WM_WAT.f64_toI32Wrap = { params: ["f64"], result: "i32", body: `(call $__wm_toint32 ${L0})`, uses: ["toint32"] };
WM_WAT.f32_from = { params: ["f64"], result: "f32", body: un("f32.demote_f64") };

/** f64 members that ARE JavaScript's `Math` (functions and constants): rewritten to `Math.<x>`. */
export const WM_F64_MATH = [
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh", "asinh", "acosh",
  "atanh", "exp", "expm1", "log", "log1p", "log2", "log10", "pow", "cbrt", "hypot", "round", "sign",
  "E", "LN10", "LN2", "LOG10E", "LOG2E", "PI", "SQRT1_2", "SQRT2",
];

/** f32 `Math`-style members: their TypeScript helpers, exactly the TypeScript bodies. */
const F32_UNARY = [
  "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "exp", "expm1", "log", "log1p", "log2", "log10", "cbrt",
];
const F32_BINARY = ["atan2", "pow", "hypot"];
export const WM_F32_TS: Record<string, string> = {};
for (const m of F32_UNARY) {
  WM_F32_TS[m] = `function __wm_f32_${m}(a: f64): f32 { return Math.fround(Math.${m}(Math.fround(a))); }`;
}
for (const m of F32_BINARY) {
  WM_F32_TS[m] =
    `function __wm_f32_${m}(a: f64, b: f64): f32 { return Math.fround(Math.${m}(Math.fround(a), Math.fround(b))); }`;
}
WM_F32_TS.round = `function __wm_f32_round(a: f64): f32 { return Math.round(Math.fround(a)); }`;
WM_F32_TS.sign = `function __wm_f32_sign(a: f64): f32 { return Math.sign(Math.fround(a)); }`;

/** The rewrites for one imported wasMath namespace: `local.member` → its lowering. */
export function wasMathRewrites(local: string, ns: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const key of Object.keys(WM_WAT)) {
    if (key.startsWith(`${ns}_`)) out.set(`${local}.${key.slice(ns.length + 1)}`, `__wm_${key}`);
  }
  if (ns === "f64") for (const m of WM_F64_MATH) out.set(`${local}.${m}`, `Math.${m}`);
  if (ns === "f32") for (const m of Object.keys(WM_F32_TS)) out.set(`${local}.${m}`, `__wm_f32_${m}`);
  return out;
}

/** The wasMath namespaces a program can import. */
export const WM_NAMESPACES = ["f64", "f32", "i32", "i64", "u32", "u64"];
