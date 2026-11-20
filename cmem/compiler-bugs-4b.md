# compiler-bugs-4b — continues [compiler-bugs-4.md](compiler-bugs-4.md)

(Split by size on 2026-11-20, letter H38.)

  12. Was OPEN (found fixing sw66, 2026-10-13; the same on main): a function's local array with the
  same name as a module-level array: the declaration's `$__malloc` goes to `global.set $a`, while
  the pushes and the return use the uninitialized local, so the MODULE array is replaced by an empty
  one (`a[0..2]` print `0 0 0`) and the function works on an array at address 0. Repro
  `sw70_local_array_shadows_global.ts` — where: wasic array declaration scoping
- sw63 — bug (native → compiled): FIXED 2026-10-09 (L3, both paths: a bigint argument to any
  `Math.*` is a compile diagnostic pointing at wasMath's i64 / u64; the repro now reads COMPILE-FAIL
  by design). Was OPEN (bigint probe, 2026-10-09): `Math.sqrt(b)` with `b: bigint` COMPILES and
  prints `4`; TypeScript rejects it and Deno throws `TypeError: Cannot convert a BigInt value to a
  number`. `Math` is f64-only in JavaScript, so a bigint argument should be a compile error. Repro
  `sw63_math_accepts_bigint.ts` — where: wasic Math dispatch
- sw64 — bug (native → compiled): FIXED 2026-10-13 (wasMath L4, console path: a bigint led by `-`,
  `~` or `(`, or by a bigint literal, is an i64 segment and prints its `n`; found with it and fixed,
  both paths: unary `-` of a bigint PARAMETER was `i32.sub` of an i64, an invalid module, and `~`
  had no bigint or float case; corpus `39_WasMathL4Operators`). Was OPEN (bigint probe, 2026-10-09):
  `console.log(-a)` of a bigint prints `-7`; JavaScript prints `-7n` (`a`, `a + b` keep the `n`).
  Repro `sw64_console_negated_bigint_drops_n.ts` — where: console_log i64 printing
- ~~sw54~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found scoping sw51; the same on main):
  `console.log(v === null)` for a nullable local holding 0 printed `true`: the console compared the
  value with 0. A console equality against `null` / `undefined` now asks wasic, which reads the
  flag. Repro `sw54_console_nullable_local_eq_null.ts`; test `24_NullableFields` — where:
  console_log null comparison
- ~~sw55~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw51; the same on main): a
  null nullable local printed `null` only as console.log's ONLY argument; beside another argument,
  in a template, or built into a string (`` `w=${w}` ``, `"w=" + w`, `String(w)`) it printed `0`.
  Every text conversion of a nullable local or flagged field now reads `null` (console:
  `setNullPrintResolver`; wasic: `emitScalarToStr`, both `String(x)` paths). Repro
  `sw55_nullable_local_prints_zero.ts`; test `24_NullableFields` — where: console + wasic text
  conversion
- ~~sw56~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw51; the same on main): `f()
  ?? d` on a `T \| null` function never took `d` (a call on the left of `??` was taken as never
  null), and `return v` of a null nullable local (or flagged field) from a `T \| null` function
  reported a value (`$__nullable_ret_flag` set to 1 unconditionally). The call's value is held in a
  scratch global and the flag read after it; a nullable source's own null is returned. Repro
  `sw56_nullable_call_coalesce_ignored.ts`; test `24_NullableFields` — where: wasic `??` / nullable
  return
- ~~sw50~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw08; the same on main): a
  bigint in a template, concat or `String(...)` kept its `n`: `b=12` → `b=12n` (both paths).
  `$__i64_to_str` writes the console form; a string conversion drops the last byte. Test
  `11_StringConversions` — where: wasic + console i64 to string
- ~~sw20~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `console.log(-7 % 4)`: `-3` → `1`. The
  console `%` is `i32.rem_s` (JavaScript's sign of the dividend, as wasic's emitExpr). Test
  `7b_ConsoleOperatorsAndClosures` — where: console_log
- ~~sw21~~ — bug (native → compiled): ✅ FIXED 2026-09-30 (with sw05; LOUD since earlier that day):
  `console.log((a+1)*(a+2))`: `20` → `5`. The paren unwrap stripped the first `(` and the last `)`
  of any expression shaped `(…)`; it now unwraps only a matching outer pair. Repro now MATCH —
  where: console_log paren strip
