# compiler-bugs — part 4 of 7

Continues [compiler-bugs.md](compiler-bugs.md) (split by size on 2026-11-20, letter H38). Sections:

- H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CO

## H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CONFIRMED BY RUNNING

**Class:** SILENT-WRONG (29, incl. sw29 from the owner's ruling) / LOUD (8) · **Status:** OPEN · **Scope:** compiler

Four parallel read-only audits (fall-throughs, codegen, `wasic.ts`↔`console_log.ts` divergence,
dead code/stale workarounds). **Every claim was run** with `scripts/phase0/verify_repros.ts` (native
Deno vs compiled). Three claims were DISPROVED that way (`n || 7`; escaped string-enum in
`console.log`; `console.error` of a null). Repros live in `scripts/phase0/round1/` by outcome; a fix
flips its repro to MATCH. Most of the console-path rows share ONE root: `exprToWat`'s
terminal fallback (console_log.ts ~2605) emits `(;? … ;) (T.const 0)` with no diagnostic.

(Table as a list — id · bug (native → compiled) · where:)

- ~~sw01~~ — bug (native → compiled): ✅ FIXED 2026-09-29: `throw new TypeError(..)` / `throw 42` →
  **proc_exit(0)**: no catch, no output, exit 0. Every built-in Error constructor (not
  `AggregateError`) now throws like `Error`; a number / numeric var / boolean throws its string
  form; anything else (an object) is a hard `Unsupported throw` diagnostic. Tests
  `15_ThrowNonError`, `15_ThrowTypeErrorUncaught` (`@expect-exit: 1`), `15_ThrowObjectRefused`
  (`@expect-fail: compile`); all three fail on the old compiler — where: wasic throw branch
- ~~sw34~~ — bug (native → compiled): ✅ FIXED 2026-09-29 (same day): wasic's instanceof resolver now
  answers EVERY `x instanceof Y` (emitExpr models the Error family and user classes), and
  `exprToWat` consults it before its terminal stub. Test `15_ConsoleInstanceofCondition`; fails on
  the old compiler. Original report: (found fixing sw02, 2026-09-29) `console.log(e instanceof Error
  ? "is error" : "not error")` in a catch: `is error` → `not error`. The console condition is
  `exprToWat`'s terminal stub `(;? e instanceof Error ;) (i32.const 0)`; the console path never
  resolves Error-family `instanceof` (wasic's emitExpr does). Predates sw02 (the old `select`
  carried the same stub). Repro `sw34_console_instanceof_cond_stub.ts` — where: console_log
  exprToWat fallback
- ~~sw33~~ — bug (native → compiled): ✅ FIXED 2026-09-29 (found fixing sw01): `String(<bool>)` went
  through `$__i32_to_str`: `true` → `1`. Now selects static "true"/"false". Test `15_ThrowNonError`
  — where: wasic `String(...)` in emitStringAssign
- ~~sw02~~ — bug (native → compiled): ✅ FIXED 2026-09-29: console ternary with a template branch:
  `n=5` → `n=`. Four causes in the one construct, all fixed: (1) `getStrPtrLen` kept only `segs[0]`
  of a multi-piece branch (template, concat); the branch is now built whole by wasic's
  `emitStringAssign` via the string-expression resolver; (2) `select` ran BOTH branches (a call in
  the branch not taken still ran) and, when both captured a length in `$__str_op_len`, the ELSE
  length won; now `if` with the chosen branch's length; (3) `looksLikeString` missed templates,
  string-method calls and string-returning calls, so those ternaries printed `0` or built an invalid
  module (widened for the ternary only); (4) the split used the LAST `?` (`findTopLevelOp`), so a
  nested ternary grouped wrongly: new `splitTernary` (first `?`, matching `:`). Also:
  `console_log.ts` gained its first error path (`setConsoleDiagnosticSink`), and a branch nothing
  can build is now a diagnostic, not `""`. Test `7b_ConsoleStringTernary`; fails on the old compiler
  — where: console_log string ternary
- ~~sw03~~ — bug (native → compiled): ✅ FIXED 2026-09-29: `ok ? "pass" : "fail: " + msg`: `pass` →
  `passboom`. The `+` concat split ran before the ternary and cut at the `+` INSIDE the else branch.
  The string-ternary block now runs before every operator handler in `parseSingleArg` (the
  conditional binds looser than all of them). Golden-WAT: no existing output changed. Test
  `7b_ConsoleTernaryBeforeOperators`; fails on the old compiler — where: console_log `+` split
- ~~sw04~~ — bug (native → compiled): ✅ FIXED 2026-09-30: `Math.abs(s.charCodeAt(0) - 100)`: `3` →
  `100` (operand → 0). The console fallback delegates to wasic's emitExpr
  (`setExprFallbackResolver`). Test `7b_ConsoleExprFallback`; fails on the old compiler — where:
  console_log fallback
- ~~sw05~~ — bug (native → compiled): ✅ FIXED 2026-09-30: string arg that is not a plain var/literal
  (`count(names[1])`): `3` → `0`. `exprToWat`'s string branch went straight to a null string; it now
  asks wasic's string resolver (emitStringPtrLen / emitStringAssign), keeps `null` / `undefined` as
  the null string, and otherwise ABORTS (`cannot emit the string expression`). The string-equality
  operand (`getStrPL`) had the same silent `""` fallback and now aborts the same way. The resolver's
  `$__str_op_len` is pre-declared for a console line whose call has an expression argument (both
  declaration heuristics, emitFunction and `_start`). Test `7b_ConsoleStringCallArg`; fails on the
  old compiler — where: console_log exprToWat string
- ~~sw35~~ — bug (native → compiled): ✅ FIXED 2026-09-30 (found fixing sw05, whose new diagnostic
  exposed it): `count(w) + count(names[2])`: `6` → `0`. Both console call matchers
  (`/^(\w+)\s*\((.*)?\)$/` in parseSingleArg and exprToWat) took `f(a) + f(b)` as ONE call with the
  argument `a) + f(b`; they now require the `(` to close at the end (`parenDepthNeverNegative`,
  which now skips string literals). Behind it, a call's result was never converted to the type the
  caller expected (an i32 `count()` in an f64 sum: an invalid module); it is widened now, or
  reported when lossy. Repro `sw35_console_call_plus_call_one_call.ts`; test
  `7b_ConsoleStringCallArg` — where: console_log call match
- ~~sw06~~ — bug (native → compiled): ✅ FIXED 2026-10-09: `` `len=${s.length}` + "!" ``: `len=5!` →
  `len=!`. `.length` (and `indexOf`-family calls) of a string receiver now infer i32, so the
  template part renders; a template part that still cannot be built is a diagnostic, not dropped.
  Test `11_StringConversions` — where: wasic appendConcatPart
- ~~sw07~~ — bug (native → compiled): ✅ FIXED 2026-10-09: `console.log(s.includes("b"))`: `true` →
  `1`. A string receiver's `includes` / `startsWith` / `endsWith` are typed `bool` (dot-call lookup
  and `inferInitType`). Test `11_StringConversions` — where: wasic dotCallLookupFn
