# Wasm number types in TypeScript: `Math` stays JavaScript's, a typed library carries wasm's (SCOPE, 2026-10-09)

**Status: SCOPE, nothing built.** Measured 2026-10-09 (`scripts/math/scan_math.ts`,
`scripts/math/ops_probe.ts`; Deno vs `wasmtk wasic` + `wasmtk run`). Extends wasm-math-plan.md
(the declared-type ruling, Phase 1) and replaces its Phase 3 "where the functions live" question.

## The principle (owner, 2026-10-09)

> "We can define the number types in TypeScript, but making the normal math library adhere to
> that won't work."

So there are TWO tracks, and they never mix:

- **Track M: `Math` is JavaScript's.** Every member takes and returns an f64 with exactly the
  JavaScript result. Deno is the reference; any difference is a compiler bug, not a design
  question. A declared `i32` going in is just an f64 value going in.
- **Track T: the wasm number types are a TypeScript library.** `i32`, `u32`, `i64`, `u64`, `f32`
  (with `f64` = `number`) and their operations, each with a TypeScript body that computes EXACTLY
  what the wasm instruction computes, so Deno and wasm agree by construction; wasic compiles each
  call to its one instruction. This is asm.js's answer: JavaScript already has an exact spelling
  for about half of it.

## Track M: every `Math` member, measured

Deno 2.9.7 (V8 15.0) has **39 functions and 8 constants** (`Object.getOwnPropertyNames(Math)`):
the 37 classic members plus `f16round` (ES2025) and `sumPrecise`. Measured two ways: a wide scan
(29 inputs per member, `scan_math.ts`), then ONE PROGRAM PER CALL (`math_table.ts`, the
appendix), because a trap ends a program and the wide scan blamed the lines after a trap on the
wrong inputs (corrected the same day).

**Identical to Deno on every input tried (23):** `abs`, `acos`, `asin`, `atan`, `atan2`, `atanh`,
`cbrt`, `ceil`, `exp`, `floor`, `fround`, `hypot`, `log1p`, `max`, `min`, `round`, `sign`,
`sqrt`, `tanh`, `trunc`, all 8 constants (alone; see sw62), `random` (range only: its VALUES can
never agree, see below); and `expm1` / `cos` / `pow` on ordinary inputs (their failures below).

**Not supported (2, a compile error):** `f16round`, `sumPrecise`.

**Wrong (14 members):**

| kind | members | measured (Deno → wasm) | class |
| --- | --- | --- | --- |
| invalid module | `clz32`, `imul` with an f64 argument | `i32.clz` / `i32.mul` handed an f64. JavaScript converts with ToInt32 (wrap mod 2³², NaN → 0) first | LOUD |
| trap on a huge argument | `sin` / `cos` / `tan(1e300)`, `pow(1e200, 1e200)`, `expm1(-1e10)`, `cosh` / `sinh(1e10)` | "float unrepresentable in integer range": a trapping `i32.trunc_f64_s` in range reduction | LOUD |
| impossible value | `sin(1e18)` | `-0.99…` → `5.98e+27` (right at 1e15 and ±2³¹) | SILENT |
| wrong value | `log` / `log10` / `log2` of a negative | `NaN` → `0` | SILENT |
| | `sin(-0)`, `tan(-0)` | `-0` → `0` | SILENT |
| | `pow(1, NaN)` | `NaN` → `1` (JavaScript differs from C here) | SILENT |
| last digit | `acosh`, `asinh`, `cosh`, `sinh` | 1–2 ulp: `acosh(2)` 1.3169578969248166 → …168; `sinh(2)` 3.626860407847019 → …186 | SILENT |

Found beside `Math` by the same table (a console bug, not a `Math` one): **sw62**, a long
`console.log` line of f64s corrupts a later line's text.

**What Track M needs** (no owner decision; bugs):

