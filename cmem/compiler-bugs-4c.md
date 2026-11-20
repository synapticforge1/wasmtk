# compiler-bugs-4c — continues [compiler-bugs-4b.md](compiler-bugs-4b.md)

(Split by size on 2026-11-20, letter H38.)

  MODULE: every f64-valued Math result was returned as f64 whatever `defaultType` asked. Now
  converted at the type asked, with wasic's existing convention for an f64 in an integer context
  (`trunc_f64_s`, as `y as i32` and an f64 local read as i32 already do), `demote` into f32. Both
  paths (wasic `asDefault`, console_log `asExpected`). Test `38_MathExactSemantics` — where: wasic +
  console_log Math dispatch
- ~~ld16~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `console.log(String(x))` emitted `call
  $String`, an undefined function. A console `String(...)` now goes through wasic's string resolver
  (emitStringAssign owns `String(...)`), and anything it cannot build is a diagnostic.
  `String(<string local>)` keeps the old pass-through (see sw44). Test `7b_ConsoleNumberFormatting`
  — where: console_log call path
- ~~ld17~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `console.log(z)` of any `f32` value was an
  invalid module: the printer was handed a raw f32. Every producer of an f64 segment whose source
  may be f32 (locals, globals, calls, closures, struct fields, 2D elements, nullish) now goes
  through `promoteF32`. Test `7b_ConsoleNumberFormatting` — where: console f64 printer
- ~~ld18~~ — bug (native → compiled): ✅ FIXED 2026-10-06: an `f32` STRUCT FIELD was loaded with
  `i32.load` (`memLoadOp` now). Underneath it, NO f32 value was ever converted at an f32 boundary
  (`const a: f64 = z + 1` with an f32 local was an invalid module on main): `emitExpr` is now a
  wrapper that reads the emitted WAT's result type from its outermost form (`watResultType`) and
  converts only when exactly one side is f32 (in valid WAT that never happens, so no valid output
  changed: golden-WAT 0 entries); an f32 operand meeting an f64 computes in f64; `f32 → i32` uses
  `i32.trunc_f32_s`. The console twin got `f32AsExpected` on its element and field loads. Test
  `9_F32Containers` — where: wasic + console_log f32
- ld27 — bug (native → compiled): FIXED 2026-10-09 (L3, both paths: each argument is ToInt32'd: a
  literal folds, an f64 / f32, or a float wasic had wrapped in a TRAPPING `trunc_f64_s`, goes
  through `$__i32_toint32`; an i32 argument is untouched, golden-neutral). Was OPEN (Math scan,
  2026-10-09; the same on main): `Math.clz32` / `Math.imul` with an f64 argument build an INVALID
  module: `i32.clz` / `i32.mul` get the f64. JavaScript applies ToInt32 (wrap mod 2³², NaN → 0)
  first. Repro `ld27_math_clz32_imul_f64_arg.ts` — where: wasic Math dispatch
- ld28 — bug (native → compiled): FIXED 2026-10-09 (L3: trig through Payne–Hanek (sw61); `pow`
  returns ±∞ / ±0 once `y·log|x|` passes ±800, `sinh` / `cosh` ∞ past 1000, `expm1` −1 below −40,
  before any integer conversion). Was OPEN (Math scan, 2026-10-09; the same on main; CORRECTED the
  same day, one call per program): these TRAP, "float unrepresentable in integer range": `sin` /
  `cos` / `tan(1e300)`, `pow(1e200, 1e200)`, `expm1(-1e10)` and `expm1(-2147483648)`, `cosh` /
  `sinh(1e10)`, `cosh(1e300)`. Correct: `sin` / `cos` at ±2³¹, `pow(-2.5, 3)`, `expm1(1e10)`, `cosh`
  / `sinh(1000)`. (The first scan printed every input in ONE program, so the lines after a trap came
  back empty and were blamed on the wrong inputs.) Repro `ld28_math_trig_large_arg_traps.ts` —
  where: wasic Math library