- ~~sw08~~ — bug (native → compiled): ✅ FIXED 2026-10-09: `s.indexOf(String(n))`: `2` → `0`.
  `String(x)` as a value (an ARGUMENT) was known only to emitStringAssign; `emitStringPtrLen` now
  builds it with `$__<type>_to_new_str` (i32, i64, f64, bool) or `$__exn_str`, and a nested quiet
  failure fails the dot-call (`quietStringFailures`) instead of passing `""`. Test
  `11_StringConversions` — where: wasic quietEmit sites
- ~~sw09~~ — bug (native → compiled): ✅ FIXED 2026-10-09: an array in a template / concat /
  `String(...)`: `v=1,2,3` → `v=260` (a pointer), in both paths. A bare i32 / f64 array is its
  `.join()` (`arrayAsJoin`; the console rewrites to its join segment); a string, 2D, struct or typed
  array there is a diagnostic. With it: a one-call multi-value first part of a concat or template is
  taken off the stack (`concatAppend`, `emitTmplConcat`), which made `` `${a.join("-")}` `` (ld25)
  work. Test `11_StringConversions` — where: both
- ~~sw10~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `-x + 5`: `2` → `-8`. Unary `-`, `!`, `~`
  (and `**`) apply only when no binary operator is at top level (`hasTopLevelBinaryOp`). Test
  `4_OperatorSemantics` — where: wasic emitExpr
- ~~sw11~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `!a && b`: `no` → `yes` (same rule as
  sw10). PRINTING `!a && b` still gives `true` where JavaScript gives the operand `0`: that is sw49
  — where: both