- ~~sw22~~ — bug (native → compiled): ✅ FIXED 2026-09-30 (LOUD since that morning): `console.log(a
  ** 2)`: `9` → `0`. `*` split inside `**`; it now skips a `*` next to a `*`, and `**` (not in the
  console table) reaches wasic's emitExpr through the fallback resolver. Test
  `7b_ConsoleOperatorSplit` — where: console_log findTopLevelOp
- ~~sw23~~ — bug (native → compiled): ✅ FIXED 2026-09-30 (LOUD since that morning): `console.log(n *
  -2)`: `-6` → `-2`. The split took the unary minus as the binary operator; a `-` / `+` is now unary
  when nothing, an operator or an opening bracket precedes it, or it signs an exponent (`1e-3`).
  Found and fixed with it, all LOUD before (invalid modules), so not counted: the unary-minus
  handler ran before the binary split, making `-n + m` into `-(n + m)`; a binary op returned its
  result at the OPERAND type (`1 << n` where f64 was expected); an identifier was returned at its
  own type whatever was asked. The last two now widen losslessly, and NEVER a boolean (`"ok: " + (a
  > b)`, ld06, stays loud: widened, it printed `ok: 1`). One golden entry changed correctly:
  `-Math.PI / 2` is `(-π) / 2` now, bit-identical. Test `7b_ConsoleOperatorSplit` — where:
  console_log
