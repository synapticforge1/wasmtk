# Wasm number types in TypeScript: `Math` stays JavaScript's, a typed library carries wasm's (SCOPE, 2026-10-09)

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 2.** The sections continue in:

- [wasm-number-types-2.md](wasm-number-types-2.md): from "Appendix: every `Math` member, one program per call (2026-10-09, Deno 2.9.7 / V8"

**Status: L1–L4 DONE (L4 2026-10-13), and D3 built the same day** (a float stored into a declared
integer, or `as i32` on one, is a compile error naming `f64.toI32` / `toI32Sat` / `toI32Wrap`;
indices and positions kept; this closes the library's known gap of an out-of-range f64 into an
`i32.*` argument). **L4:** **L4**, the operator bugs, both emitters: ld29 (every
bitwise / shift operand and `~` is ToInt32'd, never a trapping trunc), ld31 (bigint `&` `|` `^`
are i64 ops; `<<` / `>>` follow JavaScript's unbounded count wrapped to 64 bits via
`$__i64_shl` / `$__i64_shr`; bigint `>>>` is a compile error), ld30 (bigint `**` is
`$__i64_pow`), sw64 (a negated bigint keeps its `n`; with it, unary `-` of a bigint parameter
and `~` of a bigint or float), and **a `u64` prints unsigned**: wasic records names, parameters
and results declared `u64` (`u64Vars`, `u64Globals`, `FuncParam.isU64`, `FuncDef.isU64Result`,
plus the wasMath helpers returning u64 bits; `isU64Expr`) and the console prints them with
`$__u64_to_str` (requested only when used). Not covered: a u64 struct field or array element
(prints signed). Corpus `39_WasMathL4Operators`; the L2 battery and the corpus generator no
longer skip u64 ≥ 2⁶³. Earlier, **L1, L2 and L3 DONE 2026-10-09.** **L3** (owner decision **"CR, in both"**: compiled
`Math` stays correctly rounded, and wasMath's Math-style members give that SAME value in Deno):
`src/wasmath.ts`'s f64 `sin` … `pow`, `cbrt` call the embedded mathlib (`MATHLIB_BYTES`, compiled
on first use), f32's are `fround(f64.op(fround(a)))` over them; plain `Math.*` in Deno is V8's and
may differ by 1 ulp (sw60, documented). mathlib fixes: sw57, sw58, sw59, ld28 (range guards before
any integer conversion), ld33, and sw61 by a Payne–Hanek reduction from |x| ≥ 2²⁸
(`scripts/math/gen_payne_hanek.ts`). Both emitters: ld27 (ToInt32 for `clz32` / `imul`), sw63 (a
bigint into `Math` is a diagnostic). Measured: `wasmath_lower_tests` **199 / 199 exact** (no
"known" class any more); sin / cos / tan correctly rounded on 18,699 calls over the whole double
range (`math_cr_oracle.ts`, its trig reduction made exact); corpus `38_MathEdgeCasesL3`, and
`39_WasMathAllFunctions` now carries all 199. **Next: L4** (ld29, ld30, ld31, sw64; the u64 ≥ 2⁶³
printer). **Also 2026-10-09 (owner):** a plain `/` between integers is a compile error that
names `i32.div` / `f64.div`: the first operator wasMath REPLACES rather than mirrors
(design-decisions.md § "Wasm types in TypeScript"). Earlier, L1 and L2: L1: `src/wasmath.ts` (export `./wasMath`), 151 functions
exact to the real instructions (`tests/wasmath_tests.ts`). **L2:** `src/wasmath_lower.ts` is the
one lowering table; the bundler rewrites `ns.member` (a raw-WAT helper `__wm_<ns>_<member>`,
`Math.<x>` for the f64 Math members, an f32 TypeScript helper), and `WasicTranspiler` registers the
helpers a program uses as ordinary typed functions (`FuncDef.wasmathWat`). `u32` is carried as an
exact f64 (`$__wm_toint32` takes the bits); `u64` maps to i64. `tests/wasmath_lower_tests.ts`
(every function from real compiled programs vs Deno; ~15 min): **199 functions, 34,626 calls,
176 exact, 0 failed**, 23 known (the `Math`-style members: the Math bugs, ld33's hang, ld28's
traps); 220 u64 ≥ 2⁶³ inputs skipped (printing gap). The corpus runs it on every gate:
`39_WasMathAllFunctions` (all 151, identical to Deno) and `39_WasMathStopsTheSame` (a trap and a
throw stop at the same line). The corpus itself now takes its types from wasMath (285 files: 278
wasi programs + 7 bindgen fixtures; golden-WAT 0 changed). **Next: L3** (the `Math` bugs:
sw57–sw61, sw63, ld27, ld28, ld33). Known gaps: u64 ≥ 2⁶³ prints signed; an f64 OUT of the
int32 range passed to an `i32.*` function traps (wasic's f64 → i32 rule) where the body wraps.
Earlier: Direction set by the owner 2026-10-09: a complete
library, one namespace per wasm value type (f64, f32, i32, i64; u32 / u64 as views); see
§ "The library". DECIDED the same day: T1 = a wasmtk module named `wasMath` (source
`src/wasmath.ts`); T6 = traps are throws, "so TypeScript and wasm stop the same".** Measured 2026-10-09 (`scripts/math/scan_math.ts`,
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

(Table as a list — kind · members · measured (Deno → wasm) · class:)

- invalid module — members: `clz32`, `imul` with an f64 argument — measured (Deno → wasm): `i32.clz`
  / `i32.mul` handed an f64. JavaScript converts with ToInt32 (wrap mod 2³², NaN → 0) first — class:
  LOUD
- trap on a huge argument — members: `sin` / `cos` / `tan(1e300)`, `pow(1e200, 1e200)`,
  `expm1(-1e10)`, `cosh` / `sinh(1e10)` — measured (Deno → wasm): "float unrepresentable in integer
  range": a trapping `i32.trunc_f64_s` in range reduction — class: LOUD
- impossible value — members: `sin(1e18)` — measured (Deno → wasm): `-0.99…` → `5.98e+27` (right at
  1e15 and ±2³¹) — class: SILENT
- wrong value — members: `log` / `log10` / `log2` of a negative — measured (Deno → wasm): `NaN` →
  `0` — class: SILENT
- members: `sin(-0)`, `tan(-0)` — measured (Deno → wasm): `-0` → `0` — class: SILENT
- members: `pow(1, NaN)` — measured (Deno → wasm): `NaN` → `1` (JavaScript differs from C here) —
  class: SILENT
- last digit — members: `acosh`, `asinh`, `cosh`, `sinh` — measured (Deno → wasm): 1–2 ulp:
  `acosh(2)` 1.3169578969248166 → …168; `sinh(2)` 3.626860407847019 → …186 — class: SILENT

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

## The library: f64, f32, i32, i64, each complete (owner, 2026-10-09)

> "So we need to implement i64, f32, and i32 math functions then." … "We might as well implement
> the f64 math functions also as a complete wasm library."

The types possible in BOTH for assignment (2026-10-09): only `number` (= f64) and `bigint`
(= i64) are JavaScript value types; `i32` and `f32` are subsets of `number` that agree when the
value is representable. Hence four namespaces, one per wasm value type, each with the SAME shape,
plus `u32` / `u64` as the unsigned views of `i32` / `i64`:

```ts
import { f32, f64, i32, i64, u32, u64 } from "<T1: where it lives>";
type i32 = number;                  // a type and a value may share a name in TypeScript
const q: i32 = i32.div(a, b);       // Deno runs the body; wasic emits i32.div_s
const s: f64 = f64.sin(x);          // Deno runs Math.sin; wasic emits the V8-exact sin
```

Every function: a TypeScript body that computes EXACTLY the wasm result (Deno runs it), and a
wasm lowering (wasic emits one instruction or a shared helper). A trap in wasm is a throw in the
body, with the same meaning: `RangeError("integer divide by zero")`, `("integer overflow")`,
`("invalid conversion to integer")`.

**f64** (TypeScript body: `Math` / plain `number`; wasm: instruction or a V8-exact helper)

(Table as a list — group · functions:)

- instructions — functions: `add` `sub` `mul` `div` `neg` `abs` `sqrt` `min` `max` `ceil` `floor`
  `trunc` `nearest` (ties-to-even; JavaScript has none, body supplied) `copysign` (body supplied)
- JavaScript `Math` — functions: `sin` `cos` `tan` `asin` `acos` `atan` `atan2` `sinh` `cosh` `tanh`
  `asinh` `acosh` `atanh` `exp` `expm1` `log` `log1p` `log2` `log10` `pow` `cbrt` `hypot` `round`
  `sign` + the 8 constants. AS BUILT (L3, "CR, in both"): wasm runs the correctly rounded mathlib
  (not fdlibm ports, as first proposed), and the TypeScript bodies of `sin` … `pow`, `cbrt` run the
  SAME mathlib in Deno; `hypot` `round` `sign` are V8-exact helpers with JavaScript bodies
- conversions — functions: `fromI32` `fromU32` `fromI64` `fromU64` (`convert_*`), `fromF32`
  (`promote`), `toI32` / `toI64` (`trunc_*_s`, throws where wasm traps), `toI32Sat` / `toI64Sat`
  (`trunc_sat`), `toI32Wrap` (JavaScript's ToInt32, `x \| 0`), `bits` / `fromBits` (`reinterpret` ↔
  i64, via `DataView`)
- optional — functions: `random(seed)`: a seeded PRNG with the SAME body in both (e.g. xorshift), so
  values agree; `Math.random` never can

**f32** (body: `Math.fround` around f64 operations; wasm: native f32)

| group | functions |
| --- | --- |
| instructions | `add` `sub` `mul` `div` `sqrt` (exact: f64 rounding then `fround` equals the f32 operation for these five) `neg` `abs` `min` `max` `ceil` `floor` `trunc` `nearest` `copysign` |
| beyond wasm | `sin` … `pow` etc. DEFINED as `fround(f64.op(x))` in both (the wasm side computes the f64 helper, then `demote`); exact by definition, NOT C's `sinf` |
| conversions | `from` (`Math.fround` / `demote`), `fromI32` … `fromU64`, `toI32` … (`trunc_f32_*`, sat), `bits` / `fromBits` (↔ i32) |

**i32** (body: int32 arithmetic on `number`; wasm: native i32) and **u32** (the `_u` view)

(Table as a list — group · functions:)

- instructions — functions: `add` `sub` (`(a ± b) \| 0`), `mul` (`Math.imul`), `div` / `rem` (throw
  on 0 and −2³¹ / −1; `Math.trunc(a / b)` is exact for int32 operands), `and` `or` `xor` `shl` `shr`
  (`>>`), `shrU` (`>>>`, as u32), `rotl` `rotr`, `clz` (`Math.clz32`) `ctz` `popcnt`, `eqz`,
  `extend8` `extend16`
- beyond wasm — functions: `abs` (wraps: `abs(-2³¹)` = −2³¹), `min` `max`, `sign`, `pow` (wrapping,
  by `imul`)
- u32 view — functions: `u32.div` `rem` `lt` `gt` `le` `ge` `min` `max` (`>>> 0` operands),
  `u32.toF64`, printing unsigned
- conversions — functions: `fromF64` / `fromF32` (trap / sat / wrap variants as in f64), `wrap`
  (from i64)

**i64** (body: `bigint` with `BigInt.asIntN(64, …)`; wasm: native i64) and **u64** (`asUintN`)

(Table as a list — group · functions:)

- instructions — functions: `add` `sub` `mul` (wrap by `asIntN`), `div` / `rem` (BigInt truncates
  like wasm; throw on 0 and −2⁶³ / −1, where BigInt itself would NOT throw), `and` `or` `xor` `shl`
  `shr` `shrU` `rotl` `rotr` `clz` `ctz` `popcnt` `eqz` `extend8` `extend16` `extend32`
- beyond wasm — functions: `abs` `min` `max` `sign` `pow` (wrapping)
- u64 view — functions: the `_u` comparisons, division, `toF64`
- conversions — functions: `fromI32` / `fromU32` (`extend_i32_s/u`), `fromF64` / `fromF32` (trap /
  sat), `toI32` (`wrap`)

**Order of work (proposal):**

1. **L1. The library as TypeScript.** Every body, runnable in Deno, with a battery per function
   (`scripts/math/` style: edge values, both signs, overflow, NaN, ±0).
2. **L2. wasic recognises the library.** Each call lowers to its instruction or helper; the
   battery then compares Deno and wasm per call, as `math_table.ts` does for `Math`.
3. **L3. f64 parity (Track M). DONE 2026-10-09**, as "CR, in both" rather than V8-exact (the
   owner's choice after the measurement: on every sw60 input ours was correctly rounded and V8
   1 ulp off). Non-trapping range reduction (Payne–Hanek), JavaScript's special cases; `Math.*`
   and `f64.*` share the mathlib, and wasMath runs it in Deno too. Closed sw57–sw59, sw61, sw63,
   ld27, ld28, ld33; sw60 by decision.
4. **L4. The operator bugs on the way** (ld29 `x | 0`, ld30 / ld31 bigint `**` / bitwise /
   shifts, sw64), since the i32 / i64 namespaces lower to the same instructions.

## What stays a decision for the owner

- **T1. DECIDED (owner, 2026-10-09): a wasmtk module called `wasMath`.** (Was: where the
  library lives, and its name.) The principle rules out a global `Math`
  extension. A wasmtk module (e.g. `@jrmarcum/wasmtk/num`, or a local file the program imports)
  runs unchanged under Deno and is recognised by wasic. Namespaces named like the type aliases
  (`i32.add`) read naturally; TypeScript allows a type and a value to share a name. (Was
  wasm-math-plan.md D2.)
- **T6. DECIDED (owner, 2026-10-09): traps are throws, "so TypeScript and wasm stop the
  same".** The bodies throw `RangeError` where wasm traps, so a Deno run stops
  where the wasm run would. The alternative (a saturating or wrapping body that never throws)
  would make the two DISAGREE at exactly those inputs.
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
A bigint probe the same day: sw63 (`Math` accepts a bigint argument; JavaScript throws), sw64
(`-a` prints without `n`), ld30 (bigint `**` unsupported), ld31 (bigint `&` `|` `^` `<<` `>>`
build invalid modules). bigint `+ - * / %` and unary `-` agree.