1. ToInt32 as one helper (`$__to_int32`: wrap modulo 2³², NaN/±Inf → 0), used by `clz32`, `imul`,
   the bitwise operators and `x | 0` on an f64 (below). Today `x | 0` with x = 4294967298.7
   TRAPS (JavaScript: 2).
2. Range reduction that never traps: the trig functions need the full argument reduction
   (fdlibm `__ieee754_rem_pio2` / `__kernel_rem_pio2`), not an i32 truncation.
3. Bit-exact algorithms. V8's math routines (`src/base/ieee754.cc`) derive from FreeBSD msun /
   fdlibm; matching them to the last bit means porting the same algorithms (verify against the V8
   version Deno ships before porting; `hypot` was matched this way in Phase 1, 224 calls
   identical). `pow` needs JavaScript's special cases (`pow(1, NaN)` is NaN; `pow(±1, ±Infinity)`
   is NaN).
4. `Math.random`: nothing can make the VALUES agree (a host's PRNG vs any wasm PRNG). Agreement is
   range and distribution only; say so in the user page.

## Track T: what plain TypeScript does to a declared wasm type, measured

`type i32 = number` is erased: Deno computes the f64 result. wasic computes the declared type.

| source (declared types) | Deno | wasm | agree? |
| --- | --- | --- | --- |
| `const c: i32 = 2147483647 + 1` | 2147483648 | −2147483648 | no: wrap |
| `const c: i32 = 65536 * 65536` | 4294967296 | 0 | no: wrap |
| `const q: i32 = 7 / 2` | 3.5 | 3 | no (ruled: i32 division truncates) |
| `const d: i32 = 1 / 0` | Infinity | TRAP | no |
| `-7 % 2` | −1 | −1 | yes |
| `-1 >>> 0` | 4294967295 | −1 | no: wasm has no u32 to print |
| `1 << 31`, `1 << 33`, `x << 1` | as wasm | as JS | yes (JavaScript shifts ARE int32) |
| `x \| 0`, x = 4294967298.7 | 2 | TRAP | no: a bug (ToInt32) |
| `const fa: f32 = 0.1` printed | 0.1 | 0.10000000149011612 | no: TS never rounds to f32 |
| `fa + fb` (f32) vs `Math.fround(Math.fround(0.1) + Math.fround(0.2))` | — | 0.30000001192092896 both | **yes, exactly** |
| `9223372036854775807n + 1n` (i64) | 9223372036854775808n | −9223372036854775808n | no: BigInt is unbounded |

### The library: one TypeScript body per wasm operation, exact in both

JavaScript ALREADY spells these exactly (asm.js's idioms); wasic can compile the idiom to the one
instruction and drop the no-op coercion:

| wasm | exact TypeScript | note |
| --- | --- | --- |
| `i32.add` / `sub` | `(a + b) \| 0` | exact: both operands < 2³¹, the f64 sum is exact, ToInt32 wraps |
| `i32.mul` | `Math.imul(a, b)` | NOT `(a * b) \| 0` (the f64 product rounds above 2⁵³) |
| `i32.and/or/xor/shl/shr_s` | `&` `\|` `^` `<<` `>>` | already int32 in JavaScript |
| `i32.shr_u`, any u32 | `>>> 0` | prints the unsigned value; wasm needs a u32 TYPE to print the same |
| `i32.clz` | `Math.clz32(x)` | |
| `f32.add/sub/mul/div/sqrt` | `Math.fround(fround(a) op fround(b))` | exact: f64 has ≥ 2·24+2 bits, so the double rounding is innocuous for these five |
| `f32` constant | `Math.fround(0.1)` | then both print 0.10000000149011612 |
| `i64.add/sub/mul` | `BigInt.asIntN(64, a op b)` | |
| `u64` | `BigInt.asUintN(64, …)` | |
| `f64.min/max/abs/sqrt/floor/ceil/trunc` | the `Math` member | identical (Track M) |

JavaScript has NO exact spelling for these; the library supplies a TypeScript body that matches:

| library function (candidate names) | TypeScript body | wasm |
| --- | --- | --- |
| `idiv(a, b)` | throw on b = 0 or (−2³¹ / −1), else `Math.trunc(a / b)` | `i32.div_s` (traps where the body throws) |
| `irem(a, b)` | throw on b = 0, else `a % b` | `i32.rem_s` |
| `udiv`, `urem`, `ult`/`ugt`/… | on `a >>> 0`, `b >>> 0` | `i32.div_u`, `rem_u`, `lt_u`… |
| `ctz32`, `popcnt32` | bit loops | `i32.ctz`, `i32.popcnt` |
| `rotl32`, `rotr32` | `(x << k \| x >>> (32 − k)) \| 0` | `i32.rotl`, `i32.rotr` |
| `toI32Sat(x)` | clamp to [−2³¹, 2³¹−1], NaN → 0 | `i32.trunc_sat_f64_s` |
| `toI32(x)` | `x \| 0` (ToInt32: wrap) | helper (no single instruction) |
| `roundEven(x)` | ties to even | `f64.nearest` |
| `copysign(x, y)` | `Math.abs(x)` with `y`'s sign (−0 negative) | `f64.copysign` |
| `i64` `div`/`rem`/`shr_u`/`clz`/`ctz`/`popcnt`/`rotl` | BigInt bodies with `asIntN` / `asUintN` | the `i64.*` instruction |
| `reinterpret`s | `DataView` | `f64.reinterpret_i64`, … |

## What stays a decision for the owner

- **T1. Where the library lives.** The principle rules out a global `Math` extension. A wasmtk
  module (`import { idiv, u32 } from "@jrmarcum/wasmtk/num"`, or a local file the program
  imports) runs unchanged under Deno and is recognised by wasic. (Was wasm-math-plan.md D2.)
- **T2. Operators on declared types without the idiom.** `const c: i32 = a + b` cannot agree in
  general (Deno does not wrap). Options: (a) as now, the declared type decides, plus a
  compile-time NOTE where they can differ (wasm-math-plan.md D6); (b) a strict mode that REQUIRES
  the idiom or the library for `+ - * /` on integers, so every line agrees (asm.js validation),
  heavy for existing code; (c) nothing. Recommendation: (a) by default, (b) as an opt-in flag.
- **T3. Division** (sw36, sw37, wasm-math-plan.md D1) fits here: `idiv` for "I mean wasm's
  division", plain `/` for "I mean JavaScript's". The D1 question then narrows to what plain `/`
  on two i32s means when nothing says.
- **T4. Unsigned and f32 printing.** A `u32` type (printed unsigned, compared with `_u`) and an
  `f32` type whose initialiser is rounded the same in TypeScript (`Math.fround`) make the printed
  values agree; without them `-1 >>> 0` and `0.1` print differently by construction.
- **T5. Which library functions** (the tables above are candidates, not a commitment; was D4).

## Bugs the scan found (logged in compiler-bugs.md, H12 round 1, 2026-10-09)

sw57 (`log` family of a negative → 0), sw58 (`sin` / `tan` lose −0), sw59 (`pow(1, NaN)`), sw60
(`acosh` / `asinh` / `cosh` / `sinh` last digit), sw61 (`sin(1e18)` impossible value), sw62
(console line corruption), ld27 (`clz32` / `imul` of an f64: invalid module), ld28 (trig / `pow` /
`expm1` / `cosh` / `sinh` trap on huge arguments), ld29 (`x | 0` traps out of range: ToInt32).

## Appendix: every `Math` member, one program per call (2026-10-09, Deno 2.9.7 / V8 15.0)

Re-derive with `deno run -A scripts/math/math_table.ts <scratch dir>`. "—" = same as Deno.

| member | call | Deno | wasic |
| --- | --- | --- | --- |
| `abs` | `abs(-2.5)` · `abs(-0)` · `abs(NaN)` · `abs(-2147483648)` | 2.5 · 0 · NaN · 2147483648 | — |
| `acos` | `acos(0.5)` · `acos(1)` · `acos(-1)` · `acos(2)` | 1.0471975511965979 · 0 · 3.141592653589793 · NaN | — |
| `acosh` | `acosh(1)` · `acosh(2)` · `acosh(100)` · `acosh(0.5)` | 0 · 1.3169578969248166 · 5.298292365610484 · NaN | 0 · **…168** · **…485** · NaN |
| `asin` | `asin(0.5)` · `asin(1)` · `asin(-0)` · `asin(2)` | 0.5235987755982989 · 1.5707963267948966 · -0 · NaN | — |
| `asinh` | `asinh(1.5)` · `asinh(0.1)` · `asinh(-0)` · `asinh(1e300)` | 1.1947632172871094 · 0.09983407889920758 · -0 · 691.4686750787736 | **…092** · **…756** · -0 · **…737** |
| `atan` | `atan(1)` · `atan(-0)` · `atan(Infinity)` · `atan(1e10)` | 0.7853981633974483 · -0 · 1.5707963267948966 · 1.5707963266948965 | — |
| `atan2` | `atan2(1, 2)` · `atan2(0, -0)` · `atan2(-1, -0)` · `atan2(∞, ∞)` | 0.4636476090008061 · 3.141592653589793 · -1.5707963267948966 · 0.7853981633974483 | — |
| `atanh` | `atanh(0.5)` · `atanh(-0)` · `atanh(1)` · `atanh(2)` | 0.5493061443340549 · -0 · Infinity · NaN | — |
| `cbrt` | `cbrt(27)` · `cbrt(-8)` · `cbrt(2)` · `cbrt(-0)` | 3 · -2 · 1.2599210498948732 · -0 | — |
| `ceil` | `ceil(1.2)` · `ceil(-1.5)` · `ceil(-0.5)` · `ceil(1e300)` | 2 · -1 · -0 · 1e+300 | — |
| `clz32` | `clz32(1)` · `clz32(0)` · `clz32(4294967295)` · `clz32(0.5)` | 31 · 32 · 0 · 32 | **invalid module** (ld27) |
| `cos` | `cos(0)` · `cos(1)` · `cos(NaN)` · `cos(1e10)` · `cos(1e300)` | 1 · 0.5403023058681398 · NaN · 0.873119622676856 · -0.5753861119575491 | — · — · — · — · **trap** |
| `cosh` | `cosh(0)` · `cosh(2)` · `cosh(10)` · `cosh(1000)` · `cosh(1e10)` | 1 · 3.7621956910836314 · 11013.232920103324 · Infinity · Infinity | — · — · **…323** · — · **trap** |
| `exp` | `exp(1)` · `exp(-1)` · `exp(710)` · `exp(-Infinity)` | 2.718281828459045 · 0.36787944117144233 · Infinity · 0 | — |
| `expm1` | `expm1(1e-10)` · `expm1(1)` · `expm1(-0)` · `expm1(1e10)` · `expm1(-1e10)` | 1.00000000005e-10 · 1.7182818284590453 · -0 · Infinity · -1 | — · — · — · — · **trap** |
| `f16round` | `f16round(1.337)` · `(65520)` · `(5e-8)` · `(-0)` | 1.3369140625 · Infinity · 5.960464477539063e-8 · -0 | **not supported** |
| `floor` | `floor(1.7)` · `floor(-1.2)` · `floor(-0)` · `floor(0.49999999999999994)` | 1 · -2 · -0 · 0 | — |
| `fround` | `fround(0.1)` · `fround(1.337)` · `fround(3.4e39)` · `fround(5e-324)` | 0.10000000149011612 · 1.3370000123977661 · Infinity · 0 | — |
| `hypot` | `hypot(3, 4)` · `hypot(1e200, 1e200)` · `hypot(∞, NaN)` · `hypot(-3, -0)` | 5 · 1.414213562373095e+200 · Infinity · 3 | — |
| `imul` | `imul(3, 4)` · `imul(2147483647, 2)` · `imul(-5, 12)` · `imul(4294967295, 5)` | 12 · -2 · -60 · -5 | **invalid module** (ld27) |
| `log` | `log(1)` · `log(10)` · `log(0)` · `log(-1)` | 0 · 2.302585092994046 · -Infinity · NaN | — · — · — · **0** |
| `log10` | `log10(1000)` · `log10(2)` · `log10(0)` · `log10(-1)` | 3 · 0.3010299956639812 · -Infinity · NaN | — · — · — · **0** |
| `log1p` | `log1p(1e-10)` · `log1p(1)` · `log1p(-1)` · `log1p(-2)` | 9.999999999500001e-11 · 0.6931471805599453 · -Infinity · NaN | — |
| `log2` | `log2(8)` · `log2(3)` · `log2(0)` · `log2(-1)` | 3 · 1.584962500721156 · -Infinity · NaN | — · — · — · **0** |
| `max` | `max(1, 2)` · `max(0, -0)` · `max(NaN, 1)` · `max(-∞, -1)` | 2 · 0 · NaN · -1 | — |
| `min` | `min(1, 2)` · `min(0, -0)` · `min(NaN, 1)` · `min(∞, 1)` | 1 · -0 · NaN · 1 | — |
| `pow` | `pow(2, 10)` · `pow(2, 0.5)` · `pow(-2.5, 3)` · `pow(1, NaN)` · `pow(1e200, 1e200)` | 1024 · 1.4142135623730951 · -15.625 · NaN · Infinity | — · — · — · **1** · **trap** |
| `random` | `random()` | in [0, 1) | — (values never agree) |
| `round` | `round(2.5)` · `round(-2.5)` · `round(0.49999999999999994)` · `round(-0.4)` | 3 · -2 · 0 · -0 | — |
| `sign` | `sign(3)` · `sign(-3)` · `sign(-0)` · `sign(NaN)` | 1 · -1 · -0 · NaN | — |
| `sin` | `sin(1)` · `sin(-0)` · `sin(π)` · `sin(1e10)` · `sin(1e18)` · `sin(1e300)` | 0.8414709848078965 · -0 · 1.2246467991473532e-16 · -0.4875060250875107 · -0.9929693207404051 · -0.8178819121159085 | — · **0** · — · — · **5.98e+27** · **trap** |
| `sinh` | `sinh(1)` · `sinh(2)` · `sinh(-0)` · `sinh(1000)` · `sinh(1e10)` | 1.1752011936438014 · 3.626860407847019 · -0 · Infinity · Infinity | — · **…186** · — · — · **trap** |
| `sqrt` | `sqrt(2)` · `sqrt(16)` · `sqrt(-1)` · `sqrt(-0)` | 1.4142135623730951 · 4 · NaN · -0 | — |
| `sumPrecise` | `sumPrecise([0.1, 0.2, 0.3])` · `sumPrecise([1e20, 0.1, -1e20])` | 0.6 · 0.1 | **not supported** |
| `tan` | `tan(1)` · `tan(-0)` · `tan(π/4)` · `tan(1e10)` · `tan(1e300)` | 1.5574077246549023 · -0 · 0.9999999999999999 · -0.5583496378112418 · 1.4214488238747245 | — · **0** · — · — · **trap** |
| `tanh` | `tanh(1)` · `tanh(-0)` · `tanh(20)` · `tanh(-Infinity)` | 0.7615941559557649 · -0 · 1 · -1 | — |
| `trunc` | `trunc(2.7)` · `trunc(-2.7)` · `trunc(-0.5)` · `trunc(1e300)` | 2 · -2 · -0 · 1e+300 | — |
| constants | `E` `LN10` `LN2` `LOG10E` `LOG2E` `PI` `SQRT1_2` `SQRT2` | 2.718281828459045 · 2.302585092994046 · 0.6931471805599453 · 0.4342944819032518 · 1.4426950408889634 · 3.141592653589793 · 0.7071067811865476 · 1.4142135623730951 | — (alone) |
