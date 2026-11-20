# wasm-number-types — part 2 of 2

Continues [wasm-number-types.md](wasm-number-types.md) (split by size on 2026-11-20, letter H38). Sections:

- Appendix: every `Math` member, one program per call (2026-10-09, Deno 

## Appendix: every `Math` member, one program per call (2026-10-09, Deno 2.9.7 / V8 15.0)

Re-derive with `bun scripts/math/math_table.ts <scratch dir>` (its reference column still runs
Deno: a V8 oracle). "—" = same as Deno.

(Table as a list — member · call · Deno · wasic:)

- `abs` — call: `abs(-2.5)` · `abs(-0)` · `abs(NaN)` · `abs(-2147483648)` — Deno: 2.5 · 0 · NaN ·
  2147483648 — wasic: —
- `acos` — call: `acos(0.5)` · `acos(1)` · `acos(-1)` · `acos(2)` — Deno: 1.0471975511965979 · 0 ·
  3.141592653589793 · NaN — wasic: —
- `acosh` — call: `acosh(1)` · `acosh(2)` · `acosh(100)` · `acosh(0.5)` — Deno: 0 ·
  1.3169578969248166 · 5.298292365610484 · NaN — wasic: 0 · **…168** · **…485** · NaN
- `asin` — call: `asin(0.5)` · `asin(1)` · `asin(-0)` · `asin(2)` — Deno: 0.5235987755982989 ·
  1.5707963267948966 · -0 · NaN — wasic: —
- `asinh` — call: `asinh(1.5)` · `asinh(0.1)` · `asinh(-0)` · `asinh(1e300)` — Deno:
  1.1947632172871094 · 0.09983407889920758 · -0 · 691.4686750787736 — wasic: **…092** · **…756** ·
  -0 · **…737**
- `atan` — call: `atan(1)` · `atan(-0)` · `atan(Infinity)` · `atan(1e10)` — Deno: 0.7853981633974483
  · -0 · 1.5707963267948966 · 1.5707963266948965 — wasic: —
- `atan2` — call: `atan2(1, 2)` · `atan2(0, -0)` · `atan2(-1, -0)` · `atan2(∞, ∞)` — Deno:
  0.4636476090008061 · 3.141592653589793 · -1.5707963267948966 · 0.7853981633974483 — wasic: —
- `atanh` — call: `atanh(0.5)` · `atanh(-0)` · `atanh(1)` · `atanh(2)` — Deno: 0.5493061443340549 ·
  -0 · Infinity · NaN — wasic: —
- `cbrt` — call: `cbrt(27)` · `cbrt(-8)` · `cbrt(2)` · `cbrt(-0)` — Deno: 3 · -2 ·
  1.2599210498948732 · -0 — wasic: —
- `ceil` — call: `ceil(1.2)` · `ceil(-1.5)` · `ceil(-0.5)` · `ceil(1e300)` — Deno: 2 · -1 · -0 ·
  1e+300 — wasic: —
- `clz32` — call: `clz32(1)` · `clz32(0)` · `clz32(4294967295)` · `clz32(0.5)` — Deno: 31 · 32 · 0 ·
  32 — wasic: **invalid module** (ld27)
- `cos` — call: `cos(0)` · `cos(1)` · `cos(NaN)` · `cos(1e10)` · `cos(1e300)` — Deno: 1 ·
  0.5403023058681398 · NaN · 0.873119622676856 · -0.5753861119575491 — wasic: — · — · — · — ·
  **trap**
- `cosh` — call: `cosh(0)` · `cosh(2)` · `cosh(10)` · `cosh(1000)` · `cosh(1e10)` — Deno: 1 ·
  3.7621956910836314 · 11013.232920103324 · Infinity · Infinity — wasic: — · — · **…323** · — ·
  **trap**
- `exp` — call: `exp(1)` · `exp(-1)` · `exp(710)` · `exp(-Infinity)` — Deno: 2.718281828459045 ·
  0.36787944117144233 · Infinity · 0 — wasic: —
- `expm1` — call: `expm1(1e-10)` · `expm1(1)` · `expm1(-0)` · `expm1(1e10)` · `expm1(-1e10)` — Deno:
  1.00000000005e-10 · 1.7182818284590453 · -0 · Infinity · -1 — wasic: — · — · — · — · **trap**
- `f16round` — call: `f16round(1.337)` · `(65520)` · `(5e-8)` · `(-0)` — Deno: 1.3369140625 ·
  Infinity · 5.960464477539063e-8 · -0 — wasic: **not supported**
- `floor` — call: `floor(1.7)` · `floor(-1.2)` · `floor(-0)` · `floor(0.49999999999999994)` — Deno:
  1 · -2 · -0 · 0 — wasic: —
- `fround` — call: `fround(0.1)` · `fround(1.337)` · `fround(3.4e39)` · `fround(5e-324)` — Deno:
  0.10000000149011612 · 1.3370000123977661 · Infinity · 0 — wasic: —
- `hypot` — call: `hypot(3, 4)` · `hypot(1e200, 1e200)` · `hypot(∞, NaN)` · `hypot(-3, -0)` — Deno:
  5 · 1.414213562373095e+200 · Infinity · 3 — wasic: —
- `imul` — call: `imul(3, 4)` · `imul(2147483647, 2)` · `imul(-5, 12)` · `imul(4294967295, 5)` —
  Deno: 12 · -2 · -60 · -5 — wasic: **invalid module** (ld27)
- `log` — call: `log(1)` · `log(10)` · `log(0)` · `log(-1)` — Deno: 0 · 2.302585092994046 ·
  -Infinity · NaN — wasic: — · — · — · **0**
- `log10` — call: `log10(1000)` · `log10(2)` · `log10(0)` · `log10(-1)` — Deno: 3 ·
  0.3010299956639812 · -Infinity · NaN — wasic: — · — · — · **0**
- `log1p` — call: `log1p(1e-10)` · `log1p(1)` · `log1p(-1)` · `log1p(-2)` — Deno:
  9.999999999500001e-11 · 0.6931471805599453 · -Infinity · NaN — wasic: —
- `log2` — call: `log2(8)` · `log2(3)` · `log2(0)` · `log2(-1)` — Deno: 3 · 1.584962500721156 ·
  -Infinity · NaN — wasic: — · — · — · **0**
- `max` — call: `max(1, 2)` · `max(0, -0)` · `max(NaN, 1)` · `max(-∞, -1)` — Deno: 2 · 0 · NaN · -1
  — wasic: —
- `min` — call: `min(1, 2)` · `min(0, -0)` · `min(NaN, 1)` · `min(∞, 1)` — Deno: 1 · -0 · NaN · 1 —
  wasic: —
- `pow` — call: `pow(2, 10)` · `pow(2, 0.5)` · `pow(-2.5, 3)` · `pow(1, NaN)` · `pow(1e200, 1e200)`
  — Deno: 1024 · 1.4142135623730951 · -15.625 · NaN · Infinity — wasic: — · — · — · **1** · **trap**
- `random` — call: `random()` — Deno: in [0, 1) — wasic: — (values never agree)
- `round` — call: `round(2.5)` · `round(-2.5)` · `round(0.49999999999999994)` · `round(-0.4)` —
  Deno: 3 · -2 · 0 · -0 — wasic: —
- `sign` — call: `sign(3)` · `sign(-3)` · `sign(-0)` · `sign(NaN)` — Deno: 1 · -1 · -0 · NaN —
  wasic: —
- `sin` — call: `sin(1)` · `sin(-0)` · `sin(π)` · `sin(1e10)` · `sin(1e18)` · `sin(1e300)` — Deno:
  0.8414709848078965 · -0 · 1.2246467991473532e-16 · -0.4875060250875107 · -0.9929693207404051 ·
  -0.8178819121159085 — wasic: — · **0** · — · — · **5.98e+27** · **trap**
- `sinh` — call: `sinh(1)` · `sinh(2)` · `sinh(-0)` · `sinh(1000)` · `sinh(1e10)` — Deno:
  1.1752011936438014 · 3.626860407847019 · -0 · Infinity · Infinity — wasic: — · **…186** · — · — ·
  **trap**
- `sqrt` — call: `sqrt(2)` · `sqrt(16)` · `sqrt(-1)` · `sqrt(-0)` — Deno: 1.4142135623730951 · 4 ·
  NaN · -0 — wasic: —
- `sumPrecise` — call: `sumPrecise([0.1, 0.2, 0.3])` · `sumPrecise([1e20, 0.1, -1e20])` — Deno: 0.6
  · 0.1 — wasic: **not supported**
- `tan` — call: `tan(1)` · `tan(-0)` · `tan(π/4)` · `tan(1e10)` · `tan(1e300)` — Deno:
  1.5574077246549023 · -0 · 0.9999999999999999 · -0.5583496378112418 · 1.4214488238747245 — wasic: —
  · **0** · — · — · **trap**
- `tanh` — call: `tanh(1)` · `tanh(-0)` · `tanh(20)` · `tanh(-Infinity)` — Deno: 0.7615941559557649
  · -0 · 1 · -1 — wasic: —
- `trunc` — call: `trunc(2.7)` · `trunc(-2.7)` · `trunc(-0.5)` · `trunc(1e300)` — Deno: 2 · -2 · -0
  · 1e+300 — wasic: —
- constants — call: `E` `LN10` `LN2` `LOG10E` `LOG2E` `PI` `SQRT1_2` `SQRT2` — Deno:
  2.718281828459045 · 2.302585092994046 · 0.6931471805599453 · 0.4342944819032518 ·
  1.4426950408889634 · 3.141592653589793 · 0.7071067811865476 · 1.4142135623730951 — wasic: —
  (alone)