- ~~sw12~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `c1 ? A : c2 ? B : C` grouped from the
  right: `-1` → `1`. wasic's `splitTernaryTop` and the console's numeric ternary now split at the
  FIRST `?` and its own `:`. Test `4_OperatorSemantics` — where: wasic + console
- ~~sw13~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `2 ** 3 + 1`: `9` → `16`. `**` is taken
  only when no lower-precedence operator is at top level — where: wasic
- ~~sw14~~ — bug (native → compiled): ✅ FIXED 2026-10-06: a comparison ANYWHERE inferred bool: `"h="
  + (n >> 1)`: `h=4` → `h=true`. `hasTopLevelBoolOp` looks at top level only and skips shifts and
  `=>` — where: wasic inferInitType
- ~~sw15~~ — bug (native → compiled): ✅ FIXED 2026-10-06: binop typed from the LEFT operand: `i + f`
  = `3.5` → `3`. An i32 left operand meeting a KNOWN float (a float literal or a variable declared
  f64 / f32) computes in f64, in wasic and in the console (where the segment prints as f64 too). A
  first cut trusted `inferExprType`, whose fallback is f64, and built `f64.mul` over `i32.load`s:
  caught by golden-WAT before the gate — where: wasic + console
- ~~sw16~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `if (0.5)` truncated: `yes` → `no`.
  `emitCond` (if / while / for / ternary / `!` / `&&` / `||`): when the emitter truncated a float to
  fit the i32 context, the truncation becomes `|x| > 0` (nonzero, not NaN). Decided on the emitted
  WAT: a first cut used `inferExprType`, which calls `isNaN(x)` f64, and wrapped comparisons in
  `f64.abs`. Console twin `condToWat` — where: wasic + console
- ~~sw17~~ — bug (native → compiled): ✅ FIXED 2026-10-06: `a >> 2 << 1`: `32` → `4`. Every
  same-precedence group (equality, relational, shift, additive, multiplicative) splits at its
  rightmost member, in both paths. That exposed `findBinaryOp` matching `==` inside `!==` (`s[i] !==
  "x"` split as `s[i] !` / `= "x"`): fixed in both. `a - b + c` is now `(a - b) + c` (identical in
  i32; the date library re-recorded) — where: wasic + console op tables
- ~~sw49~~ — bug (native → compiled): ✅ FIXED 2026-10-09: `a && b` / `a \|\| b` gave a BOOLEAN where
  JavaScript gives an operand: `console.log(!a && b)` with b = 0 printed `true` (JavaScript `0`);
  two numbers (`x \|\| 7`, `z && 9`) printed `true`, and a float operand (`h \|\| 2.5`) built an
  INVALID module. Now two numbers give the operand at their type (`emitLogicalValue`: the left side
  evaluated once into a `$__lor_<t>` global read only on the branch that skips the right side); two
  booleans and every condition (`emitCond`) keep the boolean short-circuit, byte-identical
  (golden-WAT 0 entries changed); a boolean mixed with a number prints through a string conditional
  as its own `console.log` argument (`logicalForConsole`) and is REFUSED inside a larger expression
  or a string (it printed `true` / built an invalid module). `splitTopLogical` splits at the LAST
  `\|\|` / `&&` (left-associative; a first cut split at the first and re-grouped 43 library entries,
  equivalent but not identical). Test `4_LogicalOperands` — where: wasic + console `&&` / `\|\|`
- ~~sw18~~ — bug (native → compiled): ✅ FIXED 2026-09-30 (LOUD since that morning): `console.log(n
  << 2)`: `12` → `true`. `findTopLevelOp` scans right to left and skipped only the FIRST `<` of `<<`
  (`after === "<"`), so the second split `n <` from `2`; it now skips a `<` with a `<` on either
  side. Test `7b_ConsoleOperatorSplit` — where: console_log findTopLevelOp
- ~~sw19~~ — bug (native → compiled): ✅ FIXED 2026-10-09: `x ?? 5` on a non-nullable 0: `0` → `5`. A
  number or boolean not tracked nullable is never null, so `??` is its left side; the 0-is-null test
  stays for pointers and for `T \| null` tuple elements (which have no null flag: sw51). A first cut
  dropped it for those too, turning a null element into 0: found reading the golden diff
  (`24_NullableTupleReturnAndFlags`), before the gate. Test `11_StringConversions` — where: wasic