- ld29 — bug (native → compiled): FIXED 2026-10-13 (wasMath L4, both paths: every bitwise / shift
  operand, and `~`'s, goes through ToInt32 (`emitToInt32` / `toInt32Wat`, shared with ld27's clz32 /
  imul): a literal folds, an i32 is untouched, a float (or one wasic had wrapped in a trapping
  `trunc_f64_s`) calls `$__i32_toint32`. `45_random-numbers`' mulberry32 and `62_GapNumericCoercion`
  moved to it, same output). Was OPEN (Math scan, 2026-10-09; the same on main): `x \| 0` on an f64
  outside the i32 range TRAPS; JavaScript's ToInt32 wraps (4294967298.7 → 2). The idiom asm.js uses
  for "to int32". Repro `ld29_or_zero_traps_out_of_range.ts` — where: wasic `\|` on an f64
- ~~ld32~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found by the wasMath corpus program; the
  same on main): `NaN` / `Infinity` where an f32 is wanted (an f32 parameter: `g(NaN)`,
  `f32.add(NaN, 1)`) emitted an `f64.const`: an INVALID module. Both emitters now give `f32.const
  nan` / `inf` in an f32 context (wasic `emitExprCore`, console `exprToWat`). Test
  `39_WasMathAllFunctions` — where: wasic + console constants
- ld33 — bug (native → compiled): FIXED 2026-10-09 (L3: `atan2` returns ±π/2 when — where: y — > — x
  — ·2⁶⁰, before the dd divide whose subnormal quotient looped; `$__cr` returns a NaN hi as is and
  zeroes a NaN lo). Was OPEN (found by the wasMath L2 battery, 2026-10-09): `Math.atan2(0.5,
  1e-310)` (a SUBNORMAL second argument) loops FOREVER in wasm; Deno `1.5707963267948966`.
  `f64.atan2` lowers to it. The repro verifier and the L2 battery now have time limits that kill the
  real process (not the `.cmd` shim) and report HANG. Track M / L3. Repro
  `ld33_math_atan2_subnormal_hangs.ts` — wasic Math library (mathlib)
- ~~ld34~~ — bug (native → compiled): ✅ FIXED 2026-10-15, and broader than recorded: EVERY `s[i]` of
  a string in console.log was refused, an i32 index too. A string receiver's index now goes to
  wasic's string resolver (the path `const ch: string = s[i]` takes). Found with it: sw71. Test
  `7f_ConsoleStringIndex`. Was OPEN (found building D3, 2026-10-13; the same on main):
  `console.log(s[pos])` with `pos: number` (an f64) is refused, "console argument: cannot emit the
  expression 's[pos]' as f64"; Deno prints `e`. `const ch: string = s[pos]` compiles and is right,
  so only the console's string-index path lacks the float index (an INDEX: the owner's D3 keeps the
  conversion there). Repro `ld34_console_string_index_by_number.ts` — where: console_log string
  index