- sw36 — bug (native → compiled): FIXED 2026-10-09 BY THE OWNER'S DECISION: a plain `/` between
  integers is now a compile error naming wasMath's `i32.div` / `f64.div` (design-decisions.md §
  "Wasm types in TypeScript"); the repro reads COMPILE-FAIL by design; `typed_decl_tests` asserts
  the reason. Was OPEN, NARROWED BY THE OWNER'S RULING (found fixing sw23, 2026-09-30): `const r:
  f64 = m / n` (5, 3) prints `1`, not `1.666…`. Ruled (design-decisions.md § "Wasm types in
  TypeScript"): `i32 / i32` IS `i32.div_s` (so `console.log(m / n)` printing `1` is by design), BUT
  an explicitly declared float destination (`const` / `let` / `var x: f64`) makes it a float
  division. The bug is that the declared f64 is applied after `i32.div_s`. Scoped in
  wasm-math-plan.md, Phase 2 — where: wasic `/` typing
- sw37 — bug (native → compiled): FIXED 2026-10-09 with sw36 (the integer `/` inside `Math.floor(…)`
  is refused; `Math.floor(f64.div(a, b))` is the float division, `i32.div(a, b)` the truncated one).
  Was OPEN (found scoping sw36, 2026-09-30): `Math.floor(a / b)` with −7, 2 prints `-3` (Deno `-4`).
  Ruled: a `Math` argument is an f64 context, so float division, then floor. `ceil` and `round`
  alike; `trunc` agrees only by coincidence. wasm-math-plan.md, Phase 2 — where: wasic Math dispatch
- ~~sw38~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (wasm-math-plan.md Phase 1):
  `Math.sign(NaN)` was `1`, `Math.sign(-0)` was `+0`. Now `$__math_sign` (NaN → NaN, ±0 → itself,
  else ±1; the argument evaluated once). Test `38_MathExactSemantics` — where: wasic + console_log
  Math `sign`
- ~~sw39~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (Phase 1): `Math.hypot(1e200, 1e200)` was
  `Infinity`, `Math.hypot(3, 4, 12)` was `5`. Now `$__math_hypot<n>`, V8's algorithm (largest
  magnitude; Infinity before NaN; Kahan-compensated scaled sum), one helper per arity. Bit-identical
  to Deno on a 224-call battery (1–4 arguments, subnormals, ±Infinity, NaN, 1e±200). Test
  `38_MathExactSemantics` — where: wasic + console_log Math `hypot`
- ~~sw40~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (Phase 1):
  `Math.round(0.49999999999999994)` was `1`, `Math.round(-0.4)` was `+0`. Now `$__math_round`:
  `floor`, then +1 when `x - floor(x) >= 0.5` (exact for every double), then `copysign` with `x`
  (keeps −0, cannot flip a nonzero result). Identical to Deno on 84 awkward values. Test
  `38_MathExactSemantics` — where: wasic + console_log Math `round`
- ~~sw41~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `console.log(-0)` printed `0` (Deno `-0`).
  A WHOLE numeric console argument (not a template, not a top-level string concat) is marked
  `console` and printed by `$__f64_to_str_console` (−0 as `-0`, else `$__f64_to_str`); a numeric
  literal argument is fixed at compile time. String conversion (`` `${-0}` ``, `String(-0)`, `"v=" +
  -0`) still gives `0`, as in JavaScript. Test `7b_ConsoleNumberFormatting` — where: console f64
  printer
- ~~sw42~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (found fixing ld16; the same on main):
  `const t: string = String(s)` printed the string's POINTER (`260`): emitStringAssign's
  `String(...)` branch sent a string argument down the numeric path. A string argument is now the
  string itself. Test `7b_ConsoleNumberFormatting` — where: wasic emitStringAssign `String(...)`
- ~~sw43~~ — bug (native → compiled): ✅ FIXED 2026-10-06: an `f32[]` literal was written as 8-byte
  f64 elements into a reservation of 4 bytes per element, OVERRUNNING the next data segment (`[1.25,
  2.5]` turned a following `"true"` into four NUL bytes), and an element read back as a bit pattern
  (`1072955392`). Now `encodeF32LE`; every load / store chain that sent f32 to `i32.load` /
  `i32.store` (60 in wasic, 4 in console_log; rewritten by a script that listed each one) is
  `memLoadOp` / `memStoreOp`; the dynamic-array helpers (`push`, `indexOf`, `find`, `sort`, `flat`,
  `flatMap`) take an f32 value type. Test `9_F32Containers` — where: wasic f32 array layout
- ~~sw45~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (found fixing sw43; the same on main): `for
  (const e of v)` over an array PARAMETER read from the pointer itself, iterating the 8-byte header
  as elements: the sum of an `i32[]` param `[1, 2, 3]` was 7, of an `f64[]` `[1.25, 2.5, 3]` was
  3.75. The branch's comment ("no header") was stale: every other read of a parameter array
  (`arr[i]`) skips the header. No test did a for-of over a parameter. Test `9_F32Containers` —
  where: wasic for-of
- ~~sw44~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (owner approved the design change):
  `String(e)` of a catch variable guessed what was thrown (a declaration always prefixed `Error: `,
  the console never did), and `e instanceof Error` was TRUE at compile time. Now the thrown KIND
  travels with the exception: `$__exn_kind` (0 = string / number / boolean, 1–7 = `EXN_KINDS`) is
  set before every `throw` (a re-throw passes the catch variable's own kind), a catch copies it into
  `$<var>__kind`, and a rejected promise carries it in its +12 word. `String(e)`, `${e}` and `"x" +
  e` go through `$__exn_str` (`Name: message`, `Name` for an empty message, the value itself for
  kind 0); `e instanceof <Error family>` is a run-time test; `e instanceof Error ? e.message :
  <else>` decides at run time when `<else>` is not the same text. Tests `15_ThrownKind`,
  `15_ThrownKindAsync` — where: wasic exception model
- ~~sw46~~ — bug (native → compiled): ✅ FIXED 2026-10-06: a function named `main` (async or NOT)
  made `_start` a bare `call $main`, and the parser stripped a top-level `main();` line, so EVERY
  other top-level statement was dropped (`console.log("before main"); main(); console.log("after
  main")` printed only main's output), a top-level array beside `main` was never initialised (7
  corpus tests had a null `guard` and passed only because their self-check never fired), and `main`
  was called even when the program never called it. The parser now keeps `main();`, and the shortcut
  applies only to a top level that is empty or exactly one `main()` call. Test
  `56_TopLevelBesideMain` — where: wasic `_start`
