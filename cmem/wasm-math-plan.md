# Wasm types in TypeScript: the declared-type rule and the `Math` additions (SCOPE, 2026-09-30)

**Status (2026-10-09): Phase 1 DONE; Phases 2–4 wait on the owner's decisions D1–D6.** sw36
and sw37 are now the ONLY open silent-wrong compiler rows. The owner (2026-10-09): "the division
question deserves more thought first". What has been measured is the two bugs (table below);
what has NOT is how many corpus programs each D1 option would change. Offered (not started): a
scratch-branch prototype per option, with golden-WAT and wasi per option, reporting the entries
and printed values each changes and whether each moves toward or away from Deno. The
ruling is recorded in design-decisions.md § "Wasm types in TypeScript". This file is the work it
implies: what was broken, what to build, in what order, and what the owner still has to decide.

## Why

TypeScript has no `i32`, `u32` or `f32`. `type i32 = number` is erased, and Deno runs it as an
f64. wasic compiles the declared type. Where the two number models differ, the user needs:

1. a rule that says which result they get (the ruling), and
2. a way to WRITE the operation they mean, so the TypeScript source says it.

JavaScript already set the precedent for (2) with wasm-shaped `Math` members: `Math.imul` is
`i32.mul`, `Math.clz32` is `i32.clz`, and `Math.fround` is the f32 rounding. All three already
compile and match Deno (measured 2026-09-30). What is missing is the rest of the set.

## What the ruling says (owner, 2026-09-30)

| Source (`a`, `b`, `m`, `n` are `i32`) | Result |
| --- | --- |
| `console.log(a / b)`, `const x: i32 = a / b` | `i32.div_s`, truncating: 7 / 2 is 3 |
| `const r: f64 = m / n` (also `let`, `var`) | float division: 5 / 3 is 1.666… |
| `Math.floor(a / b)` and every `Math` function | the argument is an f64 context: float division, then the function |

## Measured today (2026-09-30, native Deno vs compiled)

Rule gaps (the ruling says one thing, wasic does another):

| id | source | Deno | wasm | cause |
| --- | --- | --- | --- | --- |
| sw36 | `const r: f64 = m / n` (5, 3) | 1.666… | 1 | `/` typed from the left operand (`lhsType`, wasic.ts ~10334); the declared f64 is applied AFTER `i32.div_s` |
| sw37 | `Math.floor(a / b)` (−7, 2) | −4 | −3 | same: the `Math` argument is emitted as f64, but the division inside is already `i32.div_s`. `ceil` and `round` alike; `trunc` agrees only by coincidence |
| ld15 | `const x: i32 = Math.floor(3.7)`; also `trunc`, `ceil`, `round`, with or without a division | 3 | invalid module | `F64_UNARY` / `round` return f64 whatever `defaultType` is (wasic.ts ~9437–9451); the i32 local gets an f64. LOUD, but it hits a common pattern |

Plain bugs (TypeScript and wasm are both f64 here, so the ruling is not involved; ALL FIXED in
Phase 1, 2026-10-06, as was ld15 above):

| id | source | Deno | wasm | cause |
| --- | --- | --- | --- | --- |
| sw38 | `Math.sign(NaN)` / `Math.sign(-0)` | NaN / −0 | 1 / 0 | `f64.eq x 0` misses NaN; the zero case returns +0 |
| sw39 | `Math.hypot(1e200, 1e200)` / `Math.hypot(3, 4, 12)` | 1.41e200 / 13 | Infinity / 5 | naive `sqrt(a² + b²)` overflows; only two arguments are read |
| sw40 | `Math.round(0.49999999999999994)` / `Math.round(-0.4)` | 0 / −0 | 1 / 0 | `floor(x + 0.5)` rounds the sum up at that edge and loses the sign of a −0 result |

The same probe found `Math.max` / `min` with three literal arguments, `Math.abs(-2147483648)`,
`Math.imul`, `Math.clz32` and `Math.fround` all agreeing with Deno.

## The work, in order

**Phase 1: the plain bugs. ✅ DONE 2026-10-06** (sw38, sw39, sw40, ld15; ld04 with them).
- `sign`, `round`, `hypot` are wasic helpers (`$__math_sign`, `$__math_round`,
  `$__math_hypot<n>`, emitted only when used), shared by both paths: the console path now
  REQUESTS helpers through `setMathHelperNeededCallback`, which also fixed ld04.
- `hypot` is V8's algorithm and bit-identical to Deno on a 224-call battery; `round` and `sign`
  identical on 84 awkward values (the battery generator was a scratch script; its shape is in
  compiler-bugs.md sw39).
- Every f64-valued Math result is converted at the type its context asks for. ld15 needed NO new
  decision: wasic already converts an f64 in an integer context with `trunc_f64_s` (`y as i32`,
  an f64 local read as i32, about ten sites), and Math now does the same. D3 below is therefore
  a question about that convention as a whole, not about Math.
- Found on the way, logged, NOT fixed (outside the Math dispatch): sw41 (`console.log(-0)`
  prints `0`), ld16 (`String(x)` in a console argument), ld17 (`console.log` of an f32 variable).
