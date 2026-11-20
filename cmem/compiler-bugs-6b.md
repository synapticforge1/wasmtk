# compiler-bugs-6b — continues [compiler-bugs-6.md](compiler-bugs-6.md)

(Split by size on 2026-11-20, letter H38.)

  (it was NaN) and an `e` only with digits after it. Probe: 4,078 values (edge cases + random
  literals of up to 30 digits, exponents ±350) identical to Deno; the old compiler differed on 263
  of 483. dynrt's interpreter reads literals with `parseFloat`, so `caps_bytes.ts` was re-embedded
  (dynrt +1,716 bytes). Test `53_NumberParseRounding`. Was (found with ld60, 2026-10-20; the same on
  main): `parseFloat("0.123")` was `0.12300000000000001`, `"3.14159"` `3.1415900000000003`, `"1e-7"`
  `1.0000000000000002e-7`, `"1.7976931348623157e308"` `1.7976931348623145e+308` (`$__parse_float`
  added digit / 10ⁿ) — where: wasic `emitNumParserHelpers`, `emitDecToF64Helpers`
- ~~sw123~~ — defect: ✅ FIXED 2026-10-22 (found with ld64, 2026-10-20): a `T \| undefined` local
  holding `undefined` prints `null` (`const n: i32 \| undefined = undefined; console.log(n)`); one
  flag holds null and undefined alike. A string's `s.at(10)` "undefined" text prints right. The
  `__null` flag is now a KIND: 0 value, 1 null, 2 undefined (literals, reassignment, a module
  global's start; `find()` / `pop()` / an out-of-range read give 2; a nullable function's empty
  result takes its declared `T \| undefined` or `T \| null`, `nullableFuncReturnKind`). Printing
  (single argument and `nullPrintRewrite`) and `===` / `!==` (`nullKindIs`, folded for a constant or
  an out-of-range test) tell them apart; `==`, `??` and truth tests are unchanged. A string's test
  and a field's flag word still only say "nullish" (`nullTestIsKind`). 9 goldens moved, reviewed.
  Test `24_NullVersusUndefined` (failed on the old compiler) — where: wasic nullable locals
- ~~sw124~~ — defect: ✅ FIXED 2026-10-20 (found with ld57; the same on main): `console.log(new
  Box(1, 2).isBig())` printed `0` for `false`: the console's dot-call lookup typed a `new C(…).m(…)`
  chain as i32. It takes m's result type now (both lookups, console.log and console.error). Test
  `4l_MixedOperandTypes` — where: wasic dotCallLookup
- ~~sw125~~ — defect: ✅ FIXED 2026-10-20 with ld53: `s.at(i)` out of range read past the text
  (length 1, a garbage byte; `` `[${s.at(5)}]` `` printed `[u]`). All four at() paths (declaration,
  concat, comparison operand, console) go through `$__str_index`: "undefined", as `s[i]`. Test
  `28_ArrayCallbackEdges` — where: wasic / console_log string at()