- ~~sw47~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (found fixing sw46; the same on main): a
  top-level array read in a FUNCTION's `console.log` printed garbage: `console.log(total[1],
  total.length)` gave `0 0`. The console's array lookup decided "module global" from
  `moduleArrayVars` alone (wasic's own reads use `isModuleGlobalArr`), so the array's -2 marker was
  emitted as the constant ADDRESS -2. Both lookups now use wasic's test and mark a -2 array
  runtime-addressed. Repro `sw47_console_module_array_in_function.ts`; test `56_TopLevelBesideMain`
  — where: console array lookup
- ~~sw24~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `console.log("C:\\tmp")` double-decoded:
  `C:\tmp` → `C:<TAB>mp`. A literal segment holds DECODED text and the DataAllocator unescapes its
  input again; `allocDecoded` re-escapes backslashes first (per-iov path and a string-ternary
  literal branch; the gather path writes bytes directly and was right). Test
  `7b_ConsoleOperatorsAndClosures` — where: console_log per-iov
- ~~sw25~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `console.log(n > 0 ? true : false)`:
  `true` → `1`. A ternary whose branches are both boolean (literal, comparison, negation, bool
  variable or `boolean` call) is a `boolexpr`. Test `7b_ConsoleOperatorsAndClosures` — where:
  console_log
- ~~sw26~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (loud since 2026-09-30): `"x" + (a < b ?
  "lo" : "hi")`: `xlo` → `x0`, then refused. parseSingleArg now unwraps a matching outer `( … )`
  (exprToWat already did, sw21), so the ternary reaches its string handler; ld06 was the same cause.
  Test `7g_ConsoleConcatAndCompare` — where: console_log
- ~~sw27~~ — bug (native → compiled): ✅ FIXED 2026-09-30: `"v=" + (x ?? 5)`: `v=3` → `v=0`. Same
  delegation. Test `7b_ConsoleExprFallback` — where: console_log
- ~~sw28~~ — bug (native → compiled): ✅ FIXED 2026-10-09: `Math.max(a, b, c)` ignored the 3rd: `9` →
  `5` (`min` too). Both paths fold any number of arguments left to right; no argument gives
  `-Infinity` / `Infinity`. Test `11_StringConversions` — where: both
- ~~sw29~~ — bug (native → compiled): ✅ CLOSED 2026-09-28: an UNANNOTATED number was typed i32 (`let
  a = 100000; a * a` wrapped). Now LOUD by rule: every declaration states its type
  (design-decisions.md); the repro was retired, `tests/typed_decl_tests.ts` asserts the refusal —
  where: wasic checkDeclarationTypes
- ~~sw30~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (loud since 2026-09-30): the declaration
  `const d: i32[] = xs` was already right; what stayed refused was the repro's console call with an
  array-literal ARGUMENT, `t([1, 2, 3])`: the console fallback resolver typed `[…]` by inferExprType
  instead of as its i32 pointer, and `$__arr_tmp` was declared only for a `(` / `,` before `[` in a
  function (never in _start). Now an array literal is i32 in the resolver, and `$__arr_tmp(2)` /
  `$__obj_ret` are declared after emission when the body uses them. Test
  `9_ArrayLiteralArgsAndTuples` — where: console fallback + wasic temps
- ~~sw31~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (loud since 2026-09-30): a 2D array
  declared from a CALL, `const d: i32[][] = mk()`. The 2D declaration parsed ANY right side as a
  literal (zero rows), and `stripInferableAnnotations` removed the annotation for a name / call, so
  the inferred path aliased the pointer but never registered `d` as 2D. Now a non-literal right side
  is registered without rows and emitted as the pointer it evaluates to; the annotation is no longer
  stripped. Fixed with ld11, ld12. Test `6d_Array2DAliases` — where: wasic 2D paths
- ~~sw32~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `k.inc(), k.inc()` → `1 2` → `1 1`. NOT a
  console bug: the closure's mutation of its captured `n` was lost after EVERY call (`1 1 1` on
  separate lines too). A captured variable was boxed only when two or more arrows referenced it, so
  a lone mutating closure incremented a copy; and the mutation scan read only the first of its three
  regex groups (`++n` missed). A declared i32 / bool local mutated by one arrow is now boxed too.
  Test `7b_ConsoleOperatorsAndClosures` — where: wasic closure capture
- ~~sw48~~ — bug (native → compiled): ✅ FIXED 2026-10-09: a closure mutating a captured i32 / bool
  PARAMETER copied it: `adder(100).add(1), .add(2)` → `101 103` → `101 102`. A mutated captured
  parameter is boxed like a declared local: the factory's prologue rebinds it to
  `$__box_i32(value)`. With it, the factory's OWN reads and writes of any boxed name go through the
  cell (a read before the closure was made printed the cell's address: `twice 520`), and only the
  closure-creation call passes the cell (`__boxref(x)`). An f64 capture is not boxed (a 4-byte
  cell); that, and f64 closures generally, are sw52. Test `5h_CapturedParamMutation` — where: wasic
  closure capture
- ~~sw52~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw48; the same on main): an
  arrow in a returned object literal with no return annotation was typed i32 whatever it returned
  (the factory's auto-struct, `mResult = "i32"`, which the lifted arrow then took as its own
  result): a boolean printed `1` / `0`, an f64 was truncated. Its result is now typed from its
  `return` (block body, the arrow's OWN body only) or its expression, in the factory's params and
  typed locals plus the arrow's params and body locals (`closureResultType`; f64 only when a float
  is visible, so an unknown shape keeps i32). Found with it, LOUD and fixed: an expression-bodied
  arrow that is an object's LAST value took the closing `}` (ld21's root). Split off, open: sw53.
  Test `5h_ClosureResultTypes` — where: wasic closure result typing
- ~~sw53~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (split from sw52; the same on main): a
  closure mutating a captured f64 (local or parameter) changed a COPY: `s += x; return s` gave `1.75
  1.75` for `1.75 3`. The box was a 4-byte i32 cell and an f64 was never boxed (two arrows sharing
  one would have built an invalid module). Now the cell's POINTER and its VALUE type are kept apart:
  a boxed capture is an i32 parameter of the lifted arrow and its factory (so the closure layout and
  trampoline carry the pointer), `boxedCaptureTypes` / `currentBoxTypes` give the value type back
  for typing and for every load / store (`boxLoad` / `boxStore` at the read, declaration,
  assignment, compound and `++` / `--` sites); in the owning function a boxed f64 local is declared
  i32 (its cell, 8 bytes) and a boxed f64 PARAMETER keeps its value with its cell in a shadow local
  `$<name>__box` (`$__box_f64`). A boxed read now also converts to the type asked. Golden-WAT: only
  a helper's comment changed. Test `5h_CapturedFloatMutation` — where: wasic closure capture
- ~~ld01~~ — bug (native → compiled): ✅ FIXED 2026-10-15: function-typed var from a ternary:
  undefined func. Three causes: `liftStartBodyArrows` stripped EVERY top-level function-type
  annotation (`const op: (x: i32) => i32 = dbl` arrived untyped: an f64 local); _start's pre-scan
  had no function-typed clause; the console called an unknown name directly (`call $op`). Now the
  annotation is kept for a plain function or a ternary of two, _start registers `funcTypeVars`, the
  declaration emits `c ? tri : dbl` as table indices, and the console hands a call to a non-function
  to wasic (both call sites). Found with it: `fa(2) + op(1)` in console.log was typed f64 (a
  call-led operand now takes its result type). Test `5h_ClosureFieldsAndReturns` — where: wasic +
  console
- ~~ld02~~ — bug (native → compiled): ✅ FIXED 2026-10-06: console `x % 2` on f64: `f64.rem` does not
  exist. Now `x - trunc(x / y) * y`, the formula wasic's emitExpr uses (both paths share its limits:
  inexact for a large quotient, and each operand is evaluated twice). Test
  `7b_ConsoleOperatorsAndClosures` — where: console_log
- ~~ld03~~ — bug (native → compiled): ✅ FIXED 2026-10-15: console string `<`: unresolved local. The
  console compared strings through `$__str_cmp` for `===` / `!==` / `==` / `!=` only; `<` `<=` `>`
  `>=` of two strings (both sides, else JavaScript compares numbers) now do too, as wasic's STR_CMP
  table. Test `7g_ConsoleConcatAndCompare` — where: console_log
- ~~ld04~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (with Phase 1): console `Math.max` in i32
  context: `$__i32_max` never emitted. The console path now REQUESTS every helper it calls through
  `setMathHelperNeededCallback` (it used to assume wasic emitted them). Repro now MATCH — where:
  console_log
- ~~ld05~~ — bug (native → compiled): ✅ FIXED 2026-10-15: console `tag() + 7`: stack mismatch. A
  concat operand counted as a string only as a literal or a string local; `isConcatString` adds
  string-returning calls, string globals / array elements, string methods, `String(…)`, and a left
  side that is itself a string `+` (`s + n + 1`). Test `7g_ConsoleConcatAndCompare` — where:
  console_log
- ~~ld06~~ — bug (native → compiled): ✅ FIXED 2026-10-15 with sw26 (the paren unwrap): console `"ok:
  " + (a > b)`: invalid module. Five golden entries moved: a parenthesised integer in a concat now
  prints through `$__i32_to_str` instead of being converted to f64 first (same text) — where:
  console_log
- ~~ld07~~ — bug (native → compiled): ✅ FIXED 2026-10-15: `s + n + 1` into a string: unsupported.
  `flattenStringConcat` split at the last `+` and needed a plain string on one side; a left side
  that is itself a string concatenation now counts (`+` groups from the left). A literal-led chain
  always worked. Test `11c_StringBuildingChains` — where: wasic
- ~~ld08~~ — bug (native → compiled): ✅ FIXED 2026-10-15: `i64.toString()`: invalid module
  (`$__i32_to_str` handed an i64). `x.toString()` of a number or boolean is now `String(x)` in both
  emitStringAssign and emitStringPtrLen (bigint without `n`, a boolean `true` / `false`; the value
  form was refused in console.log). Test `11c_StringBuildingChains` — where: wasic
- ~~ld09~~ — bug (native → compiled): ✅ FIXED 2026-10-15: a function returning tuples from a TERNARY
  (`a < b ? [a, b] : [b, a]`): `$__arr_tmp` unresolved. Declaring the temp alone made it SILENT (the
  branches were built as ARRAYS, so `r[0]` read the length: `2 8`); a tuple-returning function now
  returns each branch on its own path (`if` + two tuple returns). Test `9_ArrayLiteralArgsAndTuples`
  — where: wasic
- ~~ld10~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (batch 2): `recs.push({ a: 1, b: 2 })` into
  `Array<{ a: i32; b: i32 }>`: unsupported expression, at TOP level only (a function's worked).
  _start's pre-scan, and `detectModuleArrayGlobals` for one used in a function, took the inline
  element type for a FUNCTION signature; both now build its struct (`inlineElementStruct`, shared
  with the function pre-scan). Found with it: the struct was named `__Anon_<varName>`, so two
  same-named arrays with different shapes shared one (now named by the shape); _start had no `const
  t = recs[i]` struct-var clause (Fix C's twin, which ld14 also needed); `t.a + t.b` of an i32 and
  an f64 field added as i32 (console `hasFloatField`, `fieldAsExpected`). Test
  `9b_InlineStructArrays` — where: wasic + console
- ~~ld11~~ — bug (native → compiled): ✅ FIXED 2026-10-15 with sw31: a 2D array declared from another
  2D array's NAME. Test `6d_Array2DAliases` — where: wasic
- ~~ld12~~ — bug (native → compiled): ✅ FIXED 2026-10-15: a 2D array declared from a 2D PARAMETER,
  then `d[1][2]`. A `T[][]` parameter was no array at all (parseParams knew `T[]` only); it is now
  `is2DArray` and registered 2D. Found with it: the 2D read regex took `d[1][0] + rows[0][1]` as ONE
  access (index `0] + rows[0][1`); each index must now be balanced. And the repro's console argument
  `t([[…]])` (sw30's cause). Test `6d_Array2DAliases` — where: wasic
- ~~ld13~~ — bug (native → compiled): ✅ FIXED 2026-10-15: `const b: string[] = a` (top level): the
  declaration's capture kept the `;` and emitted `a;`. Test `11c_StringBuildingChains` — where:
  wasic
- ~~ld14~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (batch 2) with ld10: a union-typed array
  filled by `push({ … })` literals, then `xs[i].type`: the top-level `const n: TreeItem = xs[i]` was
  not a struct var (_start lacked Fix C). Test `9b_InlineStructArrays` — where: wasic
- ~~ld15~~ — bug (native → compiled): ✅ FIXED 2026-10-06 (Phase 1): `const x: i32 = Math.floor(3.7)`
  (also `trunc`, `ceil`, `round`, `sqrt`, `sign`, `hypot`, the mathlib functions) was an INVALID

> Continues in [compiler-bugs-4c.md](compiler-bugs-4c.md).