- ~~ld37~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (batch 2): `$__arr_elem_str` writes
  booleans (kind 8), bigints with their `n` (9) and strings (10, quoted and escaped as
  `scripts/console/inspect_array_ref.ts`); `$__arr_inspect` aligns booleans and strings LEFT in
  columns (padEnd), counts a string's width in characters, and reserves room for the strings' text.
  A string array, returned or a variable, prints. Struct arrays stay refused (sw74, ld45); a typed
  or 2D array beside other arguments too. Golden: only the two helpers grew (+106 lines) in 7
  entries. Test `7h_ConsoleWholeArrays`. Was OPEN (opened by the sw66 fix, 2026-10-13): a WHOLE
  string / boolean / bigint (or struct) array as a console.log argument, and a typed or 2D array
  beside other arguments, is refused ("printing a whole string[] array is not supported yet; print
  its elements"); before sw66 they printed an address or element bits. Deno prints `[ "a", "b" ]`,
  `[ true, false ]`, `[ 1n, 2n ]`. Needs element writers in `$__arr_elem_str` (a string quoted as
  util.inspect quotes it: `"` unless the text holds one, then `'`, then `` ` ``; booleans and
  strings align with padEnd, not padStart). Repro `ld37_console_whole_nonnumeric_array.ts` | console
  array writer
- ~~sw71~~ — bug (native → compiled): ✅ FIXED 2026-10-15 under the owner's ruling (the same day): an
  out-of-range `s[i]` gave `""` (and in a concat a GARBAGE byte, `$__str_char_code_at`'s);
  JavaScript gives `undefined`. Now `$__str_index` returns a static "undefined" text out of range,
  which prints, concatenates and interpolates as JavaScript's does; a string compared with
  `undefined` / `null` calls `$__str_is_nullish` (no text, or that marker). `charAt` keeps `""`, as
  JavaScript. **And a FLOAT string index is a compile error** (`error[float-index]`, owner: "refuse
  float index"; it narrows D3 for strings: a fractional index is `undefined` in JavaScript and wasm
  would truncate). Judged by the emitted index (truncated = a float). 3 corpus programs migrated
  (`i32` counters, `f64.toI32(v % 16)`). Known edges, documented: `s[10].length` is 9 (JavaScript
  throws), `s[10] === "undefined"` is true (JavaScript false). Tests `7f_ConsoleStringIndex`;
  typed_decl (4 refusals, 1 accepted) — where: wasic string index
- ~~sw75~~ — bug (native → compiled): ✅ FIXED 2026-10-19 with sw102 (a top-level comparison through
  the dot-call path prints as a boolean; test `7i_ConsoleUnaryBoolStringFields`). Was (found with
  sw71, 2026-10-15; the same on main): `console.log(s.charAt(far) === "")` prints `1` for `true`
  (the comparison takes a numeric segment; not the string-method branch, which now needs the whole
  argument to be one call) — where: console_log
- ~~ld46~~ — bug (native → compiled): ✅ FOUND FIXED 2026-10-20 (it passes; closed by sw100's
  `.length` of a string-valued call, 2026-10-19). Was (found with sw71, 2026-10-15; the same on
  main): `console.log(s.charAt(far).length)` builds an invalid module (an i32 block where an f64 is
  expected); `const c: string = s.charAt(far)` then `c.length` works — where: console_log
- ~~sw72~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (found with ld22; the same on main): a
  function-typed declaration whose initialiser was neither a closure-factory call nor a plain
  function name EMITTED NOTHING (`return ""`): the local stayed 0, and a call through it reached
  table slot 0, whatever function that was (an assembler error only when the table was empty). Any
  other initialiser is now a compile error; ld39 and ld01 closed the forms that reached it — where:
  wasic function-typed declaration
- ~~sw73~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (found with ld12; the same on main): a
  function's local array named like a top-level array (`function mk() { const m: i32[][] = …; }`
  beside a top-level `m`) made the top-level one a module global, because `detectModuleArrayGlobals`
  counted the function's OWN `m` as a use; _start then initialised it as a local and read the
  global: `3 7 9` → `3 0 0`. A name the function declares (param, `const` / `let` / `var`) no longer
  counts. `13_variadic-functions`' `nums` became a plain local (golden re-recorded) — where: wasic
  module arrays
- ~~ld38~~ — bug (native → compiled): ✅ FIXED 2026-10-22: `$__f64_to_fixed(x, f)`, exact as
  JavaScript's: x = m·2^e, n = m·10^f·2^e in big integers, ties to the larger n
  (`(1.005).toFixed(2)` is "1.00", 1.005 being a little below it), NaN "NaN", \|x\| ≥ 1e21 and
  ±Infinity are String(x), f outside 0..100 traps (JavaScript: RangeError). It reuses sw122's
  `$__bn_*` helpers (plus a right shift and a small division), emitted once when both are used.
  Declarations, templates, concatenations and console.log. Test `4m_ExpressionGaps`. Was (found
  2026-10-15): `Number.prototype.toFixed` is not implemented: `console.log(x.toFixed(1))` and `const
  t: string = x.toFixed(2)` are refused — where: wasic numbers
- ~~ld41~~ — bug (native → compiled): ✅ FIXED 2026-10-22 (found with sw73, 2026-10-15): a TOP-LEVEL
  2D array read inside a function, `return grid[r][c]`, is refused (the module-global 2D path is
  missing). detectModuleArrayGlobals registered `T[][]` as a 1D `T[]` and missed the `Array.from`
  pre-pass form; it now registers a 2D global, and the 2D read, `a[i].length`, `a[i].push`, console
  print and both builders go through arrGetWat / arrSetWat. `string[][]` is ld94 — where: wasic
  module arrays
- ~~ld42~~ — bug (native → compiled): ✅ FIXED 2026-10-22 (found with ld01, 2026-10-15): a top-level
  `boolean` constant read inside a function, `if (useTri)`, is "Unsupported expression" (an i32
  constant beside it works). parseModuleGlobals promoted numeric and enum literals only; `true` /
  `false` now make a `bool` global, kept `bool` in console_log's globals map so it prints `true` /
  `false` (11 goldens moved, `local.get` → `global.get` only) — where: wasic module globals
- ~~ld94~~ — bug (native → compiled): ✅ FIXED 2026-10-22 (found with ld41): a 2D STRING array,
  `const names: string[][] = [["a", "b"]]`, is refused everywhere, at top level too, with the
  unhelpful "Unsupported expression: \"a\"" (the 2D builder has no string element). Elements are
  (ptr, len) pairs: the builder (a literal or a string variable; others refused), `str2DElemAddr`
  for reads in emitStringPtrLen / emitStringAssign / console, the 2D write, `names[r].length` a
  row's length; `parse2DArrayLiteral` is string-aware (`"d,e"` was two elements); module 2D string
  arrays register. Test `63_StringMatrix` — where: wasic arrays
- ~~ld95~~ — bug (native → compiled): ✅ FIXED 2026-10-22 (found with ld78): a LITERAL array of
  functions, `const ops: Op[] = [add, mul]` (or `Array<(…) => T>`), was no function array (`const f:
  Op = ops[i]` "Unsupported function-typed initialiser"; `console.log(ops[0](1, 2))` refused). A
  pre-pass writes the empty function array and one push per element; `arr[i](args)` calls the slot's
  table index in emitExpr and in console. Test `44_FunctionArrayLiterals` — where: wasic function
  arrays
- ~~ld43~~ — bug (native → compiled): ✅ FIXED 2026-10-22: emitExprCore's `.length` of a
  string-valued receiver unwraps parentheses and builds a concatenation into the `$__str_op` pair
  (emitStringAssign); it also takes a string FIELD of an element (ld70) and stays out of a sum
  (`a.length + t.length`) and of a plain element read (`arr[j].length`, its direct load).
  `isStringExpr` now knows `L + R` with a string on either side (the last additive operator being
  that `+`, nothing looser at top level): `(s + s).length` was refused. Test `4m_ExpressionGaps`.
  Was (found with sw26, 2026-10-15): `.length` of a parenthesised string expression in console.log,
  `("pre" + s).length`, is refused — where: console_log
- ~~sw74~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (found with ld37; the same on main): a
  whole STRUCT array in console.log printed its element POINTERS, `[ 260, 264 ]` for `[ { x: 1 }, {
  x: 2 } ]`: the refusal list missed `structTypeName`, and the elements are i32. Refused now (ld45
  is the printing) — where: console_log
- ~~ld44~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (found with ld37; the same on main): a
  string `push` with an expression in a ONE-LINE loop at top level, `for (…) grown.push("w" + i)`,
  used an undeclared `$__str_push_ptr` (the pre-scan wants the push at the start of its line);
  declared after emission now, as `$__arr_tmp`. Test `7h_ConsoleWholeArrays` — where: wasic temps
- ~~ld45~~ — bug (native → compiled): ✅ FIXED 2026-10-24 (the object writer, `src/inspect_wat.ts`;
  see the 2026-10-24 entry above). Was OPEN (2026-10-15): printing a whole struct array,
  `console.log(ps)` (Deno `[ { x: 1 }, { x: 2 } ]`), is refused; needs an object writer
  (util.inspect's `{ k: v }`, its own line-breaking). 2026-10-22: a single struct or class instance
  too (it printed its address: sw127, now refused, `refuseWholeObjectArgs`) — where: console array
  writer
- ~~sw127~~ — bug (native → compiled): ✅ FIXED (refused) 2026-10-22 (found with ld45; the same on
  main): `console.log(p)` of a whole struct printed its ADDRESS, `260` for `{ x: 1, y: 2.5 }`.
  wasic's console handlers refuse a bare struct / class instance argument before console_log runs
  (no new console_log export); printing it is ld45. Test `7i_ConsoleWholeStructRefused`
  (expect-fail) — where: wasic console
- ld36 — bug (native → compiled): FIXED 2026-10-13 with D3 (a documented gap, dynrt-design.md 3.1,
  never a row until D3 made it the only way to unbox): a cast operand in a comparison, `(x as f64)
  === 13`, compared as `i32.eq` over an f64, an invalid module. The binary-op loop now types an
  operand written `(x as T)` / `x as T` as T. `dynrt_any_bundle` checks 13 such comparisons — where:
  wasic binary-op operand typing
- ld35 — bug (native → compiled): FIXED 2026-10-13 with D3 (found building it; the same on main): in
  a `console.log` argument, a call to a user function with an `i32` parameter passed an f64 argument
  RAW (`console.log(h(f))`), an invalid module ("call[0] expected type i32, found global.get of type
  f64"); outside the console it was truncated. Both paths now refuse it (D3: a float passed to an
  integer parameter; console `intArgWat`). typed_decl asserts it — where: console_log call arguments
- ld30 — bug (native → compiled): FIXED 2026-10-13 (wasMath L4: bigint `**` is wasMath's i64 power
  by squaring, `$__i64_pow`, wrapped to 64 bits like every bigint here; a negative exponent traps
  where JavaScript throws; inferExprType now types a bigint expression led by a bigint GLOBAL or
  holding a bigint literal as i64, which the console fallback needed). Was OPEN (bigint probe,
  2026-10-09): bigint `**` is unsupported (`cannot emit the expression 'a ** 3n' as i64`). Repro
  `ld30_bigint_exponent_unsupported.ts` — where: wasic i64 operators
- ld31 — bug (native → compiled): FIXED 2026-10-13 (wasMath L4, both paths: a bigint operand makes
  `&` `\|` `^` i64 ops and `<<` `>>` calls to `$__i64_shl` / `$__i64_shr`, which follow JavaScript's
  unbounded count (≥ 64 fills, negative shifts the other way) wrapped to 64 bits, where `i64.shl`
  takes the count mod 64; `>>>` on a bigint is a compile error, as it is a TypeError in JavaScript;
  typed_decl asserts it). Was OPEN (bigint probe, 2026-10-09): bigint `&` `\|` `^` `<<` `>>` build
  an INVALID module (`i32.and` / `i32.shl` handed an i64), in console arguments and declarations
  alike. `+ - * / %` and unary `-` are right. Repro `ld31_bigint_bitwise_shift_invalid.ts` — where:
  wasic i64 operators
- ~~ld26~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw51; the same on main): a
  struct literal containing `null` pushed into a struct array (`recs.push({ a: null, b: 2 })`) did
  not compile: `null` made the literal non-constant, and the runtime path's `$__rt_struct_ptr` was
  undeclared there. `null` / `undefined` are compile-time constants now (the static encoder stores 0
  and sets a flagged field's flag). Repro `ld26_push_struct_literal_with_null.ts`; test
  `24_NullableFields` — where: wasic struct literal
- ~~ld24~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw09; the same on main): a
  top-level array named BARE inside a function (`` `g=${g}` ``, not `g[i]` / `g.length`) compiled to
  a nonexistent local `$g`. `detectModuleArrayGlobals` now counts every identifier a function uses,
  and a `push` / `pop` / `shift` / `unshift` / `splice` on it as dynamic. Test
  `11_StringConversions` — where: wasic module arrays
- ~~ld25~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw09; the same on main): ``
  const s: string = `${a.join("-")}|` ``: `Unsupported expression`. A `.join(...)` segment is a
  string (`isStringExpr`) and its multi-value result is taken off the stack. Test
  `11_StringConversions` — where: wasic template
- ~~ld23~~ — bug (native → compiled): ✅ FIXED 2026-10-15, both paths: an equality with a boolean
  side (a comparison, `!x`, `true` / `false`, a boolean variable; not `a \|\| b`, a number per sw49)
  is an i32 compare (console `isBoolOperand`, wasic `_boolEquality`). The declaration form `x < 1
  === ok` failed too. Test `7g_ConsoleConcatAndCompare`. Was OPEN (found fixing sw17, 2026-10-06;
  fails on main too): a comparison between booleans, `2 < 3 === true`: the equality is typed f64
  from its literal-led left side over an i32 comparison result, an invalid module. Repro
  `ld23_compare_boolean_with_boolean.ts` — where: wasic + console comparison typing
- ~~ld20~~ — bug (native → compiled): ✅ FIXED 2026-10-15: the function parser now joins a multi-line
  `return () => {` … `};` (newlines kept, as `return function`), parseReturnArrow splits a one-line
  body into statements, and an unannotated block arrow returns what its `return` returns (it was
  void, an invalid module). Test `5h_ClosureFieldsAndReturns`. Was OPEN (found fixing sw32,
  2026-10-06): a function that RETURNS a block-bodied arrow (`return () => { c++; return c; };`, one
  line or several): `Unsupported statement`. The object-literal form (`return { inc: () => { … } }`)
  works. Repro `ld20_returned_block_arrow.ts` — where: wasic arrow lifting
- ~~ld21~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (with sw52): an object literal returning
  TWO closures (`{ up: () => { ++v; return v; }, get: () => v }`): `Unsupported expression`. Not the
  two closures: an expression-bodied arrow that is the object's LAST value ended only at `)` / `]` /
  `,` / `;`, so it took the closing `}` with it. A `}` at depth 0 ends it now. Repro now MATCH; test
  `5h_ClosureResultTypes` — where: wasic arrow lifting
- ~~ld22~~ — bug (native → compiled): ✅ FIXED 2026-10-15, not a console bug: `rd.g()` was refused
  everywhere. The factory's result struct took only arrows written INLINE in `return { … }`; a field
  naming a local declared with a function type (`{ g: g }` / `{ g }`) is now a field too (in source
  order). Under it, ld39 and sw72; beside it, ld40. Test `5h_ClosureFieldsAndReturns`. Was OPEN
  (found fixing sw32, 2026-10-06): `console.log(rd.g())`, a closure held in a struct field called
  inside console.log: `cannot emit the expression 'rd.g()'`. Repro
  `ld22_console_struct_closure_call.ts` — where: wasic closure struct
- ~~ld39~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (found with ld22; the same on main): a
  local declared WITH its function type inside a function, `const g: () => i32 = () => r * 2`, was
  never lifted: `liftInlineArrows` met the type's `=>` first (the top-level pass strips the
  annotation; the function pass now does too, for an arrow initialiser). Test
  `5h_ClosureFieldsAndReturns` — where: wasic arrow lifting
- ~~ld40~~ — bug (native → compiled): ✅ FIXED 2026-10-15 (found with ld22; the same on main): an
  arrow with nothing to capture as a value of a returned object (`{ h: (): f64 => 1.5 }`, or a local
  returned in one) was a bare table index, but the result struct calls through a closure pointer:
  "function signature mismatch". It gets a zero-capture closure there. Test
  `5h_ClosureFieldsAndReturns` — where: wasic arrow lifting
- ~~ld19~~ — bug (native → compiled): ✅ FIXED 2026-10-15: a struct-array element's field leads the
  type, in the console's numeric segment (Phase 42 knew `a.x` only) and in its binop operand typing.
  Test `9_ArrayLiteralArgsAndTuples`. Was OPEN (found fixing ld18, 2026-10-06; the same on main):
  `console.log(qs[0].x + qs[1].x)` (fields of struct-array elements, summed): `cannot emit the
  expression 'qs[0].x' as i32`. The console binop types the sum from its lead atom (`qs`, an i32
  pointer). A declaration (`const s: f64 = qs[0].x + qs[1].x`) works. Repro
  `ld19_console_struct_array_field_sum.ts` — where: console_log binop typing