- Golden-WAT: 42 entries changed, every line explained: only the old inline round / sign /
  hypot forms became helper calls, including inside the dynrt runtime library (35 pipeline
  entries, which also renumber their functions around the new helper).

**Phase 2: the declared-destination rule (sw36, sw37).** The mechanism: an EXPLICIT float
destination turns a `/` of integer operands into `f64.div` of converted operands.
- The trap: `emitExpr`'s `defaultType` is also a plain fallback where the user declared nothing.
  "The user wrote f64" must be a separate, explicit signal. If `defaultType === "f64"` is reused
  as it stands, the rule silently turns every defaulted context into float division, and the rule
  is gone. Thread an `explicitFloat` flag (or an equivalent) from the three sources the ruling
  names: a typed `const` / `let` / `var` initialiser, a `Math` argument, and (D1) whatever else
  the owner adds.
- A later assignment to a declared-f64 variable (`r = m / n`): its declaration is explicit, so it
  should follow the rule. Confirm with the owner (D1).
- `console_log.ts` is the parallel path. `console.log(a / b)` has no declared type, so it stays
  `i32.div_s` there, as ruled. A `Math` call inside a console argument must follow Phase 2 too.
- Measure first: a golden-WAT run shows every corpus program whose output the rule changes. Each
  one changes a printed value, so this is at least MINOR and may be MAJOR (D5).

**Phase 3: the `Math` additions (after D2 and D4).** The wasm operations JavaScript has no
spelling for. Each has a TypeScript body that does exactly what wasm does, so the Deno run shows
the wasm result, and each compiles to one instruction:

| candidate | TypeScript body | wasm |
| --- | --- | --- |
| `idiv(a, b)` | `Math.trunc(a / b)`; throws where wasm traps (b = 0; −2³¹ / −1) | `i32.div_s` |
| `udiv(a, b)`, `urem(a, b)` | on `a >>> 0`, `b >>> 0` | `i32.div_u`, `i32.rem_u` |
| `ctz32(x)` | count trailing zeros | `i32.ctz` |
| `popcnt32(x)` | population count | `i32.popcnt` |
| `rotl32(x, k)`, `rotr32(x, k)` | rotate | `i32.rotl`, `i32.rotr` |
| `truncSat(x)` | clamp to the i32 range, NaN to 0 | `i32.trunc_sat_f64_s` |
| `roundEven(x)` | ties to even | `f64.nearest` |
| `copysign(x, y)` | `\|x\|` with the sign of `y` (−0 counts as negative) | `f64.copysign` |

`%` needs nothing: JavaScript's `%` already truncates with the dividend's sign, like
`i32.rem_s` (measured: −7 % 2 is −1 in both).

**Phase 4: telling the user.** A user-facing page, "TypeScript vs WebAssembly: what you will
see": one row per divergence (i32 division, i32 overflow wrap, divide-by-zero trap, f32 rounding,
u32, numeric `as` casts), each with what Deno prints, what wasm prints, and how to write the line
so both agree. Optionally, compile-time NOTES (not errors) where the declared type changes the
result, e.g. `note: m / n is i32 division; wasm prints 1, TypeScript prints 1.666…` (D6).

## Decisions for the owner

- **D1. Which destinations count as explicit?** Ruled: typed `const` / `let` / `var`
  initialisers. Open: a later assignment to such a variable; a function's declared return type
  (`function f(): f64 { return m / n; }`); a declared f64 parameter at a call (`g(m / n)`). And a
  nested division under a float destination: `const r: f64 = (m / n) + 0.5`. Is the division
  float because the declaration is, or i32 because its own operands are (giving 1.5)?
- **D2. Where the new functions live.** Either on the global `Math` (TypeScript allows
  `declare global { interface Math { idiv(a: number, b: number): number } }`, but Deno then
  needs a runtime polyfill module the program imports), or in a wasmtk module
  (`import { idiv } from "@jrmarcum/wasmtk/math"`), which needs no global change.
- **D3. f64 into an `i32` destination, as a convention.** Today, everywhere (and for Math since
  Phase 1): truncate and TRAP out of range or on NaN (`i32.trunc_f64_s`). Keep it, or saturate
  (`trunc_sat`), or wrap (what `| 0` does in JavaScript)? A change applies to every site, not
  only Math.
- **D4. Which functions.** The Phase 3 table is a candidate list, not a commitment.
- **D5. Release.** Phase 2 changes printed values of existing programs: MINOR with a note, or
  MAJOR?
- **D6. Compile-time notes:** on by default, behind a flag, or not at all?

## Where things are

- `Math` dispatch: `src/wasic.ts` ~9344 (`MATH_CONSTS`, `F64_UNARY`, `round`, `sign`, `hypot`,
  `fround`, `MATH38_UNARY`); console twin `src/console_log.ts` ~2036 and ~1506.
- `/` typing: `src/wasic.ts` binary loop, `["/", "div_s", "div", false]` ~10187, `lhsType`
  ~10334; compound `/=` ~11918.
- Repros: `scripts/phase0/round1/silent-wrong/sw36_i32_division_truncates.ts`; the Math probe
  (2026-09-30) is reproduced in the tables above.
