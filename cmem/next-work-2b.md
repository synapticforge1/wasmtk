# next-work-2b — continues [next-work-2.md](next-work-2.md)

(Split by size on 2026-11-20, letter H38.)

> a growable heap buffer now). **sw66 + sw67 FIXED 2026-10-13** (an array prints as Deno prints
> it, `$__arr_inspect`; found with them sw69, sw70 silent and ld37 loud). **binaryang 1.12.0
> PINNED** (above). **sw69 FIXED 2026-10-13** (array and struct literal values; compiler-bugs.md).
> **sw70 FIXED 2026-10-13** (a local array shadowing a module one). **sw68 FIXED 2026-10-13**
> (a nested console.log in an argument): **no silent-wrong row is open.** **Next, in order:** the 21 loud
> rows (ld34, ld37), then the rest of the binaryang items. The next release is MAJOR (3.0.0) and
> waits on the owner's word.
>
> **PAUSED 2026-10-09, end of day (owner).** `main` was clean at the integer-division commit
> (`5fde9c0`). Decided later the
> same day (owner): `(a / b) | 0` STAYS refused, pointing at wasMath; **D6: a compile-stopping
> issue is REPORTED with its location** (below); **D3: an implicit f64 → i32 conversion is
> REFUSED**, naming `f64.toI32` (traps) / `f64.toI32Sat` (clamps) / `f64.toI32Wrap` (wraps).
>
> **D3 BUILT 2026-10-13** (design-decisions.md § "Wasm types in TypeScript"): stores into declared
> integers, `as i32` / `as i64` on a float or an `any`, and floats into wasMath `i32.*` / `i64.*`
> arguments are refused; indices and positions kept. Found with it: ld34 (open), ld35 (fixed).
>
> **D3 SCOPE DECIDED (owner, 2026-10-13), after a measurement** (every implicit float → integer
> conversion in the corpus tagged by the statement it is in): only 2 programs STORE a float into a
> declared integer (`38_MathExactSemantics`' `const fl: i32 = Math.floor(y)` ×7, `18_Multi-Scope…`'s
> `const namePtr: i32 = nameMatrix[d][v]` from a `number[][]`); 26 programs use a float as an
> INDEX or POSITION (`arr[i]`, `s.indexOf(x, pos)`, `splice(i, 1)`, 115 conversions), which
> JavaScript itself converts. **Refused: stores into a declared integer** (declaration,
> assignment, argument to an integer parameter, return from an integer function, field / element
> store) **and `x as i32` / `as i64` on a float** (it names the type, not the conversion). **Kept:
> indices and positions.**
>
> **D3 refusal (owner 2026-10-09; designed, not built).** Today wasic silently inserts
> `i32.trunc_f64_s` wherever an f64 meets an i32 destination: `const x: i32 = f`, an f64 argument
> to an i32 parameter, an f64 returned from an `: i32` function, an f64 stored into an i32 field
> or array element, `Math.floor(y)` into an i32 (the ld15 convention, design-decisions.md), the
> `asDefault` / `asExpected` paths of both emitters, and `x as i32` (decide whether an explicit
> `as` counts as the program saying so; it does not say WHICH conversion, so likely refuse too).
> Plan: (1) list every site that emits `i32.trunc_f64_s` / `trunc_f32_s` / `i64.trunc_*` from a
> value the program did not convert (grep both emitters; L1's ld27 trunc check is one), (2) raise
> one diagnostic from a shared message like `intDivisionDiagnostic`, (3) MEASURE the corpus on a
> branch first (golden-WAT status changes), expect many more programs than division's 10, (4)
> migrate them to the wasMath call that prints what wasm printed (`toI32`), (5) the wasMath i32
> namespace's own known gap (an out-of-range f64 into an `i32.*` argument traps where the body
> wraps) closes with it. Also i64 destinations (`trunc_f64_s` to i64) by the same rule. Pairs
> naturally with the D6 report.
>
> **Compile-error report (D6, owner 2026-10-09; BUILT 2026-10-13, the design below as built,
> except the summary line is the CLI's `❌ wasic: N errors in <file>; no .wasm was written.`).** Today a refusal prints
> `⚠️ <text>` lines, then "Compilation aborted: N unsupported feature(s)" and a `wasmtk dync`
> hint: no location for most errors, "unsupported" for deliberate refusals, and dync advice that
> does not apply. Proposed, per error: `error[<code>]: <what>`, `--> file:line:col`, the source
> line with a `^^^` marker, `= TypeScript: …` / `= wasm: …` where that is the reason, `= help:`
> the fix in the user's own names; then `wasic: N errors in <file>; no .wasm was written.`, exit
> 1, the dync hint only for genuinely dynamic code. Same report from `wasic` and `modc`. Work:
> diagnostics become structured (code, message, position, help) instead of strings, and positions
> map back through the bundler's rewrite to the user's file. **Found doing this: the
> typed-declaration diagnostic's line was OFF BY ONE in a program that imports wasMath** (it
> counted lines in the BUNDLED source, which drops the import): FIXED by D6, which locates in the
> files as written; typed_decl asserts it ("line number after a wasMath import").