- ~~sw51~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found fixing sw19; the same on main; owner
  chose option A): a `number \| null` / `boolean \| null` TUPLE element, and (found scoping it) an
  interface or class FIELD, stored null as 0 with no flag, so a real 0 read as null and a null read
  as 0: `[0, 2.5]` destructured, `v ?? -1` → `0` → `-1`; `{ a: null }` then `r.a ?? -1` → `-1` → `0`
  (a field on the left of `??` ignored the right side entirely); `{ a: 0 }` then `r.a === null` →
  `true`. Now such a field has a flag word after the last field, read, written, copied and printed
  like a nullable local's `__null` (design-decisions.md § "Nullable FIELDS carry a flag word").
  Found with it: sw54, sw55, sw56, ld26, and `inferExprType` typing `d1.c === null` from its leading
  f64 field (it built an invalid module). Test `24_NullableFields` — where: wasic struct / tuple
  layout
- sw57 — bug (native → compiled): FIXED 2026-10-09 (wasMath L3: mathlib's `log` / `log2` / `log10`
  return NaN below 0; corpus `38_MathEdgeCasesL3`). Was OPEN (found by the Math scan, 2026-10-09;
  the same on main): `Math.log` / `log10` / `log2` of a negative number give `0`; JavaScript gives
  `NaN`. Repro `sw57_math_log_negative_zero.ts` — where: wasic Math library (Track M,
  wasm-number-types.md)
- sw58 — bug (native → compiled): FIXED 2026-10-09 (L3: `sin` / `tan` return ±0 as is; the dd sum
  `-0 + 0` made it +0). Was OPEN (Math scan, 2026-10-09): `Math.sin(-0)`, `Math.tan(-0)` give `0`;
  JavaScript keeps `-0`. Repro `sw58_math_sin_tan_negzero.ts` — where: wasic Math library
