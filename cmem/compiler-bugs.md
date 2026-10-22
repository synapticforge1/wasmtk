# Compiler bug log

## Classification tally (H12)

- **SILENT-WRONG:** the defect produced a wrong result that LOOKED like success (wrong output or value, exit 0, a false pass, a swallowed error, dead code believed to guard something), with no error or abort.
- **LOUD:** the defect announced itself (compile error/abort, crash/trap, hang, failing test, non-zero exit, visible error message), even if the message was misleading.

| class | compiler-open | compiler-fixed | other-open | other-fixed |
| --- | --- | --- | --- | --- |
| SILENT-WRONG | 1 | 142 | 0 | 27 |
| LOUD | 3 | 104 | 0 | 19 |
| n/a | — | 3 | — | 3 |

Re-counted from the round-1 table's rows 2026-10-15 (the open column had drifted: it read 3 / 20
while the rows said sw26, sw30, sw31 and 18 loud). Batch 1 of the loud rows closed sw26, sw30,
sw31 and 15 loud rows, found and fixed sw72, sw73, ld39, ld40, and found sw71, ld38, ld41–ld43.
Batch 2 (the same day) closed ld10, ld14, ld37, found and fixed sw74 and ld44, and found ld45:
**all 21 loud rows of 2026-10-13 are closed.**

80 classified entries (the 77th: Phase 36 restored, LOUD; the 78th: 24 wast passes resting on V8's own limits, SILENT-WRONG, other; the 79th: `assert_trap` passing on any trap kind, SILENT-WRONG, other, 2026-09-30; the 80th: `modc` of a dynrt-merged library, FIXED 2026-09-30, SILENT-WRONG, other) plus the 103 rows of the Phase 0b round-1 table (ld34–ld36 the 98th–100th, sw66–sw68 the 101st–103rd, 2026-10-13) (sw35 the 48th, sw36 the 49th, sw37–sw40 and ld15 the 50th–54th, 2026-09-30; sw41, ld16, ld17 the 55th–57th, sw42–sw44 and ld18 the 58th–61st, sw45 and ld19 the 62nd–63rd, sw46 the 64th, sw47 the 65th, sw48 and ld20–ld22 the 66th–69th, sw49 and ld23 the 70th–71st, 2026-10-06; sw50, sw51, ld24, ld25 the 72nd–75th, sw52 the 76th, sw53 the 77th, sw54–sw56 and ld26 the 78th–81st, sw57–sw60 and ld27–ld29 the 82nd–88th, sw61 and sw62 the 89th–90th, sw63, sw64, ld30, ld31 the 91st–94th, sw65, ld32, ld33 the 95th–97th, 2026-10-09) (each row counted as one
bug; re-tallied 2026-09-28 after the typed-declaration rule landed: sw29 closed, sw30–sw32 and
ld09–ld14 added, and the new entry "Landing the typed-declaration rule" holds 2 fixed and counts
once, as SILENT-WRONG, its worst); 2 pure groupings (`### wabt-ts 1.4.0` with its blockers under `####`, and `## FIXED — the 7 long-standing test failures`) carry a note instead and are not counted. An entry covering several defects takes its WORST class. PARTIAL counts as open. n/a entries have no status and sit in the -fixed column for placement only.

**ld94, ld95 FIXED 2026-10-22:** `string[][]`, a literal array of functions; open loud 3 compiler
(ld45, ld96, ld100); tests `63_StringMatrix`, `44_FunctionArrayLiterals`.
**sw123 FIXED 2026-10-22** (owner: "fix the compiler issues first"): null and undefined are told
apart; open silent 1 (sw119, the owner's decision); test `24_NullVersusUndefined`.
**Loud tool rows, group 3 FIXED 2026-10-22:** ld81 (`wasmbundle` memory), ld82 (bindgen camelCase
import), ld83 (deno binding: a relative path, a view's offset); **all loud tool rows closed**; open
loud 5 compiler + 0 tool (the ld83 pair counts twice in the "other" column).
**Loud tool rows, group 2 FIXED 2026-10-22:** ld84 (bundler exports), ld85 (one basename twice),
ld87 (`mod` i64); open loud 5 compiler + 4 tool.
**Loud tool rows, group 1 FIXED 2026-10-22:** ld89 (`dync` scaffold and doubled errors), ld90 (flag
values, a stray `-o`, a missing target); open loud 5 compiler + 7 tool; `tests/tool_rows_tests.ts`.
**sw127 FIXED (refused) 2026-10-22**, found looking at ld45: `console.log(p)` of a whole struct or
class instance printed its address; refused now, ld45 (the object writer) stays open; test
`7i_ConsoleWholeStructRefused` (expect-fail).
**Loud refusals, group 6 (classes) FIXED 2026-10-22:** ld74 (but generic classes, now ld100, open),
ld79; found and fixed **sw126** (silent: a base method calling an overridden one through `this`,
or a call on a base-typed parameter, ran the base's version); open loud 5 compiler + 9 tool; test
`29_ClassDispatchAndChaining`.
**Loud refusals, group 5 (callbacks and loops) FIXED 2026-10-22:** ld78 (its last two forms), ld91,
ld92, ld93; found and fixed ld97, ld98, ld99; found ld95, ld96 (open); open loud 6 compiler + 9
tool; test `5h_CallbacksChainsAndLoops`.
**Loud refusals, group 4 (module globals) FIXED 2026-10-22:** ld41, ld42; found ld94 (`string[][]`
refused everywhere, open); open loud 8 compiler + 9 tool; test `63_ModuleGlobals2DAndBoolean`.
**Loud refusals, group 3 (strings, tuples, objects) FIXED 2026-10-22:** ld76, ld77, ld80; open loud
9 compiler + 9 tool; test `28_StringsTuplesAndObjects`.
**Loud refusals, group 2 (statements) FIXED 2026-10-22:** ld71, ld72, ld73, and ld78's default-from-
an-earlier-parameter and two-declaration `for` (ld78 stays open for its callback forms); open loud
12 compiler + 9 tool; tests `5f_IncrementsAndCompoundForms`, `5f_CompoundIndexSideEffectRefused`.
**Loud refusals, group 1 (expressions) FIXED 2026-10-22:** ld38, ld43, ld66–ld70; open loud 15
compiler + 9 tool; test `4m_ExpressionGaps`.
**Open silent-wrong in the compiler: 2; in the tools: 0** (2026-10-21: sw122 fixed, parseFloat /
Number / parseInt correctly rounded, `53_NumberParseRounding`; left sw119, owner-ruled on a branch,
and sw123 with the nullable gaps). Before that, 3 (2026-10-20, the loud rows' invalid-module
group: 16 loud rows fixed (ld48–ld50, ld52–ld57, ld59–ld61, ld63, ld64, ld75) and ld46, ld62 found
already passing, 22 loud open; tests `4l_MixedOperandTypes`, `28_ArrayCallbackEdges`. Found on the
way: sw122 and sw123 OPEN, sw124 and sw125 FIXED; loud ld91–ld93 open). Before that, 1 (2026-10-19, latest: sw120 fixed, a null
string field is the 0 pointer, `24_NullableStringFields`; left only sw119, measured on a branch,
the owner's decision pending). Before that, 2 (2026-10-19, later: sw87 built, the
owner's rule 2, `28_SortDefaultStringOrder`; left sw119, sw120). Before that, 3 (2026-10-19, later: sw95 built, the
owner's rule 1, `9c_ArrayOutOfRangeUndefined`; left sw87, sw119, sw120). Before that, 4 (2026-10-19, later: sw97, sw99, sw100,
sw101, sw108, sw121 fixed, with loud ld58, ld65; `4k_LastSilentRows`. Left: the owner-ruled sw87,
sw95, sw119, and sw120 with the nullable gaps). Before that, 10 (2026-10-19, later: the method edge
cases sw86, sw88, sw89, sw90, sw93, sw94 fixed, with loud ld51; `28_MethodEdgeCases`). Before
that, 16 (2026-10-19, later: the console
printing group sw96, sw98, sw102, sw103 fixed, sw75 with them; sw120, sw121 found; tests
`7i_ConsoleUnaryBoolStringFields`, `7i_NullishStringFieldRefused`). Before that, 19 (2026-10-19, later: block scoping
sw104, sw105 fixed, `5e_BlockScopedDeclarations`). Before that, 21 (2026-10-19, later: sw106 `finally` on
every exit fixed, `15_FinallyOnEveryExit`). Before that, 22 (2026-10-19, later: spread sw77–sw79
and the string-array paths sw76, sw107 fixed; tests `28_SpreadLiterals`, `28_StringArrayJoinSearch`,
`28_SpreadOfExpressionRefused`). Before that, 27 (2026-10-19, later: the index-
normalisation group sw80–sw85, sw91, sw92 fixed, with loud ld47; tests `28_RelativeIndexMethods`,
`28_SpliceItemReadsArrayRefused`). Before that, 35 compiler, 0 tools (2026-10-19, later: the last tool rows
sw111, sw115–sw118 fixed, `tests/tool_rows_tests.ts`; all ten round-2 tool rows are closed).
Before that, 35 (2026-10-19: sw119, i32 overflow, opened by the owner's
ruling; the owner also decided sw87, sw95 and ld88, design-decisions.md § "Owner's rulings of
2026-10-19"). Before that, **34** (2026-10-15, audit round 2: sw76–sw108 found, and sw75;
plus 10 silent TOOL defects sw109–sw118; loud 40 in the compiler (ld47–ld80 found) and 11 in the
tools; the round-2 section below). Before that, **1** (2026-10-15, later: sw71 fixed under the owner's
string-index ruling; sw75 found with it, `console.log(s.charAt(i) === "")` prints `1`. Open loud: 6,
all found that day: ld38 `toFixed`, ld41, ld42, ld43, ld45, ld46). Before that, **1** (2026-10-15:
sw71, an out-of-range string index gives `""` for `undefined`, found fixing ld34; sw72, sw73, sw74
found and fixed the same day; the 21 loud rows of 2026-10-13 closed). Before that, **0** (2026-10-13, latest: sw68 fixed, a nested console.log in an
argument overwrote the outer line: 1 → 0 silent, 21 loud). Before that, **1** (2026-10-13: sw70
fixed, a local array named like a module array initialized the module's: 2 → 1). Before that, **2**
(2026-10-13: sw69 fixed, broader than recorded:
every compile-time layout of an array or struct literal, and the run-time array init, read values
with `parseFloat || 0`; with it, a boolean element's printing, an invalid console comparison and a
float literal into an integer (now D3's report): 3 → 2 silent (sw68, sw70), 21 loud). Before that,
**3** (2026-10-13: sw66 and sw67 fixed together
(an array prints as Deno prints it); found with them sw69 (a static array literal's non-numeric
elements become 0) and sw70 (a local array named like a module array initializes the module's),
and opened loud ld37 (a whole string / boolean / bigint array is refused): 3 → 3 silent (sw68,
sw69, sw70), 20 → 21 loud). Before that, **3** (2026-10-13, sw62 fixed, broader than recorded: any
console line over 128 bytes corrupted memory; found with it sw66 (an array variable prints its
address), sw67 (a long array's layout) and sw68 (a nested console.log in an argument): 1 → 3). Before that, **1** (2026-10-13, later: building the owner's D3 found two
loud ones and fixed one documented gap: ld34 open (console `s[pos]` with a float index), ld35
fixed (console call argument passed an f64 raw), ld36 fixed (`(x as f64) === lit` compared as
i32): 19 → 20 open loud). Before that, **1** (2026-10-13, wasMath L4: sw64 fixed, loud ld29, ld30,
ld31 fixed, and a u64 of 2⁶³ or more prints unsigned: 2 → 1 silent (sw62, console), 22 → 19
loud). Before that, **2** (2026-10-09, the owner's division decision: a plain `/`
between integers is a compile error pointing at wasMath; sw36 and sw37 closed: 4 → 2, sw62 and
sw64 left, both console). Before that, **4** (2026-10-09, wasMath L3, the math library: sw57, sw58,
sw59, sw61, sw63 fixed and sw60 closed by the owner's decision "CR, in both"; loud ld27, ld28,
ld33 fixed: 10 → 4 silent (sw36, sw37 on wasm-math D1; sw62, sw64 console), 25 → 22 loud).
Before that, **10** (2026-10-09, wasMath L2 and the corpus program found
and fixed sw65 (the bundler renamed inside string literals) and loud ld32 (`NaN` / `Infinity`
into an f32), and found loud ld33 (`Math.atan2` with a subnormal hangs): still 10 silent, 24 → 25
loud). Before that, **10** (2026-10-09, a bigint probe: sw63 (`Math` accepts a
bigint), sw64 (`-a` prints without `n`), loud ld30 (`**`), ld31 (bitwise / shifts invalid):
8 → 10 silent, 22 → 24 loud). Before that, **8** (2026-10-09, the per-call Math table,
`scripts/math/math_table.ts`: sw61 (`sin(1e18)`) and sw62 (console line corruption) found, ld28
corrected: 6 → 8). Before that, **6** (2026-10-09, scoping the wasm number types: a scan of
every `Math` member against Deno (`scripts/math/scan_math.ts`, wasm-number-types.md) found sw57–sw60
and loud ld27–ld29, all the same on main: 2 → 6 silent, 19 → 22 loud). Before that, **2**
(2026-10-09, late: sw51 fixed by the owner's option A,
nullable fields carry a flag word; sw54–sw56 and loud ld26 found and fixed with it: 3 → 2, still
19 loud; the two left, sw36 and sw37, wait on wasm-math D1). Before that, **3** (2026-10-09,
night: sw53 fixed: 4 → 3; the three
left wait on the owner: sw36 and sw37 on wasm-math D1, sw51 on the tuple layout). Before that,
**4** (2026-10-09, evening: sw52 fixed, sw53 split from it
and open: still 4; loud ld21 fixed with it: 20 → 19). Before that, **4** (2026-10-09, later: sw48
and sw49 fixed; sw52 found: 5 → 4, still 20 loud). Before that, **5** (2026-10-09: string conversions and two value-typing
slips, sw06–sw09, sw19, sw28, fixed; sw50 found and fixed with them; sw51 found, open; loud ld24 and
ld25 found and fixed: 10 → 5 silent, still 20 loud). Before that, **10** (2026-10-06, evening:
wasic's operator rows sw10–sw17
fixed in BOTH paths; sw49 and loud ld23 found: 17 → 10 silent, 19 → 20 loud). Before that, **17**
(2026-10-06, later: the console rows sw20, sw24, sw25
and sw32 (a closure bug, not a console one) fixed, loud ld02 too; sw48 and loud ld20–ld22 found:
20 → 17 silent, 17 → 19 loud). Before that, **20** (2026-10-06, late: sw46 fixed, top-level code beside
a `main` function; sw47 found and fixed with it: 21 → 20). Before that, **21** (2026-10-06,
night: sw44 fixed, the thrown kind now
tracked; sw46, every top-level statement beside an async `main()` dropped, found: still 21).
Before that, **21** (2026-10-06, evening: f32 in containers fixed, sw43
and loud ld18; sw45, a for-of over any array parameter, found and fixed; loud ld19 found: 22 →
21 silent, 17 loud). Before that, **22** (2026-10-06, later: the Phase 1 finds fixed, sw41
and loud ld16, ld17; fixing them found sw42 (fixed), sw43 and sw44 (open), and loud ld18: 21 →
22 silent, 18 → 17 loud). Before that, **21** (2026-10-06, wasm-math-plan.md Phase 1: sw38, sw39,
sw40 fixed, sw41 found, 23 → 21; loud ld15 and ld04 fixed, ld16 and ld17 found, still 18).
Before that, **23** (2026-09-30, night: scoping the division ruling
found sw37–sw40 in the `Math` dispatch, 19 → 23, and ld15, loud 17 → 18; sw36 narrowed by the
ruling, still open. See wasm-math-plan.md). Before that, **19** (2026-09-30, evening: sw18, sw22, sw23 fixed, all
three loud, so open loud 20 → 17; sw36 FOUND, the i32 division, pending a ruling: 18 → 19).
Before that, **18** (2026-09-30, later: sw05 fixed, and sw35 found and
fixed with it; sw21, loud since the morning, fixed too, so open loud 21 → 20). Before that, **19**
(2026-09-30, which is H12/I11 bar (c): the console
fallback now delegates to wasic's `emitExpr` and otherwise ABORTS, so sw04 and sw27 are fixed and
7 rows (sw18, sw21, sw22, sw23, sw26, sw30, sw31) turned LOUD: still open, now loud, 14 → 21. The
corpus reached the stub nowhere (0 of 489 golden WAT outputs held one), so no existing program
changed, bar one intentionally failing test that now names a second cause. Before that, **28**
(2026-09-29: sw01 fixed, and
sw33 found and fixed with it; then sw02 fixed and sw34 found with it; then sw03 and sw34 fixed.
The round-1 table has 47 rows. 31 on 2026-09-28: 29 after
round 1, −1 sw29 closed by the typed-declaration rule, +3 found while landing it). It read 0 earlier the
same day, after the first tally's 2 were fixed, and that 0 carried the warning below; the Phase 0b
audit then CONFIRMED 28 more by running them (table below). The count is only as good as the
entries: a silent-wrong bug nobody has found is not in it.

## H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CONFIRMED BY RUNNING

**Class:** SILENT-WRONG (29, incl. sw29 from the owner's ruling) / LOUD (8) · **Status:** OPEN · **Scope:** compiler

Four parallel read-only audits (fall-throughs, codegen, `wasic.ts`↔`console_log.ts` divergence,
dead code/stale workarounds). **Every claim was run** with `scripts/phase0/verify_repros.ts` (native
Deno vs compiled). Three claims were DISPROVED that way (`n || 7`; escaped string-enum in
`console.log`; `console.error` of a null). Repros live in `scripts/phase0/round1/` by outcome; a fix
flips its repro to MATCH. Most of the console-path rows share ONE root: `exprToWat`'s
terminal fallback (console_log.ts ~2605) emits `(;? … ;) (T.const 0)` with no diagnostic.

| id | bug (native → compiled) | where |
| --- | --- | --- |
| ~~sw01~~ | ✅ FIXED 2026-09-29: `throw new TypeError(..)` / `throw 42` → **proc_exit(0)**: no catch, no output, exit 0. Every built-in Error constructor (not `AggregateError`) now throws like `Error`; a number / numeric var / boolean throws its string form; anything else (an object) is a hard `Unsupported throw` diagnostic. Tests `15_ThrowNonError`, `15_ThrowTypeErrorUncaught` (`@expect-exit: 1`), `15_ThrowObjectRefused` (`@expect-fail: compile`); all three fail on the old compiler | wasic throw branch |
| ~~sw34~~ | ✅ FIXED 2026-09-29 (same day): wasic's instanceof resolver now answers EVERY `x instanceof Y` (emitExpr models the Error family and user classes), and `exprToWat` consults it before its terminal stub. Test `15_ConsoleInstanceofCondition`; fails on the old compiler. Original report: (found fixing sw02, 2026-09-29) `console.log(e instanceof Error ? "is error" : "not error")` in a catch: `is error` → `not error`. The console condition is `exprToWat`'s terminal stub `(;? e instanceof Error ;) (i32.const 0)`; the console path never resolves Error-family `instanceof` (wasic's emitExpr does). Predates sw02 (the old `select` carried the same stub). Repro `sw34_console_instanceof_cond_stub.ts` | console_log exprToWat fallback |
| ~~sw33~~ | ✅ FIXED 2026-09-29 (found fixing sw01): `String(<bool>)` went through `$__i32_to_str`: `true` → `1`. Now selects static "true"/"false". Test `15_ThrowNonError` | wasic `String(...)` in emitStringAssign |
| ~~sw02~~ | ✅ FIXED 2026-09-29: console ternary with a template branch: `n=5` → `n=`. Four causes in the one construct, all fixed: (1) `getStrPtrLen` kept only `segs[0]` of a multi-piece branch (template, concat); the branch is now built whole by wasic's `emitStringAssign` via the string-expression resolver; (2) `select` ran BOTH branches (a call in the branch not taken still ran) and, when both captured a length in `$__str_op_len`, the ELSE length won; now `if` with the chosen branch's length; (3) `looksLikeString` missed templates, string-method calls and string-returning calls, so those ternaries printed `0` or built an invalid module (widened for the ternary only); (4) the split used the LAST `?` (`findTopLevelOp`), so a nested ternary grouped wrongly: new `splitTernary` (first `?`, matching `:`). Also: `console_log.ts` gained its first error path (`setConsoleDiagnosticSink`), and a branch nothing can build is now a diagnostic, not `""`. Test `7b_ConsoleStringTernary`; fails on the old compiler | console_log string ternary |
| ~~sw03~~ | ✅ FIXED 2026-09-29: `ok ? "pass" : "fail: " + msg`: `pass` → `passboom`. The `+` concat split ran before the ternary and cut at the `+` INSIDE the else branch. The string-ternary block now runs before every operator handler in `parseSingleArg` (the conditional binds looser than all of them). Golden-WAT: no existing output changed. Test `7b_ConsoleTernaryBeforeOperators`; fails on the old compiler | console_log `+` split |
| ~~sw04~~ | ✅ FIXED 2026-09-30: `Math.abs(s.charCodeAt(0) - 100)`: `3` → `100` (operand → 0). The console fallback delegates to wasic's emitExpr (`setExprFallbackResolver`). Test `7b_ConsoleExprFallback`; fails on the old compiler | console_log fallback |
| ~~sw05~~ | ✅ FIXED 2026-09-30: string arg that is not a plain var/literal (`count(names[1])`): `3` → `0`. `exprToWat`'s string branch went straight to a null string; it now asks wasic's string resolver (emitStringPtrLen / emitStringAssign), keeps `null` / `undefined` as the null string, and otherwise ABORTS (`cannot emit the string expression`). The string-equality operand (`getStrPL`) had the same silent `""` fallback and now aborts the same way. The resolver's `$__str_op_len` is pre-declared for a console line whose call has an expression argument (both declaration heuristics, emitFunction and `_start`). Test `7b_ConsoleStringCallArg`; fails on the old compiler | console_log exprToWat string |
| ~~sw35~~ | ✅ FIXED 2026-09-30 (found fixing sw05, whose new diagnostic exposed it): `count(w) + count(names[2])`: `6` → `0`. Both console call matchers (`/^(\w+)\s*\((.*)?\)$/` in parseSingleArg and exprToWat) took `f(a) + f(b)` as ONE call with the argument `a) + f(b`; they now require the `(` to close at the end (`parenDepthNeverNegative`, which now skips string literals). Behind it, a call's result was never converted to the type the caller expected (an i32 `count()` in an f64 sum: an invalid module); it is widened now, or reported when lossy. Repro `sw35_console_call_plus_call_one_call.ts`; test `7b_ConsoleStringCallArg` | console_log call match |
| ~~sw06~~ | ✅ FIXED 2026-10-09: `` `len=${s.length}` + "!" ``: `len=5!` → `len=!`. `.length` (and `indexOf`-family calls) of a string receiver now infer i32, so the template part renders; a template part that still cannot be built is a diagnostic, not dropped. Test `11_StringConversions` | wasic appendConcatPart |
| ~~sw07~~ | ✅ FIXED 2026-10-09: `console.log(s.includes("b"))`: `true` → `1`. A string receiver's `includes` / `startsWith` / `endsWith` are typed `bool` (dot-call lookup and `inferInitType`). Test `11_StringConversions` | wasic dotCallLookupFn |
| ~~sw08~~ | ✅ FIXED 2026-10-09: `s.indexOf(String(n))`: `2` → `0`. `String(x)` as a value (an ARGUMENT) was known only to emitStringAssign; `emitStringPtrLen` now builds it with `$__<type>_to_new_str` (i32, i64, f64, bool) or `$__exn_str`, and a nested quiet failure fails the dot-call (`quietStringFailures`) instead of passing `""`. Test `11_StringConversions` | wasic quietEmit sites |
| ~~sw09~~ | ✅ FIXED 2026-10-09: an array in a template / concat / `String(...)`: `v=1,2,3` → `v=260` (a pointer), in both paths. A bare i32 / f64 array is its `.join()` (`arrayAsJoin`; the console rewrites to its join segment); a string, 2D, struct or typed array there is a diagnostic. With it: a one-call multi-value first part of a concat or template is taken off the stack (`concatAppend`, `emitTmplConcat`), which made `` `${a.join("-")}` `` (ld25) work. Test `11_StringConversions` | both |
| ~~sw10~~ | ✅ FIXED 2026-10-06: `-x + 5`: `2` → `-8`. Unary `-`, `!`, `~` (and `**`) apply only when no binary operator is at top level (`hasTopLevelBinaryOp`). Test `4_OperatorSemantics` | wasic emitExpr |
| ~~sw11~~ | ✅ FIXED 2026-10-06: `!a && b`: `no` → `yes` (same rule as sw10). PRINTING `!a && b` still gives `true` where JavaScript gives the operand `0`: that is sw49 | both |
| ~~sw12~~ | ✅ FIXED 2026-10-06: `c1 ? A : c2 ? B : C` grouped from the right: `-1` → `1`. wasic's `splitTernaryTop` and the console's numeric ternary now split at the FIRST `?` and its own `:`. Test `4_OperatorSemantics` | wasic + console |
| ~~sw13~~ | ✅ FIXED 2026-10-06: `2 ** 3 + 1`: `9` → `16`. `**` is taken only when no lower-precedence operator is at top level | wasic |
| ~~sw14~~ | ✅ FIXED 2026-10-06: a comparison ANYWHERE inferred bool: `"h=" + (n >> 1)`: `h=4` → `h=true`. `hasTopLevelBoolOp` looks at top level only and skips shifts and `=>` | wasic inferInitType |
| ~~sw15~~ | ✅ FIXED 2026-10-06: binop typed from the LEFT operand: `i + f` = `3.5` → `3`. An i32 left operand meeting a KNOWN float (a float literal or a variable declared f64 / f32) computes in f64, in wasic and in the console (where the segment prints as f64 too). A first cut trusted `inferExprType`, whose fallback is f64, and built `f64.mul` over `i32.load`s: caught by golden-WAT before the gate | wasic + console |
| ~~sw16~~ | ✅ FIXED 2026-10-06: `if (0.5)` truncated: `yes` → `no`. `emitCond` (if / while / for / ternary / `!` / `&&` / `||`): when the emitter truncated a float to fit the i32 context, the truncation becomes `|x| > 0` (nonzero, not NaN). Decided on the emitted WAT: a first cut used `inferExprType`, which calls `isNaN(x)` f64, and wrapped comparisons in `f64.abs`. Console twin `condToWat` | wasic + console |
| ~~sw17~~ | ✅ FIXED 2026-10-06: `a >> 2 << 1`: `32` → `4`. Every same-precedence group (equality, relational, shift, additive, multiplicative) splits at its rightmost member, in both paths. That exposed `findBinaryOp` matching `==` inside `!==` (`s[i] !== "x"` split as `s[i] !` / `= "x"`): fixed in both. `a - b + c` is now `(a - b) + c` (identical in i32; the date library re-recorded) | wasic + console op tables |
| ~~sw49~~ | ✅ FIXED 2026-10-09: `a && b` / `a \|\| b` gave a BOOLEAN where JavaScript gives an operand: `console.log(!a && b)` with b = 0 printed `true` (JavaScript `0`); two numbers (`x \|\| 7`, `z && 9`) printed `true`, and a float operand (`h \|\| 2.5`) built an INVALID module. Now two numbers give the operand at their type (`emitLogicalValue`: the left side evaluated once into a `$__lor_<t>` global read only on the branch that skips the right side); two booleans and every condition (`emitCond`) keep the boolean short-circuit, byte-identical (golden-WAT 0 entries changed); a boolean mixed with a number prints through a string conditional as its own `console.log` argument (`logicalForConsole`) and is REFUSED inside a larger expression or a string (it printed `true` / built an invalid module). `splitTopLogical` splits at the LAST `\|\|` / `&&` (left-associative; a first cut split at the first and re-grouped 43 library entries, equivalent but not identical). Test `4_LogicalOperands` | wasic + console `&&` / `\|\|` |
| ~~sw18~~ | ✅ FIXED 2026-09-30 (LOUD since that morning): `console.log(n << 2)`: `12` → `true`. `findTopLevelOp` scans right to left and skipped only the FIRST `<` of `<<` (`after === "<"`), so the second split `n <` from `2`; it now skips a `<` with a `<` on either side. Test `7b_ConsoleOperatorSplit` | console_log findTopLevelOp |
| ~~sw19~~ | ✅ FIXED 2026-10-09: `x ?? 5` on a non-nullable 0: `0` → `5`. A number or boolean not tracked nullable is never null, so `??` is its left side; the 0-is-null test stays for pointers and for `T \| null` tuple elements (which have no null flag: sw51). A first cut dropped it for those too, turning a null element into 0: found reading the golden diff (`24_NullableTupleReturnAndFlags`), before the gate. Test `11_StringConversions` | wasic |
| ~~sw51~~ | ✅ FIXED 2026-10-09 (found fixing sw19; the same on main; owner chose option A): a `number \| null` / `boolean \| null` TUPLE element, and (found scoping it) an interface or class FIELD, stored null as 0 with no flag, so a real 0 read as null and a null read as 0: `[0, 2.5]` destructured, `v ?? -1` → `0` → `-1`; `{ a: null }` then `r.a ?? -1` → `-1` → `0` (a field on the left of `??` ignored the right side entirely); `{ a: 0 }` then `r.a === null` → `true`. Now such a field has a flag word after the last field, read, written, copied and printed like a nullable local's `__null` (design-decisions.md § "Nullable FIELDS carry a flag word"). Found with it: sw54, sw55, sw56, ld26, and `inferExprType` typing `d1.c === null` from its leading f64 field (it built an invalid module). Test `24_NullableFields` | wasic struct / tuple layout |
| sw57 | FIXED 2026-10-09 (wasMath L3: mathlib's `log` / `log2` / `log10` return NaN below 0; corpus `38_MathEdgeCasesL3`). Was OPEN (found by the Math scan, 2026-10-09; the same on main): `Math.log` / `log10` / `log2` of a negative number give `0`; JavaScript gives `NaN`. Repro `sw57_math_log_negative_zero.ts` | wasic Math library (Track M, wasm-number-types.md) |
| sw58 | FIXED 2026-10-09 (L3: `sin` / `tan` return ±0 as is; the dd sum `-0 + 0` made it +0). Was OPEN (Math scan, 2026-10-09): `Math.sin(-0)`, `Math.tan(-0)` give `0`; JavaScript keeps `-0`. Repro `sw58_math_sin_tan_negzero.ts` | wasic Math library |
| sw59 | FIXED 2026-10-09 (L3: `pow`'s head follows ECMAScript: `y = ±0` → 1, a NaN operand → NaN, `x = 1` → 1 only for a finite `y`, `|x| = 1` with `y = ±∞` → NaN). Was OPEN (Math scan, 2026-10-09): `Math.pow(1, NaN)` gives `1` (C's rule); JavaScript gives `NaN` (also `pow(±1, ±Infinity)`). Repro `sw59_math_pow_one_nan.ts` | wasic Math library |
| sw60 | CLOSED BY DECISION 2026-10-09 (owner: "CR, in both"; counted in the fixed column): measured against the BigInt oracle, OURS is correctly rounded on every one of these inputs and V8 is the one 1 ulp off (`scratchpad cr_vs_v8.ts`: acosh 2 / 100, asinh 1.5 / 0.1 / 1e300, cosh 10, sinh 2). Compiled `Math` stays correctly rounded; wasMath's `f64.acosh` & co. now run the SAME mathlib in Deno, so they agree to the bit; plain `Math.*` in Deno is V8's and may differ by 1 ulp, documented (README, design-decisions.md). The repro still reads DIFFER, by design. Was OPEN (Math scan, 2026-10-09): `acosh`, `asinh`, `cosh`, `sinh` differ from V8 by 1–2 ulp (`acosh(2)` …166 → …168); other algorithms than V8's fdlibm-derived ones. Repro `sw60_math_hyperbolic_last_digit.ts` | wasic Math library |
| sw61 | FIXED 2026-10-09 (L3: Payne–Hanek reduction from |x| ≥ 2²⁸, generated by `scripts/math/gen_payne_hanek.ts` from 2/π computed exactly in BigInt; sin / cos / tan correctly rounded on 18,699 calls across the whole double range, including Muller's hardest case, against `math_cr_oracle.ts`, whose own trig reduction was made exact the same day; its 100-digit π was garbage past 2⁶⁰). Was OPEN (Math table, 2026-10-09; one call per program): `Math.sin(1e18)` gives `5.981619729467063e+27`, an impossible sine (Deno `-0.9929693207404051`). Range reduction loses the argument somewhere between 1e15 (right) and 1e300 (traps, ld28). Repro `sw61_math_sin_huge_arg_wrong.ts` | wasic Math library |
| sw62 | FIXED 2026-10-13, and BROADER than first seen: ANY console line over 128 bytes overran the fixed gather scratch (SCRATCH_BASE, 4 × 32 bytes) into the data after it: eight long floats (this repro), a 200-character string (the next line printed `23456` for the label `after`), an array printout. Gather mode now builds the line in `$__cbuf`, a heap buffer that grows (`$__cbuf_need`, `$__cbuf_put`, array / join wrappers that load the length once and ensure the worst case); the iov pointer is set just before the write. Per-iov array / join printing moved to it too. 287 golden entries gained the helpers (none refused). Found with it: sw66, sw67, and an `i64[]` printout called an undefined helper (now a diagnostic). Was OPEN (Math table, 2026-10-09): a long `console.log` line of f64s corrupts a LATER line's literal text: after the eight `Math` constants, `console.log(1.1, 2.2, …, 8.8)` prints `6 1.4142135623730951` / `.6 0.7071067811865476 8.8`. Each line alone is right. Suspected: the console scratch buffer overlaps the data holding later lines' pre-rendered text. Repro `sw62_console_long_line_corrupts_later_text.ts` | console_log buffers |
| ~~sw65~~ | ✅ FIXED 2026-10-09 (found by the wasMath corpus program; the same on main): the bundler's `applyRenames` rewrote imported names INSIDE string literals and comments: a multi-file program's `console.log("add")` printed the module-prefixed name, and a wasMath label `"i32.add"` printed `__wm_i32_add`. It now renames only CODE (a position-preserving `codeMask`: strings, template text and comments are data; `${…}` code is code) in ONE pass (an alternation, longest key first), so a rename can no longer be renamed again. Golden-WAT: 0 existing entries changed. Test `39_WasMathAllFunctions` (its labels) | tsbundler applyRenames |
| sw66 | FIXED 2026-10-13 (with sw67; corpus `7d_ConsoleArrays`): an array variable (module, local, parameter; static or dynamic) is an `arrptr` segment, printed by the new `$__arr_inspect`. Fixed with it, the same class: a TYPED array was read as 4-byte i32 words whatever its type (an `Int8Array` printed neighbours' bytes; `Uint32Array` / `Float32Array` printed their bits as i32) — the writer now takes the element layout (`arrInspectKind`); and a returned `number[]` went to the i32 writer. Arrays with no element writer (string, boolean, bigint, struct, 2D beside other arguments) are refused (ld37), never printed as numbers. Was OPEN (found fixing sw62, 2026-10-13; the same on main): `console.log(arr)` of an array VARIABLE prints its memory address (`260`) instead of `[ 1, 2, 3 ]`, for i32 / number / string arrays, at top level or in a function. Only a function call's RETURNED array becomes an array printout (`arrptr`, from the call's `resultTsName`); a variable takes the integer path. `arr.join(sep)` is right. Fixing it needs the variable's layout from `arrayLookup` (static vs dynamic header), string arrays printed with quotes, and sw67's layout. Repro `sw66_console_array_variable_prints_address.ts` | console_log parseSingleArg |
| sw67 | FIXED 2026-10-13 (with sw66): `$__arr_inspect` is util.inspect's array layout (groupArrayElements + reduceToSingleString) for a top-level argument: one line within 80 columns, else right-aligned columns past 6 entries (Math.round as floor(x + 0.5)), else one per line; 100 elements then `... N more items`; `[]` empty (the old writer printed `[  ]`); `-0` in an f64 array; a typed array's `Name(n) ` prefix counted. The layout was first written in TypeScript (`scripts/console/inspect_array_ref.ts`) and checked identical to `Deno.inspect` on 444 generated arrays (sizes 0–250, ints, floats, strings, booleans; `check_inspect_array_ref.ts`), then ported. Was OPEN (found fixing sw62, 2026-10-13): a long numeric array prints on ONE line in wasm; Deno and Node break it into aligned rows (the `util.inspect` grouping, past ~72 characters / more than 6 items). The owner's M3 keeps the Deno / Node layout, so wasic should match it. Repro `sw67_console_long_array_layout.ts` | console array writers |
| sw68 | FIXED 2026-10-13 (corpus `7e_ConsoleNestedLog`): when an argument calls a user function (or any indirect call), every expression argument is evaluated, in order, into a `$__clt_<type>_<n>` temporary BEFORE the line is built (`hoistCallingArgs` in emitConsoleLog), as JavaScript evaluates all arguments before printing; the emitters declare the temporaries they find (`consoleTempLocals`, and _start's). Conservative by design (any user call, not only one that prints: helpers share the fixed scratch too): 198 golden entries moved, each checked to be ONLY the capture (an undo script plus reading). On main the probe garbled 8 of 10 lines (`inner 40.25 end`, `2 ne 12`, a 160-byte line with `0.25` written over its start). Was OPEN (found fixing sw62, 2026-10-13; the same before it): a `console.log` whose argument calls a function that ITSELF prints: the nested line rewrites the shared gather cursor (iovBase+4) and buffer, so the outer line loses what it had built (`console.log("outer:", scale(4), "end")` prints `inner 40.25 end`; Deno `outer: 0.25 end`). The pointer half (an iov pointer stored before the nested call) is fixed with sw62; the shared cursor and buffer are not. Fix direction: evaluate such arguments into temporaries before the line is built, or give each line its own cursor. Repro `sw68_console_nested_log_in_argument.ts` | console_log gather |
| sw69 | FIXED 2026-10-13 (corpus `9_LiteralElementValues`; typed_decl +3), and BROADER than first seen. Every compile-time layout of a literal read its values with `parseFloat(raw) \|\| 0` / `parseInt(raw, 10) \|\| 0`: (1) numeric arrays, as below; `true` in a `boolean[]` was 0; `1.5` in an `i32[]` truncated; a bigint past 2^31 lost its high word; (2) the RUN-TIME array init (`emitDynArrayInit`, 2D too) did the same, so an array that is pushed to was no better; (3) a `string[]` literal that is pushed to stored pointer 0 for every element, printing `""` (`28_slices` read its data unwritten); (4) a module-level struct literal and every array of struct literals stored 0 / false for any field that was not a plain decimal (`{ x: k, ok: k > 3 }`; `6b_pointers` masked it by zeroing the field next); a struct literal pushed onto an array was a null pointer. Now `plainArrayLiteral` decides what is laid out (exact decimal, hex, binary, octal, bigint, boolean literals of the element type); anything else is evaluated at run time with emitExpr under the usual type rules (`arrayElemWat`); module structs keep their static address and get run-time field stores; `allocStructData` refuses a value it cannot lay out. Found and fixed with it: a `boolean[]` element printed `1` / `0` (console); `flags[0] === false` in console.log was f64.eq over an i32 (an invalid module, the same on main); a float LITERAL into an integer slot (`const z: i32 = 1.5`) was `(i32.const 1.5)`, an assembler error with no location: it is D3's located report now, and `1e3` there is 1000. Was OPEN (found fixing sw66, 2026-10-13; the same on main): a STATIC array literal is encoded into the data section by `allocArrayData` with `parseFloat(e) \|\| 0` / `parseInt(e, 10) \|\| 0` per element, so every element that is not a plain decimal becomes 0 or a wrong number: `NaN`, `-0`, `Math.PI`, `0x10`, `0b101`, a variable, an expression (`[k, k + 1]` → `0 0`). Module and function level. Fix direction: encode only exact numeric literals; any other element makes the array initialized at run time (the dynamic path evaluates each element with emitExpr). Repro `sw69_static_array_literal_elements.ts` | wasic allocArrayData |
| sw70 | FIXED 2026-10-13 (corpus `9_LocalArrayShadowsModule`): `isModuleGlobalArr` decided global vs local by the NAME (a module global called that, holding a dynamic array), where every other site asks `!locals.has(name)`. emitFunction now records the module globals the function shadows with its own locals or params (`fnShadowedGlobals`, from `declaredLocals` and the params) and `isModuleGlobalArr` excludes them. On main the probe printed the module array as `0 0 0 0` / `[]`, and a local `items` from a literal (pushed) returned 2 for 12. Was OPEN (found fixing sw66, 2026-10-13; the same on main): a function's local array with the same name as a module-level array: the declaration's `$__malloc` goes to `global.set $a`, while the pushes and the return use the uninitialized local, so the MODULE array is replaced by an empty one (`a[0..2]` print `0 0 0`) and the function works on an array at address 0. Repro `sw70_local_array_shadows_global.ts` | wasic array declaration scoping |
| sw63 | FIXED 2026-10-09 (L3, both paths: a bigint argument to any `Math.*` is a compile diagnostic pointing at wasMath's i64 / u64; the repro now reads COMPILE-FAIL by design). Was OPEN (bigint probe, 2026-10-09): `Math.sqrt(b)` with `b: bigint` COMPILES and prints `4`; TypeScript rejects it and Deno throws `TypeError: Cannot convert a BigInt value to a number`. `Math` is f64-only in JavaScript, so a bigint argument should be a compile error. Repro `sw63_math_accepts_bigint.ts` | wasic Math dispatch |
| sw64 | FIXED 2026-10-13 (wasMath L4, console path: a bigint led by `-`, `~` or `(`, or by a bigint literal, is an i64 segment and prints its `n`; found with it and fixed, both paths: unary `-` of a bigint PARAMETER was `i32.sub` of an i64, an invalid module, and `~` had no bigint or float case; corpus `39_WasMathL4Operators`). Was OPEN (bigint probe, 2026-10-09): `console.log(-a)` of a bigint prints `-7`; JavaScript prints `-7n` (`a`, `a + b` keep the `n`). Repro `sw64_console_negated_bigint_drops_n.ts` | console_log i64 printing |
| ~~sw54~~ | ✅ FIXED 2026-10-09 (found scoping sw51; the same on main): `console.log(v === null)` for a nullable local holding 0 printed `true`: the console compared the value with 0. A console equality against `null` / `undefined` now asks wasic, which reads the flag. Repro `sw54_console_nullable_local_eq_null.ts`; test `24_NullableFields` | console_log null comparison |
| ~~sw55~~ | ✅ FIXED 2026-10-09 (found fixing sw51; the same on main): a null nullable local printed `null` only as console.log's ONLY argument; beside another argument, in a template, or built into a string (`` `w=${w}` ``, `"w=" + w`, `String(w)`) it printed `0`. Every text conversion of a nullable local or flagged field now reads `null` (console: `setNullPrintResolver`; wasic: `emitScalarToStr`, both `String(x)` paths). Repro `sw55_nullable_local_prints_zero.ts`; test `24_NullableFields` | console + wasic text conversion |
| ~~sw56~~ | ✅ FIXED 2026-10-09 (found fixing sw51; the same on main): `f() ?? d` on a `T \| null` function never took `d` (a call on the left of `??` was taken as never null), and `return v` of a null nullable local (or flagged field) from a `T \| null` function reported a value (`$__nullable_ret_flag` set to 1 unconditionally). The call's value is held in a scratch global and the flag read after it; a nullable source's own null is returned. Repro `sw56_nullable_call_coalesce_ignored.ts`; test `24_NullableFields` | wasic `??` / nullable return |
| ~~sw50~~ | ✅ FIXED 2026-10-09 (found fixing sw08; the same on main): a bigint in a template, concat or `String(...)` kept its `n`: `b=12` → `b=12n` (both paths). `$__i64_to_str` writes the console form; a string conversion drops the last byte. Test `11_StringConversions` | wasic + console i64 to string |
| ~~sw20~~ | ✅ FIXED 2026-10-06: `console.log(-7 % 4)`: `-3` → `1`. The console `%` is `i32.rem_s` (JavaScript's sign of the dividend, as wasic's emitExpr). Test `7b_ConsoleOperatorsAndClosures` | console_log |
| ~~sw21~~ | ✅ FIXED 2026-09-30 (with sw05; LOUD since earlier that day): `console.log((a+1)*(a+2))`: `20` → `5`. The paren unwrap stripped the first `(` and the last `)` of any expression shaped `(…)`; it now unwraps only a matching outer pair. Repro now MATCH | console_log paren strip |
| ~~sw22~~ | ✅ FIXED 2026-09-30 (LOUD since that morning): `console.log(a ** 2)`: `9` → `0`. `*` split inside `**`; it now skips a `*` next to a `*`, and `**` (not in the console table) reaches wasic's emitExpr through the fallback resolver. Test `7b_ConsoleOperatorSplit` | console_log findTopLevelOp |
| ~~sw23~~ | ✅ FIXED 2026-09-30 (LOUD since that morning): `console.log(n * -2)`: `-6` → `-2`. The split took the unary minus as the binary operator; a `-` / `+` is now unary when nothing, an operator or an opening bracket precedes it, or it signs an exponent (`1e-3`). Found and fixed with it, all LOUD before (invalid modules), so not counted: the unary-minus handler ran before the binary split, making `-n + m` into `-(n + m)`; a binary op returned its result at the OPERAND type (`1 << n` where f64 was expected); an identifier was returned at its own type whatever was asked. The last two now widen losslessly, and NEVER a boolean (`"ok: " + (a > b)`, ld06, stays loud: widened, it printed `ok: 1`). One golden entry changed correctly: `-Math.PI / 2` is `(-π) / 2` now, bit-identical. Test `7b_ConsoleOperatorSplit` | console_log |
| sw36 | FIXED 2026-10-09 BY THE OWNER'S DECISION: a plain `/` between integers is now a compile error naming wasMath's `i32.div` / `f64.div` (design-decisions.md § "Wasm types in TypeScript"); the repro reads COMPILE-FAIL by design; `typed_decl_tests` asserts the reason. Was OPEN, NARROWED BY THE OWNER'S RULING (found fixing sw23, 2026-09-30): `const r: f64 = m / n` (5, 3) prints `1`, not `1.666…`. Ruled (design-decisions.md § "Wasm types in TypeScript"): `i32 / i32` IS `i32.div_s` (so `console.log(m / n)` printing `1` is by design), BUT an explicitly declared float destination (`const` / `let` / `var x: f64`) makes it a float division. The bug is that the declared f64 is applied after `i32.div_s`. Scoped in wasm-math-plan.md, Phase 2 | wasic `/` typing |
| sw37 | FIXED 2026-10-09 with sw36 (the integer `/` inside `Math.floor(…)` is refused; `Math.floor(f64.div(a, b))` is the float division, `i32.div(a, b)` the truncated one). Was OPEN (found scoping sw36, 2026-09-30): `Math.floor(a / b)` with −7, 2 prints `-3` (Deno `-4`). Ruled: a `Math` argument is an f64 context, so float division, then floor. `ceil` and `round` alike; `trunc` agrees only by coincidence. wasm-math-plan.md, Phase 2 | wasic Math dispatch |
| ~~sw38~~ | ✅ FIXED 2026-10-06 (wasm-math-plan.md Phase 1): `Math.sign(NaN)` was `1`, `Math.sign(-0)` was `+0`. Now `$__math_sign` (NaN → NaN, ±0 → itself, else ±1; the argument evaluated once). Test `38_MathExactSemantics` | wasic + console_log Math `sign` |
| ~~sw39~~ | ✅ FIXED 2026-10-06 (Phase 1): `Math.hypot(1e200, 1e200)` was `Infinity`, `Math.hypot(3, 4, 12)` was `5`. Now `$__math_hypot<n>`, V8's algorithm (largest magnitude; Infinity before NaN; Kahan-compensated scaled sum), one helper per arity. Bit-identical to Deno on a 224-call battery (1–4 arguments, subnormals, ±Infinity, NaN, 1e±200). Test `38_MathExactSemantics` | wasic + console_log Math `hypot` |
| ~~sw40~~ | ✅ FIXED 2026-10-06 (Phase 1): `Math.round(0.49999999999999994)` was `1`, `Math.round(-0.4)` was `+0`. Now `$__math_round`: `floor`, then +1 when `x - floor(x) >= 0.5` (exact for every double), then `copysign` with `x` (keeps −0, cannot flip a nonzero result). Identical to Deno on 84 awkward values. Test `38_MathExactSemantics` | wasic + console_log Math `round` |
| ~~sw41~~ | ✅ FIXED 2026-10-06: `console.log(-0)` printed `0` (Deno `-0`). A WHOLE numeric console argument (not a template, not a top-level string concat) is marked `console` and printed by `$__f64_to_str_console` (−0 as `-0`, else `$__f64_to_str`); a numeric literal argument is fixed at compile time. String conversion (`` `${-0}` ``, `String(-0)`, `"v=" + -0`) still gives `0`, as in JavaScript. Test `7b_ConsoleNumberFormatting` | console f64 printer |
| ~~sw42~~ | ✅ FIXED 2026-10-06 (found fixing ld16; the same on main): `const t: string = String(s)` printed the string's POINTER (`260`): emitStringAssign's `String(...)` branch sent a string argument down the numeric path. A string argument is now the string itself. Test `7b_ConsoleNumberFormatting` | wasic emitStringAssign `String(...)` |
| ~~sw43~~ | ✅ FIXED 2026-10-06: an `f32[]` literal was written as 8-byte f64 elements into a reservation of 4 bytes per element, OVERRUNNING the next data segment (`[1.25, 2.5]` turned a following `"true"` into four NUL bytes), and an element read back as a bit pattern (`1072955392`). Now `encodeF32LE`; every load / store chain that sent f32 to `i32.load` / `i32.store` (60 in wasic, 4 in console_log; rewritten by a script that listed each one) is `memLoadOp` / `memStoreOp`; the dynamic-array helpers (`push`, `indexOf`, `find`, `sort`, `flat`, `flatMap`) take an f32 value type. Test `9_F32Containers` | wasic f32 array layout |
| ~~sw45~~ | ✅ FIXED 2026-10-06 (found fixing sw43; the same on main): `for (const e of v)` over an array PARAMETER read from the pointer itself, iterating the 8-byte header as elements: the sum of an `i32[]` param `[1, 2, 3]` was 7, of an `f64[]` `[1.25, 2.5, 3]` was 3.75. The branch's comment ("no header") was stale: every other read of a parameter array (`arr[i]`) skips the header. No test did a for-of over a parameter. Test `9_F32Containers` | wasic for-of |
| ~~sw44~~ | ✅ FIXED 2026-10-06 (owner approved the design change): `String(e)` of a catch variable guessed what was thrown (a declaration always prefixed `Error: `, the console never did), and `e instanceof Error` was TRUE at compile time. Now the thrown KIND travels with the exception: `$__exn_kind` (0 = string / number / boolean, 1–7 = `EXN_KINDS`) is set before every `throw` (a re-throw passes the catch variable's own kind), a catch copies it into `$<var>__kind`, and a rejected promise carries it in its +12 word. `String(e)`, `${e}` and `"x" + e` go through `$__exn_str` (`Name: message`, `Name` for an empty message, the value itself for kind 0); `e instanceof <Error family>` is a run-time test; `e instanceof Error ? e.message : <else>` decides at run time when `<else>` is not the same text. Tests `15_ThrownKind`, `15_ThrownKindAsync` | wasic exception model |
| ~~sw46~~ | ✅ FIXED 2026-10-06: a function named `main` (async or NOT) made `_start` a bare `call $main`, and the parser stripped a top-level `main();` line, so EVERY other top-level statement was dropped (`console.log("before main"); main(); console.log("after main")` printed only main's output), a top-level array beside `main` was never initialised (7 corpus tests had a null `guard` and passed only because their self-check never fired), and `main` was called even when the program never called it. The parser now keeps `main();`, and the shortcut applies only to a top level that is empty or exactly one `main()` call. Test `56_TopLevelBesideMain` | wasic `_start` |
| ~~sw47~~ | ✅ FIXED 2026-10-06 (found fixing sw46; the same on main): a top-level array read in a FUNCTION's `console.log` printed garbage: `console.log(total[1], total.length)` gave `0 0`. The console's array lookup decided "module global" from `moduleArrayVars` alone (wasic's own reads use `isModuleGlobalArr`), so the array's -2 marker was emitted as the constant ADDRESS -2. Both lookups now use wasic's test and mark a -2 array runtime-addressed. Repro `sw47_console_module_array_in_function.ts`; test `56_TopLevelBesideMain` | console array lookup |
| ~~sw24~~ | ✅ FIXED 2026-10-06: `console.log("C:\\tmp")` double-decoded: `C:\tmp` → `C:<TAB>mp`. A literal segment holds DECODED text and the DataAllocator unescapes its input again; `allocDecoded` re-escapes backslashes first (per-iov path and a string-ternary literal branch; the gather path writes bytes directly and was right). Test `7b_ConsoleOperatorsAndClosures` | console_log per-iov |
| ~~sw25~~ | ✅ FIXED 2026-10-06: `console.log(n > 0 ? true : false)`: `true` → `1`. A ternary whose branches are both boolean (literal, comparison, negation, bool variable or `boolean` call) is a `boolexpr`. Test `7b_ConsoleOperatorsAndClosures` | console_log |
| ~~sw26~~ | ✅ FIXED 2026-10-15 (loud since 2026-09-30): `"x" + (a < b ? "lo" : "hi")`: `xlo` → `x0`, then refused. parseSingleArg now unwraps a matching outer `( … )` (exprToWat already did, sw21), so the ternary reaches its string handler; ld06 was the same cause. Test `7g_ConsoleConcatAndCompare` | console_log |
| ~~sw27~~ | ✅ FIXED 2026-09-30: `"v=" + (x ?? 5)`: `v=3` → `v=0`. Same delegation. Test `7b_ConsoleExprFallback` | console_log |
| ~~sw28~~ | ✅ FIXED 2026-10-09: `Math.max(a, b, c)` ignored the 3rd: `9` → `5` (`min` too). Both paths fold any number of arguments left to right; no argument gives `-Infinity` / `Infinity`. Test `11_StringConversions` | both |
| ~~sw29~~ | ✅ CLOSED 2026-09-28: an UNANNOTATED number was typed i32 (`let a = 100000; a * a` wrapped). Now LOUD by rule: every declaration states its type (design-decisions.md); the repro was retired, `tests/typed_decl_tests.ts` asserts the refusal | wasic checkDeclarationTypes |
| ~~sw30~~ | ✅ FIXED 2026-10-15 (loud since 2026-09-30): the declaration `const d: i32[] = xs` was already right; what stayed refused was the repro's console call with an array-literal ARGUMENT, `t([1, 2, 3])`: the console fallback resolver typed `[…]` by inferExprType instead of as its i32 pointer, and `$__arr_tmp` was declared only for a `(` / `,` before `[` in a function (never in _start). Now an array literal is i32 in the resolver, and `$__arr_tmp(2)` / `$__obj_ret` are declared after emission when the body uses them. Test `9_ArrayLiteralArgsAndTuples` | console fallback + wasic temps |
| ~~sw31~~ | ✅ FIXED 2026-10-15 (loud since 2026-09-30): a 2D array declared from a CALL, `const d: i32[][] = mk()`. The 2D declaration parsed ANY right side as a literal (zero rows), and `stripInferableAnnotations` removed the annotation for a name / call, so the inferred path aliased the pointer but never registered `d` as 2D. Now a non-literal right side is registered without rows and emitted as the pointer it evaluates to; the annotation is no longer stripped. Fixed with ld11, ld12. Test `6d_Array2DAliases` | wasic 2D paths |
| ~~sw32~~ | ✅ FIXED 2026-10-06: `k.inc(), k.inc()` → `1 2` → `1 1`. NOT a console bug: the closure's mutation of its captured `n` was lost after EVERY call (`1 1 1` on separate lines too). A captured variable was boxed only when two or more arrows referenced it, so a lone mutating closure incremented a copy; and the mutation scan read only the first of its three regex groups (`++n` missed). A declared i32 / bool local mutated by one arrow is now boxed too. Test `7b_ConsoleOperatorsAndClosures` | wasic closure capture |
| ~~sw48~~ | ✅ FIXED 2026-10-09: a closure mutating a captured i32 / bool PARAMETER copied it: `adder(100).add(1), .add(2)` → `101 103` → `101 102`. A mutated captured parameter is boxed like a declared local: the factory's prologue rebinds it to `$__box_i32(value)`. With it, the factory's OWN reads and writes of any boxed name go through the cell (a read before the closure was made printed the cell's address: `twice 520`), and only the closure-creation call passes the cell (`__boxref(x)`). An f64 capture is not boxed (a 4-byte cell); that, and f64 closures generally, are sw52. Test `5h_CapturedParamMutation` | wasic closure capture |
| ~~sw52~~ | ✅ FIXED 2026-10-09 (found fixing sw48; the same on main): an arrow in a returned object literal with no return annotation was typed i32 whatever it returned (the factory's auto-struct, `mResult = "i32"`, which the lifted arrow then took as its own result): a boolean printed `1` / `0`, an f64 was truncated. Its result is now typed from its `return` (block body, the arrow's OWN body only) or its expression, in the factory's params and typed locals plus the arrow's params and body locals (`closureResultType`; f64 only when a float is visible, so an unknown shape keeps i32). Found with it, LOUD and fixed: an expression-bodied arrow that is an object's LAST value took the closing `}` (ld21's root). Split off, open: sw53. Test `5h_ClosureResultTypes` | wasic closure result typing |
| ~~sw53~~ | ✅ FIXED 2026-10-09 (split from sw52; the same on main): a closure mutating a captured f64 (local or parameter) changed a COPY: `s += x; return s` gave `1.75 1.75` for `1.75 3`. The box was a 4-byte i32 cell and an f64 was never boxed (two arrows sharing one would have built an invalid module). Now the cell's POINTER and its VALUE type are kept apart: a boxed capture is an i32 parameter of the lifted arrow and its factory (so the closure layout and trampoline carry the pointer), `boxedCaptureTypes` / `currentBoxTypes` give the value type back for typing and for every load / store (`boxLoad` / `boxStore` at the read, declaration, assignment, compound and `++` / `--` sites); in the owning function a boxed f64 local is declared i32 (its cell, 8 bytes) and a boxed f64 PARAMETER keeps its value with its cell in a shadow local `$<name>__box` (`$__box_f64`). A boxed read now also converts to the type asked. Golden-WAT: only a helper's comment changed. Test `5h_CapturedFloatMutation` | wasic closure capture |
| ~~ld01~~ | ✅ FIXED 2026-10-15: function-typed var from a ternary: undefined func. Three causes: `liftStartBodyArrows` stripped EVERY top-level function-type annotation (`const op: (x: i32) => i32 = dbl` arrived untyped: an f64 local); _start's pre-scan had no function-typed clause; the console called an unknown name directly (`call $op`). Now the annotation is kept for a plain function or a ternary of two, _start registers `funcTypeVars`, the declaration emits `c ? tri : dbl` as table indices, and the console hands a call to a non-function to wasic (both call sites). Found with it: `fa(2) + op(1)` in console.log was typed f64 (a call-led operand now takes its result type). Test `5h_ClosureFieldsAndReturns` | wasic + console |
| ~~ld02~~ | ✅ FIXED 2026-10-06: console `x % 2` on f64: `f64.rem` does not exist. Now `x - trunc(x / y) * y`, the formula wasic's emitExpr uses (both paths share its limits: inexact for a large quotient, and each operand is evaluated twice). Test `7b_ConsoleOperatorsAndClosures` | console_log |
| ~~ld03~~ | ✅ FIXED 2026-10-15: console string `<`: unresolved local. The console compared strings through `$__str_cmp` for `===` / `!==` / `==` / `!=` only; `<` `<=` `>` `>=` of two strings (both sides, else JavaScript compares numbers) now do too, as wasic's STR_CMP table. Test `7g_ConsoleConcatAndCompare` | console_log |
| ~~ld04~~ | ✅ FIXED 2026-10-06 (with Phase 1): console `Math.max` in i32 context: `$__i32_max` never emitted. The console path now REQUESTS every helper it calls through `setMathHelperNeededCallback` (it used to assume wasic emitted them). Repro now MATCH | console_log |
| ~~ld05~~ | ✅ FIXED 2026-10-15: console `tag() + 7`: stack mismatch. A concat operand counted as a string only as a literal or a string local; `isConcatString` adds string-returning calls, string globals / array elements, string methods, `String(…)`, and a left side that is itself a string `+` (`s + n + 1`). Test `7g_ConsoleConcatAndCompare` | console_log |
| ~~ld06~~ | ✅ FIXED 2026-10-15 with sw26 (the paren unwrap): console `"ok: " + (a > b)`: invalid module. Five golden entries moved: a parenthesised integer in a concat now prints through `$__i32_to_str` instead of being converted to f64 first (same text) | console_log |
| ~~ld07~~ | ✅ FIXED 2026-10-15: `s + n + 1` into a string: unsupported. `flattenStringConcat` split at the last `+` and needed a plain string on one side; a left side that is itself a string concatenation now counts (`+` groups from the left). A literal-led chain always worked. Test `11c_StringBuildingChains` | wasic |
| ~~ld08~~ | ✅ FIXED 2026-10-15: `i64.toString()`: invalid module (`$__i32_to_str` handed an i64). `x.toString()` of a number or boolean is now `String(x)` in both emitStringAssign and emitStringPtrLen (bigint without `n`, a boolean `true` / `false`; the value form was refused in console.log). Test `11c_StringBuildingChains` | wasic |
| ~~ld09~~ | ✅ FIXED 2026-10-15: a function returning tuples from a TERNARY (`a < b ? [a, b] : [b, a]`): `$__arr_tmp` unresolved. Declaring the temp alone made it SILENT (the branches were built as ARRAYS, so `r[0]` read the length: `2 8`); a tuple-returning function now returns each branch on its own path (`if` + two tuple returns). Test `9_ArrayLiteralArgsAndTuples` | wasic |
| ~~ld10~~ | ✅ FIXED 2026-10-15 (batch 2): `recs.push({ a: 1, b: 2 })` into `Array<{ a: i32; b: i32 }>`: unsupported expression, at TOP level only (a function's worked). _start's pre-scan, and `detectModuleArrayGlobals` for one used in a function, took the inline element type for a FUNCTION signature; both now build its struct (`inlineElementStruct`, shared with the function pre-scan). Found with it: the struct was named `__Anon_<varName>`, so two same-named arrays with different shapes shared one (now named by the shape); _start had no `const t = recs[i]` struct-var clause (Fix C's twin, which ld14 also needed); `t.a + t.b` of an i32 and an f64 field added as i32 (console `hasFloatField`, `fieldAsExpected`). Test `9b_InlineStructArrays` | wasic + console |
| ~~ld11~~ | ✅ FIXED 2026-10-15 with sw31: a 2D array declared from another 2D array's NAME. Test `6d_Array2DAliases` | wasic |
| ~~ld12~~ | ✅ FIXED 2026-10-15: a 2D array declared from a 2D PARAMETER, then `d[1][2]`. A `T[][]` parameter was no array at all (parseParams knew `T[]` only); it is now `is2DArray` and registered 2D. Found with it: the 2D read regex took `d[1][0] + rows[0][1]` as ONE access (index `0] + rows[0][1`); each index must now be balanced. And the repro's console argument `t([[…]])` (sw30's cause). Test `6d_Array2DAliases` | wasic |
| ~~ld13~~ | ✅ FIXED 2026-10-15: `const b: string[] = a` (top level): the declaration's capture kept the `;` and emitted `a;`. Test `11c_StringBuildingChains` | wasic |
| ~~ld14~~ | ✅ FIXED 2026-10-15 (batch 2) with ld10: a union-typed array filled by `push({ … })` literals, then `xs[i].type`: the top-level `const n: TreeItem = xs[i]` was not a struct var (_start lacked Fix C). Test `9b_InlineStructArrays` | wasic |
| ~~ld15~~ | ✅ FIXED 2026-10-06 (Phase 1): `const x: i32 = Math.floor(3.7)` (also `trunc`, `ceil`, `round`, `sqrt`, `sign`, `hypot`, the mathlib functions) was an INVALID MODULE: every f64-valued Math result was returned as f64 whatever `defaultType` asked. Now converted at the type asked, with wasic's existing convention for an f64 in an integer context (`trunc_f64_s`, as `y as i32` and an f64 local read as i32 already do), `demote` into f32. Both paths (wasic `asDefault`, console_log `asExpected`). Test `38_MathExactSemantics` | wasic + console_log Math dispatch |
| ~~ld16~~ | ✅ FIXED 2026-10-06: `console.log(String(x))` emitted `call $String`, an undefined function. A console `String(...)` now goes through wasic's string resolver (emitStringAssign owns `String(...)`), and anything it cannot build is a diagnostic. `String(<string local>)` keeps the old pass-through (see sw44). Test `7b_ConsoleNumberFormatting` | console_log call path |
| ~~ld17~~ | ✅ FIXED 2026-10-06: `console.log(z)` of any `f32` value was an invalid module: the printer was handed a raw f32. Every producer of an f64 segment whose source may be f32 (locals, globals, calls, closures, struct fields, 2D elements, nullish) now goes through `promoteF32`. Test `7b_ConsoleNumberFormatting` | console f64 printer |
| ~~ld18~~ | ✅ FIXED 2026-10-06: an `f32` STRUCT FIELD was loaded with `i32.load` (`memLoadOp` now). Underneath it, NO f32 value was ever converted at an f32 boundary (`const a: f64 = z + 1` with an f32 local was an invalid module on main): `emitExpr` is now a wrapper that reads the emitted WAT's result type from its outermost form (`watResultType`) and converts only when exactly one side is f32 (in valid WAT that never happens, so no valid output changed: golden-WAT 0 entries); an f32 operand meeting an f64 computes in f64; `f32 → i32` uses `i32.trunc_f32_s`. The console twin got `f32AsExpected` on its element and field loads. Test `9_F32Containers` | wasic + console_log f32 |
| ld27 | FIXED 2026-10-09 (L3, both paths: each argument is ToInt32'd: a literal folds, an f64 / f32, or a float wasic had wrapped in a TRAPPING `trunc_f64_s`, goes through `$__i32_toint32`; an i32 argument is untouched, golden-neutral). Was OPEN (Math scan, 2026-10-09; the same on main): `Math.clz32` / `Math.imul` with an f64 argument build an INVALID module: `i32.clz` / `i32.mul` get the f64. JavaScript applies ToInt32 (wrap mod 2³², NaN → 0) first. Repro `ld27_math_clz32_imul_f64_arg.ts` | wasic Math dispatch |
| ld28 | FIXED 2026-10-09 (L3: trig through Payne–Hanek (sw61); `pow` returns ±∞ / ±0 once `y·log|x|` passes ±800, `sinh` / `cosh` ∞ past 1000, `expm1` −1 below −40, before any integer conversion). Was OPEN (Math scan, 2026-10-09; the same on main; CORRECTED the same day, one call per program): these TRAP, "float unrepresentable in integer range": `sin` / `cos` / `tan(1e300)`, `pow(1e200, 1e200)`, `expm1(-1e10)` and `expm1(-2147483648)`, `cosh` / `sinh(1e10)`, `cosh(1e300)`. Correct: `sin` / `cos` at ±2³¹, `pow(-2.5, 3)`, `expm1(1e10)`, `cosh` / `sinh(1000)`. (The first scan printed every input in ONE program, so the lines after a trap came back empty and were blamed on the wrong inputs.) Repro `ld28_math_trig_large_arg_traps.ts` | wasic Math library |
| ld29 | FIXED 2026-10-13 (wasMath L4, both paths: every bitwise / shift operand, and `~`'s, goes through ToInt32 (`emitToInt32` / `toInt32Wat`, shared with ld27's clz32 / imul): a literal folds, an i32 is untouched, a float (or one wasic had wrapped in a trapping `trunc_f64_s`) calls `$__i32_toint32`. `45_random-numbers`' mulberry32 and `62_GapNumericCoercion` moved to it, same output). Was OPEN (Math scan, 2026-10-09; the same on main): `x \| 0` on an f64 outside the i32 range TRAPS; JavaScript's ToInt32 wraps (4294967298.7 → 2). The idiom asm.js uses for "to int32". Repro `ld29_or_zero_traps_out_of_range.ts` | wasic `\|` on an f64 |
| ~~ld32~~ | ✅ FIXED 2026-10-09 (found by the wasMath corpus program; the same on main): `NaN` / `Infinity` where an f32 is wanted (an f32 parameter: `g(NaN)`, `f32.add(NaN, 1)`) emitted an `f64.const`: an INVALID module. Both emitters now give `f32.const nan` / `inf` in an f32 context (wasic `emitExprCore`, console `exprToWat`). Test `39_WasMathAllFunctions` | wasic + console constants |
| ld33 | FIXED 2026-10-09 (L3: `atan2` returns ±π/2 when |y| > |x|·2⁶⁰, before the dd divide whose subnormal quotient looped; `$__cr` returns a NaN hi as is and zeroes a NaN lo). Was OPEN (found by the wasMath L2 battery, 2026-10-09): `Math.atan2(0.5, 1e-310)` (a SUBNORMAL second argument) loops FOREVER in wasm; Deno `1.5707963267948966`. `f64.atan2` lowers to it. The repro verifier and the L2 battery now have time limits that kill the real process (not the `.cmd` shim) and report HANG. Track M / L3. Repro `ld33_math_atan2_subnormal_hangs.ts` | wasic Math library (mathlib) |
| ~~ld34~~ | ✅ FIXED 2026-10-15, and broader than recorded: EVERY `s[i]` of a string in console.log was refused, an i32 index too. A string receiver's index now goes to wasic's string resolver (the path `const ch: string = s[i]` takes). Found with it: sw71. Test `7f_ConsoleStringIndex`. Was OPEN (found building D3, 2026-10-13; the same on main): `console.log(s[pos])` with `pos: number` (an f64) is refused, "console argument: cannot emit the expression 's[pos]' as f64"; Deno prints `e`. `const ch: string = s[pos]` compiles and is right, so only the console's string-index path lacks the float index (an INDEX: the owner's D3 keeps the conversion there). Repro `ld34_console_string_index_by_number.ts` | console_log string index |
| ~~ld37~~ | ✅ FIXED 2026-10-15 (batch 2): `$__arr_elem_str` writes booleans (kind 8), bigints with their `n` (9) and strings (10, quoted and escaped as `scripts/console/inspect_array_ref.ts`); `$__arr_inspect` aligns booleans and strings LEFT in columns (padEnd), counts a string's width in characters, and reserves room for the strings' text. A string array, returned or a variable, prints. Struct arrays stay refused (sw74, ld45); a typed or 2D array beside other arguments too. Golden: only the two helpers grew (+106 lines) in 7 entries. Test `7h_ConsoleWholeArrays`. Was OPEN (opened by the sw66 fix, 2026-10-13): a WHOLE string / boolean / bigint (or struct) array as a console.log argument, and a typed or 2D array beside other arguments, is refused ("printing a whole string[] array is not supported yet; print its elements"); before sw66 they printed an address or element bits. Deno prints `[ "a", "b" ]`, `[ true, false ]`, `[ 1n, 2n ]`. Needs element writers in `$__arr_elem_str` (a string quoted as util.inspect quotes it: `"` unless the text holds one, then `'`, then `` ` ``; booleans and strings align with padEnd, not padStart). Repro `ld37_console_whole_nonnumeric_array.ts` | console array writer |
| ~~sw71~~ | ✅ FIXED 2026-10-15 under the owner's ruling (the same day): an out-of-range `s[i]` gave `""` (and in a concat a GARBAGE byte, `$__str_char_code_at`'s); JavaScript gives `undefined`. Now `$__str_index` returns a static "undefined" text out of range, which prints, concatenates and interpolates as JavaScript's does; a string compared with `undefined` / `null` calls `$__str_is_nullish` (no text, or that marker). `charAt` keeps `""`, as JavaScript. **And a FLOAT string index is a compile error** (`error[float-index]`, owner: "refuse float index"; it narrows D3 for strings: a fractional index is `undefined` in JavaScript and wasm would truncate). Judged by the emitted index (truncated = a float). 3 corpus programs migrated (`i32` counters, `f64.toI32(v % 16)`). Known edges, documented: `s[10].length` is 9 (JavaScript throws), `s[10] === "undefined"` is true (JavaScript false). Tests `7f_ConsoleStringIndex`; typed_decl (4 refusals, 1 accepted) | wasic string index |
| ~~sw75~~ | ✅ FIXED 2026-10-19 with sw102 (a top-level comparison through the dot-call path prints as a boolean; test `7i_ConsoleUnaryBoolStringFields`). Was (found with sw71, 2026-10-15; the same on main): `console.log(s.charAt(far) === "")` prints `1` for `true` (the comparison takes a numeric segment; not the string-method branch, which now needs the whole argument to be one call) | console_log |
| ~~ld46~~ | ✅ FOUND FIXED 2026-10-20 (it passes; closed by sw100's `.length` of a string-valued call, 2026-10-19). Was (found with sw71, 2026-10-15; the same on main): `console.log(s.charAt(far).length)` builds an invalid module (an i32 block where an f64 is expected); `const c: string = s.charAt(far)` then `c.length` works | console_log |
| ~~sw72~~ | ✅ FIXED 2026-10-15 (found with ld22; the same on main): a function-typed declaration whose initialiser was neither a closure-factory call nor a plain function name EMITTED NOTHING (`return ""`): the local stayed 0, and a call through it reached table slot 0, whatever function that was (an assembler error only when the table was empty). Any other initialiser is now a compile error; ld39 and ld01 closed the forms that reached it | wasic function-typed declaration |
| ~~sw73~~ | ✅ FIXED 2026-10-15 (found with ld12; the same on main): a function's local array named like a top-level array (`function mk() { const m: i32[][] = …; }` beside a top-level `m`) made the top-level one a module global, because `detectModuleArrayGlobals` counted the function's OWN `m` as a use; _start then initialised it as a local and read the global: `3 7 9` → `3 0 0`. A name the function declares (param, `const` / `let` / `var`) no longer counts. `13_variadic-functions`' `nums` became a plain local (golden re-recorded) | wasic module arrays |
| ~~ld38~~ | ✅ FIXED 2026-10-22: `$__f64_to_fixed(x, f)`, exact as JavaScript's: x = m·2^e, n = m·10^f·2^e in big integers, ties to the larger n (`(1.005).toFixed(2)` is "1.00", 1.005 being a little below it), NaN "NaN", \|x\| ≥ 1e21 and ±Infinity are String(x), f outside 0..100 traps (JavaScript: RangeError). It reuses sw122's `$__bn_*` helpers (plus a right shift and a small division), emitted once when both are used. Declarations, templates, concatenations and console.log. Test `4m_ExpressionGaps`. Was (found 2026-10-15): `Number.prototype.toFixed` is not implemented: `console.log(x.toFixed(1))` and `const t: string = x.toFixed(2)` are refused | wasic numbers |
| ~~ld41~~ | ✅ FIXED 2026-10-22 (found with sw73, 2026-10-15): a TOP-LEVEL 2D array read inside a function, `return grid[r][c]`, is refused (the module-global 2D path is missing). detectModuleArrayGlobals registered `T[][]` as a 1D `T[]` and missed the `Array.from` pre-pass form; it now registers a 2D global, and the 2D read, `a[i].length`, `a[i].push`, console print and both builders go through arrGetWat / arrSetWat. `string[][]` is ld94 | wasic module arrays |
| ~~ld42~~ | ✅ FIXED 2026-10-22 (found with ld01, 2026-10-15): a top-level `boolean` constant read inside a function, `if (useTri)`, is "Unsupported expression" (an i32 constant beside it works). parseModuleGlobals promoted numeric and enum literals only; `true` / `false` now make a `bool` global, kept `bool` in console_log's globals map so it prints `true` / `false` (11 goldens moved, `local.get` → `global.get` only) | wasic module globals |
| ~~ld94~~ | ✅ FIXED 2026-10-22 (found with ld41): a 2D STRING array, `const names: string[][] = [["a", "b"]]`, is refused everywhere, at top level too, with the unhelpful "Unsupported expression: \"a\"" (the 2D builder has no string element). Elements are (ptr, len) pairs: the builder (a literal or a string variable; others refused), `str2DElemAddr` for reads in emitStringPtrLen / emitStringAssign / console, the 2D write, `names[r].length` a row's length; `parse2DArrayLiteral` is string-aware (`"d,e"` was two elements); module 2D string arrays register. Test `63_StringMatrix` | wasic arrays |
| ~~ld95~~ | ✅ FIXED 2026-10-22 (found with ld78): a LITERAL array of functions, `const ops: Op[] = [add, mul]` (or `Array<(…) => T>`), was no function array (`const f: Op = ops[i]` "Unsupported function-typed initialiser"; `console.log(ops[0](1, 2))` refused). A pre-pass writes the empty function array and one push per element; `arr[i](args)` calls the slot's table index in emitExpr and in console. Test `44_FunctionArrayLiterals` | wasic function arrays |
| ~~ld43~~ | ✅ FIXED 2026-10-22: emitExprCore's `.length` of a string-valued receiver unwraps parentheses and builds a concatenation into the `$__str_op` pair (emitStringAssign); it also takes a string FIELD of an element (ld70) and stays out of a sum (`a.length + t.length`) and of a plain element read (`arr[j].length`, its direct load). `isStringExpr` now knows `L + R` with a string on either side (the last additive operator being that `+`, nothing looser at top level): `(s + s).length` was refused. Test `4m_ExpressionGaps`. Was (found with sw26, 2026-10-15): `.length` of a parenthesised string expression in console.log, `("pre" + s).length`, is refused | console_log |
| ~~sw74~~ | ✅ FIXED 2026-10-15 (found with ld37; the same on main): a whole STRUCT array in console.log printed its element POINTERS, `[ 260, 264 ]` for `[ { x: 1 }, { x: 2 } ]`: the refusal list missed `structTypeName`, and the elements are i32. Refused now (ld45 is the printing) | console_log |
| ~~ld44~~ | ✅ FIXED 2026-10-15 (found with ld37; the same on main): a string `push` with an expression in a ONE-LINE loop at top level, `for (…) grown.push("w" + i)`, used an undeclared `$__str_push_ptr` (the pre-scan wants the push at the start of its line); declared after emission now, as `$__arr_tmp`. Test `7h_ConsoleWholeArrays` | wasic temps |
| ld45 | OPEN (2026-10-15): printing a whole struct array, `console.log(ps)` (Deno `[ { x: 1 }, { x: 2 } ]`), is refused; needs an object writer (util.inspect's `{ k: v }`, its own line-breaking). 2026-10-22: a single struct or class instance too (it printed its address: sw127, now refused, `refuseWholeObjectArgs`) | console array writer |
| ~~sw127~~ | ✅ FIXED (refused) 2026-10-22 (found with ld45; the same on main): `console.log(p)` of a whole struct printed its ADDRESS, `260` for `{ x: 1, y: 2.5 }`. wasic's console handlers refuse a bare struct / class instance argument before console_log runs (no new console_log export); printing it is ld45. Test `7i_ConsoleWholeStructRefused` (expect-fail) | wasic console |
| ld36 | FIXED 2026-10-13 with D3 (a documented gap, dynrt-design.md 3.1, never a row until D3 made it the only way to unbox): a cast operand in a comparison, `(x as f64) === 13`, compared as `i32.eq` over an f64, an invalid module. The binary-op loop now types an operand written `(x as T)` / `x as T` as T. `dynrt_any_bundle` checks 13 such comparisons | wasic binary-op operand typing |
| ld35 | FIXED 2026-10-13 with D3 (found building it; the same on main): in a `console.log` argument, a call to a user function with an `i32` parameter passed an f64 argument RAW (`console.log(h(f))`), an invalid module ("call[0] expected type i32, found global.get of type f64"); outside the console it was truncated. Both paths now refuse it (D3: a float passed to an integer parameter; console `intArgWat`). typed_decl asserts it | console_log call arguments |
| ld30 | FIXED 2026-10-13 (wasMath L4: bigint `**` is wasMath's i64 power by squaring, `$__i64_pow`, wrapped to 64 bits like every bigint here; a negative exponent traps where JavaScript throws; inferExprType now types a bigint expression led by a bigint GLOBAL or holding a bigint literal as i64, which the console fallback needed). Was OPEN (bigint probe, 2026-10-09): bigint `**` is unsupported (`cannot emit the expression 'a ** 3n' as i64`). Repro `ld30_bigint_exponent_unsupported.ts` | wasic i64 operators |
| ld31 | FIXED 2026-10-13 (wasMath L4, both paths: a bigint operand makes `&` `\|` `^` i64 ops and `<<` `>>` calls to `$__i64_shl` / `$__i64_shr`, which follow JavaScript's unbounded count (≥ 64 fills, negative shifts the other way) wrapped to 64 bits, where `i64.shl` takes the count mod 64; `>>>` on a bigint is a compile error, as it is a TypeError in JavaScript; typed_decl asserts it). Was OPEN (bigint probe, 2026-10-09): bigint `&` `\|` `^` `<<` `>>` build an INVALID module (`i32.and` / `i32.shl` handed an i64), in console arguments and declarations alike. `+ - * / %` and unary `-` are right. Repro `ld31_bigint_bitwise_shift_invalid.ts` | wasic i64 operators |
| ~~ld26~~ | ✅ FIXED 2026-10-09 (found fixing sw51; the same on main): a struct literal containing `null` pushed into a struct array (`recs.push({ a: null, b: 2 })`) did not compile: `null` made the literal non-constant, and the runtime path's `$__rt_struct_ptr` was undeclared there. `null` / `undefined` are compile-time constants now (the static encoder stores 0 and sets a flagged field's flag). Repro `ld26_push_struct_literal_with_null.ts`; test `24_NullableFields` | wasic struct literal |
| ~~ld24~~ | ✅ FIXED 2026-10-09 (found fixing sw09; the same on main): a top-level array named BARE inside a function (`` `g=${g}` ``, not `g[i]` / `g.length`) compiled to a nonexistent local `$g`. `detectModuleArrayGlobals` now counts every identifier a function uses, and a `push` / `pop` / `shift` / `unshift` / `splice` on it as dynamic. Test `11_StringConversions` | wasic module arrays |
| ~~ld25~~ | ✅ FIXED 2026-10-09 (found fixing sw09; the same on main): `` const s: string = `${a.join("-")}|` ``: `Unsupported expression`. A `.join(...)` segment is a string (`isStringExpr`) and its multi-value result is taken off the stack. Test `11_StringConversions` | wasic template |
| ~~ld23~~ | ✅ FIXED 2026-10-15, both paths: an equality with a boolean side (a comparison, `!x`, `true` / `false`, a boolean variable; not `a \|\| b`, a number per sw49) is an i32 compare (console `isBoolOperand`, wasic `_boolEquality`). The declaration form `x < 1 === ok` failed too. Test `7g_ConsoleConcatAndCompare`. Was OPEN (found fixing sw17, 2026-10-06; fails on main too): a comparison between booleans, `2 < 3 === true`: the equality is typed f64 from its literal-led left side over an i32 comparison result, an invalid module. Repro `ld23_compare_boolean_with_boolean.ts` | wasic + console comparison typing |
| ~~ld20~~ | ✅ FIXED 2026-10-15: the function parser now joins a multi-line `return () => {` … `};` (newlines kept, as `return function`), parseReturnArrow splits a one-line body into statements, and an unannotated block arrow returns what its `return` returns (it was void, an invalid module). Test `5h_ClosureFieldsAndReturns`. Was OPEN (found fixing sw32, 2026-10-06): a function that RETURNS a block-bodied arrow (`return () => { c++; return c; };`, one line or several): `Unsupported statement`. The object-literal form (`return { inc: () => { … } }`) works. Repro `ld20_returned_block_arrow.ts` | wasic arrow lifting |
| ~~ld21~~ | ✅ FIXED 2026-10-09 (with sw52): an object literal returning TWO closures (`{ up: () => { ++v; return v; }, get: () => v }`): `Unsupported expression`. Not the two closures: an expression-bodied arrow that is the object's LAST value ended only at `)` / `]` / `,` / `;`, so it took the closing `}` with it. A `}` at depth 0 ends it now. Repro now MATCH; test `5h_ClosureResultTypes` | wasic arrow lifting |
| ~~ld22~~ | ✅ FIXED 2026-10-15, not a console bug: `rd.g()` was refused everywhere. The factory's result struct took only arrows written INLINE in `return { … }`; a field naming a local declared with a function type (`{ g: g }` / `{ g }`) is now a field too (in source order). Under it, ld39 and sw72; beside it, ld40. Test `5h_ClosureFieldsAndReturns`. Was OPEN (found fixing sw32, 2026-10-06): `console.log(rd.g())`, a closure held in a struct field called inside console.log: `cannot emit the expression 'rd.g()'`. Repro `ld22_console_struct_closure_call.ts` | wasic closure struct |
| ~~ld39~~ | ✅ FIXED 2026-10-15 (found with ld22; the same on main): a local declared WITH its function type inside a function, `const g: () => i32 = () => r * 2`, was never lifted: `liftInlineArrows` met the type's `=>` first (the top-level pass strips the annotation; the function pass now does too, for an arrow initialiser). Test `5h_ClosureFieldsAndReturns` | wasic arrow lifting |
| ~~ld40~~ | ✅ FIXED 2026-10-15 (found with ld22; the same on main): an arrow with nothing to capture as a value of a returned object (`{ h: (): f64 => 1.5 }`, or a local returned in one) was a bare table index, but the result struct calls through a closure pointer: "function signature mismatch". It gets a zero-capture closure there. Test `5h_ClosureFieldsAndReturns` | wasic arrow lifting |
| ~~ld19~~ | ✅ FIXED 2026-10-15: a struct-array element's field leads the type, in the console's numeric segment (Phase 42 knew `a.x` only) and in its binop operand typing. Test `9_ArrayLiteralArgsAndTuples`. Was OPEN (found fixing ld18, 2026-10-06; the same on main): `console.log(qs[0].x + qs[1].x)` (fields of struct-array elements, summed): `cannot emit the expression 'qs[0].x' as i32`. The console binop types the sum from its lead atom (`qs`, an i32 pointer). A declaration (`const s: f64 = qs[0].x + qs[1].x`) works. Repro `ld19_console_struct_array_field_sum.ts` | console_log binop typing |

**`sw29` was settled by the owner's ruling (2026-09-28), not by an f64 default:** every
declaration states its type, and a counting-`for` counter is an integer by standard. See
design-decisions.md and the entry "Landing the typed-declaration rule" below. The "untyped number is
an f64" idea was put on hold and then superseded.

**sw30–sw32 and ld09–ld14 were found by LANDING that rule, not by the round-1 audit.** Requiring
annotations pushed every program through the typed-declaration handlers, which turned out to be
weaker than inference for arrays; the probes that showed it are filed beside the round-1 repros.

**Also from the dead-code audit (cleanup, not bugs):** every private member is reachable. Unused
exports `DATA_BASE` / `SCRATCH_SLOTS` / `ArrayLookup` (console_log.ts); the unused promise
`+28 reactions` slot; `iovBase`/`scratchBase` are constants; stale comments at console_log.ts
536-537, wasic.ts 15143-15148, 15443, 18694-18696, 1545-1547; duplicated `-Oz` code in
`watToOptimisedWasm` vs `binaryenOptimize`.

Classified 2026-09-28 from each entry's own text; re-tally whenever an entry is added or closed.

## H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 10 silent tool defects, ~44 loud, CONFIRMED BY RUNNING

**Class:** SILENT-WRONG / LOUD per row · **Status:** OPEN · **Scope:** compiler and tools

Four parallel read-only auditors (owner: item 2 of 2026-10-15's list): fall-throughs / silent stubs
(87 probes), codegen in wasic (144), wasic ↔ console divergence (303 variants), and the other
source files + the CLI + dead code. Every row was RUN: `scripts/phase0/verify_repros.ts` on the
copied repros reads 50 / 50 DIFFER in `scripts/phase0/round2/silent-wrong/` and 63 / 63
COMPILE- or RUN-FAIL in `round2/loud/` (files named `<row>_<probe>.ts`); the tool rows have
their inputs in `round2/tools/` (`.wat` / `.wit` there are inputs, force-added past .gitignore).
De-duplicated across auditors. Fix order: silent first (owner's standing order), the tool rows that
overwrite user files (sw113) at the top.

**Silent-wrong, compiler** (native → compiled):

| id | defect | root cause |
| --- | --- | --- |
| ~~sw76~~ | ✅ FIXED 2026-10-19: a string-element join writer (`$__dynarr_join_to_scratch_str`, sized exactly by `$__strarr_join_size`), used by the console (`$__cbuf_join_str`, both paths) and by wasic's join VALUE (`$__dynarr_join_str_str`, which also closes ld80's "`string[].join` into a declaration"). Test `28_StringArrayJoinSearch`. Was: `string[].join(sep)` and a string array in a template print pointer and length (`a-b` → `260-1`) | console `joinarr` segment never checks `isStringArr` (console_log ~1500) |
| ~~sw77~~ | ✅ FIXED 2026-10-19 (with sw78, sw79): `emitSpreadArrayInit` starts EMPTY and takes every part in order: `...x` is a concat (a copy), a plain part a push (strings by (ptr, len), struct literals as push does); `spreadLiteralDecl` parses the literal bracket- and quote-aware at all three sites (`[b[0], ...a]` was cut at the first `]` and missed). A spread of anything but an array variable, an i64 spread, or a literal not the whole initializer is refused (`28_SpreadOfExpressionRefused`; a spread of a call was already an unclear compile failure). Test `28_SpreadLiterals`. Was: a spread literal drops its plain elements (`[...a, ...b, 5]`, `[0, ...a, 7]`) | wasic ~13172 keeps only `...` parts |
| ~~sw78~~ | ✅ FIXED 2026-10-19 with sw77 (`13_RestAndSpread`'s golden shows it: `merged` / `abc` were `local.set` to `a`). Was: `[...a]` aliases `a` (a push / store through the copy changes `a`) | `emitSpreadArrayInit` ~7038 `local.set` of the first spread |
| ~~sw79~~ | ✅ FIXED 2026-10-19 with sw77 (8-byte `concat_f64` for string arrays, a module-global string array's `isStringArr` honoured). Was: a spread of string arrays copies 4-byte slots, not (ptr, len) pairs | ~7023 picks `concat_i32` |
| ~~sw80~~ | ✅ FIXED 2026-10-19: one normalisation, `relIndexWat` (negative counts from the end, then clamp to [0, len]), in the numeric and string-array slice helpers. Test `28_RelativeIndexMethods`. Was: array `slice` with a negative index clamps to 0 (`slice(-2)` is the whole array) | `$__dynarr_slice_*` ~18159, string-array slice ~18193 |
| ~~sw81~~ | ✅ FIXED 2026-10-19: `$__str_slice` normalises as JavaScript (no other caller relied on substring's clamping; the console hands `.slice` to wasic). Test `28_RelativeIndexMethods`. Was: string `slice` with a negative index (`"hello world".slice(-5)` is the whole string; `slice(1,-1)` is `""`) | `$__str_slice` ~19009 has substring semantics |
| ~~sw82~~ | ✅ FIXED 2026-10-19 with sw80 (`relIndexWat`). Was: array `fill` with a negative start / end clamps to 0 | ~18502 |
| ~~sw83~~ | ✅ FIXED 2026-10-19 with sw80 (`relIndexWat`; the helper had no clamping at all). Was: typed-array `fill` with a negative start does nothing | `$__ta_fill_*` ~17848 |
| ~~sw84~~ | ✅ FIXED 2026-10-19: splice is ONE helper per slot width (4 / 8 bytes): it normalises idx and count, moves the tail to open a gap of N slots (growing the array), leaves idx in `$__splice_at`, and returns the array pointer (re-stored, as push does); the caller stores the items there (scalars, strings, struct literals). A missing count removes to the end. An item that READS the spliced array is refused (it would read it changed): test `28_SpliceItemReadsArrayRefused`. Test `28_RelativeIndexMethods`. Was: `splice` drops insertion arguments; a one-argument `splice(i)` removes one element | ~13960: only args 0 and 1, count defaults to 1 |
| ~~sw85~~ | ✅ FIXED 2026-10-19 with sw84 (with ld47). Was: `splice` with a negative index removes the last element | `$__dynarr_splice_*` ~18775 (no normalisation; ld47 is its trap) |
| ~~sw86~~ | ✅ FIXED 2026-10-19 in an f64 context (a `select` maps the helper's -1 to NaN); an `i32` slot keeps -1 until the owner's sw119 store rule is built (NaN does not fit an i32). Test `28_MethodEdgeCases`. Was: `charCodeAt` out of range gives -1, not NaN (`isNaN(s.charCodeAt(9))` false) | ~19222 |
| ~~sw87~~ | ✅ FIXED 2026-10-19 (the owner's rule 2): `sort_T` (a bare sort of an i32 / f64 / f32 / bool array) compares `String(a)` with `String(b)` (`$__numstr_gt_T`, two 32-byte buffers per call), as JavaScript; a comparator still decides. dynrt keeps its own documented numeric default (a separate runtime, not wasic). Test `28_SortDefaultStringOrder`. Was: a bare numeric `sort()` sorts numerically; JavaScript sorts as strings (`1,10,100,9`). **Owner 2026-10-19: follow JavaScript** (a JS function does what JS intends) | `sort_<T>` ~10191 / ~14152 (dynrt documents the deviation, wasic does not) |
| ~~sw88~~ | ✅ FIXED 2026-10-19: one part per byte (`"".split("")` is `[]`; a multi-byte character splits, as everywhere the helpers index bytes). Test `28_MethodEdgeCases`. Was: `split("")` gives the whole string as one part | ~19550 "treat as no-split" |
| ~~sw89~~ | ✅ FIXED 2026-10-19: `reduce1_T` (expression and statement forms) starts from element 0 and folds from 1; an empty array traps (JavaScript throws). Test `28_MethodEdgeCases`. Was: `reduce` with no initial value starts the accumulator at 0 (a product is 0) | ~10234 `zeroOf` |
| ~~sw90~~ | ✅ FIXED 2026-10-19: `find_T` sets `$__nullable_ret_flag` (1 found, 0 not); a nullable declaration / reassignment from `x.find(…)` reads it into its `__null`, and console's "undefined" print tests that flag. A NON-nullable `const f: i32 = xs.find(…)` (a TypeScript type error) keeps the sentinel. Test `28_MethodEdgeCases`. Was: `find` returns a sentinel: a found -1 reads as undefined, a miss is not `=== undefined` | ~18299 |
| ~~sw91~~ | ✅ FIXED 2026-10-19: the empty-match step copies the byte it steps past (`-a-b-c-`); bytes, not UTF-16 units. Test `28_RelativeIndexMethods`. Was: `replaceAll("", x)` loses the original characters (`abc` → `----`) | ~19415 skips the byte |
| ~~sw92~~ | ✅ FIXED 2026-10-19: an empty pad returns the string unchanged (a missing pad is still a space, from the call site). Test `28_RelativeIndexMethods`. Was: `padStart` / `padEnd` with an empty pad pads with memory bytes | ~19451, ~19492 force `padlen` 1 |
| ~~sw93~~ | ✅ FIXED 2026-10-19 (with ld51): `$__f64_to_str_radix`, a port of V8's DoubleToRadixCString (fraction digits to the half-ulp, round-half-even with carry, zeros past 2^53, exact i64 remainders below), emitted only when used; NaN / ±Infinity texts. Matches Deno on 12 values × 4 radixes. Test `28_MethodEdgeCases`. Was: `x.toString(radix)` of an f64 truncates to i32 (`255.5` → `ff`) | ~7742 (ld51 is its trap) |
| ~~sw94~~ | ✅ FIXED 2026-10-19: `includes` on a float array uses `sameval_T` (equal, or both NaN); `indexOf(NaN)` stays -1 (`===`). Test `28_MethodEdgeCases`. Was: `includes(NaN)` false on an f64 array (SameValueZero) | ~10110 = `indexOf != -1` |
| ~~sw95~~ | ✅ FIXED 2026-10-19 (the owner's rule 1): `arrOobTestWat` is the out-of-range test (`index >= length`, unsigned; `at()` normalises a negative index first; a literal index into a STATIC array is decided at compile time), used by `nullTestWat`, so `a[i] === undefined`, `a[i] ?? d`, a `T \| undefined` declaration / return from `a[i]` all see it; console.log prints `undefined` through the null printer (a float element keeps its `-0`; not for i64, whose template drops the `n`, nor f32, whose template is not built: the first try broke `9_F32Containers`). A plain numeric READ out of range (`a[9] + 1`) still reads past the array: no `undefined` value exists in an i32 / f64 (sw119's store rule is the place for it). Found with it: `inferExprType` typed `a.at(i)` as f64 (an i32[]'s `${a.at(1)}` was an invalid module). Test `9c_ArrayOutOfRangeUndefined`. Was: an out-of-range array read / `at()` is never `undefined` (`a[5] === undefined` false). **Owner 2026-10-19: give `undefined`, as for strings; a float array index keeps D3's conversion** | design-decisions.md § "Owner's rulings of 2026-10-19" |
| ~~sw96~~ | ✅ FIXED 2026-10-19: console `!` / `~` apply only with no top-level binary operator (`hasTopLevelBinaryOp`, as unary minus). Test `7i_ConsoleUnaryBoolStringFields`. Was: console: `!` and `~` take the whole binary expression (`!a && b` is `!(a && b)`, `~n + 1` is `~(n + 1)`), also in templates / concats | console_log ~3010, ~3027 lack unary minus's `!hasTopLevelBinaryOp` guard |
| ~~sw97~~ | ✅ FIXED 2026-10-19 (with ld65): a parenthesised left operand is f64 / i64 when its contents hold a KNOWN float / bigint (a float literal, a name declared f64 / f32 / i64); not inferExprType's f64 fallback, which turned `((z + 5) % 7) + 6` of i32s into float arithmetic (the date bundle's golden caught it). Test `4k_LastSilentRows`. Was: a declaration comparing parenthesised floats truncates both to i32 (`(z / 2) === (z / 2.5)` true) | wasic ~11636 `lhsType` falls back to `defaultType` for a `(` lead (ld65: NaN traps) |
| ~~sw98~~ | ✅ FIXED 2026-10-19: a string struct field (`p.s`, `ps[i].s`) is a string to the console's string ternary and to wasic's `isStringExpr`; `emitStringPtrLen` builds a string ternary and a string `a ?? b` (by the value's null flag); a template part that is a string ternary is one multi-value. So the ternary prints its text in console.log, in templates and in declarations (refused before). `??` on a `string \| null` FIELD is REFUSED (`7i_NullishStringFieldRefused`): such a field has no null representation (sw120). Test `7i_ConsoleUnaryBoolStringFields`. Was: console prints a string POINTER for a string `??` or ternary over struct string fields (`q.s ?? "none"` → `268`) | console numeric path |
| ~~sw99~~ | ✅ FIXED 2026-10-19: before `?.` is stripped, `rewriteOptChainNullish` turns `a?.b ?? d` (the chain the whole left operand, `d` simple) into `(a === null ? d : a.b ?? d)`, one null test per `?.`; inferExprType types a conditional by both branches and the console types a parenthesised numeric conditional through wasic. A bare `a?.b` as a VALUE still reads through (no `undefined` to give). Test `4k_LastSilentRows`. Was: `a?.b ?? d` with `a` null reads through the null pointer: `0`, not `d` | wasic ~21749 rewrites `?.` to `.` (README documents it; the result is silent) |
| ~~sw100~~ | ✅ FIXED 2026-10-19 (with ld58): wasic's emitExpr takes `<string-valued call>.length` from the call's (ptr, len) through `$__str_op_*`; the declaration was refused and the console sum printed 2. Test `4k_LastSilentRows`. Was: console `s.toUpperCase().length + t.length` is `2` | console |
| ~~sw101~~ | ✅ FIXED 2026-10-19: `rhsKnownFloat` also takes a declared float ELEMENT (typed-array / f64[]) or FIELD. Test `4k_LastSilentRows`. Was: an `Int32Array` element plus a `Float64Array` element truncates the float (declaration) | wasic `rhsKnownFloat` ~11733 (ld56 is the console's) |
| ~~sw102~~ | ✅ FIXED 2026-10-19: the console's dot-call path prints a top-level comparison as a boolean (`isTopLevelComparison`); `inferExprType` types a top-level comparison `bool` whatever leads it (`ps[0].x > 1` took the array's element type). Found with it and fixed: a string compared through any string method or against a string LITERAL (`s.toLowerCase() < "b"`) compared numbers in the console and was refused in a declaration. Test `7i_ConsoleUnaryBoolStringFields`. Was: console prints booleans as `0` / `1`: `s.toUpperCase() !== "ABD"`, `a.slice(0,2) === b.slice(0,2)`, `ps[1].ok \|\| ps[0].x > 1` (sw75's class) | console boolean detection |
| ~~sw103~~ | ✅ FIXED 2026-10-19: after a leading `-` / `~` / `(`, a `struct.field` lead takes the field's type (i64 → the bigint printer). Test `7i_ConsoleUnaryBoolStringFields`. Was: console `-h.big` (a bigint field) prints without `n` | console i64 lead detection |
| ~~sw104~~ | ✅ FIXED 2026-10-19: `parseModuleGlobals` and the module-array pass take only depth-0 declarations (`braceDepthOf`); a block's declaration stays a `_start` statement, re-run each pass. Shadowing: with sw105. Test `5e_BlockScopedDeclarations`. Was: a top-level `let` / `const` inside a block becomes a module GLOBAL and its declaration is dropped: not re-initialised per loop pass; an inner block's `const x` overwrites the outer `x` | `parseModuleGlobals` ~3991 has no brace-depth check |
| ~~sw105~~ | ✅ FIXED 2026-10-19: `renameShadowingDecls` (before parseModuleGlobals, per function with its params, and on the top level) renames a `const` / `let` that shadows an enclosing scope's name to `x__blkN` for its block's extent; references are rewritten outside strings (template `${}` included), skipping members, object keys and break / continue labels, and expanding shorthand (`{ x }` → `{ x: x__blk1 }`). Code that does not shadow is unchanged (no golden moved). Not covered: destructuring declarations, `var`, catch variables (catchVarShadows has its own path); a bare `{ … }` block is still refused (loud). Test `5e_BlockScopedDeclarations`. Was: inside a function, a block's `const x` overwrites the outer `x` (`1 50` → `50 50`) | function locals are flat by name |
| ~~sw106~~ | ✅ FIXED 2026-10-19: finally is emitted FIRST and kept on `finallyStack` (with the controlStack depth at its try) while the try and catch bodies are emitted. A `return` runs every enclosing finally after its value is evaluated (`(return (block (result T) X FIN))`, emitStatement); a `break` / `continue` (labeled too) runs the ones entered after its target loop, innermost first; the catch body sits in its own `try_table (catch_all_ref …)`, so a throw from it runs finally and re-throws. Refused: a string return through a finally that calls a string-returning function (the `$__str_ret_*` globals would be overwritten; `15_FinallyStringReturnRefused`, which the old compiler built). The same day (owner: "I do want the one finally case fixed"): a throw FROM finally leaves the whole try statement. The fall-through copy moved after the `try_table` (it was inside, so the try's own catch caught it); each copy run by a return / break / continue is in a `try_table (catch_all_ref $__fin_escN)` branching to an escape block around the statement that re-throws outward (emitted only when an exit used it). Was "3 1013" for "3 11": the inner catch ran, then finally again. Test `15_FinallyOnEveryExit`. Was: `finally` is skipped when try / catch leaves by `return`, `break` / `continue`, or a throw from `catch` | try emission ~16920 inlines finally on fall-through only |
| ~~sw107~~ | ✅ FIXED 2026-10-19: `$__dynarr_indexof_string` compares text (`$__str_cmp`); a needle that is not a string variable or literal is refused. Test `28_StringArrayJoinSearch`. Was: `string[].indexOf` / `includes` return wrong indices | ~10104 has no string-array path |
| ~~sw120~~ | ✅ FIXED 2026-10-19: a null string field is the 0 pointer, the pointer-field convention (sw51): the static layout stores (0, 0) for `null` / `undefined`; `emitStringFieldStore` stores a string into a field (assignment, run-time literal, `fieldStore`), `null` as (0, 0) and anything else built as a string (concatenations through emitStringAssign); `nullTestWat` tests a string field's pointer, so `=== null`, `??` (no longer refused) and a nullable ternary branch work; console.log prints `null`. Found with it and fixed: ANY string field assignment (`p.s = "x"`) and a string field in a run-time struct literal were refused (emitted as numbers). `7i_NullishStringFieldRefused` replaced by `24_NullableStringFields`. Was: FOUND 2026-10-19 with sw98: a `string \| null` FIELD has no null representation: `{ s: null }` stores the TEXT "null", so `r.s === null` is `false` and `${r.s}` prints `null` by accident. `??` on such a field is refused meanwhile. The nullable gaps (next-work item 5) | struct literal / field init stores `null` through emitStringPtrLen |
| ~~sw121~~ | ✅ FIXED 2026-10-19 (the same day): `allocStructArrayElems` lays out a STATIC struct variable element as its address (JavaScript's same object: `p.n = 9` shows through `ps[0]`); a run-time one is refused, pointing at push. Test `4k_LastSilentRows`. Was: FOUND 2026-10-19 with sw98: a struct VARIABLE as an element of a struct-array literal loses its string fields (`const ps: P[] = [p, …]`: `ps[0].s` is ""; a literal element is right) | static struct-array literal layout |
| ~~sw108~~ | ✅ FIXED 2026-10-19: parseModuleGlobals registers a promoted string-enum-typed module variable in stringEnumVars (the _start pre-scan never saw the dropped line). Test `4k_LastSilentRows`. Was: a top-level string-enum-typed variable prints its tag (`1` for `DOWN`); in a function it is right | top-level `stringEnumVars` registration |

**Silent, tools** (all exit 0):

| id | defect | where |
| --- | --- | --- |
| ~~sw109~~ | ✅ FIXED 2026-10-19: `wasmmerge.dataExtent`, THE one data-extent reader (any offset bracketing, every string piece, named escapes counted once), replaces wasmbundle's own regex. Test `tests/merge_layout_tests.ts`. Was: `wasmbundle` seats every module's data at the same address (the second library's bytes read from the first's address) | `getDataMaxEnd` ~wasmbundle.ts:143 misses binaryang's `(offset (i32.const N))` form |
| ~~sw110~~ | ✅ FIXED 2026-10-19: the next base is the HIGHEST of the library's data end (`dataExtent`), its exported `__heap_ptr`, and (as before) a mutable i32 global 0, 8-aligned; no 260 fallback. 46 pipeline goldens moved, each ONLY `$__heap_ptr`'s initial value, up 2–4 bytes (the alignment). Test `tests/merge_layout_tests.ts`. Was: a wasic merge seats the heap INSIDE a merged library's data (`79 79 200` → `79 7 200`) | wasic.ts ~23103 advances by global 0's init, not the data extent |
| ~~sw111~~ | ✅ FIXED 2026-10-19: `exportFuncMap` holds EVERY name of an index; the first names the function, each other name is a forwarder (`call` of the first), and every name maps to it. Bundle and wasic merge both. Test `tests/tool_rows_tests.ts`. Was: a function exported under two names keeps only the last | `exportFuncMap` by index, wasmmerge.ts ~457 |
| ~~sw112~~ | ✅ FIXED 2026-10-19 as a REFUSAL: two files of one program declaring the same top-level value name (`function` / `const` / `let` / `var` / `class` / `enum`) stop with "the top-level name 'x' is declared in both …" (tsbundler step 6). Prefixing private names safely needs a parser (object keys, interface fields, shorthand share the spelling); `type` / `interface` repeats are allowed (`type i32 = number` everywhere). wasic no longer words every bundler error "Cannot read". Test `tests/merge_layout_tests.ts`. Was: the bundler does not prefix a file's PRIVATE top-level names, so they collide with the entry's (`6 100` → `200 100`) | tsbundler.ts ~661 renames exports only |
| ~~sw113~~ | ✅ FIXED 2026-10-19: one helper, `src/outpath.ts` (`defaultOutPath` replaces a known extension in any case, else APPENDS the new one; `assertNotInput` / `samePath` refuse any write that resolves to the input, an explicit `-o` included, case-insensitively on Windows), used by convert, wasm2js, tsbundle, bindgen, jstyper (its `.d.ts` path too) and wasic's `.ts` / `.wat` / library compiles and their sidecar `.wat` / `.wit`. Test `tests/outpath_tests.ts` (12 cases; all 12 fail on the old code, 10 of them destroying the input). Was: **default output paths can overwrite the INPUT** (`convert lib.bin`, `wasm2js`, `tsbundle entry.mts`, `bindgen H2.WIT`, `jstyper calc.mjs` empties the source) | unanchored / case-sensitive extension replaces: utils.ts:531, :503, main.ts:428, bindgen.ts:649, jstyper.ts:345, :370, :333 |
| ~~sw114~~ | ✅ FIXED 2026-10-19 with sw113: `compileWasi` checks `compileWat`'s result and exits 1. Test `tests/outpath_tests.ts`. Was: `wasmtk wasic broken.wat` exits 0 after "unknown operator" | `compileWasi` ignores `compileWat`'s result, wasic.ts ~23333 |
| ~~sw115~~ | ✅ FIXED 2026-10-19: `run` passes the arguments after the target; `args_get` / `args_sizes_get` give `[basename, …args]` (UTF-8, NUL-terminated); the library-call branch (`run lib.wasm fn 1`) is reachable. Test `tests/tool_rows_tests.ts`. Was: `wasmtk run x.ts one two` drops the arguments; WASI `args_sizes_get` is 0; the library-call branch is unreachable | main.ts:390 passes `[]`; utils.ts:146 |
| ~~sw116~~ | ✅ FIXED 2026-10-19: a non-numeric argument exits 1 with "'abc' is not a number", in `mod` and `run`'s library call. Test `tests/tool_rows_tests.ts`. Was: `mod lib.wasm add abc 5` turns `abc` into 0 | utils.ts:437 (also `runWasi` :299) |
| ~~sw117~~ | ✅ FIXED 2026-10-19: the output path is resolved against the working directory before the toolchain runs (`cwd: baseDir`), and `report()` checks the artifact as zigwasic's does (missing or empty: `success: false`). Test `tests/tool_rows_tests.ts` (needs TinyGo; skipped and said so without it). Was: Go `build -o out/x.wasm` (relative) writes beside the SOURCE and reports success at the given path | gowasic.ts ~203/241/426 unresolved; `report()` ~573 unchecked (Zig's was fixed 2026-08-24) |
| ~~sw118~~ | ✅ FIXED 2026-10-19: the first export keeps a WIT name, a later one kebabing to it is listed as `// skipped export foo_bar: its WIT name 'foo-bar' is already fooBar's`; `witPackageName` makes the package a WIT identifier (`2048` → `m2048`). The orphaned doc comment at witgen.ts:35 went with it. Test `tests/tool_rows_tests.ts`. Was: `witgen` writes duplicate exports (`fooBar`, `foo_bar` → `foo-bar` twice); package names unchecked (`local:2048`) | witgen.ts ~98, ~86 |
| ~~sw122~~ | ✅ FIXED 2026-10-21: `$__dec_to_f64` converts a decimal literal CORRECTLY ROUNDED, for `parseFloat`, `Number(string)` and `parseInt` (radix 10): an exact fast path (≤ 19 significant digits in w, no nonzero digit dropped, w ≤ 2^53, \|e\| ≤ 22: one multiply / divide by an exact 10^\|e\|), out-of-range straight to ±Infinity / ±0, else exact big-integer division over every digit (u32 limbs in a `$__malloc` block: N / T scaled to a 54–55-bit quotient, the remainder as the sticky bit, ties to even, subnormals shifted first). parseFloat also takes `[+-]Infinity` (it was NaN) and an `e` only with digits after it. Probe: 4,078 values (edge cases + random literals of up to 30 digits, exponents ±350) identical to Deno; the old compiler differed on 263 of 483. dynrt's interpreter reads literals with `parseFloat`, so `caps_bytes.ts` was re-embedded (dynrt +1,716 bytes). Test `53_NumberParseRounding`. Was (found with ld60, 2026-10-20; the same on main): `parseFloat("0.123")` was `0.12300000000000001`, `"3.14159"` `3.1415900000000003`, `"1e-7"` `1.0000000000000002e-7`, `"1.7976931348623157e308"` `1.7976931348623145e+308` (`$__parse_float` added digit / 10ⁿ) | wasic `emitNumParserHelpers`, `emitDecToF64Helpers` |
| ~~sw123~~ | ✅ FIXED 2026-10-22 (found with ld64, 2026-10-20): a `T \| undefined` local holding `undefined` prints `null` (`const n: i32 \| undefined = undefined; console.log(n)`); one flag holds null and undefined alike. A string's `s.at(10)` "undefined" text prints right. The `__null` flag is now a KIND: 0 value, 1 null, 2 undefined (literals, reassignment, a module global's start; `find()` / `pop()` / an out-of-range read give 2; a nullable function's empty result takes its declared `T \| undefined` or `T \| null`, `nullableFuncReturnKind`). Printing (single argument and `nullPrintRewrite`) and `===` / `!==` (`nullKindIs`, folded for a constant or an out-of-range test) tell them apart; `==`, `??` and truth tests are unchanged. A string's test and a field's flag word still only say "nullish" (`nullTestIsKind`). 9 goldens moved, reviewed. Test `24_NullVersusUndefined` (failed on the old compiler) | wasic nullable locals |
| ~~sw124~~ | ✅ FIXED 2026-10-20 (found with ld57; the same on main): `console.log(new Box(1, 2).isBig())` printed `0` for `false`: the console's dot-call lookup typed a `new C(…).m(…)` chain as i32. It takes m's result type now (both lookups, console.log and console.error). Test `4l_MixedOperandTypes` | wasic dotCallLookup |
| ~~sw125~~ | ✅ FIXED 2026-10-20 with ld53: `s.at(i)` out of range read past the text (length 1, a garbage byte; `` `[${s.at(5)}]` `` printed `[u]`). All four at() paths (declaration, concat, comparison operand, console) go through `$__str_index`: "undefined", as `s[i]`. Test `28_ArrayCallbackEdges` | wasic / console_log string at() |

**Loud, compiler** (`round2/loud/`): ~~ld47~~ FIXED 2026-10-19 with sw84 (the count is clamped) `splice(3, 10)` traps (count unclamped); ~~ld48~~ FIXED 2026-10-20 `pop()` of
an empty array traps (now `popn_T` / `shiftn_T`, flag-reporting, where the value is dropped or nullable; a
plain numeric use still traps, loud); ~~ld49~~ FIXED 2026-10-20 an f64 comparator in `sort` (signature
mismatch; `sortcmp_T_<result>`); ~~ld50~~ FIXED 2026-10-20 `flat()` on 1-D (a `slice(0)` copy now)
; ~~ld51~~ FIXED 2026-10-19 with sw93 `(2**32).toString(16)` traps; ~~ld52~~ FIXED 2026-10-20 `string[].sort()`
(`$__str_cmp` undefined); ~~ld53~~ FIXED 2026-10-20 `s.at(9)` (IR error: a `string | undefined` local
undeclared; and the at() itself read past the text, sw125); ~~ld54~~ FIXED 2026-10-20 a struct FIELD operand never converted
(`p.n * p.x`, `p.x > p.n`, `Math.max(p.n, p.x)`, 2-D mixed compare: invalid modules, declaration
path; emitExpr converts an i32 NUMBER to an asked-for f64, never a pointer, `isI32Number`);
~~ld55~~ FIXED 2026-10-20 console unary minus of an i32 element / a 2-D row's `.length` in a sum; ~~ld56~~ FIXED 2026-10-20 console
`ia[1] + fa[1]` (`hasFloatElem`); ~~ld57~~ FIXED 2026-10-20 a getter returning f64 compared in a method (`i32.gt_s`;
`classMemberType`); ~~ld58~~ FIXED 2026-10-19 with sw100 console
`.length` of a method result (with ld43, ld46); ~~ld59~~ FIXED 2026-10-20 console bigint operands in f64 ops; ~~ld60~~ FIXED 2026-10-20
`Number(stringVar)` (`$__str_to_number`, JavaScript's ToNumber of a string; it rides on sw122's parser);
~~ld61~~ FIXED 2026-10-20 console `reduce` returning f64; ~~ld62~~ FOUND FIXED 2026-10-20 console `s.length > 2 && arr[1] > 1`;
~~ld63~~ FIXED 2026-10-20 console `nm() < s` (bad local); ~~ld64~~ FIXED 2026-10-20 a nullable string local (`$s_ptr` unresolved;
prints `null` / its text); ~~ld65~~ FIXED 2026-10-19 with sw97 a NaN
parenthesised compare traps (sw97); ~~ld66~~ FIXED 2026-10-22 `1e-7 * 1.5` in a declaration (the `-` of the exponent
splits; `isLiteralExponentSign` in findBinaryOp); ~~ld67~~ FIXED 2026-10-22 console `n ** 2` of an i32 (`**` makes it a float); ~~ld68~~ FIXED 2026-10-22 console `typeof b === "boolean"` (wasic's compile-time boolean); ~~ld69~~ FIXED 2026-10-22 console
`x > 1 || s === "q"` (splits at `===` first; the string comparison waits for `&&` / `||` / `??` / `?:`); ~~ld70~~ FIXED 2026-10-22 `users[0].name.length` in a declaration (with ld43); ~~ld71~~ FIXED 2026-10-22
`++` / `--` as a value (console and declaration; `while (m-- > 0)`; `incDecParts`: a number local or
module global, prefix `local.tee`, postfix the old value; the scanners no longer take `++` / `--` for
`+` / `-`); ~~ld72~~ FIXED 2026-10-22 compound assignment / `++`
on an array element or element field (`arr[i] += 1`, `ps[1].x += 5`; README claims support; written
out as `X = X op E`, an index with a side effect refused; a string element's store of a concatenation
goes through `emitStringFieldStore`);
~~ld73~~ FIXED 2026-10-22 one-line `do { … } while (…)` (and a brace-less `do x; while (…);`); ~~ld74~~ FIXED 2026-10-22 classes: inherited getter
(`getterFunc` walks the inheritance chain, at the expression, `this.`, classMemberType and four
console sites), `return this` (`this` is `$__self`; a chained call on a method's result types its
receiver by the method's declared return class, `classOfExpr`, in expression and statement form,
and `const again: C = c.bump()` is an instance), a method
returning string (through `$__str_ret_*`, as a function does), `super()` with no base constructor
(the nearest ancestor that has one; none: a no-op), a struct alias's field store (`const q: P = p`
is the same struct, its pointer in a local), ~~generic and~~
abstract classes (`abstract` stripped in a pre-pass, abstract members declarations only; a call
dispatches on the class tag, `emitTagDispatch`, Phase 47's array-element dispatch made general);
generic classes are **ld100**, OPEN: `class Box<T>` / `new Box<i32>(7)` is "Unsupported statement"
(classes are not monomorphized as functions are); ~~ld75~~ FIXED 2026-10-20 callbacks: a generic function's callback (`funcTypeVars` re-seeded
per function), `map((x, i) => …)` (signature mismatch; `<method>_<T>_ix` helpers for forEach, map,
filter, find, findIndex, every, some; a third parameter is refused); ~~ld76~~ FIXED 2026-10-22 destructuring from a call, a tuple holding a string
(`destructSourceDef` / `destructSource`: a struct variable or a struct- / tuple-returning call,
evaluated once into `$__destr_src`, in the three pre-scans (the start body had no object one) and
both emitters; a tuple's string element stored by emitStringFieldStore and read by
emitStringPtrLen, `isStringExpr`, `inferExprType` and console.log); ~~ld77~~ FIXED 2026-10-22 a string literal in
expression position (`"abc" > "ab"`: a literal LEFT side compares as a string; nested string
ternary: emitStringAssign split at the LAST `?`, now splitTernaryTop; object with a string and a
function field: the lifting guard refused every arrow after a `:` on a declaration line, now only
the annotation's own colon, and a declared literal of an interface with function fields builds
closure factories as a returned one does, dispatched through `interfaceOf`); ~~ld78~~ FIXED 2026-10-22 ~~a default parameter using an earlier one~~ (FIXED 2026-10-22, `bindDefaultParam`: the
earlier arguments substituted at the call site, a side-effecting one refused), ~~`for (let i = 0, j =
10; …)`~~ (FIXED 2026-10-22: `splitForInit` in both pre-scans and all three `for` emitters, a comma
list of updates in `emitUpdate`, each declarator counter-checked), ~~chained
`filter().map().reduce()`~~ (FIXED 2026-10-22: a non-chain method on a chained receiver evaluates
it once into `$__chain_arr`, registered as a dynamic array of the chain's type, and goes through
the one-array path; reduce, find, at, indexOf, lastIndexOf, includes, every, some, findIndex),
~~a function array called through a local~~ (FIXED 2026-10-22: the top-level arrow pass stripped
the annotation of `const f: () => i32 = fns[i]`, now only of an arrow initialiser; a
function-type alias on a local (`const f: Fn`) and an empty alias array (`const fns: Fn[] = []`)
expand to the inline forms in a pre-pass; a function-array element is a valid initialiser); ~~ld79~~ FIXED 2026-10-22 `for…of` over class /
struct arrays (documented limit; virtual dispatch inside it) (`registerForOfInstance`: the item is
a class or struct instance in both pre-scans; a call on an instance held in a local, a parameter,
a `for…of` item or a method result, dispatches on its tag when a subclass overrides the method, a
static `new X` instance stays a direct call);
**sw126** FIXED 2026-10-22 (found with ld79; the same on main): a base method calling an
overridden one through `this` (`describe() { return this.area() + 1 }`), or a call on a base-typed
PARAMETER (`function areaOf(s: Shape) { return s.area() }`), ran the BASE's version: "1 0" for
JavaScript's "10 9" (`needsTagDispatch` / `emitTagDispatch`; one golden moved,
`16_DeepGenericConstraintResolution`, its parameter call now dispatches, the same output); ~~ld80~~ FIXED 2026-10-22 missing methods: `substring`
(`$__str_substring`, clamped and swapped), `lastIndexOf` (string `$__str_lastindexof`, array
`lastindexof_T` with `from`), `splice` as a value (the removed elements via the slice helper from
the normalised start and clamped count, a side-effecting start / count refused),
`(e as Error).message` (a cast of a name to a capitalised type before a member access is stripped
in a pre-pass), ~~`string[].join` into a
declaration (README says assignable)~~ (done 2026-10-19 with sw76).
Found 2026-10-20 (all the same on main): ~~ld91~~ FIXED 2026-10-22 a MULTI-LINE arrow callback at top level,
`xs.forEach((x) => {` … `});`, is "Unsupported statement: });" (`joinMultiLineArrowArgs` joins a
block-bodied arrow argument into one line, in function bodies and at top level, adding the `;` a
body line lacks); ~~ld92~~ FIXED 2026-10-22 an expression-bodied arrow
whose body is `console.log(…)` is "Unsupported expression" (an annotated `: void`, or a `console.*`
body, is no result to infer); ~~ld93~~ FIXED 2026-10-22 `for (const s of xs)` over a
`string[]` at top level leaves `$s_ptr` unresolved (an IR error) (a string-array LITERAL has
`elemType: "string"` without `isStringArr`; the `for…of` emitter and both pre-scans take either).
Found and FIXED with ld78, 2026-10-22 (all the same on main): ~~ld97~~ an untyped callback over an
`f64[]` took i32 parameters, "function signature mismatch" at run time (the lifter reads the
receiver's declared element type, a chain's from its base); ~~ld98~~ an f64 call through a
function variable in console.log was typed i32, an invalid module (`watResultType` reads a
`call_indirect`'s table type, and both console fallback resolvers use it); ~~ld99~~ array methods on
a numeric array PARAMETER (`v.reduce(…)`, `v.forEach(…)`) were refused (a parameter is not
dynamic so that a push cannot move it under the caller; the non-growing methods accept it).
Found 2026-10-22 (all the same on main), OPEN: ld95 a LITERAL array of functions,
`const ops: Op[] = [add, mul]`, is not a function array (`const f: Op = ops[i]` is "Unsupported
function-typed initialiser", `console.log(ops[0](1, 2))` a console refusal; `Array<Op> = []` and
`push` work); ld96 an array-method callback that CAPTURES a local (`v.forEach((x) => { n += x; })`
in a function, or a top-level `let` the lifter treats as captured) was an invalid module, now
refused with a message (the helpers call a bare table index; a closure needs its environment).
A `string[]` callback (`names.forEach((s) => …)`) is refused likewise (no helper passes a
(ptr, len) element; it was refused before as well).

**Loud, tools** (`round2/tools/`): ~~ld81~~ FIXED 2026-10-22 `wasmbundle` ignores `hasMutableGlobals` (a cursor moved
to 131072 in a 1-page bundle: out of bounds) (the bundle keeps the largest memory a module
declared, and wasic's 3-page floor for a module with mutable globals); ~~ld82~~ FIXED 2026-10-22 `bindgen` host imports with a camelCase method
never link (`display_show_value` vs `display_showValue`) (a WIT name is lower-kebab, so the module's
spelling is lost; the binding's `env` is a Proxy that finds an import by its name with case, `_`
and `-` ignored); ~~ld83~~ FIXED 2026-10-22 the deno binding cannot load a
relative path (`fetch(String(source))`), and a typed-array view ignores byteOffset (a path or a
`file:` URL is read from disk, only http / data / blob URLs fetched; a view is passed to
`instantiate` as given, in all three runtimes, since a Node `readFileSync` Buffer's `.buffer` is
the shared pool too; `tests/tool_rows_tests.ts` drives the Deno binding, and the node / bun
bindings were run under Bun by hand); 8 bindgen fixtures regenerated; ~~ld84~~ FIXED 2026-10-22 the bundler
handles neither `export class` nor `export { name }` (`class` / `abstract class` joined the
named-export rename, with a CAPITALISED prefix, `Shapes_Box`, since wasic reads `new X` by its
capital; a local `export { a, b as c };` renames each declaration and maps the exported name);
~~ld85~~ FIXED 2026-10-22 two imports with the same basename
collide (`duplicate func $util_add`) (`uniquePrefix`: the second file named `util` gets
`util_2`); both in `tests/merge_layout_tests.ts`; ~~ld86~~ FIXED 2026-10-19 (`extractForms` skips string
literals; `tests/merge_layout_tests.ts`) the merge scanners count `(` `)` inside data strings;
~~ld87~~ FIXED 2026-10-22 `mod` cannot call an i64 function (`exportCallArgs` reads the export's
parameter types: an i64 takes a BigInt, a fraction for one is refused; and main.ts keeps each
positional argument AS TYPED, since parseArgs made `9007199254740993` a Number, 2^53;
`tests/tool_rows_tests.ts`); ~~ld88~~ FIXED 2026-10-19 (the owner's rule 3: `src/wast_known_unbuilt.ts` holds each vendored
corpus file's unbuilt-module CEILING, 21 files / 94 modules, all engine / proposal gaps; a run
above a ceiling, with an unlisted unbuilt file, or with 0 files exits 1 and the summary says ❌;
`tests/wast_cli_tests.ts`) `wast` exits 0 with ✅ when modules are not built (or
on an empty directory) — **owner 2026-10-19: exit 1 unless the unbuilt module is on a known
list; 0 files always fails**; ~~ld89~~ FIXED 2026-10-22 `dync` leaves `<name>.__dync.ts` on
failure and prints errors twice (it exited inside the `try`, before the `finally` removed the
scaffold; `compileWasiTs` / `compileLibTs` printed the error and so did every caller, `wasic`
included: they now return it, the WAT's path in the message, and the caller prints it once);
~~ld90~~ FIXED 2026-10-22 bad flag values silently become defaults (`--runtime`,
`--any-policy`, `--on-conflict`, `--go-runtime`, `--go-target`), `-o` ignored by `run` / `info` /
`mod`, a missing target prints help and exits 0 (main.ts: `FLAG_CHOICES` checked after parsing,
exit 1 naming the values; `-o` refused where nothing is written, `run` of a Go / Zig / Rust
source still builds to it; a command without its target exits 1, `--help` and a bare `wasmtk`
exit 0). Both in `tests/tool_rows_tests.ts` (30).

**sw119, i32 overflow** (`65536 * 65536` → 0, Deno 4294967296): first "not counted" as the
declared-type contract; **owner 2026-10-19: the operator gives JavaScript's result, and storing a
value that does not fit an `i32` slot throws** (design-decisions.md § "Owner's rulings of
2026-10-19", rule 4). Silent today. **MEASURED 2026-10-19, built behind a switch on branch
`feat/i32-overflow-check` (commit 435769b, NOT merged; off = byte-identical):** `--i32-check` /
`setI32OverflowCheck(true)` computes `+ - *` of i32s in f64, keeps a chain exact, and checks only
the store into an i32 slot (`$__i32_fit_<op>` throws a RangeError naming the operator; the host
prints it as `Error:`); `x += e` desugars. On the 461 corpus programs that compare with Deno: 460
identical, 1 throws (`45_random-numbers`, an LCG relying on i32 wrapping: it would need wasMath's
`i32.add` / `i32.mul`); size +2.8% (about 150 B fixed per small module, +130% on the tiniest);
an arithmetic-heavy loop about 2.3× slower end to end, no change on the corpus's run time. NOT
covered yet (they still wrap with the switch on): console.log's own operator path, template
parts, `++` / `--`. Waiting on the owner: finish those and turn it on by default? **Dead code / stale, verified by grep** (cleanup, not bugs): main.ts:418-421
(`wast`'s unreachable `!target`); utils.ts:232-249 (Javy interception), :256-264 (`console.log`
UTF-16 shim), :292-307 (library-call branch: REACHABLE since sw115's fix, 2026-10-19); unused
`getImportInfo`, `v128`, `funcref`, `externref`, `applyNames` (utils.ts:33, :49-56); utils.ts:168
`fd_stat_put` is not a WASI function; stale comments wasmmerge.ts:138 (`DATA_PTR_THRESHOLD`),
wasmbundle.ts:136-142, wasic.ts:23106, modc.ts:6-10, wasic.ts:23184; orphaned doc comments
~~witgen.ts:35~~ (removed 2026-10-19), zigwasic.ts:204; main.ts:127 / :194 compute the same value.

## `modc` of a dynrt-merged library fails to assemble, exits 0, and `bindgen_tests` grades a stale binary (FIXED 2026-09-30)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-30 · **Scope:** other (the merge path, the CLI exit, a test)

**Fixed, in the recorded order:**
- **(2) exit codes.** `compileModule` (`./modc`) returns `boolean` (it returned `void`, so no caller
  could tell); `wasmtk modc` exits 1 on `false`; `hybrid.ts` needs both that verdict and the `.wit`.
  An EXIT SWEEP (every command, a missing input) then found two more commands exiting 0 on failure,
  `wasmtk info` and `wasmtk mod <file>` (`showInfo` caught and returned; it now exits 1 like
  `callExport`), and `wasmtk wasic x.js` (its input-error path returned). All 17 cases now non-zero.
- **(3) the test.** `bindgen_tests`' new `compileFixture` deletes the old `.wasm` / `.wit` first and
  needs BOTH a zero exit and a freshly written `.wasm`. Run before (1) was fixed, it read honestly:
  2 compile failures, `fnany_50` AND `hostfn_50` (both merge dynrt's host-call imports; both had
  been graded from stale binaries).
- **(1) the merge.** `wasmmerge` resolves a copied import's `(type N)` against the SOURCE module's
  type section (`inlineImportType`): dropped when the import spells its signature inline, replaced
  by the source signature when it carries only the index, refused loudly when the source has no
  such type. The recorded `internalizeDynrtHostImports` hazard no longer applies: its patterns
  tolerate both spellings since 2026-08-25, and library builds keep the host imports anyway.
  `bindgen_tests` 142/142 on fixtures built today, whose sections run the host bridge end to end
  (e.g. `getDoubler()(21) = 42`), so an empty output would show. Inversion: without the merge fix,
  127 / 2 failed, loudly. Golden-WAT 490 / 0: no corpus output changed.
- `compileModule`'s return type is a surface change: re-baselined in its own commit and reviewed
  `minor` (`void` → `boolean`; a caller that ignored the result is unaffected).

The original report, as found:

Found by H6.5a (`scripts/check_prev_tests.ts`: the previous release's tests in a FRESH clone).
`bindgen_tests` failed 12 of 142 there, all in the `fnany_50` integration, while the real repo
reads 142/142. Three linked defects, each confirmed 2026-09-30:

1. **`wasmtk modc tests/module/bindgen_fixtures/fnany_50.ts` does not assemble.** It auto-merges
   dynrt (`any` + `Function(…)`), and the merged import lines keep the dynrt MODULE'S type indices:
   `(import "env" "__host_call" (func $dynrt___host_call (type 0) (param i32 i32) (result i32)))`,
   where `(type 0)` is not that signature in the merged module; the assembler now refuses it
   ("inline function type does not match explicit type", lines 3 and 4). ⚠️ History of this very
   path: on the wabt-ts 1.4.0 attempt, stripping the `(type N)` made it compile and then produced
   EMPTY OUTPUT, because a regex in `internalizeDynrtHostImports` started matching a line it had
   been skipping (next-work.md before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`). A fix
   must check the host-import internalization, and the output, not just the assembly.
2. **`wasmtk modc` exits 0 when assembly fails** and writes no `.wasm`. SILENT-WRONG in the CLI's exit
   contract: a script or CI step calling `modc` believes it succeeded.
3. **`bindgen_tests` trusts that exit code, then reads `fnany_50.wasm` without checking it was
   rebuilt.** The real repo's copy is gitignored and dates from 2026-08-25 13:24 (its `.wat` is
   regenerated each run; today 12:53), so the suite has graded a FIVE-WEEK-OLD binary. The
   stale-artifact trap in testing.md, in a suite, for five weeks.

Not a regression since v2.0.3: v2.0.3's `bindgen_tests` and today's fail identically in a fresh
clone. When the assembly started failing (after 2026-08-25) is not bisected. Fix order: (2) and (3)
first, so the failure is LOUD and the suite cannot pass on stale bytes; then (1) with its history.

## wast: `assert_trap` passed on ANY trap, whatever its kind (FIXED 2026-09-30)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-30 · **Scope:** other (the `.wast` runner)

Found by the five-engine check of binaryang 1.8.0's custom-page-sizes lowering (next-work.md):
the lowered modules trapped with `unreachable` where the spec says "out of bounds memory access",
strict `wasmtime wast` and a plain-JS harness on JSC saw it, and our runner scored all 4 as
passes. `src/wast.ts` accepted any `WebAssembly.RuntimeError` at all three trap sites (a trapping
module instantiation, a direct invoke, the SIMD/NaN trampoline).

**Latent in the gate, measured before the fix:** every trap pass of the 288-file corpus was logged
as (expected, V8 message): 5,263 passes in 39 pairs, ALL of the right kind. So no gate number was
false; the runner simply could not have noticed a wrong one.

**Fix:** `TRAP_KINDS` maps each spec message to V8's wording, built from those 39 pairs, and
`trapKindVerdict` scores a trap `ok` (pass), `wrong` (a FAILURE naming both messages) or
`unmapped` (a labelled SKIP, never a pass). Keys match as prefixes, as the spec interpreter does
("uninitialized element 2"). One stated limit: V8 words integer overflow and NaN conversion alike,
so those two kinds cannot be told apart.

**Tests:** new `tests/wast_runner_tests.ts` with a fixture whose outcomes are planted
(`tests/wast_runner/trap_kind.wast`): right kind passes, `unreachable` for an out-of-bounds message
fails, an unmapped message skips. 4/4; the old runner fails all 4. The real case: the 1.8.0-lowered
`custom-page-sizes.wast` now reads 27 pass / 4 fail ("wrong kind … got unreachable") where it read
31/31; the 1.8.1 lowering reads 31/31. Corpus gate unchanged at 64,473 / 0 / 66, as predicted.

## wast: 24 passes rested on V8's own limitations; users now told when the engine is the reason (FIXED 2026-09-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** other (the `.wast` runner)

Owner question: can wasmtk detect V8 and say plainly when it does not implement a feature? Building
that (`src/engine.ts`: `explainEngineRejection`, `engineName`) exposed that the runner counted some
of those very refusals as VERDICTS. At `assert_invalid` it treated any `CompileError` as a pass
unless the message named an experimental flag, so a module V8 refused for a limitation of its own
passed — though V8 refuses a VALID module identically:

| file | passes | V8's reason | why not a verdict |
| --- | --- | --- | --- |
| `custom-page-sizes-invalid` | 19 → 3 | `invalid memory limits flags 0x8` | V8 does not implement the proposal at all |
| `custom-page-sizes/memory_max` / `_i64` | 1 → 0, 2 → 1 | the same | the same |
| `memory64` | 59 → 55 | above V8's 16 GiB cap | V8 also refuses the VALID 2^48-page module (the 2 existing skips) |
| `table` / `table64` | 24 → 23, 2 → 1 | initial table above V8's 10,000,000 cap | the assertion is min > max; V8 never got there |

**Deliberately kept as verdicts** (a narrower rule, measured): a 32-bit memory above 65,536 pages
(`memory.wast`, `threads/memory.wast`: 12). V8 calls 65,536 its "implementation limit", but it is the
SPEC's maximum, so V8 is enforcing the spec. And core `binary.wast`'s malformed memory-limits flag
`0x08`: core has no such flag, so V8's refusal is the malformed verdict. A first cut demoted all 39;
reading each message cut it to the 24 above. Gate: 64,458 → **64,434 passed / 0 failed / 105
skipped**, 6 files changed, each accounted for.

**User-facing:** `wasmtk run` / `mod` print `ℹ️ Not supported by the engine: V8 15.0.245.2 (the
engine in Deno 2.9.7) does not implement the custom-page-sizes proposal …` under the error; the
`wasmtk wast` summary lists each engine limitation once with its skip count; skip labels read
`not supported by the engine — <feature>`. `isFeatureGate` (flag-only) is folded into the new
module. Gate: `tests/engine_tests.ts` (11).

**Lesson (again):** a refusal is a verdict only if the refuser would ACCEPT the valid twin. Check the
valid twin (here: V8 refuses `(memory i64 0x1_0000_0000_0000)`, which is valid) before counting it.

## Phase 36 conditional types were never on the main line (RESTORED 2026-09-28)

**Class:** LOUD · **Status:** FIXED 2026-09-28 · **Scope:** compiler (+ docs)

Found by the branch audit (next-work.md § "Branch audit 2026-09-28" (before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`)). Phase 36
(`type Toggle<T> = T extends i32 ? f64 : i32`, resolved at compile time by
`expandConditionalTypes`) was built on branch `1.4.1` (a85d8bfc9b8, 2026-04-29) and **never
merged**. The README's feature table and roadmap row described it as shipped, with four named tests
and "124/124 suite"; `main` had neither the method nor the tests, and every Phase 36 program failed
to compile (`Unsupported statement: const a: Toggle<i32> = 3.5;`). Loud for a user, but the docs
claimed otherwise for five months, and no suite could notice: the tests were on the branch too.

**Fix:** the method is ported into `src/wasic.ts` at its original place in `transpile()` (after
`expandGenerics`, before `expandNamespaces`), and the four tests are in as
`tests/wasi/wasm_wasi/36_*.ts`. **Hardened on the way in:** the original rewrote a type's name
everywhere with a bare `\bName\b` replace, strings included (`"Scale is …"` → `"f64 is …"`, a
silent-wrong it would have shipped with). Declarations are now found on masked source and use sites
rewritten in code only. `36_ConditionalTypeNameInString` covers that, and was inversion-checked: it
FAILS against the original replace.

**Lesson:** a feature documented as shipped is a claim that needs a merged commit behind it. A
release branch that carries features must be merged or its README rows reverted before the next
branch starts from `main`. The branch audit found the other old branches held only version bumps,
superseded work, or the deliberately deferred `componentize` (roadmap P2).

## Landing the typed-declaration rule: two defects it exposed (FIXED 2026-09-28)

**Class:** SILENT-WRONG (one of two) · **Status:** FIXED 2026-09-28 · **Scope:** compiler

The owner's rule (design-decisions.md) made a type mandatory on every first declaration, so code
that used to reach the INFERRED declaration path now reaches the TYPED one. Two defects surfaced
while the corpus was annotated; the golden-WAT harness showed both as unexplained diffs.

1. **LOUD. An i32-returning call in an f64 context was not converted.** `total + add(1, 2)` with
   `total: number` emitted `f64.add` over a raw i32 `call` → `CompileError` at instantiate. The
   opposite direction (f64 call in an i32 context) was fixed 2026-06-30 and this mirror was never
   written. Fix: `emitExpr`'s user-call return wraps `f64.convert_i32_s` when the callee's result is
   i32-based and the context is f64.
2. **SILENT-WRONG. An annotated 2D array from a NAME became a fresh empty array.**
   `const data: i32[][] = initialRows;` went to the 2D-literal handler, which parsed `initialRows`
   as an empty literal: `data` read 0s. `12_Final_Integration_Stress` would have printed wrong
   sums; its golden WAT showed a `__malloc` where a `local.get` had been. Fix: a 2D annotation on a
   non-literal initialiser is checked for presence and then dropped
   (`stripInferableAnnotations`), so the declaration aliases the pointer through the inferred
   path, as before the rule. That path is still wrong for a CALL initialiser (sw31) and invalid for
   a NAME of another local 2D array (ld11); both are in the round-1 table. (2026-10-15: both fixed;
   the annotated handler aliases the pointer itself now, and the drop is retired.)

**Lesson:** a rule that FORCES a code path onto the whole corpus is a coverage event for that path.
Probe the forced path on the shapes the corpus used, typed AND untyped against the pre-change
compiler (`git stash` + reinstall), before annotating tests, or the annotation looks like the
regression.

## String literals with escaped quotes in two more places (FIXED 2026-09-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** compiler (the enum half was loud)

The 2026-05-31 JSON-work residual, confirmed. A first probe logged literals only and matched native,
and was nearly recorded as "does not reproduce". The residual lives in `console_log.ts`'s `exprToWat`
STRING-ARGUMENT branch: an argument to a call inside `console.log(...)`. There `"([^"]*)"` failed on
`"a\"b"` and fell to the null string, so `len("a\"b")` gave **0** and `echo("say \"hi\"")` gave
**`[]`**, silently. The same pattern parsed string ENUM members (`wasic.ts`), where
`Escaped = "say \"hi\""` fell to the numeric branch and failed to compile (loud). Fix: the
escape-aware `"((?:[^"\\]|\\.)*)"` already used by wasic's `emitStringPtrLen`; the raw body goes to
`allocString`, which unescapes it. No other naive literal regex remains in either file (grepped).
Regression: `27_EscapedQuoteLiterals` (inversion: the unfixed code fails at compile and run-wasm).

**Lesson:** a "does not reproduce" needs the probe to reach the code the entry names. Grep the
named site's CALLERS first, and build the probe from them.

## Numbers and booleans in string values were silently dropped (FIXED 2026-09-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** compiler

The unheaded "NOT yet fixed" note (the `"code " + x` i32-param gap, recorded after the `ref.null`
entry). It was NOT specific to parameters. In any string VALUE built with `+`, every number or
boolean operand was skipped: `"code " + 7` → `"code "` for a param, a literal and a top-level
const; likewise `n + " items"`, `"sum=" + (n + 1)`, `"flag=" + b`. The concat branch asked
`emitStringPtrLen`, got its "can't" sentinel back, and moved on. A sibling: a boolean in a template
printed `1`/`0`. `console.log(...)` was never affected (its own path in `console_log.ts`, verified).
Fix: `emitScalarToStr` renders i32/i64/f64 (f32 widened) and bool (`true`/`false`, with the
condition evaluated once). It is used by both template branches and the concat branch. Anything
still unrenderable is now a DIAGNOSTIC: a concat operand, and a template segment (a second silent
skip in the same code). The temps are declared exactly, from a per-body flag in both assemblers,
not from the `${`-only line pre-scan. Regression: `11_StringConcatScalars` (inversion: the old
output is back without the fix). Commit `4aa36ce`.

## The compiler killed its host process on an undeclared receiver (FIXED 2026-09-28)

**Class:** LOUD · **Status:** FIXED 2026-09-28 · **Scope:** compiler

`undeclared.method(…)` made `WasicTranspiler` print to stderr and call `rt.exit(1)` itself: the
ONLY host access inside the class (H12 measurement). It was loud for the CLI, but it killed any
embedding host outright, including `hybrid`/`dync`'s speculative probe compiles, which should just
fail. It is now a diagnostic, worded to match the CLI's undefined-name guidance; user-visible
behaviour is the same. Regression: `22_UndeclaredReceiverDiagnostic`. Guard: `wasic_seam_tests.ts`.
Commit `e17d2d5`.

## The 2026-08-24 "-Oz failure is no longer silent" fix was DEAD CODE (FIXED 2026-09-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** other

That audit put a `catch` around `binaryenOptimize` in `zigwasic.ts` to warn when `-Oz` failed. But
`binaryenOptimize` catches everything itself and returns `{ optimized: false }`, so the `catch` could
never run and a failed `-Oz` stayed silent. The only trace was the missing " + binaryen -Oz" in the
success line. The Go leaf build (`gowasic.ts`) had the same silence and no attempted fix. Found while
checking that the new `zig_tests.ts` actually guards the audit's two findings: it did not reach
either branch, so this was verified by reading, not by the suite.

**Fix:** `binaryenOptimize` returns the reason in `error`. Both callers warn "binaryen -Oz failed,
shipping the unoptimised module: <reason>" and label the artifact **UNOPTIMISED**. Optimisation stays
optional. The Zig path no longer mislabels an unreadable artifact as an -Oz failure: it falls
through to `report()`, whose missing/empty check (the audit's other finding) is real and was
already correct. `zig_tests.ts` now checks the contract directly (optimized:false, a non-empty
reason, the input returned unchanged). Reached suites: zig 18/18, go_merge 7/7, go_bindgen 7/7,
go_asyncify 12/12. Nothing else calls `binaryenOptimize`.

**Lesson:** a fix for a swallowed error must be verified by making the error HAPPEN. This one was
reviewed and recorded as done, and it had never executed once.

**Same pass:** `18_DenoExitNonZero.ts` (`@expect-exit: 3`) pins the `proc_exit(N)` exit-code fix,
which had been verified only by hand. Inversion-checked: with the old "only exit:0" handling it
fails with exactly the old symptom.

## `wasmtk run` exit status: three holes, now at parity with wasmtime (FIXED 2026-09-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** other (hole 2 was loud)

**Owner decision:** "we should be at parity with wasmtime". Measured wasmtime first: uncaught
exception → 1, `proc_exit(N)` → N, trap → 3 on Windows / 134 on Unix.

1. **Uncaught exception exited 0** (`src/utils.ts` `runWasi`). It was a RECORDED decision ("exits
   cleanly"), justified as mirroring an uncaught TS error, but Deno and Node exit 1 on those. A
   foreign-tag exception also printed NOTHING. Now it exits 1 with the message, or a generic one.
2. **`proc_exit(N ≠ 0)` exited 1 with "❌ Run error: RuntimeError: exit:N"**: only `exit:0` was
   recognised. Now it exits N silently. Found by reading the code next to (1), then probed.
3. **`wasmtk run x.ts|.js` discarded the child's exit code** (`await process.status; return;`), so
   EVERY failing TS program read as success, not only crashes. That is the bug's other half: without
   it, run-ts and run-wasm would disagree on the same program.

**Why nothing caught it:** the wasi suite compared stdout only, and the engine gate read wasmtime's
CORRECT exit 1 as that engine's "reject". Traps stay at 1 (platform-specific upstream, outside the
decision).

**Gate changes that came with it:** `// @expect-exit: N` in `wasi_tests.ts` (success = that exact
code; output still compared). The engine gate is now exit-code aware, with a VANISHED check. Its
first version misread wazero refusing an EH module (exit 1, no output) as `differ`, which was
corrected to `reject`. The VANISHED check was inversion-tested by planting a module. Full gate green.

## wast runner: 186 FALSE PASSES — pass paths accepted the wrong kind of failure (FIXED 2026-09-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** other

**How found:** an audit of what each permissive pass path actually passed on, counted with temporary
instrumentation over the whole corpus (not by reading). Full table in next-work.md § "FALSE-PASS
AUDIT" (before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`). Gate 63,986 → **63,800 passed**, 618 → 804 skipped, 0 failed.

**Root cause:** four handlers were written as `catch { passed++ }` or "any throw counts". The
`assert_malformed` stage split of 2026-09-19 fixed this class for ONE directive; the others were
never audited against it. The biggest share (147) was the backend being unable to PARSE newer
syntax, scored as "correctly rejected as invalid". The more syntax the backend lacks, the greener
that made the gate.

**Fix:** each assertion now requires its own verdict: `CompileError` for invalid, `LinkError` for
unlinkable, `RuntimeError` for a trap (`RangeError` for exhaustion). A JS-boundary refusal in
`assert_trap` retries through the trampoline (those 50 now genuinely trap). `isFeatureGate` (any
`--experimental-wasm-` requirement) is never a verdict. Text-malformed passes are reconciled per
file against parse errors the backend raised on WELL-FORMED modules.

**Lesson (also in best-practices):** "passes" is a claim about WHY something failed. Count the
failure kinds behind every pass path; a path that accepts any failure turns every backend gap into
green.

## wast: `exnref` results through the trampoline, and the gate's experimental V8 flag (2026-09-28)

**Class:** n/a (not a defect) · **Status:** — (coverage change and gate flag) · **Scope:** other

726 → **618 skips**, 0 failures; gate 63,986 passed.

- **`exnref` / `nullexnref` results (7, `ref_null.wast`).** V8 refuses these at the JS boundary, but
  `(ref.null …)` needs only null-ness. The trampoline gained ref RESULT types, returned as their
  `ref.is_null` flag (`RefLowType`). Since a `(ref.null exn)` expectation cannot say whether the
  export returns `exnref` or `nullexnref`, the type is found by link probing (the import signature
  must match exactly, so a wrong guess fails to link before anything runs). Inversion: requiring
  flag = 0 failed exactly the 7.
- **Gate-only V8 flag.** `tests/wast_tests.ts` probes `i64.add128` with `WebAssembly.validate`, and
  when it is unavailable re-runs itself with `--v8-flags=--experimental-wasm-wide-arithmetic`. The
  `--scan-chunk` children carry the flag too. It detects the feature rather than an env marker, so it
  cannot loop. Without `--allow-run` it continues unflagged and `wide-arithmetic.wast` fails the gate
  loudly. The CLI is deliberately unflagged.
- **Tried and ruled out**, so nobody repeats it: `--wasm-max-table-size` does not lift V8's table
  cap (hard-coded), and `compat/binaryen`'s `Module.validate()` is a stub that always returns 1.

## wast runner: every runner-owned skip group closed (2026-09-28) — skips 886 → 726, 0 of them ours

**Class:** SILENT-WRONG · **Status:** FIXED 2026-09-28 · **Scope:** other (reader swallowed assertions silently; table64 was loud; rest coverage)

Gate: 63,732 / 0 / 886 → **63,880 / 0 / 726**. 28 files moved, none went down, and none gained a
failure. Two of the seven changes were BUGS. The rest are coverage.

**Bugs.**
1. **The s-expr reader ran a module on into the next command.** `readAtom` read through `"`, so a
   string abutting other tokens (`x")"y`, `x-y$yz"aa"-2`) let a `)` inside it close a list, and a
   quoted id `$" "` split at its space. `id.wast`'s module was read as lines 1–32 (it ends at 24),
   silently swallowing five assertions; `annotations.wast` as 1–23 (ends at 21). A `"` now ends an
   atom, except after a bare `$` or `@`, where the string is part of the token. `id.wast` went from
   0 passed / 1 skipped to 6 / 0.
2. **`spectest.table64` was a 32-bit table.** It was built with `index: "i64"`, but the JS API field
   is `address` (with BigInt sizes). V8 ignores the unknown key, so the import failed with "cannot
   import i32 table as i64". Probed both descriptors before fixing.

**Coverage.** `(module definition|instance …)` (definitions compile only; a failed definition leaves
the current instance alone). Annotations before a command keyword are stripped at the top level
only. An inline-module script becomes one `(module quote …)`, byte-escaped. `(either …)` results go
through the trampoline, typed by their agreeing alternatives. `assert_exception` passes only on a
`WebAssembly.Exception`; a trap is a failure. Index-less `ref.struct/array/eq/i31/any` results are
classified by a `ref.test` helper module: V8 15.0 hands GC values to JS, contrary to an old comment,
which is corrected. `assert_trap` with trampoline-only arguments finds the result type by LinkError
probing, and only a real `RuntimeError` counts as the trap: a runner error there must not score
as one. Custom-annotation assertions share the plain handlers.

**Inversion-checked:** requiring EVERY `either` alternative failed 10 + 8 assertions, and testing
`ref.array` against struct failed exactly the 4 + 8 + 4 array assertions.

## wast trampoline: SIMD and NaN-payload assertions now RUN (2026-09-28) — skips 26,944 → 886

**Class:** LOUD · **Status:** FIXED 2026-09-28 · **Scope:** other (coverage change; the exposed `hexFloatToNumber` bug failed 2 assertions)

**Not a bug fix but a coverage change, recorded here because it exposed one bug.** 96% of the
corpus's skips were JS-embedding limits, not toolchain gaps: V8 refuses `v128` at the JS boundary
(24,078 in `simd_*`), and a JS number cannot be trusted with a NaN payload (~1,840 `nan:0x…`
assertions in `f32*`/`f64*`). `src/wast.ts` now routes any `assert_return` touching either through
a generated wasm module. It IMPORTS the export with its true signature, since a wasm-to-wasm call
has no such limit, and EXPORTS `run` over raw bits (f32 → i32, f64 → i64, v128 → two i64 halves).
All comparison happens in JS on exact bits, per lane for v128, with the same NaN rules as before.
It is cached per (instance, export, signature). A signature guess that does not LINK is a skip, and
a trampoline that does not ASSEMBLE is a loud failure (it is our own text).

**Result:** 37,674 / 0 / 26,944 → **63,732 passed / 0 failed / 886 skipped**, ALL CLEAN. The balance is
exact (+26,058 = −26,058), 71 files moved, none went down, none gained a failure. Every
`simd_*`, `relaxed_*`, `f32*`, `f64*` file now has 0 skips. **Inversion-checked two ways:** flipping
result bit 0 failed 1496 / 400 / 456 / 274 in four sample files, and clearing the f32 quiet bit failed
exactly the 466 trampolined `f32.wast` assertions. That second check was needed because those
expect `nan:arithmetic`, which a bit-0 flip cannot break.

**The bug it exposed — `hexFloatToNumber` underflowed subnormal literals to 0.** It computed
`mantissa × 2^e` with one `Math.pow`, and `0x0.0000000000002p-1023` is `2 × 2^-1075`; `2^-1075`
is 0 in f64. Two `simd_lane` assertions failed the moment they first ran. Fixed by scaling in two
steps: the first is an exact power of two, so the value is rounded only once. The direct-call path
shared the helper, so this was latent there too, just never reached by an assertion that ran.

**Still open:** `(either …)` results and `assert_trap`/bare `invoke` with v128 arguments (no expected
value to infer result types from) are still skips. None remain in the corpus today, but they would
need the export's real signature, i.e. decoding the type section.

## The 100 pinned wast failures were all our RUNNER (FIXED 2026-09-28) — gate now ALL CLEAN

**Class:** LOUD · **Status:** FIXED 2026-09-28 · **Scope:** other

Three defects in `src/wast.ts`, none in the compiler or binaryang. Corpus 37,370 / 100 failed /
27,148 skipped → **37,674 / 0 / 26,944**. The totals are consistent (+304 passes = 204 former skips
+ 100 former failures), so no assertion was lost and none flipped to failing.

1. **Reference-typed arguments were refused (88 failures, +150 skips → pass).**
   `(invoke "init" (ref.extern 0))` hit `__skip__: unsupported arg type`, so `init` never ran and
   every later assertion read an empty table. That covered the whole GC-cast family (`ref_test` 32,
   `ref_cast` 11, `br_on_cast*` 4 × 10, which is 83, not the 73 the old triage said), plus `ref_is_null`,
   `table_get*` and `table_grow*`. Fix: `hostRef(N)` gives one frozen object per `N`, shared by
   `ref.extern N` and `ref.host N` (the spec's external and internal views of one host value).
   It is an object, not the number, because under GC a JS number entering `anyref` can become an
   `i31ref`. The new `resultType` also admits index-less `(ref.extern)` / `(ref.func)` as non-null
   matchers. Arguments and results are checked separately, so a result-only form can never be
   passed as an argument. **Inversion-checked:** a fresh object per call (identity broken) failed
   3 `extern` and 13 `table_fill` assertions.
2. **`TextDecoder` dropped a leading U+FEFF (1 failure).** `names.wast` exports `"\u{FEFF}"`. Both the
   assembler and our s-expression parser kept it, but `watStrToJs` decoded it to `""`. Fixed with a
   shared `watUtf8 = new TextDecoder("utf-8", { ignoreBOM: true })`, also used for the
   `module quote` text, where eating a BOM could make a malformed module look well-formed.
3. **`assert_trap (module …)` was never instantiated (11 failures, +54 skips → pass).**
   Instantiation writes element and data segments into IMPORTED tables and memories before it
   traps, and `linking*` reads that state afterwards. It is now instantiated: a `RuntimeError` is a
   pass, a clean instantiation is a loud failure, and a link or compile error keeps the old skip with
   the cascade tag. It also cleared every "unbuilt module" in `data`, `data1`, `elem`, `linking1` and
   `start`. Those modules had never failed to build; they were these skipped traps.

**Lesson.** The runner reported all 100 as conformance gaps, and for a month they read as
GC/ref-types work waiting on the toolchain. Before attributing a failure to the thing under test,
check that the harness gave it the same SETUP the spec did (the method note in next-work.md § A, before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`;
now proven on the whole set).

## binaryang 1.6.0 honoured `readDebugNames: true`, and the merge path broke (FIXED 2026-09-28)

**Class:** LOUD · **Status:** FIXED 2026-09-28 · **Scope:** compiler (3 of 4 sites in `src/wasic.ts`; 1 in `wasmbundle.ts`)

**Symptom.** On the 1.5.3 → 1.6.0 bump, `go_merge_tests` went 6/7: merging the TinyGo leaf failed
with `undefined func "$mathleaf_addi"` (and `_muli`, `_clampi`). Every other suite was green,
including wasi 417/417, because wasic-built libraries carry no name section.

**Root cause — ours, hidden by a backend bug.** Four sites disassembled an imported `.wasm` with
`readDebugNames: true` and fed the text to parsers that match only the INDEX form
`(func (;N;) …)` / `(export "x" (func N))`: `mergeOneWasmImport` and both signature pre-passes in
`src/wasic.ts`, and `src/wasmbundle.ts`. **binaryang 1.5.3 ignored the flag** (its output was
byte-for-byte the index form with `true` or `false`; measured on `mathleaf.wasm`). 1.6.0 honours it,
as real wabt does, so a leaf with a name section now disassembles to `(func $main.addi#wasmexport …)`
and the merge finds no exports to rename. We had asked for the wrong form since the Phase 1 split,
and it never mattered until the backend started doing what we asked.

**Fix.** Pass `readDebugNames: false` at all four sites, each with a comment saying why. Left alone on
purpose: `convert` (wasm → wat, `src/utils.ts`). People read that output, so real names are an
improvement there.

**No input guard in `mergeWasmWat`.** One was considered and not added, because
`wasmmerge_guard_tests.ts` feeds it hand-written NAMED WAT and expects it NOT to throw. The contract
is enforced at the call sites instead. Regression coverage: `go_merge_tests` (the TinyGo leaf is the
only merge input in the tree that carries a name section).

**Lesson.** When a backend ignores an option, an option that is wrong for us stays hidden. Grep for
every option we pass to the backend when bumping it, not only for the APIs it removed.

## Phase 34 inline predicate target: the whole function header failed to parse (FIXED 2026-07-30)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-30 · **Scope:** compiler (bug 1 loud, bug 2 silent)

Phase 34 stress batch (type predicates), 3 owner tests. Tests 1 and 2 — basic narrowing and an
if/else-if chain of two sibling predicates — **passed as written**. Test 3 failed, and probing its
mechanic surfaced a second, worse bug behind the first.

**Bug 1 — the header regex rejected an inline target, so the function vanished.** Test 3 writes the
predicate against a discriminated union in the form the variant is normally spelled:

```ts
function isSphere(g: Geometry): g is { type: "sphere"; r: f64 } { … }
```

`parseFunctions`'s return-annotation alternative was `[\w]+\s+is\s+[\w]+` — a *named* target only.
An inline object type matched no alternative, so `restMatch` was null and the loop hit its
`continue // malformed header — skip`: **the function was never parsed at all.** The call then
aborted the compile with `Unknown function 'isSphere' — not declared in this module`, and the
advice attached to that diagnostic ("if any is a typo or missing declaration, fix it first") is
actively misleading, because the function is right there and correctly declared. Fixed by adding a
`\{[^}]*\}` alternative to both the header regex and the `typePredicateMatch` extraction.

**Bug 2 — with the header parsed, an inline target narrowed nothing and read 0.** The narrowing site
resolves the target through `structDefs.get(targetType)`, which an inline object type can never hit.
Both `targetDef` and `targetCls` came back undefined, narrowing was silently skipped, and the
then-branch compiled against the variable's *unnarrowed* type. For test 3's DU that is harmless —
the Phase 32 flat super-struct already carries `r`, `w` and `h` at their real offsets, which is why
test 3 prints the right answer with no narrowing at all. Over an **interface hierarchy** it is
silently wrong: with `s: Shape` and target `{ kind: i32; radius: f64 }`, `s.radius` compiled clean
and printed **0** where native TS printed **5** — a wrong number, no trap, no diagnostic.

**Fix.** `resolveInlineStructTarget` matches the inline shape against registered `StructDef`s by
exact field-name set plus mapped WAT type (a string-literal discriminant like `type: "sphere"` is
matched on name alone — it never determines a layout by itself) and narrows to the match, so the
hierarchy case now uses `Circle`'s real offsets. When nothing matches, narrowing is skipped as
before — correct for a DU — **unless** the variable's own def is missing a field the inline target
names, which is exactly the case that has no layout to read against: that now pushes a `diagnostics`
entry naming the predicate, the variable, the missing fields and the containing type, and telling
the author to declare the target as a named interface. The documented preference again: hard abort
over silently-wrong codegen.

**Why it survived.** All four pre-existing Phase 34 tests use named targets, which is the only form
the regex admitted — the inline form could not reach the narrowing site to be wrong there. The two
bugs also masked each other: bug 1 made every inline-target program fail loudly at compile, so bug 2
had no way to produce a wrong number until bug 1 was fixed.

**Deliberately NOT done.** Building a synthetic `StructDef` from the inline object type and
narrowing to *that* was rejected: its offsets would be computed independently of the allocation the
variable actually points at, so it would agree with a matching declared type by luck and disagree
with a DU super-struct by construction — trading a hard abort for a new class of silent-wrong reads.
Resolving against the DU's per-variant field sets (`DiscUnionDef.variants`) was also left alone; the
super-struct layout makes it unnecessary for field access.

Regressions: `34_InlinePredicateTargetNarrowing` (the hierarchy case that printed 0, plus a
named-target guard in the same file) and `34_InlinePredicateUnresolvable` (`@expect-fail: compile`,
the shape that must abort).

## Phase 33 intersection base-prefix: a base-typed parameter read the wrong fields (FIXED 2026-07-30)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-30 (by a hard-abort guard) · **Scope:** compiler

Phase 33 stress batch (intersection types). **All three owner tests passed as written** — the bug
came from a follow-up probe on test 3's mechanic, not from the tests themselves.

Test 3 (`33_IntersectionBasePointerParam`) passes a `Sprite = Transform & Renderable` to
`getScaleArea(t: Transform)` and correctly printed `6`. Reversing ONE token —
`type Sprite = Renderable & Transform` — printed **`1.6`**, with no error at any stage.

**Root cause.** A struct travels as a POINTER, and the callee reads fields at the offsets of its own
declared parameter type. `parseIntersectionTypes` merges constituents in **declaration order**, so
`Renderable & Transform` lays out `alpha@0, scaleX@8, scaleY@16` while `getScaleArea` reads
`scaleX@0, scaleY@8` — i.e. it multiplied `alpha * scaleX` = `0.8 * 2.0` = `1.6`. Every offset was a
valid in-bounds f64 slot, so nothing trapped and the WAT was well-formed. **The prefix assumption
was known and written down** — the README's Phase 33 row states "passing a derived intersection
pointer to a function expecting a base intersection pointer is safe because the first N bytes of the
derived layout are identical to the base layout" — but nothing *enforced* the ordering it depends on.

**Why it survived.** All four pre-existing Phase 33 tests, and the owner's three new ones, declare
the constituent that a function later consumes FIRST. `33_IntersectionFunc` and
`33_IntersectionThreeWay` only ever pass the FULL intersection to a parameter of its own type, so
they never exercise a base-typed parameter at all. The favourable ordering was luck, not coverage.

**Fix (guard, not codegen).** `checkStructArgLayouts` + `structLayoutPrefixMismatch` in `wasic.ts`:
at every direct call, a bare-identifier argument whose tracked struct type differs from the
parameter's declared struct type must be a byte-exact layout prefix (same field name, offset, type
and size), else a `diagnostics` entry aborts the compile naming the variable, both types, the
offending field and both byte offsets, and pointing at the two fixes (list the base constituent
first, or type the parameter with the intersection). This is the documented preference — a hard
abort over silently-wrong codegen — applied to a case where the source language (TypeScript) is
genuinely happy: `Sprite` really is assignable to `Transform`, wasic's flat-pointer representation
is what cannot express it.

**Deliberately NOT done.** Monomorphising the callee per actual argument struct type is what would
make the program *work*, but the function body is compiled once against the parameter type; cloning
per call-site layout is a far larger change than this batch warrants. Re-packing the argument into a
temporary of the parameter's layout was also rejected — structs are by-reference here, so the
callee's writes would be silently lost.

**Parallel-path trap, again.** The check was initially added to the two call-emission paths in
`wasic.ts` and looked correct — but `console.log("area:", getScaleArea(hero))` still compiled,
because a call nested inside `console.log` is emitted by `console_log.ts`. Since that module knows
the argument TEXT but not the struct layouts, the check is injected into it as
`setStructArgLayoutChecker(...)`, matching the existing `setStructLiteralAllocator` pattern, and is
called from BOTH of its call-emission sites. **The original probe used `console.log(f(x))` — so the
first version of the fix appeared to do nothing.** See design-decisions.md § parallel code paths.

Regressions: `33_IntersectionBasePrefixGuard` (`@expect-fail: compile`) pins the rejected shape;
`33_IntersectionPrefixOk` pins four shapes that must keep compiling — base-typed param with a
two-way and a three-way intersection argument, an intermediate intersection as a prefix of a longer
chain, and an exact-type parameter.

## A union field shared by two variants took the FIRST variant's type (FIXED 2026-07-30)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-30 · **Scope:** compiler (silent truncation masked by a loud instantiate error)

Phase 19 stress batch (discriminated unions: super-struct layout / switch dispatch / chained
`else if` narrowing). Tests 1 and 2 passed as written; test 3 failed at instantiation with
`CompileError: … type error in return[0] (expected f64, got i32)`.

**Root cause.** `parseDiscriminatedUnions` built the flat super-struct by walking the variants and
skipping any field name it had already seen:

```ts
if (seenFieldNames.has(f.name)) continue;   // ← drops the LATER declaration outright
```

So for `{type:"intVal"; val: i32} | {type:"floatVal"; val: f64}` the first variant claimed `val` as
a 4-byte i32 and the second variant's `f64` declaration was discarded. Two concrete failures fell
out of that one line:

- **Silent truncation on store.** `{type:"floatVal", val: 25.5}` was emitted into the data segment
  as `\19\00\00\00` — the i32 `25`. The `.5` was gone before any code ran.
- **Invalid WASM on load.** `return container.val` in the narrowed `floatVal` branch emitted
  `(return (i32.load …))` inside `(func … (result f64))`, which V8 rejects at instantiate time.

The second masked the first: the module never instantiated, so the truncation was invisible. Had
both variants' fields happened to be 4 bytes wide the program would have run and quietly printed
`25`.

**Why it survived this long.** Every prior Phase 19 test gives each variant *distinct* field names
— `19_VariantMaximumMemoryAlignment` has `code` vs `val1`/`val2`/`id`,
`19_NestedDiscriminantUnions` has `operation` vs `errorCode`. With no name collision the
`seen`-skip never fired, so the whole resolution path was untested. A shared field name is the
natural way to write this union, which is why the owner's first probe of it broke immediately.

**Fix.** Replaced the skip with a real resolution step, factored into
`buildDuSuperStructFields` + `widenDuFieldType`. Pass 1 resolves each unique field name to ONE
source type across all variants; pass 2 lays out offsets from the resolved types. Because `i32` and
`f64` are both `number` aliases, TypeScript itself sees `val: number` in both variants — there is no
conflict in the source language, only in wasic's representation, so the slot is **widened** to the
type that can represent every variant (i32/f32 → f64, i32 → i64). `val` then lands at offset 8,
8-byte aligned, with `f64.load` on both branches and `25.5` stored as real f64 bytes.

**A collision that is not a numeric widening now throws at parse time** (e.g. `string` vs `f64`).
It previously pushed a `diagnostics` entry — but diagnostics are only reported once the whole
transpile SUCCEEDS, and a slot that cannot hold both variants crashes downstream first: the user saw
`Transpile error: Offset is outside the bounds of the DataView`. Throwing from the parser is the
only place the message can name the union, the field, and both types.

**Deliberately NOT done.** Per-variant slots (each variant's `val` at its own offset, resolved by
narrowing context) were rejected: field access is keyed by name against a single flat StructDef, so
that would mean threading narrowing state through every field read — a large change to fix a case
TypeScript does not even consider a conflict.

**Bonus parity fix.** The two layout loops were duplicated (inline `{…} | {…}` blocks vs
`type X = A | B` named variants) and had drifted: only the named-variant loop set `structType` for
PascalCase field types, so an inline-block union with a nested struct field could not recurse in
`allocStructData`. Collapsing both onto the shared helper fixed that for free.

Regression: `19_UnionSharedFieldWidening` pins the fix **and its guards** — a field shared at the
same type in every variant (must still collapse to one slot), the widening case, a field declared
*after* the widened slot (alignment must survive), and the reversed declaration order (wide variant
first, so widening cannot be order-dependent).

## Phase 31 TypedArray stress batch (2026-07-30) — NO BUGS FOUND

**Class:** n/a (not a defect) · **Status:** — (clean stress batch, no bug) · **Scope:** compiler

Recorded because a clean batch is itself evidence. 3 owner stress tests, all passing as written on
the first run, every printed value matching the owner's inline `// Expected:` annotations:

| Test | Covers |
| --- | --- |
| `31_TypedArraySubWordAccess` | `Uint8Array`/`Int16Array` element widths; `.length` vs `.byteLength`; **sign-extension of a negative `Int16` element** (`-16000` reads back correctly, not `49536`) |
| `31_TypedArrayLiteralInitializer` | `new Float64Array([...])` — header allocation + literal float-byte copy; `byteLength === 24` for 3 elements |
| `31_TypedArrayFillAndSet` | `.fill(v, start, end)` with an **exclusive** end bound (indices 1–3, not 1–4); `.set(src, offset)` |

**Why the phase held.** Phase 31's existing `31_TypedArrayAdvanced` already pinned the load-bearing
mechanics — runtime-length construction, `Uint8Array`, literal initializers, `.set()` with and
without an offset, and TypedArray function parameters. The genuinely new ground here was narrow:
`Int16Array` (the only sub-word *signed* view in the corpus), `Float64Array.byteLength`, and
`.fill()` with an explicit range. All three were already correct.

**Process note.** No bug and no `src/` edit means the full suite is NOT run — the `"^31_"` filter
(7/7) is the whole gate. That corollary was added to the regression-gate trigger by owner directive
during this batch; see INDEX.md and testing.md.

## Namespace member references not rewritten inside the body (FIXED 2026-07-30)

**Class:** LOUD · **Status:** FIXED 2026-07-30 · **Scope:** compiler (the `###` sub-entry below is classified separately)

Phase 30 stress batch (namespaces / interface inheritance / shorthand properties). Tests 2 and 3
passed as-written; test 1 failed with `Unsupported expression: GRAVITY`.

**Root cause.** `expandNamespaces` renames a namespace's exported DECLARATIONS
(`export const GRAVITY` → `const PhysicsEngine_GRAVITY`, `export function f` → `function
PhysicsEngine_f`) but never touched the namespace BODY, where members are referred to by their bare
name. So `export function calculateForce(mass) { return mass * GRAVITY; }` kept pointing at
`GRAVITY`, which no longer existed after the rename.

**Why it survived this long:** the existing Phase 30 tests declare namespace constants
(`30_Namespace`, `30_NamespaceAdvanced`, `30_Phase30Combined` all have `export const`) but **none
of them reads a constant from inside a namespace function** — every use is qualified from outside
(`MathUtils.PI`). The batch's first unqualified internal reference broke immediately.

**Fix.** Collect the exported member names BEFORE renaming, then rewrite bare occurrences within the
transformed body. Guards: skips names inside a string/template literal (via
`buildStringLiteralMask`), a property access (`obj.LIMIT`), and an already-prefixed token
(`Cfg_LIMIT`, caught by the `prev === "_"` check). Regression `30_NamespaceInternalRefs` covers a
const reference, a sibling FUNCTION call, a member name inside a string literal, and a struct field
sharing a member name.

### String members in a namespace — ALSO FIXED (2026-07-30)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-30 · **Scope:** compiler (string const printed 0; string return was loud)

Found while probing the above; pre-existing (verified on a clean tree with the first fix stashed),
then fixed in the same batch.

- `namespace A { export const NAME: string = "cfg" }` → `console.log(A.NAME)` printed **`0`**
  instead of `cfg` (silently wrong).
- A string-RETURNING namespace function (`export function label(): string`) failed to instantiate:
  `not enough arguments on the stack for i32.store`.

**Root cause — per-use-site resolution.** Each *qualified* use was resolved ad hoc: a
numeric-constant branch in `emitExpr` for `Ns.CONST`, a dot-call branch for `Ns.fn()`. Neither
understood the string ptr/len ABI, so anything string-typed fell through. Adding a third
special case per string form would have kept the pattern (and missed the next type).

**Fix — remove the special-casing instead.** `expandNamespaces` now also rewrites QUALIFIED uses,
`Ns.member` → `Ns_member`, once the bodies are spliced in. A namespace member becomes an ORDINARY
top-level symbol, so every existing path handles it for free: string consts, the string-return
side-channel, concatenation, comparison, arrays, structs. Only exact (namespace, member) pairs
collected during expansion are rewritten, so an unrelated `obj.member` never matches, and
occurrences inside string/template literals are skipped via `buildStringLiteralMask`.

Regression `30_NamespaceStringMembers` covers string/i32/f64 consts, a string-returning namespace
function inline + assigned + concatenated + compared, a struct field sharing a member name, and a
member name inside a string literal.

Gate: wasi **400/400**, wast 12444/0, every other suite 0 failures.

## Multiplicative associativity + string-enum values + literal-led console.log (FIXED 2026-07-29)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-29 · **Scope:** compiler (items 2–3 were loud)

Phase 29 stress batch (static fields / getters+setters / string enums). Test 1 passed; the other two
each failed, and the getter/setter failure turned out to be a **general arithmetic bug** with nothing
to do with classes.

**1. `*`, `/`, `%` were parsed RIGHT-associatively — the most consequential bug found so far.**
They share one precedence level and are left-associative, but the binary-op loop splits at the FIRST
operator **in table order**, where `*` is listed before `/` and `%`. So `a * b / c` matched `*` and
produced `a * (b / c)`. With integer division that is silently, badly wrong:

| Expression (a = 180) | Was | Correct |
| --- | --- | --- |
| `a * 5 / 9` | `0` (= `180 * (5/9)`) | `100` |
| `a * 5 % 9` | `900` (= `180 * (5%9)`) | `0` |

Surfaced only because a Fahrenheit→Celsius setter used `(f - 32) * 5 / 9` and silently produced 0.
`a / b * c`, `a / b / c` and `a % b * c` were already correct — the broken shapes are exactly `*`
left of `/` or `%`. **Fix:** skip a candidate when another member of its precedence group sits
further right, so the split lands on the RIGHTMOST operator. Applied in **both** binary-op loops —
`emitExpr` (wasic.ts) *and* `exprToWat` (console_log.ts). Fixing only the first left
`console.log("x:", a * 5 % 9)` emitting `(i32.mul … (f64.rem …))`; the two loops are parallel code
paths and must always be fixed together. (`+`/`-` need no guard: `a + (b - c)` and `(a + b) - c` are
mathematically equal — though they can differ in f64 rounding, noted in design-decisions.md.)

**2. Pure string enums had no usable value form.** The Phase 22 work assigned synthetic i32 tags only
to *heterogeneous* enums (`hasString && hasNumeric`), so a pure string enum had NO `enumValues` entry:
`const a: LogLevel = LogLevel.Error` and `a === LogLevel.Error` hit the terminal "Unsupported
expression" abort, and only `console.log(LogLevel.Info)` (the compile-time display path) worked.
**Fix (a):** tag string members whenever any exist — for a pure string enum tags simply start at 0.
That made comparison work but printing a *variable* then showed the raw tag (`0`, `2`) instead of
`INFO`/`ERROR`. **Fix (b):** a runtime tag→string ladder `$__enum_str_<Enum>` emitted on demand,
`stringEnumVars` tracking (params + both pre-scans), and a `setEnumStrVarResolver` hook in
console_log consulted **before** the simple-identifier handler. The `$__str_op_*` temp-pair prologue
also had to learn about it, else the multi-value capture referenced undeclared locals.

**3. Literal-led / paren-led arithmetic in `console.log` failed to instantiate.** PRE-EXISTING and
unrelated to the above — found while writing the regression test. `console.log("x:", 1 + n)` emitted
`f64.add` over an `i32` operand, while `n + 1` worked. The operand type is taken from the LHS lead
atom; an integer literal and a parenthesised group both have none, so it fell back to f64.
**Fix:** take the type from the first typed atom — the RHS for an integer-literal LHS, inside the
group for a parenthesised LHS — in BOTH the segment-kind decision (`parseSingleArg`) and the
operand-type decision (`exprToWat`); the two disagreeing produced `$__i32_to_str` wrapped around
f64 ops. A FLOAT literal (`1.5 + n`) still means f64. Deliberately NOT applied to a call LHS, where
scanning would take an argument's type instead of the return type.

Tests `29_StaticFieldsAndGlobals`, `29_GettersAndSetters`, `29_StringEnumDispatch`, plus regression
`22_MultiplicativeAssociativity` (both broken shapes, the already-correct shapes, longer chains,
mixed additive, through a function body, and f64). Gate: wasi **395/395**, wast 12444/0, and every
other suite 0 failures.

## `arr.join()` had no string VALUE + console.log concat broke on `]`/`)` (FIXED 2026-07-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-28 · **Scope:** compiler (join-as-value was a loud abort; concat printed `0`)

Two bugs from the Phase 28 array-method stress batch (`28_ArrayPredicatesAndAt` and
`28_ArrayMutationsAndSort` passed as-written; `28_ArrayJoin` failed).

**1. `join` existed only inside `console.log`.** `console_log.ts` implements it as a `joinarr`
segment that writes straight into the gather scratch buffer, so it never produced a string *value*:
`const s: string = arr.join("-")` aborted with "unsupported string assignment". Same shape as the
Phase 27 parity gap, from the other direction — a method living only in the console.log path.
**Fix:** two WAT wrappers, `$__dynarr_join_str_i32` / `_f64`, that reuse the existing (tested)
scratch writer over a `$__malloc`'d buffer plus a 4-byte cursor cell and return multi-value
`(ptr, len)`; plus a `join` handler in `emitStringPtrLen`. Because `emitStringAssign` ends in a
last-resort fallback through `emitStringPtrLen`, that single handler fixed assignment, concatenation
and comparison at once. Capacity is a worst-case bound (12 B/i32, 32 B/f64, + one separator per
element + slack); verified against `-2147483648` (11 bytes), empty arrays, and single elements.
Non-literal separators and `string[]` receivers return the sentinel and stay unsupported.

**2. `console.log` string concat silently printed `0` when a literal contained `]` or `)`.**
`findTopLevelOp` in `console_log.ts` counted `()`/`[]` for depth but did **not** skip string
literals, so the `]` in `w + "]"` drove depth to 1 and the top-level `+` was never seen at depth 0 —
the whole concat fell through to the numeric path. Discovered while testing `"[" + arr.join(",") +
"]"`, but **entirely independent of `join`**: plain `w + "]"` failed identically. Measured:

| Expression | Before | After |
| --- | --- | --- |
| `"a" + w + "b"` | `aVb` | unchanged |
| `"{" + w + "}"` | `{V}` | unchanged (braces were never counted) |
| `"[" + w` (open only) | `[V` | unchanged |
| `"[" + w + "]"` · `"(" + w + ")"` · `w + "]"` | **`0`** | `[V]` · `(V)` · `V]` |

**Fix:** a local `literalMask()` twin of `wasic.ts`'s `buildStringLiteralMask` (console_log.ts is
imported BY wasic.ts, so it cannot import back without a cycle) + `if (inStr[i]) continue;` in the
scan. This is the **same bug class already fixed on the wasic side** and recorded in
design-decisions.md § "Bracket/paren/operator scanners MUST skip string literals" — the
console_log.ts twin had never been done. High blast radius (`findTopLevelOp` drives all console.log
operator parsing), so the full gate was re-run.

Tests `28_ArrayJoin`, `28_ArrayPredicatesAndAt`, `28_ArrayMutationsAndSort`, plus regression
`27_ConsoleLogBracketConcat`. Gate: wasi **391/391**, wast 12444/0, and every other suite 0 failures.

**Windows runner caveat (not a bug):** running `go_asyncify_tests` CONCURRENTLY with the full wasi
suite produced 4 spurious failures — all `os error 32` ("file is being used by another process") on
`tests/go_fixtures/**/main.wasm`, i.e. TinyGo build / asyncify write racing the OS lock, not
assertion failures. Run alone it is 12/12. **Do not run the Go suites in parallel with other suites
on Windows.**

## Phase 27 string methods missing from `emitStringPtrLen` — silent `0` (FIXED 2026-07-28)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-28 · **Scope:** compiler

Surfaced by an owner stress test whose only failing line was `console.log("Repeated:", "x".repeat(3))`
→ printed **`0`** instead of `xxx`. Pulling the thread showed a whole family of silent-wrong output.

**Root cause — handler parity gap between the two string entry points.** `emitStringAssign` (RHS of a
string assignment) implemented the full Phase 27 set, but `emitStringPtrLen` — the entry point for a
string used as a **console.log argument**, comparison operand, or call argument — implemented only
`.at`, `.slice`, `.padStart`/`.padEnd` and case conversion. `trim`/`trimStart`/`trimEnd`, `charAt`,
`repeat`, `replace`, `replaceAll` existed **only** in the assignment path. So they worked when
assigned to a variable first and silently produced `0` when used inline. Additionally `slice`, `.at`
and the case handler gated their receiver on `locals.get(recv) === "string"`, so a string **literal**
receiver fell through the same way.

Measured before → after (all eight forms, wasm vs the ts baseline):

| Form | Before | After |
| --- | --- | --- |
| `s.repeat(3)` (variable receiver, inline) | `0` | `xxx` |
| `"z".repeat(3)` / `"  t  ".trim()` | `0` | `zzz` / `t` |
| `"a-a".replace("a","b")` | `0` | `b-a` |
| `"hello".slice(1,3)` / `"hello".charAt(1)` | `0` | `el` / `e` |
| `"ab".toUpperCase()`, `"q".padStart(3,"*")` | already correct | unchanged |

`const b: string = "y".repeat(3)` was a *loud* abort ("unsupported string assignment"); also fixed.

**Fix.** One generic block in `emitStringPtrLen` covering trim family / `charAt` / `repeat` /
`replace` / `replaceAll`, following the existing `padStart` pattern: the receiver is resolved by
**recursing through `emitStringPtrLen`**, so a variable, a string literal, a string-array element,
and a string-returning call all work uniformly. Every helper already returned multi-value
`(result i32 i32)`, so the call is returned directly — no new WAT runtime. An arity gate
(0/1/2 args per method) makes a wrong arg count fall through rather than emit a mismatched call.
For `slice` and `.at`, which need the receiver's length **independently** (defaulted `end`, negative
index), a new `stringReceiverParts()` helper returns SEPARATE ptr/len for a string local, module
string const, or literal; it returns null otherwise so callers keep their existing paths. The
case-conversion receiver was generalized the same way.

This is the failure mode INDEX.md calls the compiler's worst — silent-wrong, not an abort — and it
had been reachable by any inline `console.log(s.trim())` since Phase 27 shipped.

Tests `27_StringSplitAndForOf`, `27_StringTrimPadReplace`, `27_CharCodeAndSubstringQuery` (the other
two passed as-written). Gate: wasi **387/387**; bindgen 142, mod, hybrid, jstyper, merge, varscope,
bundle 4/4, wasmmerge_guard, and the three TinyGo `go_*` suites (TinyGo present — genuinely ran, not
skipped) all **0 failures**.

## `bundle_tests.ts` StructImport — struct types gated on PascalCase spelling (FIXED 2026-07-28)

**Class:** LOUD · **Status:** FIXED 2026-07-28 · **Scope:** compiler

The one long-standing red suite. `StructImport` (a two-file fixture importing `interface Vec2`
from `vec.ts`) aborted with 10 "unsupported expression" diagnostics — every `a.x` field access and
both struct literals.

**Root cause — a spelling proxy standing in for an authoritative registry.** wasic decided "is this
type annotation a struct?" with `/^[A-Z]\w*$/`, i.e. *PascalCase means struct*. `tsbundler` prefixes
every imported symbol with the module's **filename**, which is conventionally lower-case: `Vec2` in
`vec.ts` becomes **`vec_Vec2`**. That name is a perfectly valid registered struct but fails the
capitalization test, so no param was registered in `structVars`, no struct literal was allocated,
and every field access fell through. Bisected with single-file probes: `Vec2` ✅, `Vec_2` ✅,
`A_B` ✅, but `vecVec2` ❌, `vec_Vec2` ❌, `abc_Vec2` ❌, `_Vec2` ❌ — the underscore is irrelevant,
**only the first character mattered**. So it was never bundler-specific: a hand-written
`interface point {}` failed identically in a single file.

**Fix.** Use the registry that was already being consulted one line later. At the eight
struct-annotation sites (`sdm`, `namedTupleLitStmt`, `structSpreadMatch`, `structLetMatch`,
`namedTuplePre`/`Pre2`, `structPre`/`Pre2`) the regex is now `(\w+)` instead of `([A-Z]\w*)`; each
is immediately followed by a `structDefs`/`structVars`/`structSpreadVars` lookup that returns
undefined for a non-struct, so the relaxation cannot widen what they accept. The struct-array
element check drops its redundant `/^[A-Z]/` (the `structDefs.has()` beside it already decides).
The function-param `structType` gate had no registry guard, so it is **additive**: PascalCase
behaves exactly as before, plus any identifier already in `structDefs`/`classDefs` (`parseStructs`
and `parseClasses` both run before `parseFunctions`, so the lookup is populated).

**Deliberately NOT fixed in the bundler.** Capitalizing the mangled prefix would have papered over
it while leaving the same bug for hand-written lower-case type names, and would have broken
tsbundler's documented invariant that the canonical name is always `<module>_<original>`.

Regression `12_LowercaseStructTypeName` (lower-case and `_`-initial interfaces; field read, field
write, struct params, struct literals). Gate: wasi **384/384**, **bundle 4/4 (was 3/4)**, bindgen
142, jstyper 73, mod 55, merge 1, varscope 12, wasmmerge_guard — all zero failures.

## Stress-test batch (2026-07-28) — 8 new Phase 22/24/25/26 tests surfaced 6 bugs, all FIXED

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-28 · **Scope:** compiler (bugs 4 and 6 silent; 1–3 and 5 loud)

Owner supplied 8 hand-written stress tests (Phase 22 enum-folding/casts, 24 nullable returns, 25
nullish/logical-assignment, 26 `for…of`/destructuring). 3 passed as-written; the other 5 each
exposed a genuine defect. Gate after the fixes: wasi **383/383** (was 375; +8 new tests, zero
regressions), bindgen **142**, jstyper 73, mod 55, merge 1, varscope 12.

**1. `expr as T` hardcoded the cast SOURCE type to `i32` for every compound expression**
(`emitExpr`, the Phase 22 ` as ` handler). `**` always emits `(call $mathlib_pow …)` → f64
regardless of the requested `defaultType`, so `(baseVal ** 3) as f64` wrapped an f64 producer in
`f64.convert_i32_s` → `expected type i32, found call of type f64`. Probing showed the far more
common `Math.floor(x) as i32` was broken the same way (`local.set[0] expected i32, found
f64.floor`) — most `Math.*` handlers emit a native f64 op unconditionally; only
`abs`/`min`/`max`/`imul`/`clz32` branch on `defaultType`. **Fix:** new `compoundExprIsAlwaysF64()`
+ `MATH_I32_AWARE` set; those two provably-f64 forms now type as f64. Deliberately conservative —
only whole-expression matches count, so a merely f64-*containing* expression (`(a + Math.floor(x))`)
keeps the i32 default. A blanket `inferExprType` fallback was rejected: `inferInitType` returns
"f64" for anything parenthesized, which would have broken parenthesized i32 arithmetic cast to f64.
Test `22_ConstEnumFoldingAndExponentCast`.

**2. Tuple/struct literal returned from a `T | null` function was emitted as a homogeneous array.**
The nullable-return branch short-circuited with a plain `emitExpr` *before* the dedicated
aggregate-return paths, so `return [100, 3.14159]` from `(): Pair | null` hit the generic
array-literal emitter (which assumes uniform elements) and produced the invalid token
`(i32.const 3.14159)`. Inline and aliased tuple returns both worked; only `| null` broke it.
**Fix:** delegate aggregate literals to the existing struct/tuple return emitters, guarded on the
return type actually resolving to a `StructDef` so plain `i32[] | null` returns keep their path.

**3. `$__nullable_ret_flag` referenced but never declared.** `needsNullableResultFlag` was set only
by a nullable *variable declaration carrying an explicit annotation*; a caller relying on inference
(`const n = maybeGet()`) left the global undeclared while the callee still emitted `global.set` into
it → `undefined global`. Masked by bug 2 (parse error aborted first). **Fix:** set the flag at the
site that references it. Test `24_NullableTupleReturnAndFlags`.

**4. `??` was unsupported inside `console.log` arguments.** `console_log.ts` has no nullable
awareness, so `val ?? -1` fell through to the comment-stub fallback plus a stray unary minus
(printed `-1` instead of `100`). **Fix:** new `setNullishResolver` singleton delegating to
`emitExpr` (same pattern as `_instanceofResolver`), avoiding a 12th parameter on `parseSingleArg`.
Must run BEFORE the boolexpr/ternary blocks — the `_hasTernary` probe matches the leading `?` of
`??` and would otherwise swallow it.

**5. Nullable MODULE globals were unimplemented** — `globalNullable ??= 77` aborted with
*unsupported statement*. `parseModuleGlobals`'s annotation group was `(\w+)`, which cannot match
`i32 | null`, so the declaration never became a global; notably the `??=`-on-nullable-global
**emitter already existed** (`logicalAssignMatch`) — only the declaration side was missing.
**Fix:** persistent `moduleNullableGlobals` map + a companion `$name__null` WASM global + re-seeding
`nullableVarInnerType` after its per-function reset. Test `25_LogicalAssignmentOperators`.
**Self-inflicted regression during this fix (worth remembering):** widening the annotation regex
made `let x: i32 | null = 7` match the OUTER regex for the first time; when promotion declined, it
**fell through to the plain-global path**, registering a global with no `__null` companion while
every reference site still emitted `local.get $x__null` — broke `24_NullUndefined` +
`25_NullishOps` (378/380). Fixed by making a nullable annotation never reach that path, and
restricting promotion to names genuinely referenced in a non-`_start` function body.

**6. Nested `for…of` shared ONE cursor local.** A single `$__forof_idx` meant the inner loop
clobbered the outer loop's index; the outer then re-tested an exhausted cursor and ran exactly one
iteration — a 3×2 matrix summed to **3 instead of 21**. Silently wrong, not a crash. **Fix:**
per-nesting-depth index locals (`forOfDepth` + `forOfIdxLocal()`), incremented around body
emission; depth 0 keeps the unsuffixed name so non-nested loops emit byte-identical WAT. Both
pre-scans declare one cursor per `for…of` statement — an upper bound on nesting depth.
Test `26_NestedForOfMatrix`.

**Verified pre-existing, NOT caused by this batch:** `tests/bundle_tests.ts` `StructImport`
(compile abort, 10 unsupported features) fails identically on a clean tree — confirmed by stashing
the working changes, rebuilding, and re-running. Still open; worth a look separately.

## Code-audit sweep (2026-07-08) — THREE fan-out passes, all fixed, all suites green

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-08 (two documented latent limits remain, see "Known-latent") · **Scope:** other

Three adversarial fan-out passes over the freshly-added asyncify port (binaryen-ts) + Go-bindgen /
WIT-overlay / hybrid / bindgen surface (wasmtk), then over this session's own fix code. Final
gates: binaryen-ts **401/401** · wasi **375/375** · bindgen **142** · go_bindgen **7/7** ·
hybrid **8/8** (new `tests/hybrid_tests.ts`).

**Correctness bugs found and FIXED:**

- **binaryen-ts `walk.ts` — `call_indirect` children walked target-before-operands** (reversed
  eval order). wasm evaluates operands first, then the table index; since Flatten hoists preludes
  via `mapChildrenShallow`, a `call_indirect` (Go interface / func-value call shape) whose target
  and operands interact was silently miscompiled. Fixed `_mapChildren` + `_visitChildren`; +IR
  regression asserting operand→target order.
- **binaryen-ts `flatten.ts` — a non-last bare `unreachable` was dropped** (trivial with empty
  prelude, hit neither block branch → the trap vanished, control fell through). Kept as a
  statement; +structural regression.
- **wasmtk WIT kebab↔camel round-trip is lossy** (`toKebabCase` lowercases: `parseHTML` →
  `parse-html` → `kebabToCamel` → `parseHtml` ≠ `parseHTML`), breaking export lookup for
  capital-heavy names (`parseHTML`/`readJSON`/`getID`) in BOTH the merge-import overlay (hard
  compile error) and bindgen (runtime `exp["parseHtml"] is not a function`). Fixed: overlay keys
  through `toKebabCase` on both sides; bindgen loader resolves via an `_ex()` load-time kebab
  fallback. +e2e regression fixture `kebabcase_50` (readID/toHTML).
- **wasmtk hybrid scanners — not string/comment/regex-aware.** The `hybrid` call-rewriter/body-
  extractor originally counted braces & matched names inside strings/comments (fixed pass 1: made
  string/comment-aware), then a deeper pass found they still didn't recognize **regex literals** —
  a regex in host code (`.replace(/["'{}]/, …)`, common) opened a phantom string that silently
  disabled ALL downstream call rewrites (→ runtime `ReferenceError`) or truncated a `@wasm` body.
  Also the session's context-aware rewrite had **regressed** call-rewriting inside template `${…}`
  interpolations (the old blind regex happened to handle them). Final state: a shared
  `skipLiteral` (string/comment/**regex** with regex-vs-division disambiguation) + `${…}`
  interpolation recursion + multi-line-import injection fix. See design-decisions.md § "hybrid
  call-rewriting / body-extraction MUST be context-aware". +8 hybrid tests.

**Robustness / fail-loud conversions (silent-wrong → hard error or honored behavior):**
asyncify now ensures a memory exists (upstream `ensureExists`), honors `import-globals` (imports
the two globals; verified encode/instantiate), rejects multi-memory, accepts newline-split &
legacy-alias (`blacklist`/`whitelist`/`relocatable`) option lists, and diagnoses bad list entries;
`witTypeToWat`/`parseWitType` fail loud on unknown/aggregate WIT types (and the wasic merge catch
now RE-THROWS a `wasic:` diagnostic instead of burying it as a "skipping" warning);
`parseWitFuncs` rejects multi-value returns; bindgen guards the generated `cabi_post_<name>` call;
the gowasic wasm-opt shim is now runtime-agnostic (Deno/Bun/Node) with a runtime-branched launcher.
Dead code removed (`hasIndirectCall`, hybrid `forceHost`).

**Known-latent, documented (not silent):** asyncify add/remove/only-list options key on internal
function names, so real-symbol lists won't match a binary-parsed module (name section dropped) —
lists work against ModuleBuilder/named-WAT modules; needs name-section retention when asyncify is
wired to binary-parsed input. Nested-backtick-inside-`${…}` is the one residual hybrid template
edge. Both documented inline.

Commits: binaryen-ts `e616d8f`/`27a6f2f`/`0cc225b`/`c5bee62`, wasmtk `0e94a38`/`7531e34`/`07f1c94`/
`ff69717`/`e75baa3`.

## wabt-ts BACKEND bugs surfaced by the `.wast` spec runner — NOT wasmtk-side

**Class:** SILENT-WRONG · **Status:** FIXED 2026-07-02 (wabt-ts 1.3.4/1.3.5) · **Scope:** other — this line covers only the preamble's 3 execution findings; each `###`/`####` below carries its own line.

The `wasmtk wast` conformance runner (`src/wast.ts`, gate `tests/wast_tests.ts`) runs the official
WebAssembly spec `.wast` testsuite through the pluggable WABT backend + host V8. Each isolated execution
failure is a genuine `jsr:@jrmarcum/wabt-ts` (active backend) bug (V8 is spec-compliant; fed wabt-ts's
bytes it yields the wrong result). None affect the wasmtk suite (375/375) — wasic doesn't emit these
shapes. Report/prompt for the wabt-ts team: `scripts/wabt-ts-bug-report.md`.

**✅ ALL 3 EXECUTION findings FIXED across wabt-ts 1.3.4 + 1.3.5 (2026-07-02). The whole core spec suite
runs clean (gate: 41 files, 12444 exec assertions, 0 fail; suite 375/375 on 1.3.5).** Two **parse** gaps
opened later — see "Parse gaps" below. They cost skips, never failures, so the gate stays green.

- ✅ **FIXED 1.3.4 — `br_if`/`br_table` with a branch value.** Was: dropped the value / yielded the
  condition, or emitted bytes V8 rejected ("expected 1 elements on the stack for branch").
- ✅ **FIXED 1.3.4 — over-precise HEX float consts** (`0x1.00000100000000001p-50` → `0x26800001`, was
  truncated to `0x26800000`).
- ✅ **FIXED 1.3.5 — Bug C: decimal `f32.const` double-rounding.** Was: `(f32.const
  +8.8817847263968443574e-16)` → `0x26800000` and `+8.8817857851880284252e-16` → `0x26800002`; now both
  correctly single-round decimal→f32 to `0x1.000002p-50` = `0x26800001`. `const.wast` is now in the gate.
  (wabt-ts 1.3.5 added exact single-rounding `decimalToBits`; f64 consts stay on `parseFloat`. Note: the
  runner's expected-value oracle parses the `.wast` hex literal `0x1.000002p-50` directly to bits — it is
  NOT hardcoded/V8-derived — so it computes the same `0x26800001` by exact hex-float decode and agrees.)

**Two RUNNER improvements made while re-validating on 1.3.4 (real correctness, not workarounds):**
(1) a **void** export returns `undefined` → treat as `[]` (was `[undefined]`, length-1, mismatching a
0-result `assert_return` — this was the bulk of the "new" `nop`/`func` fails once the br_if fix let those
modules compile); (2) an argument that is a **NaN with a specific payload** (`nan:0x…`) is **skipped** —
a non-canonical NaN payload can't survive the JS number boundary (V8 canonicalizes it), so
`reinterpret`-of-NaN-payload tests are untestable via a JS host, not a bug.

The runner also counts validation-assertion toolchain leniency (`assert_invalid`/`assert_malformed` that
wabt+V8 fails to reject) as **skips**, not failures.

### wasic emits LEGACY exception handling — Wasmtime cannot run it (OPEN, 2026-08-24)

**Class:** LOUD · **Status:** FIXED 2026-08-25 (see "LEGACY EH MIGRATED TO `try_table`" below; the heading's OPEN predates it) · **Scope:** compiler

Reported by the **wabt-ts** side (`wabt-ts/scripts/wasmtk-eh-report.md`, commit `b26b6a99`) and
**confirmed here against freshly regenerated artifacts** (wasi suite 417/417, corpus rebuilt
2026-08-24 11:29, `wasmtime 47.0.3`).

**Every TypeScript `try`/`catch`/`finally` compiles to the superseded legacy EH proposal.**
Wasmtime rejects all of it at compile time:

```
Invalid input WebAssembly code: legacy_exceptions feature required for try instruction
```

**This is not a feature flag.** `wasmtime -W` offers only `exceptions[=y|n]` — the *standard*
proposal (`try_table`/`exnref`). There is no `legacy-exceptions` knob in any configuration.
Verified: `wasmtime -W help | grep exception` returns that one line.

**Why it hid for so long, and the reusable lesson: our gate's oracle is V8, and V8 still accepts
legacy EH.** The wasmtk suite is 417/417 green with every one of these modules broken on the
primary WASI host. A single-engine gate cannot see this class of defect at all. **`wasmtk wast`
has the same shape** — it validates through host V8 (see architecture.md), so the same blind spot
applies there. Adding Wasmtime to the EH tests is the durable fix, not just migrating the emitter.

**Scope — 10 modules, not the 6 first reported** (their corpus copy is 272 `.wat`; ours is now 373,
so their snapshot is ~100 files behind). All 10 confirmed REJECTED by Wasmtime:

```
15_Exceptions   15_IdiomaticCatch_Stress   15_LexicalShadowing_Stress
15_TestCase1-NestedEscalation   15_recover   18_Multi-ScopeScaleAndMemoryLongevityTest
56_AsyncReject   60_AsyncAll   64_ReportModuleTryCatch   64_ReportThrowTemplate
```

**Emission sites** (`src/wasic.ts`; the report's ~13976/13992/13994 are stale):

| line | emits | migrate to |
| --- | --- | --- |
| 14749 | `(try (do …))` | `try_table` inside an enclosing block |
| 14756 | `(catch $__exn_tag …)` | `(catch $__exn_tag $h)` — handler becomes a BRANCH TARGET |
| 14772 + 14774 | `(catch_all …)` + `(rethrow 0)` | `(catch_all_ref $h)` + `throw_ref` |

**Only TWO shapes need migrating, not three.** The report's middle row — a bare
`(try (do B) (catch_all H))` with no rethrow — **is never emitted**: `catch_all` is generated only
inside the `hasFinally` branch and *always* followed by `(rethrow 0)`. Corpus-verified: 2
occurrences of `(catch_all`, both with `(rethrow 0)`. **No `delegate` is emitted anywhere**
(confirmed — the only "delegate" in `src/wasic.ts` is an English word in a comment at :10691).

**The structural change**, which is where the work actually is: in legacy `try` a catch clause is an
inline handler; in `try_table` it is a *branch target*. Handler bodies move OUT of the try into an
enclosing block, and the tag's params arrive as that block's results. Worked examples for both
shapes are in the report.

**Caveat carried over, measured by them:** Wasmer 7.2.1 runs *neither* form — with `--enable-all` it
reports "No backends support the required features" for legacy and `try_table` alike. Migrating
fixes Wasmtime and does not change Wasmer. Not a reason to defer; Wasmtime is the host WASI names.

### The wabt-ts `KNOWN_INVALID` list is STALE — do not act on it (checked 2026-08-24)

**Class:** SILENT-WRONG · **Status:** CLOSED 2026-09-30 (superseded: the `KNOWN_INVALID` list lives in wabt-ts, FROZEN since the 2026-08-27 merge into binaryang; nothing in wasmtk reads it. If binaryang still carries it, retiring it is theirs) · **Scope:** other

The same report repeats seven modules as "genuinely invalid wasm … V8, Wasmtime and Wasmer all
reject them". **Not reproducible here.** Against artifacts regenerated from current `wasic`, all
seven RUN CLEAN on `wasmtime 47.0.3` — exit 0, correct output:

```
19_NestedDiscriminantUnions   19_VariantMaximumMemoryAlignment   3_enums
32_BasicDiscUnion             32_DiscUnionMixed                  32_Phase32Combined
5e_MixedSignatures
```

Their `KNOWN_INVALID` asserts these *stay* invalid, which was meant to make the list shrink as wasic
is fixed. Because their corpus copy is frozen at 272 files, the assertion still passes against old
bytes — so it is now doing the opposite of its purpose: **masking a fix rather than tracking one.**
Same failure mode as the `proposals/threads/` false alarm (see testing.md): a stale vendored
snapshot read as a live signal. Fix is on their side — re-vendor the corpus.

### wast runner memory — ✅ FIXED, verified 2026-08-25 (was OPEN; the diagnosis below was wrong)

**Class:** LOUD · **Status:** FIXED 2026-08-25 · **Scope:** other

**A full 288-file directory run now completes in ONE process** — `37247 passed, 102 failed, 27275
skipped, 162 unbuilt modules`, no OOM, totals identical to the chunked gate.
`proposals/custom-descriptors/exact.wast`, which used to exhaust the heap on its own, reports
`pass=20 fail=0 skip=16`.

**Neither cause was the one predicted below.** It was two discrete bugs, not memory retention:

1. **Ours** — an infinite loop in the S-expr reader on a lone `;` (`readAtom` stopped without
   consuming it), which is what produced the ~1.9 GB. Fixed by taking any character `readAtom`
   cannot consume as a one-character atom, so the loop cannot stall on a future one.
2. **wabt-ts** — a `parseWat` blow-up on `(ref (exact any))`: **50 characters → 4 GB.** Fixed
   upstream in **wabt-ts 1.4.1**, which is what let `exact.wast` back in.

🎓 **The standing hypothesis was "instantiated modules and their `WebAssembly.Memory` buffers, which
V8 does not reclaim promptly" — a lifetime redesign.** It was plausible, specific, written down, and
completely wrong; there is no creep to fix. It survived because it was recorded in the same voice as
a measurement. The text below is preserved as the record of that, not as guidance — **read it as a
retracted hypothesis.**

### (RETRACTED) wast runner memory — OPEN as of 2026-08-20 (OURS, not a backend bug)

**Class:** n/a (not a defect) · **Status:** — (retracted hypothesis; see entry above) · **Scope:** other

`wasmtk wast <dir>` over the full 288-file spec corpus dies with `Fatal JavaScript out of memory:
Ineffective mark-compacts near heap limit`. Heap reaches ~1.9 GB within the first few files, then
creeps ~1–6 MB per file; `proposals/custom-descriptors/exact.wast` exhausts the heap **on its own**.

**Partial fix landed (2026-08-20).** `runWast` called `await wabt()` per file — a fresh WABT module
per file, never released — now a process-wide singleton via `getWabt()` in `src/wast.ts`. Measured:
that alone did NOT stop the dir-run OOM, so most retention is elsewhere. Prime suspect is
instantiated modules and their `WebAssembly.Memory` buffers (the 64-bit memory tests reserve large
memories), which V8 does not reclaim promptly. **Do not assume the singleton fixed it** — it did
not, and re-testing after a "fix" is the whole point here.

Knock-ons to be aware of before touching this:
- The 280-file `wast_tests` gate fits in one process; a full 288-file rescan does not. That is why
  `--update-baseline` chunks across subprocesses.
- An OOM **cannot be caught in-process**, so any single-process full-corpus scan is one bad file away
  from losing all its results.

### 2026-08-24 "look for code issues" audit — 5 passes, 9 fixed, 1 retracted

**Class:** SILENT-WRONG · **Status:** FIXED 2026-08-24 · **Scope:** compiler (`evalEnumExpr`, `console.log(a == b)`); also other (CLI exit 0, Zig `report()`, gate holes)

Full trigger sweep. Grouped by what the defect actually was, because three of them are the SAME
SHAPE in different files: a result that was computed correctly and then never reached the caller.

**🔴 `console.log(a == b)` emitted an INVALID module and reported success.** `console_log.ts`'s
boolean detection tested `/===|!==/` but never `==` / `!=`, so loose equality was not recognised as a
boolean, fell through to the numeric path, and emitted an i32 comparison where an f64 was expected:
`CompileError: expected type f64, found f64.eq of type i32`. wasic printed `✅ WASI … (3136 bytes)`
first. **`wasic.ts` handles `==` correctly everywhere else** — verified `if (a == b)` and
`const c: boolean = a != b` — so this was purely the `console_log.ts` half of the documented
parallel-code-path pair ([design-decisions.md](design-decisions.md)). Fixed; all three engines agree.

**🔴 `evalEnumExpr` silently returned 0.** An initializer that would not evaluate —
`enum E { A = B }` with B unresolved — was caught and became `A = 0`, **silently colliding** with any
other member at 0. Now pushes a `diagnostics` entry (traced through `warnings` → `aborted: true`, so
it genuinely aborts) and reports the supported grammar. The adjacent non-finite case was fixed too:
`NaN | 0` was also becoming 0.

**⚠️ `wasmtk convert` / `wasm2js` printed ❌ and EXITED 0.** Both were `Promise<void>`; the catch
logged and the CLI fell through to `break`. Any script or CI checking `$?` read a failed conversion
as success. Widened to `Promise<boolean>` and checked at the call sites. **Isolated, not CLI-wide**
— `wasic` on bad input exits 1 correctly, which is what pins it as a local hole.

**⚠️ Zig producer: `report()` claimed success without checking the artifact.** The size read was in
an ignoring catch, so a build that exited 0 without emitting a file was announced as `✅` with the
size quietly missing. Now verifies the file exists and is non-empty. A failed binaryen `-Oz` was also
swallowed; it now warns and labels the output `UNOPTIMISED`.

**⚠️ `convertFile` rewrote the wrong path segment.** `String.replace` with a string pattern hits the
FIRST occurrence, so `build.wat/out.wat` → `build.wasm/out.wat`. The sibling `wasm2js` 20 lines above
already anchored with `/\.(wasm|wat)$/`. Anchored; verified through the CLI.

**Gate holes found in the gate written the same day** — recorded because the audit's own new surface
is the place it is least likely to look:
- `unbuilt` was written into **159 baseline entries and never compared**. It matters most exactly
  where the pass check is toothless: **71 files are pinned at pass == 0** (a zero cannot drop), 66 of
  them with unbuilt > 0. `table_copy.wast` (pass 0, unbuilt 51) could have reached 100 silently.
- The known-failing branch **short-circuited the pass check**: `linking.wast` is pinned at 4 failures
  / 120 passes, and had its passes fallen to 50 with failures still 4, the `else if` chain printed
  "KNOWN FAILING" and the gate went green. **An `else if` chain is the wrong shape for independent
  invariants** — it reports the first and hides the rest. Now collected and reported together.

**Low:** a ternary with two identical arms (`parseIntLit`), and two locals computed then
`void`-discarded in `assemble()`. Removed.

**🎓 RETRACTED — not a bug.** `/===|!==/` is a raw regex where every sibling operator uses
`findTopLevelOp` (nesting- and string-literal-aware). Predicted a nested `===` would misclassify;
tested `pick(1 === 1)` and it printed 10/20 correctly — an earlier branch catches call tokens first.
**The inconsistency is real, the inferred bug is not.** Recorded so it is not "fixed" again.

**Structural gap, flagged not fixed: `zigwasic.ts` (286 lines) and `rustwasic.ts` (64) have NO test
suite**, while `zig`, `cargo` and `rustc` are all installed and working here and Zig fixtures sit in
the corpus. Two of the findings above live in exactly that unguarded code. A small suite would have
caught the `report()` bug automatically. See [next-work.md](next-work.md) (before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`).

### `fd_write` short writes — ✅ FIXED 2026-08-24 (found by the multi-engine gate on run one)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-08-24 · **Scope:** compiler

**Found by the new multi-engine gate on its very first full run** (`tests/engine_cross_check_tests.ts`),
which is exactly the class of defect it was built for: 37 corpus modules produce **different stdout on
wasmtime than on V8** — and match on wasmer and wazero, so V8-only testing could never see it.

**The bug is OURS, and the source comment blamed the wrong side.** `console_log.ts` carried
*"wasmtime 43 only processes the first iov"* as the justification for gather mode. Measured on
wasmtime 47.0.3 with a two-iovec fixture (`iov[0]`=2 bytes, `iov[1]`=1 byte):

| engine | bytes out | `nwritten` reported |
| --- | --- | --- |
| wasmtime 47.0.3 | 2 of 3 | **2** — honest short write |
| wasmer 7.2.1 | 3 of 3 | 3 |

WASI explicitly permits `fd_write` to write fewer bytes than requested; the caller must loop.
**wasic never reads `nwritten` back** — it is stored at `NWRITTEN_OFFSET` (128) and no emitted code
ever loads it, and no emitted path retries. So a short write silently truncates.

**Visible symptom:** `console.log(<boolean expression>)` loses its trailing newline on wasmtime.
`1_values` prints `falsetruefalse` instead of three lines — output is **exactly 3 bytes short**, one
per lost newline. `boolexpr` is the shape that shows it because it is deliberately excluded from
gather mode (the WAT expression would be evaluated twice — once for the ptr select, once for the len
select — which is unsafe for a side-effecting expression), so its newline lands in a second iovec.

**Gather mode MITIGATES, it does not fix.** One iovec makes a short write less likely, not
impossible; a large enough single write can still truncate. The fix is a retry loop around
`fd_write`, and the natural way to also make `boolexpr` gatherable is to evaluate it ONCE into a temp
local and use that local for both selects.

**THE FIX (2026-08-24).** A `$__fd_write_all` helper that loops until every iovec is drained, advancing `ptr` and shrinking `len` in place on a partial write. It bails on a non-zero errno and on **zero progress** — the second guard matters: a runtime reporting success while writing nothing would otherwise spin forever. Emitted whenever `hasConsoleLog` is set, i.e. gated on exactly the same flag as the `$fd_write` import, so the helper exists in every module that can call it and no module that cannot.

**Both call sites were rerouted** (gather mode and per-iov mode). Note the per-iov path was the one showing the symptom, but the gather path had the same latent defect — one iovec is less likely to short-write, never immune.

**And the parallel path was fixed too, differently and on purpose.** `internalizeDynrtHostImports` in `src/wasic.ts` splices its own `__host_print` with an inline single-iovec `fd_write`; it now carries its **own** inline loop rather than calling the shared helper, because it is injected into an already-merged module that need not contain `$__fd_write_all`. Verified by `dync_cross_runtime_tests.ts` 3/3.

**Measured result:** `1_values` on wasmtime 58 → 61 bytes, matching V8/wasmer/wazero exactly. The engine gate went **0 regressed, 37 improved** — every one of the 37 `differ` entries flipped to `match`, and nothing else moved. Full suite green AT THAT COMMIT: wasi 417/417, wast 281 files 27651/0, all polyglot suites. (The wast figure moved to 287 / 27983 / 12 pinned later the same day when known failures were pinned rather than excluded — quoted here as-of, not as current.)

⚠️ **Parallel code paths:** `src/wasic.ts` and `src/console_log.ts` each own their own string
handling ([design-decisions.md](design-decisions.md)). Check BOTH for `fd_write` emission before
calling this fixed — there are two `nwrittenOffset` call sites in `console_log.ts` alone
(~3040, ~3177).

### `console.log(<bool expr>)` evaluated its argument TWICE — ✅ FIXED 2026-08-24

**Class:** SILENT-WRONG · **Status:** FIXED 2026-08-24 · **Scope:** compiler

Found while fixing `fd_write` above — same code region, unrelated defect, and **worse in kind**: it changes program semantics rather than output formatting.

`console_log.ts` emits a `boolexpr` segment as two stores, and interpolates the argument's WAT into **both**:

```wat
(i32.store (i32.const iovPtr) (if (result i32) <EXPR> (then trueOff) (else falseOff)))
(i32.store (i32.const iovLen) (if (result i32) <EXPR> (then 4)      (else 5)))
```

So any side effect in `<EXPR>` happens twice. Reproduced:

```ts
let calls: number = 0;
function isPositive(n: number): boolean { calls = calls + 1; return n > 0; }
console.log(isPositive(5));
console.log(calls);          // prints 2 — should be 1
```

This is also **why `boolexpr` is excluded from gather mode** (the exclusion comment says so), so the two are the same knot: evaluate the expression ONCE into a temp i32 local, use that local for both selects, and `boolexpr` becomes gatherable at the same time. Needs a spare local plumbed through the emitter, which is why it was not folded into the `fd_write` change.

**THE FIX — and it needed no temp local, contrary to the first write-up here.** Restructuring to a
single **statement-form** `if` with both stores inside each arm evaluates the operand exactly once:

```wat
;; was: two value-form ifs, operand interpolated twice
(i32.store (i32.const iovPtr) (if (result i32) <EXPR> (then trueOff) (else falseOff)))
(i32.store (i32.const iovLen) (if (result i32) <EXPR> (then 4)      (else 5)))

;; now: one if, both stores per arm
(if <EXPR>
  (then (i32.store (i32.const iovPtr) (i32.const trueOff))
        (i32.store (i32.const iovLen) (i32.const 4)))
  (else (i32.store (i32.const iovPtr) (i32.const falseOff))
        (i32.store (i32.const iovLen) (i32.const 5))))
```

**The same restructure was applied to the GATHER branch, which was worse — THREE evaluations**
(`srcExpr`, `lenExpr`, and `lenExpr` again for the cursor bump). Harmless for `boolvar`, fatal for
an arbitrary expression. Everything now duplicated across the arms is pure: `destExpr` is a constant
or an `i32.load`, and offsets/lengths are compile-time constants.

**That unlocked the second half.** `boolexpr` joined `gatherable` and `strBoolKinds`, so
`console.log(x > 0)` now gathers and absorbs its trailing newline into a single iovec instead of
emitting two. The exclusion comment and the double-eval bug were **one knot, not two** — the
exclusion existed *because* of the multiple evaluation.

**Verified:** the counter repro prints `1` (was `2`), and wasmtime/wasmer/wazero all agree.

⚠️ Pure `boolexpr` shapes (comparisons, `instanceof`, `f64.ne`) are unaffected in OBSERVABLE terms — only a **call** returning `bool` shows it, which is why a corpus of mostly-pure predicates never surfaced it.

### wabt-ts 1.4.0 — cleared THREE blockers, but the bump was REVERTED same-day (2026-08-25)

**Class:** grouping — each blocker is classified under its own `####` below (not counted in the tally).

Probed BEFORE bumping, per the recorded plan. All five `try_table` handler forms encode; `ref.null`
encodes for every heap type; and `proposals/custom-descriptors/exact.wast` — the 50-character input
that took `parseWat` to 4 GB and killed the process — now runs. `(module definition …)` still does
not parse, which is expected: that one really is upstream-wabt parity.

**Corpus effect, measured:** passes **27,983 → 37,247** (+9,264), skips **37,252 → 27,275**
(−9,977), unrunnable **1 → 0**, files **287 → 288**. Failures went 12 → 102, every one of them in a
file that had been DARK. Scoped in [next-work.md](next-work.md) (before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`).

#### Blocker 1 of 3 — `unknown type` — ✅ FIXED 2026-08-25 (and it was not what it looked like)

**Class:** LOUD · **Status:** FIXED 2026-08-25 · **Scope:** compiler (`internalizeDynrtHostImports`, `src/wasic.ts`)

**The dangling `(type N)` was the symptom; matching a pretty-printer's exact output was the bug.**
`internalizeDynrtHostImports` recognised its two host imports with regexes requiring
`(func $x (param i32 i32))` EXACTLY. wabt-ts 1.3.5's `wasm2wat` emits that; **1.4.0 emits
`(func $x (type 1) (param i32 i32))`**. Under 1.4.0 the patterns silently stopped matching, so:

1. the host imports were never internalized — the module kept an `env.*` import it must not have
   (and the dync portability invariant exists precisely to forbid that), and
2. the un-removed line carried a `(type N)` indexing the SOURCE module's type section, which does
   not survive the merge — hence `error: unknown type`.

**Fix:** make the `(type N)` group optional and the whitespace flexible in both regexes. Verified on
1.4.0: 0 `env` imports remain, the definition is present, the module assembles. No-op on 1.3.5
(dync 3/3 unchanged).

⚠️ **An earlier attempt — stripping `(type N)` inside `wasmmerge` — was treating the symptom**, and
its side effect of making the regex match again is what made it look partly right. Reverted.
**A regex over generated text is a coupling to a formatter, not to a format.**

### ✅ LEGACY EH MIGRATED TO `try_table` — 2026-08-25, on wabt-ts 1.4.1

**Class:** n/a (not a defect) · **Status:** — (fix record for the legacy-EH entry) · **Scope:** compiler

**The headline defect of the whole exchange, and it is fixed.** Every TypeScript `try`/`catch`/
`finally` now compiles to the STANDARD exception proposal. Measured on `15_Exceptions`: legacy
`(try` = 0, `try_table` = 3, `rethrow` = 0, and **V8 and wasmtime produce byte-identical output** on
a module wasmtime refused to load at all before.

**Three emitted shapes**, each with uniquely-labelled blocks (`$__eh_done{N}` / `$__eh_tag{N}` /
`$__eh_all{N}`, from a module-scoped counter) because a `try_table` catch clause is a BRANCH TARGET,
not an inline handler — without unique labels an inner handler shadows an outer one:

| source | emitted |
| --- | --- |
| `try/catch` | `(catch $__exn_tag $h)`; payload arrives as the block's `(result i32 i32)` |
| `try/finally` | `(catch_all_ref $h)` + `throw_ref` — this is what replaces legacy `rethrow 0` |
| `try/catch/finally` | tag handler runs catch-then-finally and rejoins; `catch_all_ref` runs finally then re-throws the ORIGINAL |

**`$__exn_tag` keeps both params on purpose.** `src/utils.ts` reads `exports.__exn_tag` and calls
`err.is(tag)` / `err.getArg(tag, 0|1)` to turn an uncaught throw into
`error: Uncaught (in Wasm) Error: <msg>`. The binaryen-ts side specifically warned us not to break
that, and they were right — dropping it would silently degrade every uncaught error to an opaque trap.

#### ⚠️ The deliberate cost: `try_table` modules SKIP binaryen `-Oz`

**Class:** SILENT-WRONG · **Status:** FIXED 2026-08-27 (binaryang 1.5.2; skip removed) · **Scope:** other (binaryen `-Oz` miscompiled `try_table`)

binaryen-ts 1.4.3's binary reader rejects a multi-value block type, and a two-param tag makes the
handler block's type necessarily multi-value. `try_table` itself is fine in binaryen-ts; multi-value
BLOCKS are the gap (multi-value function RESULTS are fine). So `watToOptimisedWasm` returns the raw
wabt bytes when the WAT contains `try_table`.

This narrowly reinstates a skip that existed for exception modules until 2026-06-08 (then for an
unrelated `-Oz` CoalesceLocals bug). **Modules that throw are therefore larger.** The alternative was
emitting legacy EH that wasmtime and wasmer both refuse to load, which is not a trade.
**DELETE THAT BRANCH the moment binaryen-ts reads multi-value blocks** — acceptance test is
`scripts/eh_try_table_fixture.wat` through the full pipeline, expecting exit 34.

> ✅ **CLOSED 2026-08-27 — fixed in the PUBLISHED binaryang 1.5.2; skip removed after our own gate.**
> `check_try_table_oz.ts` exit 0 (pre-Oz 42 / post-Oz 42), `15_Exceptions` and
> `15_LexicalShadowing_Stress` matching the TS reference through real `-Oz`, then the full gate:
> **wasi 417/417**, wast ON BASELINE unchanged, engine re-recorded at `0 regressed, 10 improved`.
> Payoff beyond correctness: 10 throwing modules ship optimised output (`15_Exceptions`
> **4534 → 1345 bytes**) and **10 modules newly LOAD on wasmer** (353 → 363 match) — raw wabt output
> was being rejected there. 🎓 **A skip that looks like it only costs size can also cost
> portability.** The prior note, kept because the sequence is the point:
> binaryang fixed the `-Oz` defect and closed our three API gaps (`listPasses()` exported, kebab-case
> pass names resolving, unknown-pass error listing registered names). **None of it is published.**
> Their own instruction, and the right one: do not lift against an unpublished branch — re-verify
> with `check_try_table_oz.ts` **plus** `15_Exceptions` + `15_LexicalShadowing_Stress` against a
> version we can pin. Given what the last removal cost, a note saying "fixed" is not the same
> evidence as our gate saying so.
>
> ⚠️ **Our pass spellings were RIGHT and we recorded them as wrong.** We wrote that
> `coalesce-locals` et al. were "unknown to the compat surface" — which reads as our spelling being
> at fault. It was their resolver: `compat/binaryen` emulates `npm:binaryen`, where kebab-case is
> exactly what the docs tell you to write. 🎓 **When a lookup rejects your input, "my input is wrong"
> and "their lookup is wrong" are both live hypotheses; we recorded the first as fact without
> testing it.** Re-run the bisect on 1.5.2 and send them the offending pass name.
>
> ### 🚨 Exposure: we match their "tag whose signature no function shares" in 11 modules
>
> Their `-Oz` hunt turned up five more defects, all GC-shaped. **We emit zero ref-typed shapes** — no
> `(ref $T)`, no `(ref null $T)`, no `ref.null` with a user-defined heap type anywhere in the
> 417-module corpus — so four of the five are unreachable from wasic output *today*. That is a
> consequence of wasic not emitting GC types yet, **not a guarantee**: the day it does, all five go
> live at once.
>
> The fifth needs no ref types and **we are in its shape**. `$__exn_tag` is `(param i32 i32)` and no
> function we emit shares that signature (nearest: `(param i32 i32 i32 i32)`). Critically, **the
> `try_table` skip does not cover all of them**: a program that throws but never catches gets a tag
> and NO `try_table`, so the skip does not fire and the module goes through `-Oz` normally. There are
> **11 such modules** (`15_panic`, `15_Trap-On-Error`, `3_enums`,
> `13_SecureMatrixManagerIntegration`, the four `46_*` escape tests, +3). All 11 **pass** output-diff
> on 1.5.1. Asked upstream whether defect 5 requires a `(ref $T)` param or whether an unshared plain
> signature suffices — if the latter, 11 modules should be failing and are not, which we would rather
> understand than enjoy.
>
> 🎓 **A byte-identical baseline over a fixed corpus can only catch regressions in shapes the corpus
> already contains.** Their 421-file byte baseline was unchanged by every one of these fixes, which is
> exactly why it never caught them. Ours has the same blind spot from the same cause: no ref types in
> the corpus means it is structurally incapable of seeing four of the five, however green it reads.
> **Coverage of INPUTS is a separate axis from strictness of COMPARISON**, and a very strict
> comparison over a narrow corpus reads as reassurance it has not earned.

> **⚠️ THE SKIP STAYS — and the reason changed. Retracting an earlier "resolved" note in this file.**
> binaryen-ts 1.5.0 does fix the READER (multi-value blocks load), the acceptance fixture passes
> `-Oz` at exit 34, and on that evidence the skip was deleted. **The full gate then failed
> `15_Exceptions` and `15_LexicalShadowing_Stress`** — so the skip was reinstated the same hour, now
> for a *second, worse* defect.
>
> **1.5.0's OPTIMIZER silently miscompiles `try_table`.** `-Oz` CoalesceLocals merges a local that is
> live across a catch EDGE, because binaryen's EH-aware CFG models legacy `try`/`catch` inline
> handlers, not `try_table` — where a catch clause is a **branch target**. One cause, two symptoms:
>
> | test | expected | `-Oz` produced |
> | --- | --- | --- |
> | `15_Exceptions` | `-1` | `0` |
> | `15_LexicalShadowing_Stress` | `Shadow Check: Outer String` | `Shadow Check: Inner Literal Error` |
>
> The second is the sharper one: an inner `catch (e)` overwrote the **outer** `e`. This is the same
> class as the CoalesceLocals bug that kept exception modules off binaryen until 2026-06-08 — fixed
> then *for legacy EH*. The `try_table` migration put us back outside what that CFG understands.
>
> 🔬 **Attribution is measured, not assumed.** Assembling `15_Exceptions.wat` with the SAME wabt and
> running the pre-`-Oz` bytes prints the correct `-1`; the `-Oz` bytes print `0`. Same WAT, same
> assembler, one variable.
>
> 🎓 **The acceptance fixture passed the whole time, and that is the lesson.**
> `scripts/eh_try_table_fixture.wat` exercises `try_table` but has **no local live across a handler
> edge**, so it cannot see this bug — yet it was treated as sufficient evidence to remove a safety
> skip. A fixture built to prove a feature *works* is not a fixture that proves an optimiser is
> *safe*. **The real gate for lifting this skip is `15_Exceptions` + `15_LexicalShadowing_Stress`,
> and a fixture that keeps a value live across a catch edge should be added before the next attempt.**

🎓 **How it got unblocked, which is the reusable part.** This sat recorded as "blocked on
binaryen-ts" for a day. It was only half true: their reader genuinely cannot take the block, but the
block is not mandatory *in the pipeline*. The note in `wasic.ts` saying exception modules once
skipped binaryen is what reopened it. **Before accepting a blocker, ask whether the blocking
component is on the critical path or merely on the current path.**

### 🔥 wabt-ts 1.4.1 prints const-exprs UNFOLDED — six folded-only regexes silently no-opped (FIXED 2026-08-25)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-08-25 · **Scope:** other (`wasmmerge.ts`/`wasmbundle.ts`; one site in `wasic.ts`; seen only as a hang)

**The most dangerous bug of this batch, and it was OURS, not wabt's.** Found only because a full
`wasi_tests` run *hung* — two processes burning 1146s and 540s of CPU. A hang, not a failure.

**Symptom.** `main_func` / `main_funcs` in `tests/wasi/wasm_wasi_bundle/dynrt_eval_bundle/` built
fine and then span forever. Neither module contains a single `try`/`catch`, which immediately
exonerated the same-day `try_table` migration — **check whether the suspect code is even reachable
from the failing input before you start bisecting it.**

**Root cause.** wabt-ts 1.4.1 changed its pretty-printer to emit constant expressions unfolded:

| | global initialiser |
| --- | --- |
| wabt-ts ≤ 1.3.5 | `(global $g (mut i32) (i32.const 0))` |
| wabt-ts 1.4.1 | `(global $g (mut i32) i32.const 0)` |

Both are valid WAT. We parse that text with regexes, and **six of them hard-coded the folded
bracketing** (`\(i32\.const\s+(\d+)\)`). Every one silently matched nothing:

- `getDataMaxEnd` (`src/wasmbundle.ts`) returned **0**, so `dataOffset` never advanced and every
  merged module's data stacked at the same base.
- The data-extent scan in `src/wasmmerge.ts` left `dataHi === 0`, whose guard disables
  `relocateDataPtrs` **wholesale** — so no data pointer anywhere was relocated.
- `src/wasic.ts` fell through to its `: 260 /* DATA_BASE fallback */`, under-advancing the heap.

Net effect: `$__heap_ptr` was seated at 1366 instead of 2140 — **inside static data**. The allocator
then handed out addresses over live constants, and the corrupted state showed up as an infinite
loop. `relocateDataPtrs` itself was already bracket-agnostic; it never got the chance to run.

**Fix.** `CONST_EXPR_RE` + `constExprValue` / `replaceConstExpr` in `src/wasmmerge.ts` match either
bracketing and *preserve* the one wabt used; the other four sites take an optional-paren pattern.
Verified by rebuilding on both versions and diffing: **zero numeric differences** between the 1.3.5
and 1.4.1 output (the residual diff is bracketing plus `nop` padding 1.4.1 no longer emits).

🎓 **The lesson is already written three lines above this entry** — "a regex over generated text is a
coupling to a formatter, not to a format" — and we still shipped six of them. Restating it did not
help; what helps is the mechanical rule now enforced in the code:

> **Parsing wabt output: never require a bracketing you did not emit.** Read const-exprs through a
> helper that accepts folded *and* unfolded and preserves what it found. A hard-coded bracketing does
> not throw when the printer changes — it returns "nothing here", which every caller reads as a
> legitimate empty result. Silent no-op → corrupt memory → hang, which is the worst failure ladder
> we have. If a relocation scan finds **zero** segments in a module that has data, that is a bug,
> not an empty set.

⚠️ **`grep` for the sibling copies before declaring it fixed.** The first patch fixed three sites in
`wasmmerge.ts`, and the module *still* failed — `heap_ptr` stayed at 1366 — because three more lived
in `wasmbundle.ts` and `wasic.ts`. `grep -rn -F '\(i32\.const' src/*.ts` finds them all; it must come
back empty. See the parallel-code-paths warning in `CLAUDE.md`.

#### Blocker 2 of 3 — `duplicate local $alist` — ✅ FIXED 2026-08-25

**Class:** LOUD · **Status:** FIXED 2026-08-25 · **Scope:** compiler

`dynArrayMethod` in the dynrt library declares `const alist` in **four separate branches**.
TypeScript scopes those independently; wasic hoists every declaration to a function local. Several
registration paths feed `declaredLocals` and only the supplementary scan checked `locals` first, so
the emitted WAT carried four `(local $alist i32)`. wabt-ts 1.3.5 tolerated duplicate local names;
1.4.0 rejects them. **The malformation predates 1.4.0.**

**Fix:** dedupe `declaredLocals` by name at emission, TYPE-AWARE. A repeat at the same type is pure
redundancy and is dropped; a repeat at a DIFFERENT type is two distinct variables collapsing onto one
slot, so it raises a `diagnostics` entry instead of silently keeping whichever came first. A blind
dedupe would have converted a loud parse error into a silent miscompile.

Measured: `dynrt_lib_modc.wat` 4 → 1, and a corpus-wide scan went from 3 affected functions
(`$alist`, `$ln`, `$fn`) to **zero**.

⚠️ **`bundle_tests` passed 4/4 while the malformation was still present** — it read a `.wat` from 16
minutes earlier. The count only moved after the file was deleted and regenerated. The stale-artifact
rule in [testing.md](testing.md) exists for exactly this, and it nearly banked a fix as verified on a
test that never re-ran the compiler.

#### Blocker 1b — 1.4.0 dync output is EMPTY (CLOSED 2026-09-30, resolved: see Status)

**Class:** SILENT-WRONG · **Status:** CLOSED 2026-09-30 (resolved: the 1.4.0 attempt that printed nothing was REVERTED; the later 1.4.x bump landed only after the three malformations it exposed were fixed, with both dync suites green, and both pass 3/3 on binaryang 1.8.1, 2026-09-30. The UTF-16 hypothesis below was never confirmed and no longer needs to be) · **Scope:** other

With blocker 1 fixed the module assembles on 1.4.0 and still prints nothing. Same input yields a
structurally IDENTICAL module — same section counts, 157 data segments, 34 globals — but **774 bytes
less data**: `$__heap_ptr` starts at **2542** on 1.3.5 and **1768** on 1.4.0.

**Two hypotheses tested and DISPROVEN — recorded so they are not retried:**
- *Removing an import shifts the function index space.* No: every call in the merged WAT is
  name-based (`grep -c '(call [0-9]'` = 0).
- *The internalized print clobbers data by writing its iovec at 0/4/128.* No: data segments start at
  **260** in both versions, so 0–259 is genuinely reserved scratch.

**Live hypothesis, NOT confirmed:** data-segment contents are being measured in UTF-16 code units
rather than UTF-8 bytes somewhere in `wasmmerge` — the same class as the `decodeWatString` bug fixed
earlier the same day, in the OTHER string-handling path. Confirm before acting on it.

⚠️ **THE BUMP IS REVERTED — we are pinned at 1.3.5.** The figures above are what 1.4.0 WOULD give;
they are NOT current. The wast gate was reported clean before the full suite finished — a premature
claim — and when it finished it showed **wasi 417/417 → 378/417** with both dync suites at **0**.
1.4.0's stricter validation rejects three classes of malformed WAT we have always emitted:

1. **`unknown type`** — `wasmmerge` copies import lines verbatim, carrying a `(type N)` index into
   the SOURCE module's type section. That section does not survive the merge, so the index dangles.
   1.3.5 accepted it. ⚠️ **An attempted fix (stripping the index) made it compile and then produced
   EMPTY OUTPUT**, because removing `(type N)` made a regex in `internalizeDynrtHostImports` start
   matching a line it had been skipping. Reverted — that coupling is not yet understood, and it is
   the first thing to work out before retrying.
2. **`duplicate local $alist`** in the bundle path's generated library WAT.
3. a runtime `memory access out of bounds` in `18_Multi-Scope…`, cause unestablished.

**These are OUR bugs.** Fix them on 1.3.5, where they are latent, rather than under a red suite —
then re-bump. Order matters: fix, then bump.

🎓 **RETRACTION — I told the wabt-ts team `ref.null $t` would not move.** The 2026-08-24 report
classified `ref.null` with a CONCRETE type index as parity with upstream wabt (whose `ParseRefKind`
accepts only `func`/`extern`/`exn`) and said no wabt-ts release would change it. 1.4.0 changed it.
Running the probe rather than trusting my own note is what caught it. The `(module definition …)`
half of that same claim did hold.

### `decodeWatString` corrupted every non-ASCII character — ✅ FIXED 2026-08-25

**Class:** LOUD · **Status:** FIXED 2026-08-25 · **Scope:** other (spec runner; surfaced as 368 failures)

Pushed `s.charCodeAt(i)` into a `number[]` that becomes a `Uint8Array`, which truncates anything
above `0xFF`. `names.wast` exports a function named **U+FEFF** (raw `EF BB BF` in the source): we
pushed `0xFEFF`, it became `0xFF`, and the export lookup missed. Astral characters were worse — a
lone surrogate each. **Fix:** encode the code point as UTF-8 via `TextEncoder`, and skip the low
surrogate the loop would otherwise re-read.

**`names.wast`: 113 pass / 369 fail → 481 pass / 1 fail.** 368 of the 470 failures the bump surfaced
were this one bug.

⚠️ **The bug PREDATES 1.4.0 entirely.** It was invisible because those modules never assembled — a
latent defect of ours sitting behind a toolchain gap, which is exactly why a file reading
`0 passed, N skipped` has to be treated as dark rather than healthy.

### wabt-ts cannot ENCODE `try_table` — blocks the EH migration (OPEN, 2026-08-24)

**Class:** LOUD · **Status:** FIXED 2026-08-25 (wabt-ts 1.4.x per the entries above; the heading's OPEN predates it) · **Scope:** other

Found while closing a caveat the binaryen-ts team raised (they asked which side should fix the
legacy-EH problem; see `scripts/binaryen-ts-report.md`). **This inverts the plan recorded earlier
the same day**, which had the `try_table` migration as startable-now.

**wabt-ts 1.3.5 encodes legacy `(try …)` fine and cannot encode ANY `try_table` carrying a handler.**
The parser accepts every form; the binary writer rejects them:

```
binary writer: unresolved name-var "$__exn_tag" for var — run resolveNames before encoding
  at BodyWriter.beginTryTableExpr (wabt-ts/src/writer/binary-writer.ts:407)
```

| form | result |
| --- | --- |
| `(catch $t $h)` / `(catch 0 $h)` / `(catch_ref $t $h)` | ENCODE-FAIL |
| `(catch_all $h)` / `(catch_all_ref $h)` | ENCODE-FAIL |
| `try_table` with no handler; `throw_ref` alone; legacy `try` | OK |

The numeric-tag case fails on the **branch label** `"$h"`, not the tag — so it is not tag resolution
alone. Same class as the `ref.null` encode bug below: same message, same writer, and `resolveNames`
is exposed on neither `/compat` nor `wat2wasm`. **Plausibly one fix for both.**

**Expected to be fixed in wabt-ts 1.4.0** (owner, 2026-08-24). Verify with the encoder probe BEFORE
re-recording anything — see [next-work.md](next-work.md) § "THE NEXT BUMP IS wabt-ts 1.4.0" (before 2026-09-30: `git show ab5d1273644:cmem/next-work.md`).

**Why it blocks us:** wasic's pipeline is WAT text → **wabt** → binary → binaryen
(`watToOptimisedWasm`, `src/wasic.ts:205–240`). wabt is unavoidable, so wasic cannot emit
`try_table` until this is fixed — and legacy is what wasmtime refuses. We can currently produce
*only* the form the primary WASI host rejects.

**The target shape is proven, so this is purely an encoder gap.** A nested fixture exercising both
required forms — `(catch $tag $h)` and `(catch_all_ref $h)` + `throw_ref` for `finally` — runs
correctly on `wasmtime 47.0.3` with **no `-W` flags**, exiting 34 = `l(33) + finally_ran(1)`, which
proves the catch handler bound the tag params **and** the finally body ran before the exception
propagated to the outer handler. Fixture: scratch `tt_fixture.wat`, shape reproduced in
`scripts/binaryen-ts-report.md`.

**Not verified, and it matters:** whether **binaryen-ts** can *emit* `try_table`. With wabt-ts unable
to encode it and no `wasm-tools`/`wat2wasm` on this machine, there is no way to get a `try_table`
binary *into* binaryen-ts locally. Asked them to confirm on their side. If binaryen-ts also cannot
emit it, both proposed options need work there and the sequencing changes again — **do not assume
the binaryen half is clear.**

### wabt-ts `ref.null` + parser gaps — OPEN as of 2026-08-20 (wabt-ts 1.3.5)

**Class:** LOUD · **Status:** FIXED 2026-08-25 (item 1: `ref.null` encodes in wabt-ts 1.4.0 per the entry above; items 2–3 are upstream parity, not defects) · **Scope:** other

> **Corrected 2026-08-20 (same day).** The first version of this entry blamed
> "typed function references `(ref null $t)`" and said a wabt-ts bump would likely recover them. Both
> were wrong, and the correction matters because it changes who owns the fix. `(ref null $t)` as a
> **type** (param/result) assembles fine. Two of the three gaps are **parity with upstream wabt**, so
> no wabt-ts bump will move them. And the biggest one was missed entirely.

Surfaced by the 2026-08-20 corpus sync to upstream `65a43d2e`. None of these fail an assertion —
`src/wast.ts` skips a module it cannot assemble, **and every action depending on it** — so the gate
stays green while coverage silently drains into skips. That is exactly what a regression looks like
from a distance: **measure per file, never by total.**

**1. `ref.null` cannot be encoded for ANY heap type — the big one (genuine wabt-ts bug).**
Parses for most heap types, then throws in wabt-ts's own binary writer:
`binary writer: unresolved name-var "funcref" for var — run resolveNames before encoding`.
For `any`/`eq`/`i31`/`none`/`nofunc`/`noextern` the message names **`funcref`** — the *wrong* type —
so the heap type looks like it is dropped at parse time and defaulted. `exn`/`struct`/`array` fail
earlier, at parse. `ref.func $g` encodes fine, so it is specific to `ref.null`. The error tells the
caller to run `resolveNames`, but **the `/compat` parse result exposes no such method**. Cost:
`ref.null func|extern` appears in **27** corpus files; `ref_null.wast` is **0 pass / 34 skip** —
entirely dead.

**2. `ref.null $t` (concrete type index) — parity with upstream wabt, NOT a wabt-ts bug.**
Upstream's `ParseRefKind` errors `ErrorExpected({"func","extern","exn"})`, i.e. abstract heap types
only. This is the actual `return_call.wast:95` killer (col 45 = the `$t` operand, **not** the
`(ref null $t)` result type). Cost: `return_call.wast` 44 → **12** pass, +35 skip.

**3. `(module definition …)` — parity with upstream wabt, NOT a wabt-ts bug.** Upstream's parser has
no `definition` handling either. Cost: `proposals/custom-page-sizes/memory_max{,_i64}.wast`
4 → **2** pass each. 8 corpus files use the form.

`enable_all: true` is **already** set on `parseWat` (`src/wast.ts:441`) — none of this is a flag we
forgot to pass. None of these constructs are anything `wasic` emits, so no wasmtk output path is
affected; the cost is spec-runner coverage only. Report written up for the wabt-ts team in
`scripts/wabt-ts-bug-report.md` (§ "NEW — 2026-08-20"), including the limits of our evidence: it is
all via `/compat`, and the upstream-parity claims are read from GitHub source, not a built binary.
Provenance + the full per-file manifest: [testing.md](testing.md) § "Vendored spec testsuite".

---

Live record of bugs found + fixed. Newest first. **✅ NO SUITE-FAILING BUGS — full suite 375/375** (`bindgen` 131/131, `jstyper` 73/73, `dync` conformance 3/3) as of **2026-07-01** (mathlib `sin`/`cos`/`tan` are now **correctly-rounded** double-double — the canonical value every libm agrees on, validated bit-for-bit vs a BigInt CR oracle through the full pipeline; regression `67_TrigCorrectlyRounded` — see issue 5 below + design-decisions.md. Plus `66_Dragon4Formatting` for the Dragon4 f64→string rewrite — see issue 6 below and design-decisions.md; prior baseline 373/373 = #14 Route A `18zh`–`18zz` + gap regressions `62_Gap*` + `63_Gap*` + user-report `64_Report*` + trig 5a `65_ReportTrigLargeArg`).

**f64 `toString` — issue 6 (2026-07-01) ✅ FIXED with pure Dragon4.** The old `$__f64_to_str`
(×1e15 + shortest-round-trip shortening loop) both (a) capped at ~15 sig-figs — diverging from
V8's 17-sig-fig shortest for values like `Math.SQRT2`, `7/3` — and (b) **trapped** (`i64.trunc_f64_s`
"float unrepresentable in integer range") on `|x| ≥ ~9.2e18` and emitted **no scientific notation**
for runtime values. Rewrote it in `src/console_log.ts` as a hand-written-WAT **Dragon4
(Burger-Dybvig free-format)**: 48-limb (1536-bit) fixed-size bignums (`R/S/m+/m-`) in a lazily
`$__malloc`'d 1 KB scratch region held in a new `$__d4s` module global (declared in `wasic.ts`
`toWat()`), 7 bignum helpers (`$__bz/$__bset64/$__bmul_u32/$__bshl/$__bcmp/$__badd/$__bsub`),
robust bidirectional k-estimate fixup, round-to-even ties, then full ECMAScript
`Number.prototype.toString` formatting (fixed vs scientific in both directions; sign, zero,
±Infinity, NaN). **100% byte-exact vs V8** — validated at `0/3017` fuzz mismatches (incl.
subnormal `5e-324`, max `1.7976931348623157e308`, and previously-wrong Grisu cases) + regression
`66_Dragon4Formatting`. Dropped the now-obsolete `// @allow-output-diff` on `1_values`,
`7a_MathIntrinsics`, `45_random-numbers` (all now byte-exact). `7a_constants` keeps its marker but
its one remaining diff is a **mathlib `sin(5e8)` last-ULP** difference (mathlib polynomial vs V8
libm; ~13 sig-figs agree), NOT formatting — Dragon4 renders mathlib's value exactly.

**User issue report (2026-06-30, "Basics of Coding WASM" lesson set) — 4 of 6 issues FIXED in `src/wasic.ts`; regressions `64_Report*`:**
- **Issue 1 (HIGH — was SILENT, most dangerous):** `throw new Error(`template`)` (or a variable/concat message) ESCAPED an enclosing try/catch — the throw handler only matched a string-LITERAL `Error("…")`; a template/var fell to the `proc_exit(0)` fallback (a clean exit that skips the catch → no output, exit 0). FIXED: `throw new Error(<expr>)` / `throw <template|concat>` now builds the message into a `$__throw_msg` (ptr,len) temp (via `emitStringAssign`) and emits `(throw $__exn_tag …)`. A bare `throw e` (re-throw of the caught string var) still uses the direct var path. `$__throw_msg_ptr/len` declared in both pre-scans when a function/`_start` contains any `throw`. (`throw new Error(dynamicVar)` — which previously failed to COMPILE — is fixed by the same path.)
- **Issue 2 (HIGH — compile abort):** `str += someString[index]` → `$__str_op_ptr cannot be resolved` — the `$__str_op` temp-declaration trigger's char-subscript regex required an adjacent `+`, missing a bare `x += s[i]`. FIXED: added `\+=[^;]*\w+\[` to the trigger (both pre-scans). (Blocked `57_base64-encoding`.)
- **Issue 3 (MEDIUM — compile abort):** a module-scope `try/catch` with a bound catch var → `$e_ptr/$e_len cannot be resolved` — `_start`'s `(local …)` declarations were built ONLY from `startLocals`, but the catch handler pushes the `(ptr,len)` pair to `startDeclaredLocals` (which was never emitted). Most handlers set both, so it only bit the catch var. FIXED: `_start` local decls are now the UNION of `startLocals` (non-string) and `startDeclaredLocals`, de-duped (mirrors the in-function path, which builds from `declaredLocals`).
- **Issue 4 (HIGH — compile abort):** an array-typed interface field via a function PARAM — `p.origin.length` / `p.origin[i]` — was "Unsupported expression". Two root causes: (a) `StructField` didn't remember a field's array element type (a `T[]` field stored plain `i32`), and (b) `allocStructData` had NO array-field case, so a struct literal `{ origin: ["a","b"] }` hit the numeric branch → `parseFloat("[…]")` → 0 (field never held the array — so even the documented alias workaround produced empty output). FIXED: `StructField` gained `arrayElemType`/`arrayIsString` (set in `parseStructs`); `allocStructData` allocates a literal array field and stores its pointer; `emitExpr` + `emitStringPtrLen` gained `structVar.field.length` / `structVar.field[i]` (string + numeric) handlers. (Blocked `49_xml`.)
- **Issue 5 (LOW/MED — ✅ NOW CORRECTLY-ROUNDED 2026-07-01; supersedes the fdlibm + 5a notes below):**
  mathlib `sin`/`cos`/`tan` now return the **IEEE-754 correctly-rounded** result — the canonical value
  every correct libm agrees on (max accuracy + max cross-language compat; see design-decisions.md for the
  full rationale vs "match V8 bit-for-bit"). **Key finding driving this:** modern V8's `Math.sin/cos`
  delegate to LLVM-libc's `shared::sin/cos`, which are only *faithfully*-rounded (≤1 ULP, ~99.76%
  correctly-rounded) and a moving version-pinned target — so bit-for-bit-V8 is both fragile and less
  accurate than correct rounding. **Implementation:** double-double (dd) arithmetic in `mathlib.wat` —
  `$__ts`/`$__tp` (Veltkamp twoProduct, no FMA) + `$__dda`/`$__ddm`/`$__ddmd`/`$__ddri`/`$__dddiv`
  (multi-value `(hi,lo)` returns), dd Taylor kernels `$__ddsin`/`$__ddcos` (11 terms), the table-free
  Veltkamp n-split reduction `$__trig_reduce` (dd remainder in `$__tr`/`$__trt`); `tan = dd sin/cos` via
  `$__dddiv`. **Validated bit-for-bit vs a BigInt correctly-rounded oracle through the FULL pipeline**
  (wat2wasm + merge + Binaryen `-Oz` preserves the dd ops): sin/cos 1032/1032 + tan 412/412, 0 off,
  `|x|` to 1e12 (CR to ~1e15). Pure f64 (no Payne-Hanek table / no linear memory) → survives the merge.
  Regression `67_TrigCorrectlyRounded`; `7a_constants` byte-exact (`sin(5e8)` is a CR==V8 arg). NOTE:
  wasic trig now differs from Deno's V8 on the ~0.24% where V8 isn't correctly-rounded — intended (wasic
  is more correct). Reference-validated (dd JS impl vs oracle) before the WAT port, same as Dragon4.
  — Prior fdlibm note (≤1-ULP, superseded) / 5a note (large-arg range reduction only):
- **Issue 5 (LOW/MED — ✅ FIXED 2026-06-30, "5a"):** `Math.sin`/`cos`/`tan` of a LARGE argument diverged at the ~7th sig-fig. Root cause was the **range reduction**, not the polynomial: `mathlib.wat` reduced mod 2π with a SINGLE f64 2π constant, so for `sin(5e8)` the constant's ~1e-16 relative error was multiplied by `floor(x/2π) ≈ 8e7` → ~5e-8 absolute error in the reduced angle. FIXED with a **3-term Cody-Waite split** of 2π (HI with low mantissa bits zeroed so `k*HI` is exact for `|k| < 2^30`, + LO1 + LO2) in `$sin` and `$cos` (`tan = sin/cos`). `sin(5e8)` now matches JS to ~13 sig figs (was 7). Regenerated `mathlib.wasm` + `mathlib_bytes.ts`. Regression `65_ReportTrigLargeArg` (self-checking tolerance bands). NOTE: the trig POLYNOMIALS are still ~1e-11-accurate minimax approximations (e.g. `cos(1.0)` differs from JS at the ~11th digit) — a separate, deeper limit (better coefficients / more terms) not addressed here; only the large-argument reduction blow-up was fixed.
- **Issue 6 (LOW — ✅ FIXED 2026-07-01):** f64 `toString` differed (`.wasm` ~15 sig-figs vs the JS engine's 17-sig-fig shortest-round-trip) and TRAPPED / lacked scientific notation for large-magnitude runtime values. Replaced `$__f64_to_str` with pure Dragon4 → 100% byte-exact parity with V8. Full write-up at the top of this file + design-decisions.md.

**Separately DISCOVERED while fixing issue 1 (✅ FIXED 2026-09-28: broader than described here; see "Numbers and booleans in string values were silently dropped" at the top):** `"code " + x` where `x` is an i32 **parameter** drops the number (`"code 7"` → `"code "`) — a `string + i32-param` concat gap (template interpolation `${x}` works fine, so it's specific to the explicit `+` concat of a string with a numeric param). Simple workaround: use a template literal.

**Low-priority OPEN-gap cleanup (2026-06-30) — all 5 documented gaps FIXED.** Regressions `62_GapNumericCoercion` / `62_GapStringCalls` / `62_GapSingleLineLocals` / `62_GapEmptyArrayGrow` / `62_GapStringLiteralBraces`. Each is a `src/wasic.ts` codegen fix (see the individual sections below, now marked FIXED):
- **Gap 1** (single-line brace `if (c){return 1}else{return -1}` return mis-type) — was ALREADY resolved by the `fixTerminalFallthru` + `expandInlineBraceChain` work; verified across i32/f64/no-else/nested/brace-less/multi-line-else forms. The old "still-open" note was stale.
- **Gap 2** — an **f64-returning call in an i32 context** (`f() | 0`) now truncates: the general user-call return in `emitExpr` wraps `(i32.trunc_f64_s …)` when `fn.result` is f64/f32 and `defaultType` is i32 (mirrors the f64-local + parseInt paths). `| 0` folds away in Binaryen, so the raw f64 call was landing under an i32 op.
- **Gap 3** — a **primitive `const`/`let` nested in a block on a single-PHYSICAL-line function body** is now declared as a WAT local (supplementary `maskCode`-masked scan in `emitFunction` after the anchored pre-scan). Was `local "$x" cannot be resolved`.
- **Gap 4** — `parseFunctions` was **string-blind**: `function f(){…}` INSIDE a string literal (`const s = "function f(){…}"`) parsed as a real declaration → mangled source. Now detects headers over `maskCode(src)` (positions preserved → slice from real). Same class as the `parseClasses` fix. (`parseTopLevel`'s brace-count also now masks strings, defensively.) `dync`'s base64 embedding no longer strictly needs this but keeps it.
- **Gap 5.0/5.1/5.2/5.3** (the "4 gaps surfaced by dynrt", worked-around-in-lib) — now fixed in the compiler: **5.0** i32 global / TypedArray element as an f64 call-arg (module-global path + TypedArray-element read now coerce like the local path); **5.1** `+` of two string-returning CALLS (guarded the greedy string-call regex + a call-in-concat handler that emits the call then reads the `$__str_ret_*` globals into the accumulator before the next call clobbers them); **5.2** Float64Array element in a comparison (binary-op `lhsType` inference now consults `typedArrayVars`, so `fa[i] === fa[j]` uses `f64.eq`); **5.3** empty `[]` grown from capacity 0 (the `push`/`unshift`/`push_string` grow helpers now use `select(8, cap<<1, cap==0)` so a cap-0 array grows to 8 instead of staying 0 — empty arrays reconstructed each loop iteration + pushed now work).

**Separately DISCOVERED while testing the gaps — now ALL FIXED 2026-06-30** (regressions `63_GapModuleGlobalArrayInFn` / `63_GapConsoleLog2D` / `63_GapSingleLineLoopArray`): (a) a **module-global array read/written INSIDE a function** used the `-2` moduleArrayVars ptr sentinel as the base → 0. FIXED: the 12 array-element base-computation ternaries + the emitExpr bracket read now route ptr `=== -2` through `arrGetWat` → `(global.get $arr)`. (b) **`console.log(grid[i][j])`** (2D dynamic-array element directly in console.log, and as an operand) emitted a comment-stub → 0. FIXED: added a 2D handler to `parseSingleArg` + `exprToWat` in `console_log.ts` (loads the row ptr then the element); exposed `is2D` on `ArrayLookup`. (c) a **`const`-declared array inside a single-PHYSICAL-line loop body** (`for(…){ const row=[]; row.push(…) }` on one line) wasn't registered → `'row' is not defined`. FIXED: a supplementary `maskCode`-masked scan in the startBodyLines pre-scan registers nested array decls (emission already handles single-line bodies via splitStmts).

**#14 2h (2026-06-30) — three interpreter/compiler fixes surfaced building `wasmtk dync`:** (1) **interpreter HANG on a multi-byte UTF-8 char in a comment** — `evalSkipWs` had NO comment handling; line/block comments "worked" only by accident via a downstream parse path that LOOPED on a high byte (e.g. an em-dash `—` in `// …`). FIXED by giving `evalSkipWs` real `//` and `/* */` skipping (safe: the interpreter has no regex LITERALS — RegExp is `new RegExp("…")` — so `//`/`/*` are unambiguously comments). (2) **`Math.min`/`max` were 2-arg only** in `dynMathMethod` (ignored args 3+; `Math.min(3,7,2)`→3) — now variadic; caught by the dync conformance gate. (3) **wasic source scanner was string-blind to `{`** — a module-level string literal CONTAINING a brace made `parseTopLevel`/`parseFunctions` mis-parse it. `dync` sidesteps it by **base64-embedding** the program source; **now also FIXED directly** (Gap 4 above — `parseFunctions` + `parseTopLevel` mask strings). (+`18j`–`18t` dynrt: value-model / virtual

**#14 2h (2026-06-30) — three interpreter/compiler fixes surfaced building `wasmtk dync`:** (1) **interpreter HANG on a multi-byte UTF-8 char in a comment** — `evalSkipWs` had NO comment handling; line/block comments "worked" only by accident via a downstream parse path that LOOPED on a high byte (e.g. an em-dash `—` in `// …`). FIXED by giving `evalSkipWs` real `//` and `/* */` skipping (safe: the interpreter has no regex LITERALS — RegExp is `new RegExp("…")` — so `//`/`/*` are unambiguously comments). (2) **`Math.min`/`max` were 2-arg only** in `dynMathMethod` (ignored args 3+; `Math.min(3,7,2)`→3) — now variadic; caught by the dync conformance gate. (3) **wasic source scanner is string-blind to `{`** (KNOWN limitation, worked AROUND not fixed): a module-level string literal CONTAINING a brace makes `parseTopLevel`'s regex brace-count mis-count depth and split the line on `;` inside the string (`const s = "function f() {\n …;\n}"` → "Unsupported statement" fragments). `dync` sidesteps it by **base64-embedding** the program source (alphabet has no `{}`/`;`/`"`/newline). A proper fix would make `parseTopLevel` mask strings via `maskCode` — deferred (higher regression risk; not needed for any current path). (+`18j`–`18t` dynrt: value-model / virtual
import / eval / eval-env / calls / statements / functions+`new Function` / `18q` wasic `any`
type+auto-merge / `18r` GC Part 1 auto-grow heap / `18s`-`18z` GC Parts 2-5b + polish COMPLETE (… / splitting / hybrid segregated+coalescing allocator). 4 known wasic gaps are OPEN but worked around in the dynrt library — see next
section; 2d.1/2d.2/3.1 added none. 3.1 has its own documented FOLLOW-UPS — see dynrt-design.md
"Increment 3 → 3.1": any-param unbox, `as string` unbox, inline-cast comparison, non-literal boxing). 3 KNOWN wasic
gaps are OPEN but worked around in the dynrt library (so the suite stays green) — see the next
section; each is a candidate for a real `src/wasic.ts` fix (then the lib workaround can be removed,
the RegExp `&&` precedent). (Pre-18j: 317 = 307 at v1.7.0 + 2 Phase-53 tests + 8 async tests 54–61;
`bindgen` 103→104 from the ABI return-side forward-alignment's `cabi_post` assertion.)

## FIXED — wasic `parseClasses` was string-blind: `class …{}` inside a STRING parsed as a real class (#14 2e.8, 2026-06-26)

**Class:** LOUD · **Status:** FIXED 2026-06-26 · **Scope:** compiler

Surfaced building #14 2e.8 (classes in the dynrt interpreter): the test driver passes eval-source STRINGS
like `"class Point { constructor(x){ this.x = x; } … } const p = new Point(5); …"` to `dynRun`. wasic's
`parseClasses` (`src/wasic.ts`) ran its `class\s+(\w+)…{` regex over the RAW `this.src` (string-blind), so
it matched `class Point {` INSIDE the driver string, brace-counted the body over the raw source (string
braces miscounted), and extracted a bogus class — leaking its constructor/method bodies as 11 "Unsupported
statement: this.x = x;" errors. **Fix:** detection now runs over a CODE-ONLY mask
(`maskCode(this.src)` from `src/varscope.ts` — string/comment chars → spaces, length preserved) for BOTH
the `classRe` match and the body brace-count; the class body is still SLICED from the real source (valid
because maskCode preserves positions). Same string-blind class as the earlier `=>` / `?.` / `eval(` /
`Function(` fixes — `maskCode` is now the shared code-only primitive (it also backs the 2e.7b var gate).
General wasic improvement: any real wasic program with `class …{}` text inside a string literal now
compiles. Regression test: `18zo` (the 2e.8 pipeline). Full suite re-validated 349/349 — real class tests
(Phase 9/16/17/47) unaffected (maskCode only blanks string/comment CONTENT, leaving real `class` decls
visible).

## FIXED — `deno fmt` wrapped a deeply-indented ternary that modc can't parse (process bug, 2026-06-26)

**Class:** LOUD · **Status:** FIXED 2026-06-26 · **Scope:** other (process; dynrt lib source)

Found building #14 2e.7: the dynrt lib (`tests/wasi/wasm_wasi_bundle/dynrt_bundle/dynrt_lib_modc.ts`) is
compiled by **`modc`**, whose body-line joiner does NOT handle a multi-line (wrapped) ternary. Three
deeply-indented ternaries in the 2e.4 member/index-assign path (16-space indent, >100 cols) — e.g.
`const cur: i32 = isDot === 1 ? dynMember(container, segKey) : dynIndexValue(container, segIdx);` — were
WRAPPED by `deno fmt` into `const cur =\n  ? …\n  : …` form, which modc reports as `Unsupported statement:
? dynMember(...)` / `: dynIndexValue(...)` and aborts. **This had silently shipped in v1.10.6's committed
SOURCE** (the lib no longer round-tripped through modc) — but the shipped RUNTIME was unaffected because
`caps_bytes.ts` is generated from the PRE-`fmt` compiled `.wasm`, and the suite passed because the
`@test-pipeline` `modc` step ran on the on-disk lib BEFORE the end-of-increment `deno fmt`. **Fix:**
converted the three fragile ternaries to single-line `if/else` (fmt-stable AND modc-parseable). **Lesson
(now in dynrt-design.md build-order):** after `deno fmt`-ing the dynrt lib, ALWAYS re-run `modc` on the
POST-fmt source before committing — `deno fmt` line-wrapping and the modc subset are not fully compatible.
Cheap guard: keep dynrt conditionals as `if/else` rather than long ternaries at deep indentation.

## FIXED — wasic arrow detection mis-fired on `=>` inside STRING LITERALS (#14 2e.3, 2026-06-24)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-24 · **Scope:** compiler (`=>` loud; the `?.` strip silently rewrote string data)

Surfaced building #14 2e.3 (arrow functions in the dynrt interpreter): the test driver passes eval-source
STRINGS like `"const add = (a, b) => a + b;"` to `dynRun`. wasic's two arrow-detection sites scanned the
RAW source (string-blind) and mistook the `=>` inside those string literals for real arrows → either
mangled the source (`parseArrowFunctions`) or split the line (`substituteOneArrow`) → "Unsupported
statement: a + b; …". (Single-param `"f = (a) => …"` happened to pass only because it lacked a leading
`const`.) **Two fixes in `src/wasic.ts`:** (1) `parseArrowFunctions` (the `const NAME = (` source pre-pass)
now tracks string state in its existing pre-match scan and `continue`s when the match index lands inside a
string literal; (2) `substituteOneArrow` replaced `line.indexOf("=>")` with a new module-level
`firstCodeArrowIdx(line)` that returns the first `=>` outside strings/`//`-comments (-1 → no arrow). Both
parallel the earlier `rewriteOutsideStringsAndComments` fix for `eval(`/`Function(`. General wasic
improvement — any program with `=>` inside a string literal now compiles. (A 3rd, dynrt-side bug also
fixed: `runStatement` treated a top-level `x => …` arrow statement as the assignment `x = …` because its
`=` check didn't exclude `=>`; added `peek2 !== '>'`. See dynrt-design.md 2e.3.)

**Same class, 2026-06-24 (#14 2e.5):** the Phase-49 optional-chaining strip `this.src.replace(/[?][.]/g,
".")` in `transpile()` was ALSO string-blind, mangling a `?.` inside a dynrt driver's eval-source string
(`"o?.x"`→`"o.x"`). `?.name` "worked" by accident (`o?.x?.y`→`o.x.y` — same result when nothing is null)
but `?.[k]` broke (`.[` is invalid → undefined → trap). Fixed by routing through
`rewriteOutsideStringsAndComments` (code-only). General wasic fix — any program with `?.` inside a string
literal now compiles correctly.

## FIXED — wasmmerge placed a merged module's non-WASI import AFTER function definitions (#14 Phase 2, 2026-06-24)

**Class:** LOUD · **Status:** PARTIAL — fixed 2026-06-24 in `wasmmerge`; `wasmbundle` still does not route `importWat` (documented follow-up; RE-VERIFIED STILL OPEN 2026-09-30: `src/wasmbundle.ts` never reads `importWat`) · **Scope:** other

Surfaced building #14 Phase 2 (host→core callbacks): the dynrt lib gained ONE `env.__host_call` import
(its first import). Adding it broke `18l` (explicit-path dynrt merge) with a runtime "memory access out
of bounds" — while `18q`/`18za` (virtual-path) passed. Long diagnosis (isolation + GOOD/BAD WAT diff +
npm:wabt cross-check) pinpointed it: `mergeWasmWat` pushed the merged module's non-WASI import into
`funcParts` (the FUNCTION section), so it was spliced **after ~30 function definitions** instead of into
the import section. WASM requires ALL imports before ANY function/global/memory. **npm:wabt rejects** such
a module at parse time; **wabt-ts leniently assembles it** but the import lands at the wrong function
index → the whole function index space is off by one → calls resolve to wrong functions → OOB. (The
pre-binaryen merged WAT was the culprit — wabt-only assembly OOB'd too, ruling out binaryen.) **Fix:**
`mergeWasmWat` now collects non-WASI imports into a separate `importWat` (new `WatMergeResult` field);
`mergeOneWasmImport` splices `importWat` into the main module's import section (right after the last
existing `(import …)`, before memory/globals/functions) instead of with the functions. Verified: import
now at line 5 (before first func at line 11); `18l`/`18q`/`18za` + all 29 `18*` pass. **NOTE:** the
`wasmbundle` CLI path (`src/wasmbundle.ts`) consumes `mergeWasmWat` but does not yet route `importWat`
into its master WAT — a non-WASI import in a `wasmbundle`d module would be dropped (it was already
mis-handled there pre-fix; no regression, no current test exercises it) — documented follow-up.

## "look for code issues" audit of the functions-as-`any` work (2026-06-24, post-v1.9.0)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-24 · **Scope:** compiler (`eval(`/`Function(` pre-pass); also other (bindgen, tsbundler)

Focused audit of the freshly-shipped functions-as-`any` code (pin table, `Function(` producer, bindgen
tag-7 proxy, the tsbundler comment-strip). Suite **335/335 → 336/336** (item 3 added the `18zb`
regression), bindgen **119 → 122**.

- **FIXED — bindgen tag-7 proxy double-unpin (ABA → use-after-free), `src/bindgen.ts` ~line 374.** The
  generated proxy did `_fn.release = () => _dynGcUnpin(_pin)` and `_pinReg.register(_fn, _pin)` with NO
  unregister token. So an explicit `release()` followed by GC fired `_dynGcUnpin(_pin)` a SECOND time
  via the FinalizationRegistry; if that pin slot was reused by a newer pin in between, the newer
  (still-live) handle was wrongly unpinned and could be collected while the host held it. Fix: a
  `let _released` idempotency guard + `_pinReg.unregister(_fn)` in `release()` + register with `_fn` as
  the 3rd-arg unregister token. New assertions in `testGenBindingsAnyFunction` (idempotent / cancels
  registry / unregister token). Severity was low-med (needs release()+GC+slot-reuse interleaving, and
  FinalizationRegistry timing is non-deterministic) but it's a real correctness hole on a non-moving GC.
- **FIXED — tsbundler auto-merge trigger sniffed over a fragile regex strip, `src/tsbundler.ts`.** The
  earlier `Function(`-self-merge fix stripped comments with `…replace(/\/\/[^\n]*/g,"")`, but that eats
  a `//` INSIDE a string literal (e.g. a URL) and the rest of that line with it — hiding a real
  `: any`/`eval(`/`Function(` later on the same line (false-negative → confusing compile failure).
  Blanking strings first instead would let an apostrophe in a comment (`// it's`) start a bogus string.
  Replaced both with a single left-to-right scanner `stripCommentsAndStrings()` that tracks comment AND
  string/template state correctly (string contents → a space, so a trigger inside a string is data and
  doesn't count; comments removed). Verified: dynrt lib still does NOT self-merge (its doc-comment
  `Function(` is blanked), and all existing `any`/`eval` tests still trigger (suite green).
- **FIXED — wasic `Function(`/`eval(` source pre-passes rewrote inside string literals + comments,
  `src/wasic.ts` ~line 17920.** `this.src.replace(/\beval\s*\(/g, …)` and the `Function(` variant
  rewrote the RAW source, so a literal `console.log("call Function() …")` came out as
  `…dynrt_dynMakeFn() …` (wrong OUTPUT, not a compile error — the rewritten token sits inside string
  data). Pre-existing class (the `eval(` pre-pass shipped this way since #14.3.3). Fix: new module-level
  `rewriteOutsideStringsAndComments(src, transform)` — a single left-to-right scanner that copies string
  literals (`'`/`"`/`` ` ``) and comments through verbatim and applies the `eval(`/`Function(` regex
  replacements only to the CODE spans between them. Both pre-passes route through it. Regression test
  `18zb_PrepassStringSafety` (output-diff: a program that PRINTS `eval( … )` / `Function( … )` with no
  real dynamic code — verifies the strings survive AND that dynrt is not spuriously merged). Templates
  are opaque in full (their `${…}` interpolations are not rewritten — a rare accepted under-reach,
  consistent with the tsbundler trigger sniff). The pin table (`dynGcPin`/`dynGcUnpin`, free-slot 0
  sentinel — valid handles are never 0), `dynMakeFn`'s comma-scanner (relies on the now-shipped `||`
  short-circuit), and the marshal-export DCE protection were all audited CLEAN.

## ✅ FIXED 2026-06-30 (was OPEN) — `f64call() | 0` doesn't truncate a call result in i32 context (found 2026-06-23)

**Class:** LOUD · **Status:** FIXED 2026-06-30 · **Scope:** compiler

**Fix:** the general user-call return in `emitExpr` (`src/wasic.ts`) now wraps `(i32.trunc_f64_s …)` when the called fn's `result` is f64/f32 and `defaultType` is i32. Regression `62_GapNumericCoercion`. Original note below.

`s = s + (dynNumberValue(x) | 0)` where `dynNumberValue` returns `f64` miscompiles:
`i32.add[1] expected type i32, found call of type f64`. The `| 0` integer-truncation idiom doesn't fire
when its operand is a direct **function call returning f64** (it works for f64 variables / arithmetic).
Surfaced writing the GC split test (`18y`); worked around by comparing the f64 array elements directly
instead of summing them with `| 0`. Likely the `| 0` handler doesn't recognize a call-typed operand as
f64 needing `i32.trunc_f64_s`. Low severity. Fix site: the `| 0` / i32-coercion path in `emitExpr`
(detect an f64-returning call operand). Bind the call to an `f64` local first as a workaround.

## FIXED — wasmmerge clobbered ALL merged mutable globals to 131072 (#14 GC Part 3, 2026-06-22)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-22 · **Scope:** other (silent heap corruption; trapped only past ~3–4k cells)

`mergeWasmWat` (`src/wasmmerge.ts` ~line 776) rewrote the initial value of **every** `(mut i32)` global
in a merged library to `131072` (the page-2 boundary). That hack was meant for a hand-written library
carrying its OWN bump-allocator free-pointer (the Phase 18 `18_symbol_table.wasm`) — placing that
private heap out of the main module's region. But it fired BLANKET on all mutable globals, including
the ordinary STATE globals of modc capability libraries (whose allocator is unified into the host's,
so they have no private heap). Pre-existing dynrt globals (`pos`, `lastLen`) survived only because
they're written-before-read. **GC Part 3's `__gc_reg` registry pointer is read-before-write** (its `0`
value is the "registry not yet created" sentinel): clobbered to 131072, the lazy-init `=== 0` check
never fired, so `mkCell` treated 131072 as the registry list and wrote cell pointers through it →
heap corruption that manifested as `RuntimeError: memory access out of bounds` once enough cells were
allocated (~3–4k). **Fix:** gate the rewrite on `droppedHeapPtrGlobalIdx === null` — i.e. apply the
131072 relocation ONLY when the library was NOT allocator-unified (the genuine private-free-pointer
case). When the allocator WAS unified, the library's other mutable globals are plain state →
`relocateDataPtrs` them (preserves counters/0/-1; the Stage 0.7 range-scoped relocation leaves
non-data-range values untouched). Verified: Phase 18 symbol-table tests still pass (non-unified path),
all 5 capability libs + dynrt still pass (unified path now preserves their state). This was a LATENT
bug — `__gc_reg` is the first merged mutable global that relies on its initial value.

Diagnosis trail (worth remembering): the tell was `dynGcCellCount()` returning a nonzero garbage value
(768) when the registry was DISABLED — proof the global being read wasn't the one being (not) written,
i.e. an initial-value/relocation problem, not a logic bug.

## ✅ FIXED 2026-06-30 (was OPEN) — single-physical-line function: nested-block `const` not declared as a WAT local (found 2026-06-22)

**Class:** LOUD · **Status:** FIXED 2026-06-30 · **Scope:** compiler

**Fix:** a supplementary `maskCode`-masked scan in `emitFunction` (after the anchored pre-scan) declares any primitive `const`/`let` that follows a `{`/`;` on the same physical line. Regression `62_GapSingleLineLocals`. Original note below.

A function written on ONE physical line whose body has a nested block declaring a local —
`function check(c){ if(c===0){ const x = a[i]; console.log(x); } }` — emits `(local.set $x …)` /
`(local.get $x)` but NO `(local $x i32)`, so assembly fails: `local "$x" cannot be resolved at IR
level`. The MULTI-LINE form of the same function is fine (its pre-scan declares `$x`). Root cause: the
single-physical-line body path (`splitStmts`) doesn't recurse into nested `{…}` blocks when collecting
locals to declare. Low severity (rare hand-written form); surfaced writing a GC test — worked around
by writing the test's `check` multi-line. Fix site: the local-declaration pre-scan for single-line
bodies in `emitFunction`.

## ✅ FIXED 2026-06-30 (was OPEN, worked-around-in-lib) — 4 gaps surfaced by the #14 dynamic runtime (found 2026-06-22)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-30 · **Scope:** compiler (gap 3 silent; gaps 0–2 loud)

**All four are now fixed in the compiler** (regressions `62_GapNumericCoercion` + `62_GapStringCalls` +
`62_GapEmptyArrayGrow`): **0/5.0** module-global + TypedArray-element reads now coerce like the local
path (i32→f64 / f64→i32 by context); **1/5.1** the greedy string-call regex in `emitStringAssign` is
paren-guarded + a call-in-concat handler emits the call then captures the `$__str_ret_*` globals into
the accumulator; **2/5.2** binary-op `lhsType` inference consults `typedArrayVars` so a Float64Array
element compares with `f64.eq`; **3/5.3** the `push`/`unshift`/`push_string` grow helpers use
`select(8, cap<<1, cap==0)` so a capacity-0 array grows to 8. The library workarounds are left in place
(still correct). Original notes below.

Surfaced building `tests/wasi/wasm_wasi_bundle/dynrt_bundle/dynrt_lib_modc.ts` (boxed-value runtime +
expression evaluator in the wasic subset). All four were worked around IN the library; full design +
context in [dynrt-design.md](dynrt-design.md). None failed the suite.

0. **i32 GLOBAL / typed-array-element as an f64 call-arg skips the `f64.convert`** (2c). `dynNumber(g)`
   where `g` is an i32 module-global emitted `(call $dynNumber (global.get $g))` → `call[0] expected
   f64, found global.get i32` at instantiate; same for an `Int32Array` element (`dynNumber(an[2])` →
   `i32.load`). An i32 LOCAL coerces correctly, so the arg-type path inserts `f64.convert_i32_s` only
   for locals. Workaround: bind the global/element to an `i32` local first, then pass. Fix site:
   call-argument coercion in `emitExpr` (recognize global.get / typed-array-element i32 reads in an
   f64 arg position, like the local path does). (Same family as the Float64Array-compare gap #2.)

1. **`+` of two string-returning CALLS not supported.** `stringForm(a) + stringForm(b)` (both operands
   string-returning function calls) aborts with "Unsupported expression" — `emitStringAssign` doesn't
   handle a concat whose operands are both string-call results. Workaround: bind each call to a
   `string` local, then concat the locals. Fix site: `emitStringAssign` / `appendConcatPart` in
   `src/wasic.ts`.
2. **`Float64Array` element in a comparison mis-infers as i32.** `fa[0] === fb[0]` (two Float64Array
   element reads) emits `i32.eq` over `f64.load` operands → `i32.eq[0] expected i32, found f64.load`
   at instantiate. Float64Array element reads aren't tracked as f64 by the binary-op type inference
   unless first assigned to an explicitly-typed `f64` local. Workaround: `const x: f64 = fa[0]` before
   comparing. Fix site: binary-op operand-type inference in `emitExpr` (recognize TypedArray element
   reads' element type, as the i32/Uint8 paths effectively do).
3. **Empty `[]` is a SHARED static zero-capacity array; growth from cap 0 is broken.** `const a: i32[]
   = []` lowers to a static data-segment array (`(local.set $elems (i32.const 260))`) — every such
   literal aliases the SAME ptr until first grow — and `$__dynarr_push_i32` grows by `cap << 1`, which
   stays `0` from a `0` capacity. So pushing to an empty `[]` that was stored and later reconstructed
   scribbles past the allocation into the next `$__malloc` (the dynrt symptom: element 0 lost, later
   elements fine) and independent empty arrays alias. JSON dodged it (build hot, read immediately);
   a mutable runtime can't. Workaround: dynrt manages containers as self-grown `Int32Array` lists
   `[len, cap, …]` (the Set/Map idiom), nonzero starting cap + correct doubling. **Real fix (high
   value — hardens every reconstruct-then-`push` user):** make `[]` heap-allocate with a nonzero
   capacity and make the grow use `max(cap*2, MIN)`.

## console.log struct-array STRING field printed the raw pointer (2026-06-15, async 13.4b)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-15 · **Scope:** compiler

Both console.log/console.error `arr[idx].field` struct-lookup closures returned a `field.type ===
"string"` field with only `watLoad` (the ptr i32) and NO `watLoadLen`, so `console.log(arr[i].strField)`
printed the raw data pointer (e.g. `260`) instead of the string text. Surfaced by `Promise.allSettled`'s
`results[i].status`. **Fix:** special-case string fields in both closures to return `{type:"string",
watLoad: ptr@offset, watLoadLen: len@offset+4}` (the same shape the class-var string-field path already
used). General improvement — any struct-array string field in console.log now prints correctly.

## Capturing expression-body arrow result-type inferred as f64 (2026-06-15, async 13.1b)

**Class:** LOUD · **Status:** FIXED 2026-06-15 · **Scope:** compiler

A LATENT bug surfaced by capturing-closure `.then` callbacks. `substituteOneArrow` inferred an
**expression-body** arrow's result type (`v => base + v`, no return annotation) with ONLY the arrow's
own params in scope — so a CAPTURED variable (`base`) was an unknown identifier and `inferInitType`
defaulted the arithmetic to **f64**. The lifted closure body then got `(result f64)` while the body
actually produced i32 → `local.set expected f64, found call of type i32` at instantiate (and a wrong
`await_<T>` pick downstream). The block-body path already seeded the enclosing fn's params/locals; the
expression-body path did not. **Fix:** build the inference scope (enclosing fn params + locals + the
arrow's own params) ONCE and use it for BOTH paths. Benefits any value-returning capturing arrow used
as a callback. Surfaced + covered by `59_AsyncClosureCb` (capturing `.then` i32/f64). Companion fix:
`promiseInnerTypeOf`'s `.then`/`.catch` callback-type resolution was named-only → an f64 closure cb
mis-picked `await_i32`; added a `cbResult` resolver covering the `__anon_N__factory` form.

## Multi-level interface inheritance dropped fields on forward `extends` (2026-06-15, Phase 53.11)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-15 · **Scope:** compiler

`parseStructs` built interface/object-type structs in a single **source-order** regex pass. When a
derived interface was declared **before** its base (`interface C extends B {…}` above `B`/`A`), the
base wasn't in `structDefs` yet, so the inherited fields were silently lost — `const c: C = {x,y,z}`
read `x:0 y:0 z:3` (only `C`'s own field landed; the base reads returned the 0 fallback). In-order
chains of any depth already worked, so the long-standing "offset-calc" suspicion in the gap notes was
a red herring — the bug was declaration ORDER, not arithmetic. **Fix:** collect all interface +
object-type declarations up front, then build them in **dependency order** to a fixpoint (a decl is
ready when its base is built, has no base, or is external); leftovers/cyclic build last without the
unresolved base. Field-building extracted into the new `buildStructDef` helper. Regression
`53_InterfaceInheritance` (4-level forward-ref chain + mixed-width chain + base-typed param). No
behavior change for in-order decls (non-extends build in the same interfaces-then-type-aliases order).

## console.log string/numeric comparison fixes + member-target chained assignment (2026-06-12)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-12 (a documented LOUD limitation remains: 5th+ numeric arg in per-iov mode prints `?`) · **Scope:** compiler

The remaining audit items (the console_log.ts silent-wrong stubs the wasic-side hardening didn't
reach — console_log has no `diagnostics` channel). Root cause was a single broad bug plus a few
gaps. Suite 306→307 (regression `27_ConsoleLogStringCompare`; `52_ChainedAssignment` extended).

1. **`findTopLevelOp` skipped the trailing `op.length` characters (`src/console_log.ts`).** It
   started the depth scan at `i = expr.length - op.length`, so a RHS ending in `)` / `]` (a function
   call, `.slice(…)`, any parenthesised tail) left that closing bracket uncounted → paren depth went
   NEGATIVE → the operator was never matched at depth 0 → the WHOLE comparison/expression silently
   fell through to the numeric/terminal path. E.g. `console.log("x", a === getName())` and even
   `a.length === getName().length` returned the wrong boolean. This is the SAME bug class as the
   documented wasic-side `findBinaryOp` fix. **Fix:** scan the FULL string from the end (counting
   trailing `)`/`]`) and only test for an op match at valid start positions (`i <= maxStart`).
   Broad impact — every console.log operator/comparison whose RHS ends in `)`.
2. **`console.log` string `===`/`!==` only handled local/literal/array-element operands** — a
   fn-call (`a === getName()`), struct field (`a === p.name`), slice (`a === s.slice(0,3)`) or method
   (`"BOB" === a.toUpperCase()`) operand silently compared against the **empty string** (wrong
   boolean). **Fix:** `getStrPL` (and the string-ternary `getStrPtrLen`) now fall back to the existing
   `_stringExprResolver` bridge → wasic's `emitStringPtrLen`. Wired the resolver-temp declaration:
   broadened the `$__str_op_ptr/len` prologue trigger to fire on a `console.*` line with a
   string-equality op.
3. **String `!==`/`!=` in console.log was INVERTED** (`src/console_log.ts`) — it returned true for
   EQUAL strings (`(i32.ne (i32.eqz cmp) 0)`). `$__str_cmp` returns 0 when equal, so `!==` must be
   `(i32.ne cmp 0)`. Pre-existing; affected every string `!==` in console.log.
4. **String `.length` as a comparison/arithmetic OPERAND fell to the exprToWat terminal → 0**
   (`src/console_log.ts`). The earlier (Phase 52) string-`.length` fix was only in `parseSingleArg`;
   `exprToWat` (used for operands) had only the array-`.length` branch. Added the string-`.length`
   branch there, plus a general `<stringExpr>.length` handler (`getName().length`, `s.slice(…).length`)
   via the resolver's len word.
5. **Member/element-target chained assignment** `p.x = z = 5`, `arr[i] = w = 9` (`emitBlock`/`emitStatement`
   chain handler). Previously only bare-identifier targets were lowered; member/element targets bailed
   (→ silent-wrong, then abort after the hardening). **Fix:** accept any assignable lvalue
   (`\w+`, `\w+.\w+`, `\w+[…]`); the per-step lowering reuses the normal assignment emitter.
6. **`arr[i].method()` empty vtable dispatch** now records a diagnostic (fail-loud) instead of
   silently dispatching to `(i32.const 0)` when a class hierarchy is mis-registered (niche).

**Documented limitation (NOT fixed — too risky pre-publish):** `console.log` of a **5th+ numeric arg
in per-iov mode** prints `"?"` (a VISIBLE marker, not silent-wrong). Raising `SCRATCH_SLOTS` shifts
`DATA_BASE` (260), which is hardcoded in `wasic.ts` and is the **wasmmerge `DATA_PTR_THRESHOLD`** —
load-bearing for data-pointer relocation. Left as-is.

## Pre-publish hardening pass — else-chain drop bug + silent-fall-through diagnostics (2026-06-12)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-12 · **Scope:** compiler

A pre-bump audit (workarounds / dead code / silent fall-throughs) added **unsupported-feature
diagnostics** to the emitter's terminal "give-up" fallbacks, and that immediately surfaced a **real,
latent codegen bug**:

1. **Brace-less AND single-line-braced `else` / `else if` after a SINGLE-LINE `if` were silently
   DROPPED** (`src/wasic.ts` `emitBlock`). `if (c) s; else if (c2) s2; else sN;` and
   `if (c) { s } else if (c2) { s2 } else { sN }` (each branch on its own line) compiled with only the
   first branch — every `else`/`else if` after it vanished. Proven with a minimal repro: TS `10 20 30 99`
   vs WASM `10 0 0 0`. The if-handler's else-detection only recognised a few braced multi-line forms;
   a single-line if (brace-less `inlineBody` or single-line-braced `singleLineBlock`) followed by these
   self-contained else lines matched none of them, so they fell through to the statement stream and were
   stubbed. **Latent** because the suite's inputs never exercised the dropped branches (e.g. `27_base64`
   `rem===2`, a RegExp lib's escape table). **Fix:** before the inlineBody/singleLineBlock branching,
   detect a following self-contained else chain (`WasicTranspiler.isSelfContainedElse`), assemble the
   if-body + the whole chain into one inline string (brace-less bodies braced via `braceifyElseLine`),
   and feed it to the existing `expandInlineBraceChain` → canonical braced multi-line form the proven
   else/else-if machinery handles. An OPEN braced else (`else {` continuing on later lines) is left to
   the existing machinery. Regression test `15_ElseChainForms.ts` (suite 305→306). NOTE: `deno fmt`
   de-braces single-statement bodies, so the single-line-braced form is tested with non-trivial bodies
   (a nested `if`) that fmt keeps inline.
2. **`x instanceof Error` (a BUILT-IN, not a user class)** reached the `emitExpr` terminal stub (→ silent
   0). The Phase-51 `instanceof` handler only fires for `classDefs` entries. **Fix:** added a branch for
   non-user-class RHS — wasic models caught exceptions as strings, so the idiomatic
   `if (e instanceof Error)` catch-narrow resolves to **1** for the Error family
   (`Error`/`TypeError`/`RangeError`/…), **0** for other unmodelled built-ins. Compile-time constant.

**The hardening itself (kept, all green):** four terminal "give-up" fallbacks now record a diagnostic
(which aborts the compile via the existing `warnings` gate) instead of silently emitting `0` / the empty
string: `emitExpr` (unsupported expression), `emitStatement` (unsupported statement), `emitStringAssign`
(unsupported string assignment), and `emitStringPtrLen` (unsupported string expression — kills the
silent-empty-string class, incl. the dangerous case where a string `===` silently compares against `""`
and flips a branch). Speculative / guarded probe sites that recover gracefully are wrapped in a new
`quietEmit()` (a depth counter `emitDiagSuppressDepth`) so only the ~20 *unguarded* sentinel callers
turn into hard errors. The `emitStatement` diagnostic skips clearly-non-statement fragments of
multi-line constructs that are parsed as a whole elsewhere (DU type-alias `|` continuations, and
array/object/struct-literal element lines — `"success",`, `{ type: "add", value: 15 }`, bare `404`).
See design-decisions.md "Terminal emit diagnostics".

**Dead code removed (same pass):** `allocStringNoLog` (byte-identical to `allocString`) collapsed into
`allocString`; the orphaned, in-repo-unused modules `src/runner.ts` + `src/args.ts` and
`utils.ts:checkIsLibrary` deleted, along with their `deno.json` `./runner` / `./args` exports (a
breaking removal of two unused public subpaths). Also Phase-52 follow-ups: `void c.bump()` (void
dot-call) emitted invalid `(drop (call $void))` → call-shaped `void` exprs now route through the
statement emitter; the chained-assignment `=` scan is now string/template-aware.

## Phase 52 (2026-06-11) — leaf conveniences

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-11 · **Scope:** compiler

Phase 52 surfaced one pre-existing gap, now fixed: `console.log("s.length:", s.length)` on a STRING var
returned 0 — `console_log.ts dotLenMatch` only handled array `.length`; added a string-`.length`
branch (UTF-8 byte length) for local strings / module string consts / string globals (also fixed
the same direct-print path for `fromCharCode` strings).

## Remaining-items pass — chained new().method(), module-level multi-statement lines, string-assign delegation (2026-06-08)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-08 (item 5 2026-06-09; the named feature gaps hit a stub, later a loud abort) · **Scope:** compiler (item 5 is `wasmmerge`)

Cleared the low-severity items the pre-bump audit had left (suite 296→298). Two MORE real
silently-wrong bugs surfaced + fixed in the process:

1. **Chained `new ClassName(...).method(...)`** (`src/wasic.ts` `emitExpr`) — had no handler (stubbed
   to 0). Added a balanced-scan handler (find the ctor's matching `)`, then `.method(args)`): allocate
   the struct, call the constructor, call the method on the fresh pointer → `(block (result T) ctorCall
   methodCall)`. Guarded the method-args capture with `parenDepthNeverNegative` so `new A(x).m() + new
   B(y).m()` falls through to the binary-op loop. console.log routes `new`-led tokens through
   `dotCallLookup`→`emitExpr`. String-returning chains out of scope. Works in assign/return/binary-op/
   console.log. Regression: `9_ChainedNewAndMultiStmt`.
2. **Module-level multi-statement single physical line** (`const a = 1; const b = 2;`) — `parseTopLevel`
   pushed it as ONE _start statement. Now split via `splitStmts`, BUT gated by a new
   `hasMultipleTopLevelStatements` helper (a depth-0, bracket+string-aware `;` with content after it) so
   an array/object-literal FRAGMENT (`const x = [`, `{ name: "a" },`) is NOT split — splitStmts tracks
   only `(){}` not `[]` and would append a stray `;` / split at struct `}`, corrupting multi-line array
   literals (caught a 30_sorting / 6b_testing regression before it shipped). Regression in the same test.
3. **i32/i64 module-global arithmetic in console.log emitted `f64.add`** (surfaced by #2; pre-existing).
   `console.log(a + b)` where `a`/`b` are i32 module globals → type error / wrong, because the
   `leadType` routing in `parseSingleArg` AND `exprToWat` consulted only `locals`, never the `globals`
   map. **Fix:** `locals.get(id) ?? globals?.get(id)` in both. Covered by `9_ChainedNewAndMultiStmt`.
4. **`emitStringAssign` complex-expr stub narrowed** — added an `emitStringPtrLen` last-resort before
   the stub, so a string METHOD on an array element in an assignment (`const u = words[0].toUpperCase()`)
   now resolves instead of stubbing to empty. Regression: `27_StringMethodAssignFromArrayElem`.
   STILL feature-gaps (hit the now-narrower stub, not regressions): `arr.join(sep)` as a *value* (no
   value-returning string-array join helper exists — only the console.log gather-scratch numeric join),
   and `.slice()`/`.at()` on a bracket receiver in an assignment (those handlers take only `\w+`).
5. **`relocateDataPtrs` (wasmmerge) — FIXED (2026-06-09).** The range heuristic (`dataLo<=n<dataHi →
   shift`) over-relocated an arithmetic constant that coincidentally lands inside a merged lib's
   static-data range. Grounding in real merged WAT settled the design: (a) the merged module body is
   disassembled to FLAT/stack form (`i32.const N` then its consumer on the next line); (b) a genuine
   data pointer DOES appear in value position (MathLibrary: `i32.const 0 / i32.const 260 / i32.store`
   stores the version-string pointer), so an "address-position only" walk would UNDER-relocate it — an
   exact pointer/arithmetic split is impossible from WAT text. **The one safe signal:** a data pointer
   is NEVER the rhs operand of a pure arithmetic/bitwise/shift op. So the fix scans flat form and, for
   each in-range `i32.const N`, looks at the NEXT instruction token (the stack consumer): if it's in
   `ARITH_NEVER_PTR` (`i32.mul/div/rem/and/or/xor/shl/shr/rotl/rotr`) the constant is left alone;
   every other consumer (store/load/add/sub/call, `(data …)` offset) still relocates, so NO genuine
   pointer is ever dropped. `add`/`sub`/comparison stay relocated (a pointer legitimately appears as
   `base±offset`; over-relocation there is far rarer and undisambiguable without dataflow). Proven both
   directions: the new regression FAILS under the old relocate-all heuristic (`x % 271` → `271→531` →
   wrong) and PASSES with the fix, while the banner string pointer still relocates (`260→520`).
   Regression: `18i_RelocArithmeticConstant` (`@test-pipeline`, trap-on-failure). Zero change to any
   current merge (all in-range pointers were in non-arith positions). See design-decisions.md.

## Pre-bump audit — greedy method/new in binary ops + console.log array arithmetic (2026-06-08)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-08 · **Scope:** compiler

A "dead code / workarounds / bugs / fallthroughs" sweep (3 parallel scan agents + reproduction)
before bumping wasmtk found two REAL silently-wrong-output bugs (both fixed; suite 293→296):

1. **`a.method() + b.method()` / `new A(x) OP new B(y)` mis-compiled** (`src/wasic.ts` `emitExpr`).
   The `dotCallExprMatch` / `newMatch` / `superDotExprMatch` greedy `([\s\S]*)` args capture consumed
   across the operator — e.g. `a.unwrap() + b.unwrap()` matched receiver `a`, method `unwrap`, args
   `) + b.unwrap(` → a broken call. (Tests had WORKED AROUND this by hoisting `const av = a.unwrap()`
   temporaries — see 16_NestedMonomorphization.) **Fix:** `parenDepthNeverNegative(args)` guard on all
   three, so the compound expr falls through to the binary-op loop (which emits each operand
   correctly). Regression: `16_MethodCallBinaryOp`. (Narrower still-open: chained
   `new X(...).method()` in a binary op has no handler; a module-level multi-statement single physical
   line isn't split — both rare.)
2. **`console.log("x:", arr[i] + arr[j])` dropped terms** (`src/console_log.ts`) — was a documented
   KNOWN-OPEN. The greedy `arr[idx]` regex in `parseSingleArg` AND `exprToWat` captured `0] + arr[1`
   as the index and emitted one mangled access. **Fix:** bracket-balance-guard the index in both
   (nullify on unbalanced), so it falls through to the binary-op loop; and infer the op type from the
   array's ELEMENT type (the lead `arr` is an i32 pointer) so i32[]→`i32.add`, f64[]→`f64.add`.
   Regression: `6d_ConsoleLogArrayArith`.

3. **Runtime `n.toString(radix)` stubbed to 0** (only literal `(14).toString(2)` was folded). **Fixed**
   2026-06-08: new `$__i32_to_str_radix(val, radix, buf)→len` helper in `getHelperWat` (base 2..36,
   digit→char `0-9`/`a-z`, sign-magnitude for negatives) + handlers in `emitStringAssign`,
   `emitStringPtrLen` (via the `$__str_op` temp pair; `.toString(` added to the prologue + the
   console.log string-expr resolver regex), and `inferExprType`. Works across assignment / direct
   console.log / template literal / string-returning function / runtime radix. Value truncated to i32.
   Regression: `48_ToStringRadix`.

The agents' dead-code scan found NONE (the only "unused" symbols — `compileWat`/`compileWasiTs` — are
documented public API). The lower-severity items this audit flagged were then ALL fixed in the
"Remaining-items pass" entry above (chained `new().method()`, module-level multi-statement lines, the
string-assign stub narrowing, and — 2026-06-09 — the `relocateDataPtrs` over-relocation). Only two
narrow FEATURE gaps remain (not regressions): `arr.join(sep)` as a value, and `.slice()`/`.at()` on a
bracket receiver in an assignment.

(Earlier this day, the `26_ForOfSingleLine` test was added by the hazard audit — see "Proactive
hazard-audit fixes" below.) The 14 output-mismatch bugs that the
2026-06-07 runner-hardening surfaced are **ALL FIXED 2026-06-08** — see the "14 output-mismatch
bugs ALL FIXED" entry directly below for the per-cluster root causes. Earlier: Phase 51 (2026-06-05)
added `instanceof`, closed three construction/parsing gaps, and a follow-up workaround-audit fixed
one silent bug + added a loud `call_indirect`-in-merge guard; a 2026-06-07 follow-up added a
companion `memory.grow`-in-merge guard.

## Proactive hazard-audit fixes (2026-06-08, suite 292→293)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-08 · **Scope:** compiler

A codebase sweep for latent workarounds / fallthroughs found four issues; all fixed (zero
regressions, `src/wasic.ts` + `src/console_log.ts`):

1. **Brace-less single-line `for…of` dropped its body** — `for (const x of arr) stmt;` (no braces):
   the `forOfM` regex required `(\{.*)?$`, so the brace-less form hit `else { i++; continue }` and the
   body was silently skipped (same class as the single-line-`while` bug). Fixed: regex now captures
   any inline tail `(.*)$`, and the non-brace tail is split via `splitStmts` as the body. Regression
   test `26_ForOfSingleLine.ts`. (Other single-line forms — `if`/`while`/`for(;;)` — were already OK.)
2. **`console.error(arr.every/some/includes(...))` printed `1`/`0` not `true`/`false`** — the
   boolean-returning-array-method branch existed in `dotCallLookupFn` (console.log) but was missing
   from its `dotCallLookupFnErr` twin (a parallel-path-drift miss). Mirrored the branch. (No suite
   test — console.error goes to stderr, which the runner doesn't diff; verified manually.)
3. **`cv.ptr === -1` → `cv.ptr < 0`** at 12 class-instance field/method base-computation sites — the
   exact fix applied to structs (`sv.ptr < 0`) but never mirrored to `classVars`. Currently harmless
   (verified: `classVars` only holds `-1` or a static `allocStructData` ptr, never the `-3` heap
   sentinel) but future-proofs against a class heap-alloc path.
4. **Greedy `(.+)` arg-capture guards extended** — `indexOf`/`includes`/`at`/`charAt`/`replace`/
   `padStart`/`repeat`/`fromCharCode` (and the new string-char-subscript / `isNaN` handlers) now carry
   the documented `parenDepthNeverNegative(args)` guard, matching `charCodeAt`/`startsWith`/`split`/
   `slice`. Behaviour-preserving for balanced args; an over-greedy match (a swallowed following `)`)
   now falls through instead of mis-emitting. Added a `parenDepthNeverNegative` helper to
   `console_log.ts` (mirrors wasic's) for the console.log-arg `at`/`isNaN` handlers.

## The 14 output-mismatch bugs — ALL FIXED 2026-06-08

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-08 · **Scope:** compiler (one cluster was a binaryen `-Oz` bug)

The runner-hardening (2026-06-07) exposed 14 tests whose WASM output diverged from native TS. All
fixed, grouped by root cause (suite 278/292 → **292/292**, zero regressions; `src/wasic.ts` +
`src/console_log.ts`):

- **`51_ClassInstanceArrayLiteral`** — `console.log(arr[i].method())` (class vtable dispatch on an
  array element) wasn't wired in console.log: the `dotCallLookup` guard regex rejected a bracket
  receiver. Relaxed the guard + added element-class return-type detection in `dotCallLookupFn`.
- **`26_ForOf`** — `for…of` over a STATIC module-level array read from `ptr` instead of `ptr + 8`,
  so it summed the `[length, capacity]` header words. Added the missing `+8` (mirrors the `arr[i]`
  path).
- **`6b_mutexes`** — `c.field++` / `c.field += x` on a struct/class field (and static `Class.f++`)
  fell to a comment-stub. Desugared `++`/`--`/compound-assign on a dotted receiver into the working
  `recv.field = recv.field OP val` form (guarded to `this`/struct/class/static receivers).
- **`1_values`** — `console.log("go" + "lang")` was matched as ONE string literal (`go" + "lang`).
  The literal check now requires a *whole* single literal (`isWholeStringLiteral`), so concatenation
  routes to the concat path. (The remaining `7/3` line is a documented f64→string precision
  divergence — the test now carries `// @allow-output-diff`.)
- **`6b_errors` / `6b_custom-errors`** — two bugs: (a) a NESTED struct **string** field (`a.b.c`)
  returned only the i32 ptr (no `watLoadLen`) in the chained `structLookupFn`, so console.log printed
  the pointer — added the string-leaf branch (ptr at `offset`, len at `offset+4`); (b) a struct var
  re-declared in a sibling block with a DIFFERENT struct type resolved against the wrong (last-wins
  pre-scan) type — re-register `structVars` def at emit time for each `const/let X: T = call()`.
- **`6b_SimpleStructs`** — a heap-allocated struct (`ptr === -3`, when a literal has a
  non-compile-time field like `9.109e-31`) used `(i32.const -3)` as the field base instead of
  `(local.get $var)`. Generalized every `sv.ptr === -1 ? local.get : i32.const` (and `outerSv`) to
  `sv.ptr < 0` (structVars only ever uses -1/-3/≥0, never the array -2 sentinel).
- **`1_channels`** — module-level MUTABLE string (`let message = ""`) referenced by functions was
  stored as a `_start` local, invisible across calls. New `moduleStringGlobals` mechanism: a `(mut
  i32)` `$name_ptr`/`$name_len` pair, with reads (`emitStringPtrLen`), writes (`emitStringAssign`
  wrapper rewrites local.set→global.set), reassignment, and console.log (`strglobal:` encoding) all
  wired.
- **`27_line-filters`** — `console.log(arr[i].toUpperCase())` (and even `s.toUpperCase()`): console.log
  had **no** support for string-method-returning expressions. Added a `setStringExprResolver` callback
  that delegates to `emitStringPtrLen` (captured into the `$__str_op` temp pair → `strexpr`), plus
  `toUpperCase`/`toLowerCase` on plain-var and string-array-element receivers in `emitStringPtrLen`.
- **`43_collection-functions`** — `mapStr`'s `result.push(fn(arr[i]))` where `fn: (s) => string` is a
  funcref/closure param: the string return via `call_indirect` (void + `$__str_ret` globals) wasn't
  handled in `emitStringAssign` → empty elements. Added a funcTypeVars/closureTypedVars string-return
  branch (call_indirect with `null` functype result, then read the globals).
- **`15_Exceptions` / `15_recover` / `15_LexicalShadowing_Stress`** — two parts: (a) `15_recover`'s
  `r instanceof Error ? r.message : `${r}`` wasn't simplified (the else wasn't `String(r)`) —
  generalized the catch-ternary regex to any else branch (the then is always taken in wasic). (b) The
  other two are a **binaryen `-Oz` CoalesceLocals bug** that miscompiles try/catch catch-variable
  locals (coalesces a catch var with an outer local live across the try). VERIFIED: raw wabt output is
  correct, binaryen output is wrong. Interim fix: `watToOptimisedWasm` **skips binaryen** for modules
  that use exceptions (marker: `$__exn_tag`) — rare, ships the correct un-optimized wabt binary. This
  exposed a latent **terminal-`block`-fallthru** bug (a `switch` where every case returns/throws leaves
  an empty stack at the function end → V8 strict-validation reject; binaryen used to mask it) —
  `3_enums` regressed; fixed by extending `fixTerminalFallthru` to append `(unreachable)` after a
  terminal void block (harmless when binaryen runs — it strips trailing unreachable). **PROPER FIX
  (2026-06-08): the binaryen-ts CoalesceLocals bug is fixed upstream in `binaryen-ts@1.3.4`** — an
  EH-aware CFG (`src/passes/cfg.ts`): a `try` pushes its catch entries onto a handler stack while its
  body is visited; throwing instructions (`throw`/`rethrow`, `call`/`call_indirect`) link to the
  enclosing handlers, and a throwing `call` splits the block so a wrapping `local.set` can't strip a
  handler-live local. **INTEGRATED 2026-06-08:** `deno.json` bumped `^1.3.3`→`^1.3.5` (binaryen-ts
  shipped the fix in 1.3.4, plus more fixes in 1.3.5) and the `$__exn_tag` skip was **REMOVED** from
  `watToOptimisedWasm` — exception modules now get full `-Oz` and correct output (full suite
  **293/293**, bindgen 103/103, jstyper 73/73; publish gate clean). `fixTerminalFallthru`'s
  terminal-block `(unreachable)` case was KEPT (independent V8-strict-validation fix, not part of the
  workaround). The binaryen-ts fix + its 2 regression tests live in `../binaryen-ts` (suite 308→310);
  see that repo's `CLAUDE.md` § "Fix log — CoalesceLocals".
- **`27_string-formatting`** — a multi-feature stress test; fixes: **toHex** (`r = h[v%16] + r`) needed
  a string-char-subscript concat handler (`$__str_char_code_at` + malloc + store8, the fromCharCode
  shape) AND a **self-referential-concat** fix (`r` appearing as a non-first concat part was read
  AFTER the accumulator overwrote it — save the old value to `$__concat_self` first); **toFixed**
  needed `` `template`.split(".") `` (materialize the template receiver into `$__str_op`, then split)
  AND a **brace-less single-line `while (cond) stmt`** handler (the braced regex required the line to
  end at the condition; the new handler must increment `i` itself — emitBlock advances `i` manually,
  so a bare `continue` infinite-loops); **padStart/padEnd in templates** on string-literal & call
  receivers, single-arg (default pad space) — added to `emitStringPtrLen` + console.log
  `parseTemplateLiteral` (via the broadened string-expr resolver); **`(14).toString(2)`** constant-
  folded (literal number + literal radix → radix string; runtime-radix is the documented gap).

## Runner-hardening audit (2026-06-07) — exit-code suite was masking wrong output

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-07 (the 14 deferred mismatches closed 2026-06-08, entry above) · **Scope:** other (test runner; two compiler scanner fixes too)

**Test runner hardened (`tests/wasi_tests.ts`):** previously a test "passed" if compile / run-ts /
run-wasm each exited 0 — it never compared the two runs' *output*. Now it captures both stdouts and
fails on mismatch (`output-mismatch`), unless the test carries `// @allow-output-diff` (for the few
whose wasic semantics legitimately differ from native TS). This exposed **31** wrong-output tests the
green suite had been hiding (incl. `51_ClassInstanceArrayLiteral`, which "validated a fix" while
printing `0 0 0`). Implementation note: capture only reads `output.stdout` when `stdout:"piped"` —
reading it on an inherited stream throws "Cannot get 'stdout': not piped".

**FIXED in the same pass — two scanner bugs (string-literal masking), recovered 12 of the 31.**
Multiple bracket/paren-counting scanners did NOT skip string/template literals, so a literal
containing `]` `)` `}` `[` `(` `{` corrupted depth tracking. (a) `findBinaryOp` — `s + "]"` failed to
find the top-level `+` → string concat silently produced an empty string. (b) The `parseFunctions`
multi-line array-literal **body-joiner** — `let s: string = "["` looked like an unclosed array, so the
following statement got joined onto it and the whole thing fell to the "complex string assignment not
supported" stub. Fix: new module-level `buildStringLiteralMask(s)` + `netSquareBracketDepth(s)`;
`findBinaryOp` skips masked positions, the joiner uses the string-aware depth. (The single-line-body
`splitStmts` splitter has the same latent bug but wasn't on the failing path — left for the cleanup.)

**14 KNOWN-OPEN output-mismatch bugs (deferred to a scoped cleanup; checkpoint decision 2026-06-07).**
By cluster:
- **Exceptions/error string payloads (6):** `15_Exceptions` (catch returns `-1`→`0`), `15_recover`
  (message empty), `15_LexicalShadowing_Stress` (catch-var shadow returns inner not outer),
  `6b_custom-errors` (message → `260`, a pointer), `6b_errors` (message → `0`), `6b_SimpleStructs`.
- **String (5):** `1_values` (`"go"+"lang"` in console.log prints the raw tokens — string-literal
  concat in a console.log arg; also has a legit float-precision line so it can't just be allowlisted),
  `1_channels` (empty), `27_line-filters` (string methods → `0`), `27_string-formatting`,
  `43_collection-functions` (string-array elements print empty).
- **Map (1):** `6b_mutexes` (`map[a:20000 b:10000]` → `map[a:0 b:0]`).
- **for-of (1):** `26_ForOf` (`60` → `16`, plus extra lines).
- **class-array-literal (1):** `51_ClassInstanceArrayLiteral` (`areas: 16 75 4` → `0 0 0`; the
  array-literal-of-`new` desugar produces zeroed structs — the test was green-but-wrong).

**5 legitimate divergences carry `// @allow-output-diff`** (NOT bugs): `45_random-numbers`,
`7a_MathIntrinsics`, `7a_constants` (f64→string float precision), `48_ObjectDestructDefault`,
`48_Phase48Combined` (zero-sentinel destructuring defaults). Also previously documented separate-open:
`console.log("x:", arr[i] + arr[j])` array-element arithmetic drops terms after the first.

## console.log i32 struct-field + struct-field arithmetic emitted f64.add — FIXED 2026-06-07

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-07 (array-element part 2026-06-12) · **Scope:** compiler (main defect loud; `arr[i] + arr[j]` part silent)

Pre-existing (predates Phase 51.4; found while building the utility-types test). `console.log("x:",
a.i + b.i)` where `a.i`/`b.i` are **i32 struct fields** — and 3-term `a + b + c` of i32 locals —
emitted `f64.add` of `i32.load`s and failed to compile (`f64.add[0] expected f64, found i32...`). In
`console_log.ts` `exprToWat`, the binary-op operand type (`lhsLocalType`) was inferred only for a plain
`\w+` local or `\w+.length`; a struct field access `var.field` (and any compound LHS) fell through to
the f64 numeric default. **Fixed** by inferring the type from the LHS's **leading atom** — plain var,
`var.field` (via `structLookup().type`), or `.length` — conservatively skipping `arr[i]` / `fn(...)` /
`a.b.c` (remainder begins with `[` `(` `.`) so f64 array elements / call results aren't mis-typed as
i32. Purely additive (the broken pattern couldn't compile before, so no existing test used it → zero
tracked-`.wat` changes). **`console.log("x:", arr[i] + arr[j])` returning only the first element —
now FIXED 2026-06-12** as a side effect of the `findTopLevelOp` full-scan fix: the old scan skipped
the trailing `]` of `arr[j]`, so the top-level `+` was never found at depth 0 and the expression fell
through. With the full-string scan the `+` is found; array-element arithmetic (i32 + f64, literal and
variable indices) is correct (verified directly).

## Tuple positional-gap collapse in nested destructure rewrite — FIXED 2026-06-07 (pre-commit)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-07 · **Scope:** compiler

Caught during Phase 51.3 nested-tuple work, never shipped. The rewritten recursive destructure helpers
used `splitBraceAwareCommas`, which **drops empty elements** — so `const [coordX, , coordY] = t`
collapsed the gap and `coordY` read index 1 instead of 2 (`21_SkippedElementsAndGaps` printed
`Extracted Y: 999` instead of `20`). The test suite **did not catch it** (it judges per-step exit code,
not output), so it was found only by output-diffing ts-run vs wasm-run. Fixed with a gap-preserving
`splitBraceAwareCommasKeepEmpty` used by `emitDestructurePattern`/`collectDestructureLocals`. Lesson
recorded in testing.md / roadmap.md: output-verify the tests a codegen change touches.

## Reactor library exports trapped without `_initialize` — FIXED 2026-06-07

**Class:** LOUD · **Status:** FIXED 2026-06-07 · **Scope:** other

Surfaced wiring `modc --lang=go` to build a WASI **reactor library** (`-buildmode=c-shared`; see
polyglot-producers.md). Calling such a library's export via `wasmtk mod <lib> fn args` (or `wasmtk
run <lib> fn args`) **trapped with `unreachable`**. Cause: a reactor module must run its `_initialize`
export (Go runtime: heap/stack/globals setup) **before any other export**; `callExport` (and
`runWasi`'s named-export path) instantiated and called the target function directly, skipping
`_initialize`. **Proven** with a minimal probe: `square(12)` trapped without `_initialize`, returned
`144` after calling it first. **Fix** (`src/utils.ts`): both `callExport` and `runWasi`'s
named-export branch now call `exports._initialize()` (if present) right after instantiation, before
the target function. No-op for non-reactor modules with no `_initialize` (wasic/modc **TS** libraries
— regression-verified: `wasmtk mod addts.wasm addts 2 3` → 5). `callExport` also gained the same
Phase-40 `env` Proxy as `runWasi` (unlisted `env` imports → no-op stubs) for robustness; it does NOT
provide the browser `gojs` namespace, so syscall/js browser modules stay (correctly) un-hostable.

## Merge guard #2 — `memory.grow` in a merged module (2026-06-07)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-07 (by a loud guard) · **Scope:** other

Companion to the 2026-06-05 `call_indirect`-in-merge guard. `wasmmerge` now also throws a loud,
actionable error when a module being merged contains `memory.grow`. **Why:** `memory.grow` signals
that the module carries its OWN allocator which claims linear memory upward (a foreign-language
growing heap — Go's runtime allocator, Rust dlmalloc, Zig `page_allocator`) instead of sharing
wasmtk's unified bump heap (`$__malloc`/`$__heap_ptr`). Splicing it in lets its allocations overlap
the host's heap/scratch region → **silent memory corruption** once it allocates. It's *worse* than
`call_indirect` because it can appear to work for tiny allocations, so failing loudly is the safe
default.

**Motivation (empirical):** a TinyGo `wasm-unknown` module that allocates (`make`/`append`) merged
without error but produced corrupted output — its heap had no `call_indirect`, so the existing guard
missed it; only `memory.grow` distinguished it. Full matrix in
[polyglot-producers.md](polyglot-producers.md) ("native-producer mergeability"): allocation-free Go/
Rust/Zig leaves merge cleanly; allocating code merges only for Zig + a static-arena allocator;
allocating Go slipped the `call_indirect` guard and corrupted — this guard closes that hole.

**Implementation** (`src/wasmmerge.ts`, in the per-func body loop right after the `call_indirect`
check): `if (/\bmemory\.grow\b/.test(body)) throw …`. The message names the per-language fix — Zig
`FixedBufferAllocator` (not `page_allocator`), Rust `#[global_allocator]` over a static array, Go not
supported for merging — or "keep it standalone as a WIT/bindgen component." `main.ts`'s top-level
`.catch` surfaces it as a clean one-line `❌ wasmtk:` message with exit 1. **No false positives:**
wasmtk's own producers (wasic/modc) never emit `memory.grow` (their bump allocator runs over fixed
pre-declared pages). **Verified:** all 14 merge-dependent tests (`^(18|38)` — every capability
pipeline + shared-heap two-libraries + wasm-import merge + virtual imports + mathlib) pass; a
hand-built `memory.grow` module imported by a wasic program is rejected with the full message + exit 1.

## Workaround audit follow-up (2026-06-05)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-05 · **Scope:** compiler (`call_indirect` merge guard is other)

A sweep for remaining "workarounds" (keywords + a measurement of silent-stub hits) produced:

- **FIXED — `s.at(i).charCodeAt(j)` silently returned 0.** The chain fell to the catch-all `emitExpr`
  stub (the plain `charCodeAt` handler only matches a `\w+` receiver, not `s.at(i)`). New `atChainMatch`
  handler in `emitExpr` computes `$__str_char_code_at` at the normalized index. Regression test
  `51_AtCharCodeChain.ts`. (Bare `.at()` elsewhere is already handled by the string paths.)
- **FIXED (loud-failure guard) — `call_indirect` inside a merged module.** `wasmmerge` now throws a
  clear error (`❌ wasmtk: wasmmerge: '<lib>' uses call_indirect …`) instead of emitting a
  silently-dangling reference (Phase 18 strips imported type sections). `main.ts` gained a top-level
  `.catch` so thrown errors surface as a clean one-line message with exit 1. No current capability lib
  triggers it (all use direct calls); verified manually with a callback-param modc lib.
- **Silent-stub audit — NO blanket change (deliberate).** Instrumented the 3 catch-all stub sites
  (`emitExpr`/`emitStatement`/`emitStringAssign` fallbacks): **77 hits across the passing suite**,
  almost all benign — DU type-declaration continuation lines (`| { kind: … }`), multi-line literal
  element lines, and speculative/pre-scan emit calls whose results are discarded (real emission uses
  correct paths). Routing them to the (hard-aborting) diagnostics channel would break valid programs;
  a blanket warning would be noise. The stubs are deliberate tolerance — kept. See design-decisions.md
  "Silent-stub audit" + "Intentional fallbacks".
- **Doc — `wasmmerge` pointer-relocation comment was stale.** Header still described the pre-Date-fix
  blanket ">= 260 is a pointer" heuristic; the code is range-scoped to each module's own
  `[dataLo, dataHi)` data extent. Comment corrected; residual (an arithmetic const coincidentally
  inside a string-bearing lib's data range) documented as the only narrow remaining heuristic.

## Single-physical-line class / constructor bodies — FIXED 2026-06-05

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-05 · **Scope:** compiler

`class C { v: i32; constructor(x: i32) { this.v = x; } }` with the whole class (and/or constructor)
body on ONE physical line previously parsed wrong two ways: (1) **fields were dropped** — the field
loop iterated `classBody.split("\n")` and skipped any line containing `(`, so a field sharing the
line with the constructor was never registered; (2) **multi-statement bodies were mangled** — a
single-physical-line method body like `{ super(k); this.v = v; }` became one `bodyLine`
(`"super(k); this.v = v;"`) that emitted as one stubbed statement. Net effect: empty constructors +
unparsed fields → fields read 0. (The class-scope analogue of the function-body single-line gap fixed
2026-06-03.) **Fix** (`src/wasic.ts` `parseClasses`): (a) field parsing now iterates
`splitClassMemberLines(classBody)` — a new depth/string-aware splitter that breaks at depth-0 `;`,
depth-0 newlines, and immediately after a depth-0 `}` (a method body close), so fields, methods, and
the single-physical-line form all yield correct member lines (comments are already stripped globally
before `parseClasses`, so no comment handling is needed); (b) a method/constructor `rawBody` that is a
single physical line is split into statements via the existing string-aware `splitStmts` (mirrors the
2026-06-03 parseFunctions single-line-body fix). Regression test: `51_SingleLineClassBody.ts` (carries
`// deno-fmt-ignore-file` so `deno fmt` can't expand the single-line forms under test). Multi-line
class bodies (the norm) are unaffected. Validated: full suites green, zero regressions.

## Class construction gaps surfaced during Phase 51 instanceof — FIXED 2026-06-05

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-05 · **Scope:** compiler

Found while writing instanceof tests; both predated Phase 51 and were unrelated to instanceof (the
WASM output silently diverged from the TS oracle — no error — so they were latent). Both now fixed
with regression tests `51_ModuleLevelClassInstance` + `51_ClassInstanceArrayLiteral` (suite 283→285).

1. **Module-level class instances weren't tracked in `classVars`.** `const b: Box = new Box(7)` at
   module scope constructed the object (the const-new statement handler ran), but `classVars` had no
   entry for `b`, so `b.v` / method dispatch / `b instanceof Box` didn't resolve (field reads stubbed
   to 0; instanceof folded to 0). Root cause: the `startBodyLines` pre-scan resets `classVars` and had
   no `newClassPre` equivalent (the registration lived only in `emitFunction`). **Fix** (`src/wasic.ts`):
   added a `newClassPre` block to the startBodyLines pre-scan mirroring `emitFunction` — allocates the
   instance via `allocStructData(cd.struct, {}, classTag)` (STATIC ptr, because the const-new statement
   handler emits `(i32.const ptr)` for both the `local.set` and the ctor call) and registers
   `classVars[var] = {className: ctorClass, ptr}`. The `if (cd)` guard skips TypedArrays.
2. **Array-literal of `new` instances were zero-filled.** `const a: C[] = [new C(1), new C(2)]` ran the
   static struct-array path, which parses `{field: val}` literals only — for `new C(...)` it allocated
   zeroed structs with no ctor call and no class tag, so fields read 0 and `a[i] instanceof C` was
   always false. (Field-access emission was already correct; only construction was missing.) **Fix**
   (`src/wasic.ts`): new `expandClassInstanceArrayLiterals()` source pre-pass (runs after `parseClasses`,
   before `parseFunctions`/`parseTopLevel`; bracket- and string-aware so multi-line literals work)
   desugars `const a: C[] = [new C(…), …]` → `const a: C[] = []; a.push(new C(…));…` when the element
   type is a known class and every element is a `new …(…)`. This reuses the proven `arr.push(new C())`
   path, which constructs each element with its ctor + tag. Helpers `findMatchingBracketAware` /
   `splitTopLevelCommasStringAware` / `skipStringLiteral` added.

(The single-physical-line class/constructor body gap that this work also surfaced was fixed in the
same Phase 51 pass — see the "Single-physical-line class / constructor bodies" section above.)

## FIXED — single-physical-line function bodies were mangled (2026-06-03)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-03 · **Scope:** compiler (trailing statements silently dropped; some shapes V8-rejected)

When a whole function body lived on ONE physical line, multi-statement bodies were mis-emitted and
trailing statements after a brace `if` block were silently dropped. Two root causes:

1. **Function bodies were only split on `\n`.** A single-physical-line body
   (`{ let x = 0; if (c) { x = 1; } x += 100; return x; }`) was never split into statements — the
   whole thing was emitted as one mangled statement (e.g. jammed into the first `let`'s initializer).
2. **`expandInlineBraceChain` dropped trailing statements.** For `if (c) { return 1; } return 2;`
   it discarded everything after the brace chain that wasn't `else`, leaving a value-returning fn
   whose body is just a void `if` → V8 `expected 1 elements on the stack for fallthru, found 0`.

**Fix** (`src/wasic.ts`):
- In `parseFunctions`, when `rawLines.length === 1` (single-physical-line body), split it into
  statements up front via `splitStmts` before the existing per-line processing. Multi-line bodies
  (the norm — virtually every shipped test) are untouched, so blast radius is minimal.
- Made `splitStmts` **string-aware** (skips `"`/`'`/`` ` `` literals with `\` escapes) so a `;`,
  `{`, or `}` inside a string at depth 0 is never a false statement boundary. Its only prior caller
  (`expandInlineBraceChain`) benefits too; single-statement input is returned unchanged (idempotent).
- In `expandInlineBraceChain`, when the trailing content after the brace chain isn't `else`, close
  the block with `}` then re-emit the trailing statements (via `splitStmts`) as siblings instead of
  dropping them.

After splitting, each resulting statement is the idiomatic single-line form the existing if-handler
already handles (`expandInlineBraceChain` for the brace case, `fixTerminalFallthru` for terminal
void-if). The earlier repros now pass: `if (c) { return 1; } else { return -1; }` → `1 / -1`,
`if (c) { return 1; } return 2;` → `1 / 2`, plus else-if chains, brace-less inline-if + trailing
return, non-if-first single-line bodies, and string-literal `;`/`{`/`}` guards. Regression test:
`tests/wasi/wasm_wasi/48_SingleLineBraceIf.ts` (carries `// deno-fmt-ignore-file` so `deno fmt` can't
expand the single-physical-line forms under test). Validated: `wasm_wasi` **279/279**, `bindgen`
**103/103**, `jstyper` **73/73** (wabt-ts 1.3.2 + binaryen-ts 1.3.3), zero regressions.

(Note: bug1 — `if (c) { return 1; } else { return -1; }` — had already started passing by 2026-06-03
via the earlier value-fallthru/short-circuit work; the remaining live failure was the trailing-drop
and the non-if-first single-line body, both fixed here. The legacy machine-local `CLAUDE.md`'s claim
that `expandInlineBraceChain` alone fixed this was inaccurate; `cmem/` is authoritative.)

## FIXED — the 7 long-standing test failures (2026-06-02)

**Class:** grouping — the two root causes are classified under `(a)` and `(b)` below (not counted in the tally).

All 7 of the previously-"known pre-existing" failures are now fixed; as of 2026-06-02 the full
`tests/wasi/wasm_wasi` was **278/278** (the 7 fixes brought it to 277/277; the new `18h` virtual-
capability test added the 278th). (By 2026-06-03 it was **279/279** — the single-line-brace
`if` fix added `48_SingleLineBraceIf`; the live count is at the top of this file — **309/309**.)
They were two unrelated root causes:

### (a) Value-fallthru codegen — `5e_MixedSignatures`, `19_NestedDiscriminantUnions`, `19_VariantMaximumMemoryAlignment` (fixed in wasic)

**Class:** LOUD · **Status:** FIXED 2026-06-02 · **Scope:** compiler

A value-returning function whose body **ends in a statement-level (void) `if/else` where every
path `return`s** left nothing on the stack at the implicit function end. wabt + binaryen accept
this; **V8's strict validator rejects it** (`expected 1 elements on the stack for fallthru,
found 0`). Appending `(unreachable)` does NOT survive Binaryen `-Oz` — it strips the trailing
unreachable as dead code and re-emits the invalid void `if`.

**Fix** (`src/wasic.ts`, `emitFunction` → new `fixTerminalFallthru` + module-level `tokenizeWat`/
`parseWatNodes`/`serializeWat`/`watNodeToValue`/`watBranchToValue` helpers): when a value-returning
function's last top-level WAT s-expr is a void `if`, rewrite it into a value-producing
`(if (result T) cond (then … X) (else … Y))` by turning each branch's trailing `(return X)` into a
bare value `X` (recursing through nested all-returning ifs). Binaryen preserves a value-if as the
function result. Conservative: only rewrites when every branch leaf is a `return` (or a nested
all-returning `if`); otherwise leaves the body unchanged. Behavior is unchanged (the construct
already returned on all paths).

NOTE: the **single-physical-line** brace form (`if (c) { return 1; } else { return -1; }`) was a
SEPARATE bug, now **fixed 2026-06-03** — see the "FIXED — single-physical-line function bodies"
section at the top of this file. The 7 fixes here all use the multi-line form.

### (b) Hex-float literals encoded as 0 — `38_MathExpLog`, `38_MathHyperbolic`, `38_MathTrig`, `38_Phase38Combined` (fixed in wabt-ts 1.3.1)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-02 (wabt-ts 1.3.1) · **Scope:** other (backend; garbage `Math.*` values, sometimes a trap)

The mathlib functions are merged from `mathlib.wasm`, whose f64 constants are in **hex-float**
notation (`0x1.921fb54442d18p+2`) after wabt disassembly. `wabt-ts@1.3.0`'s parser
(`parseF32/F64LiteralBits`) handled `LiteralType.Hexfloat` with JavaScript's `parseFloat()`, which
**cannot parse hex-float notation** — it reads the leading `0`, stops at `x`, returns `0`. So every
mathlib polynomial coefficient / π / e / ln2 was encoded as `0`, making merged `Math.*` return
garbage (and trapping `$__f64_to_str`'s `i64.trunc_f64_s` on the resulting NaN/Inf). The main
module's own constants (decimal) were unaffected — that's why only func-13-onward (the spliced
mathlib) was corrupt.

Bisected with a minimal repro (`f64.const 0x1.921fb54442d18p+2` → npm:wabt gives 6.283, wabt-ts gave
0) and confirmed by swapping `deno.json` to `npm:wabt` (all 4 tests pass). **Fixed upstream in
`@jrmarcum/wabt-ts@1.3.1`** (`src/parser/wast-parser.ts`: new `parseHexFloatValue` reconstructor;
both f32 and f64 Hexfloat cases route through it; decimal `Float` still uses `parseFloat`). `deno.json`
bumped `^1.3.0` → `^1.3.1`. Regression test in wabt-ts `tests/tools/wat2wasm.test.ts`.

## FIXED — short-circuit `&&`/`||` removes the merge OOB-`charCodeAt` trap class (2026-06-02)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-06-02 · **Scope:** compiler (trap with runner exit 0 and no stderr)

This was the last OPEN bug. **Fixed properly** (Proper-fix #1 from the original writeup) by making
wasic emit **short-circuit** `&&`/`||` instead of a bitwise `i32.and`/`i32.or`; the RegExp library's
defensive workaround was then **removed** and 18g still passes, proving the codegen fix carries the
original trap construct on its own. Full suite re-validated: `wasm_wasi` **278/278**, `bindgen`
**103/103**, `jstyper` **73/73** (wabt-ts 1.3.2 + binaryen-ts 1.3.3).

**Original symptom:** a modc library that ran **correctly standalone** silently halted (WASM trap;
runner exits 0, no stderr) once `wasmbundle`/`wasmmerge` spliced it into a host module. Surfaced
building the RegExp capability (the matcher's count loop). Minimal repro: a `while` loop whose
condition is `i < len && atomMatches(p, pi, s.charCodeAt(i)) === 1` — a function call wrapping
`charCodeAt`, nested in an `i32.and`, in the loop's `br_if`. wasic emitted `a && b` as a
**non-short-circuit `i32.and`** (both operands always evaluated), so when `i == len` the OOB
`s.charCodeAt(i)` still ran; standalone `$__str_char_code_at` bounds-checks and returns -1, but the
spliced/reassembled `call`-in-`i32.and`-in-`loop`-`br_if` mis-encoded and trapped. (JSON didn't hit
it: its `&&`-with-`charCodeAt` conditions were in `if`s with a *direct* one-call `charCodeAt`, not a
nested call inside a `while` `br_if`.)

**The fix** (`src/wasic.ts` `emitExpr` binary-op loop, ~line 6135; mirrored in `src/console_log.ts`
`exprToWat`, ~line 1298): intercept `op === "&&" | "||"` before the bitwise `["&&","and",…]` /
`["||","or",…]` table mapping is applied and emit short-circuit control flow —
`&&` → `(if (result i32) <lhs> (then <rhs>) (else (i32.const 0)))`,
`||` → `(if (result i32) <lhs> (then (i32.const 1)) (else <rhs>))`. The result is i32 0/1, promoted
to the surrounding context via `(f64.convert_i32_s …)` / `(i64.extend_i32_s …)` when `watBaseType`
of the context type is wider. The old table entries STAY — they still drive operator *detection* in
the scan; only emission changed. Matches JavaScript semantics (RHS skipped once the LHS decides),
which is independently more correct. High blast radius (every `&&`/`||` site) — validated with the
three full suites above, zero regressions.

**Workaround removed:** `tests/wasi/wasm_wasi_bundle/regex_bundle/regex_lib_modc.ts` was rewritten to the
natural form — `atomAt` now returns `ti < t.length && atomMatches(p, pi, t.charCodeAt(ti)) === 1`,
and `matchStar`'s consume loop puts `ti + count < t.length && atomMatches(p, atomPi,
t.charCodeAt(ti + count)) === 1` **directly in the `while` `br_if`** (the exact original trap shape).
18g passes merged, so the fix — not the guard — is what carries it.

## FIXED — RegExp work (2026-05-31)

**Class:** SILENT-WRONG · **Status:** FIXED 2026-05-31 · **Scope:** compiler

- **Greedy `charCodeAt` (and `startsWith`/`endsWith`/`split`) regex swallowed a following operator.**
  `expr.match(/^(\w+)\.charCodeAt\s*\((.+)\)$/)` with greedy `(.+)` matched the whole
  `p.charCodeAt(i) === t.charCodeAt(i)` as one call (the expr *starts* with `p.charCodeAt(` and
  *ends* with `)`), so the `===` never reached the binary-op loop → always-true comparison. Fix:
  added a `parenDepthNeverNegative(match[2])` guard to those four handlers in `emitExpr`
  (`src/wasic.ts`) so an unbalanced arg falls through to the binary-op loop. (JSON's
  `v[i] !== t.charCodeAt(i)` didn't hit this because it starts with `v[`, not `X.charCodeAt`.)

## FIXED — JSON work (2026-05-31)

**Class:** SILENT-WRONG · **Status:** FIXED — 2026-05-31, and the item-3 residual (`console_log.ts`'s string-arg emitter) fixed 2026-09-28; see "String literals with escaped quotes in two more places" at the top · **Scope:** compiler

1. **String args to a merged import dropped to one stack value** (`need 2, got 1`). A modc
   `func(s: string)` compiles its string param to `(i32 i32)`, so `mergeWasmWat` registered the
   import as `[i32, i32]` and the call site couldn't expand a string arg. Fix: read the sibling
   `.wit` (which preserves `s: string`) and overlay logical types onto each `ExternalFuncDef` in
   `compileWasiTs`/`compileLibTs` (new helpers `parseWitLogicalSigs`/`readWitLogicalSigs`/
   `applyWitSig`/`witTypeToWat`/`kebabToCamel`). Numeric-only libs unaffected.
2. **Allocator detector false-positive dropped a real function.** `detectBumpAllocator` matched a
   plain `global += param; return global` accumulator (a parser cursor `advance`) and silently
   dropped it during the merge → `undefined func`. Fix: a real `$__malloc` returns the *old* value
   captured before the `global.set`, so it reads the heap global **exactly once**; the accumulator
   reads it twice. Require exactly one `global.get` AND one `global.set` occurrence.
3. **Escaped-quote string literals matched as empty.** `"([^"]*)"` stops at the first `\"`, so a
   literal with escaped quotes (an embedded JSON doc) crossed as length 0 / hit "string assignment
   from complex expression not yet supported". Fixed to escape-aware `"((?:[^"\\]|\\.)*)"` at three
   sites in `src/wasic.ts`: `emitStringPtrLen` (string-arg path), `emitStringAssign` (local string
   assign), module-const detection in `parseTopLevel`. (`console_log.ts`'s `console.log`-arg
   emitter still has the un-escaped form — pass escaped-quote literals via the main paths, which
   the JSON driver does.)
4. **`findBinaryOp` missed an operator whose RHS ends in a call.** The scan started at
   `expr.length - op.length`, never counting the last `op.length-1` chars for depth — a trailing
   `)` (e.g. `v[i] !== t.charCodeAt(i)`) drove paren depth negative so the operator was never found
   and the whole expression fell to the always-false comment-stub. Also added bracket `[]` counting
   (matching `findDepth0LTR`/`findDepth0Keyword`). Fix: scan the full string for depth, match only
   at valid start positions. High blast radius; re-validated with no regression.

## The 7 formerly-known test failures — ALL FIXED 2026-06-02

**Class:** n/a (not a defect) · **Status:** — (pointer to the fuller entry above) · **Scope:** compiler

These failed for a long time but are **now all passing** (full suite 278/278 as of 2026-06-02;
live count at the top of this file — **309/309**). Kept here as a
pointer; full root-cause writeups are in the "FIXED — the 7 long-standing test failures" section at
the top of this file.

| Test | Was | Fix |
| --- | --- | --- |
| `19_NestedDiscriminantUnions`, `19_VariantMaximumMemoryAlignment`, `5e_MixedSignatures` | V8 strict-validation fallthru on terminal void-if/else where all paths return | value-fallthru rewrite in wasic (`fixTerminalFallthru`) |
| `38_MathExpLog` / `38_MathHyperbolic` / `38_MathTrig` / `38_Phase38Combined` | merged mathlib returned garbage — hex-float consts encoded as 0; the original "f64→i32 truncation" framing was a downstream symptom (NaN/Inf → `i64.trunc_f64_s` trap) | wabt-ts 1.3.1 hex-float parse fix |

## Regenerated `.wat`/`.wasm` artifact churn

**Class:** n/a (not a defect) · **Status:** — (process note on artifact churn) · **Scope:** other

Running the suite overwrites many committed `tests/wasi/wasm_wasi/*.wat`/`*.wasm` from passing tests
(cumulative compiler drift, not behavior changes — outputs are identical). One incidental cosmetic
change: `6a_json.wat` now emits an explicit "not yet supported" stub for an already-broken
string-accumulation-in-a-loop helper (was a silent partial compile; the test passes either way).
If you want a focused diff, `git restore` the unrelated `.wat`/`.wasm` before committing.
