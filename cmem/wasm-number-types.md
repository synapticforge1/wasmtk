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

37 functions, 8 constants. Each function over 29 inputs (0, −0, ±0.5, ±1, ±1.5, 2, ±2.5, 3,
±3.7, 10, 100, 0.1, 1e−300, 5e−324, 1e300, 1e10, ±2³¹ edges, 2³²−1, 2⁵³+1,
0.49999999999999994, NaN, ±Infinity); binary members over 21 pairs.

**Identical to Deno (23):** `abs`, `acos`, `asin`, `atan`, `atanh`, `cbrt`, `ceil`, `exp`, `floor`,
`fround`, `log1p`, `round`, `sign`, `sqrt`, `tanh`, `trunc`, `atan2`, `max`, `min`, `hypot`, all 8
constants, `random` (range only: its VALUES can never agree, see below).

**Wrong (14 members), four kinds:**

| kind | members | measured (Deno → wasm) | class |
| --- | --- | --- | --- |
| invalid module | `clz32`, `imul` with an f64 argument | `i32.clz` / `i32.mul` handed an f64. JavaScript converts with ToInt32 (wrap mod 2³², NaN → 0) first | LOUD |
| trap on a large argument | `sin`, `cos`, `tan` (1e10, 1e300, ±2³¹), `pow` (`pow(-2.5, 3)`, 1e200²), `expm1`, `cosh`, `sinh` | "float unrepresentable in integer range": range reduction uses a trapping `i32.trunc_f64_s` | LOUD |
| wrong value | `log` / `log10` / `log2` of a negative | `NaN` → `0` | SILENT |
| | `sin(-0)`, `tan(-0)` | `-0` → `0` | SILENT |
| | `pow(1, NaN)` | `NaN` → `1` (JavaScript differs from C here) | SILENT |
| last digit | `acosh`, `asinh`, `cosh`, `sinh` | 1–2 ulp: `acosh(2)` 1.3169578969248166 → …168; `sinh(2)` 3.626860407847019 → …186 | SILENT |

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
(`acosh` / `asinh` / `cosh` / `sinh` last digit), ld27 (`clz32` / `imul` of an f64: invalid
module), ld28 (trig / `pow` / `expm1` / `cosh` / `sinh` trap on large arguments), ld29 (`x | 0`
traps out of range: ToInt32).