- sw59 — bug (native → compiled): FIXED 2026-10-09 (L3: `pow`'s head follows ECMAScript: `y = ±0` →
  1, a NaN operand → NaN, `x = 1` → 1 only for a finite `y`, `|x| = 1` with `y = ±∞` → NaN). Was
  OPEN (Math scan, 2026-10-09): `Math.pow(1, NaN)` gives `1` (C's rule); JavaScript gives `NaN`
  (also `pow(±1, ±Infinity)`). Repro `sw59_math_pow_one_nan.ts` — where: wasic Math library
- sw60 — bug (native → compiled): CLOSED BY DECISION 2026-10-09 (owner: "CR, in both"; counted in
  the fixed column): measured against the BigInt oracle, OURS is correctly rounded on every one of
  these inputs and V8 is the one 1 ulp off (`scratchpad cr_vs_v8.ts`: acosh 2 / 100, asinh 1.5 / 0.1
  / 1e300, cosh 10, sinh 2). Compiled `Math` stays correctly rounded; wasMath's `f64.acosh` & co.
  now run the SAME mathlib in Deno, so they agree to the bit; plain `Math.*` in Deno is V8's and may
  differ by 1 ulp, documented (README, design-decisions.md). The repro still reads DIFFER, by
  design. Was OPEN (Math scan, 2026-10-09): `acosh`, `asinh`, `cosh`, `sinh` differ from V8 by 1–2
  ulp (`acosh(2)` …166 → …168); other algorithms than V8's fdlibm-derived ones. Repro
  `sw60_math_hyperbolic_last_digit.ts` — where: wasic Math library
- sw61 — bug (native → compiled): FIXED 2026-10-09 (L3: Payne–Hanek reduction from — where: x — ≥
  2²⁸, generated by `scripts/math/gen_payne_hanek.ts` from 2/π computed exactly in BigInt; sin / cos
  / tan correctly rounded on 18,699 calls across the whole double range, including Muller's hardest
  case, against `math_cr_oracle.ts`, whose own trig reduction was made exact the same day; its
  100-digit π was garbage past 2⁶⁰). Was OPEN (Math table, 2026-10-09; one call per program):
  `Math.sin(1e18)` gives `5.981619729467063e+27`, an impossible sine (Deno `-0.9929693207404051`).
  Range reduction loses the argument somewhere between 1e15 (right) and 1e300 (traps, ld28). Repro
  `sw61_math_sin_huge_arg_wrong.ts` — wasic Math library
- sw62 — bug (native → compiled): FIXED 2026-10-13, and BROADER than first seen: ANY console line
  over 128 bytes overran the fixed gather scratch (SCRATCH_BASE, 4 × 32 bytes) into the data after
  it: eight long floats (this repro), a 200-character string (the next line printed `23456` for the
  label `after`), an array printout. Gather mode now builds the line in `$__cbuf`, a heap buffer
  that grows (`$__cbuf_need`, `$__cbuf_put`, array / join wrappers that load the length once and
  ensure the worst case); the iov pointer is set just before the write. Per-iov array / join
  printing moved to it too. 287 golden entries gained the helpers (none refused). Found with it:
  sw66, sw67, and an `i64[]` printout called an undefined helper (now a diagnostic). Was OPEN (Math
  table, 2026-10-09): a long `console.log` line of f64s corrupts a LATER line's literal text: after
  the eight `Math` constants, `console.log(1.1, 2.2, …, 8.8)` prints `6 1.4142135623730951` / `.6
  0.7071067811865476 8.8`. Each line alone is right. Suspected: the console scratch buffer overlaps
  the data holding later lines' pre-rendered text. Repro
  `sw62_console_long_line_corrupts_later_text.ts` — where: console_log buffers
- ~~sw65~~ — bug (native → compiled): ✅ FIXED 2026-10-09 (found by the wasMath corpus program; the
  same on main): the bundler's `applyRenames` rewrote imported names INSIDE string literals and
  comments: a multi-file program's `console.log("add")` printed the module-prefixed name, and a
  wasMath label `"i32.add"` printed `__wm_i32_add`. It now renames only CODE (a position-preserving
  `codeMask`: strings, template text and comments are data; `${…}` code is code) in ONE pass (an
  alternation, longest key first), so a rename can no longer be renamed again. Golden-WAT: 0
  existing entries changed. Test `39_WasMathAllFunctions` (its labels) — where: tsbundler
  applyRenames
- sw66 — bug (native → compiled): FIXED 2026-10-13 (with sw67; corpus `7d_ConsoleArrays`): an array
  variable (module, local, parameter; static or dynamic) is an `arrptr` segment, printed by the new
  `$__arr_inspect`. Fixed with it, the same class: a TYPED array was read as 4-byte i32 words
  whatever its type (an `Int8Array` printed neighbours' bytes; `Uint32Array` / `Float32Array`
  printed their bits as i32) — the writer now takes the element layout (`arrInspectKind`); and a
  returned `number[]` went to the i32 writer. Arrays with no element writer (string, boolean,
  bigint, struct, 2D beside other arguments) are refused (ld37), never printed as numbers. Was OPEN
  (found fixing sw62, 2026-10-13; the same on main): `console.log(arr)` of an array VARIABLE prints
  its memory address (`260`) instead of `[ 1, 2, 3 ]`, for i32 / number / string arrays, at top
  level or in a function. Only a function call's RETURNED array becomes an array printout (`arrptr`,
  from the call's `resultTsName`); a variable takes the integer path. `arr.join(sep)` is right.
  Fixing it needs the variable's layout from `arrayLookup` (static vs dynamic header), string arrays
  printed with quotes, and sw67's layout. Repro `sw66_console_array_variable_prints_address.ts` —
  where: console_log parseSingleArg
- sw67 — bug (native → compiled): FIXED 2026-10-13 (with sw66): `$__arr_inspect` is util.inspect's
  array layout (groupArrayElements + reduceToSingleString) for a top-level argument: one line within
  80 columns, else right-aligned columns past 6 entries (Math.round as floor(x + 0.5)), else one per
  line; 100 elements then `... N more items`; `[]` empty (the old writer printed `[ ]`); `-0` in an
  f64 array; a typed array's `Name(n) ` prefix counted. The layout was first written in TypeScript
  (`scripts/console/inspect_array_ref.ts`) and checked identical to `Deno.inspect` on 444 generated
  arrays (sizes 0–250, ints, floats, strings, booleans; `check_inspect_array_ref.ts`), then ported.
  Was OPEN (found fixing sw62, 2026-10-13): a long numeric array prints on ONE line in wasm; Deno
  and Node break it into aligned rows (the `util.inspect` grouping, past ~72 characters / more than
  6 items). The owner's M3 keeps the Deno / Node layout, so wasic should match it. Repro
  `sw67_console_long_array_layout.ts` — where: console array writers
- sw68 — bug (native → compiled): FIXED 2026-10-13 (corpus `7e_ConsoleNestedLog`): when an argument
  calls a user function (or any indirect call), every expression argument is evaluated, in order,
  into a `$__clt_<type>_<n>` temporary BEFORE the line is built (`hoistCallingArgs` in
  emitConsoleLog), as JavaScript evaluates all arguments before printing; the emitters declare the
  temporaries they find (`consoleTempLocals`, and _start's). Conservative by design (any user call,
  not only one that prints: helpers share the fixed scratch too): 198 golden entries moved, each
  checked to be ONLY the capture (an undo script plus reading). On main the probe garbled 8 of 10
  lines (`inner 40.25 end`, `2 ne 12`, a 160-byte line with `0.25` written over its start). Was OPEN
  (found fixing sw62, 2026-10-13; the same before it): a `console.log` whose argument calls a
  function that ITSELF prints: the nested line rewrites the shared gather cursor (iovBase+4) and
  buffer, so the outer line loses what it had built (`console.log("outer:", scale(4), "end")` prints
  `inner 40.25 end`; Deno `outer: 0.25 end`). The pointer half (an iov pointer stored before the
  nested call) is fixed with sw62; the shared cursor and buffer are not. Fix direction: evaluate
  such arguments into temporaries before the line is built, or give each line its own cursor. Repro
  `sw68_console_nested_log_in_argument.ts` — where: console_log gather
- sw69 — bug (native → compiled): FIXED 2026-10-13 (corpus `9_LiteralElementValues`; typed_decl +3),
  and BROADER than first seen. Every compile-time layout of a literal read its values with
  `parseFloat(raw) \|\| 0` / `parseInt(raw, 10) \|\| 0`: (1) numeric arrays, as below; `true` in a
  `boolean[]` was 0; `1.5` in an `i32[]` truncated; a bigint past 2^31 lost its high word; (2) the
  RUN-TIME array init (`emitDynArrayInit`, 2D too) did the same, so an array that is pushed to was
  no better; (3) a `string[]` literal that is pushed to stored pointer 0 for every element, printing
  `""` (`28_slices` read its data unwritten); (4) a module-level struct literal and every array of
  struct literals stored 0 / false for any field that was not a plain decimal (`{ x: k, ok: k > 3
  }`; `6b_pointers` masked it by zeroing the field next); a struct literal pushed onto an array was
  a null pointer. Now `plainArrayLiteral` decides what is laid out (exact decimal, hex, binary,
  octal, bigint, boolean literals of the element type); anything else is evaluated at run time with
  emitExpr under the usual type rules (`arrayElemWat`); module structs keep their static address and
  get run-time field stores; `allocStructData` refuses a value it cannot lay out. Found and fixed
  with it: a `boolean[]` element printed `1` / `0` (console); `flags[0] === false` in console.log
  was f64.eq over an i32 (an invalid module, the same on main); a float LITERAL into an integer slot
  (`const z: i32 = 1.5`) was `(i32.const 1.5)`, an assembler error with no location: it is D3's
  located report now, and `1e3` there is 1000. Was OPEN (found fixing sw66, 2026-10-13; the same on
  main): a STATIC array literal is encoded into the data section by `allocArrayData` with
  `parseFloat(e) \|\| 0` / `parseInt(e, 10) \|\| 0` per element, so every element that is not a
  plain decimal becomes 0 or a wrong number: `NaN`, `-0`, `Math.PI`, `0x10`, `0b101`, a variable, an
  expression (`[k, k + 1]` → `0 0`). Module and function level. Fix direction: encode only exact
  numeric literals; any other element makes the array initialized at run time (the dynamic path
  evaluates each element with emitExpr). Repro `sw69_static_array_literal_elements.ts` — where:
  wasic allocArrayData
- sw70 — bug (native → compiled): FIXED 2026-10-13 (corpus `9_LocalArrayShadowsModule`):
  `isModuleGlobalArr` decided global vs local by the NAME (a module global called that, holding a
  dynamic array), where every other site asks `!locals.has(name)`. emitFunction now records the
  module globals the function shadows with its own locals or params (`fnShadowedGlobals`, from
  `declaredLocals` and the params) and `isModuleGlobalArr` excludes them. On main the probe printed
  the module array as `0 0 0 0` / `[]`, and a local `items` from a literal (pushed) returned 2 for

> Continues in [compiler-bugs-4b.md](compiler-bugs-4b.md).
