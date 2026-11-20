# archive: testing.md — the dated pass-count notes before 2026-11-18 (superseded counts)

Moved VERBATIM from `cmem/testing.md` on 2026-11-20 (letter H38, step 4): closed or
superseded, read by nobody unless the owner asks. Item IDs are kept, so a search for one finds it.

## Current pass counts (the older notes)

> **2026-10-26, H11 (`wasmbundle` on binaryang's `bundle()`) + round 3's worst rows (sw141/sw142
> fresh `new`, sw149–sw152 switch, sw160 i32 literal range, sw174; sw139, sw140), full gate GREEN
> on the final tree.** wasi **509/509** (+`48_SwitchOrderNestingAndCaseValues`,
> +`9_NewMakesAFreshObject`) · golden-WAT **568** byte-identical after a deliberate re-record: 44
> entries moved, every one a class program (the `$__new_<C>` wrappers) or `7d_ConsoleArrays`
> (`u32[0] = 4000000000` now spelled as its wrapped constant, same bits) plus the new switch test;
> the 81 class corpus tests read as Deno before the re-record. Earlier the same day the snapshot
> stopped freezing the repo's absolute path (`<repo>`; 9 refusal entries re-recorded, path only) ·
> merge_layout **17** (+5 bundle rows, +sw139) · tool_rows **37** (+3 negative arguments) ·
> outpath **14** (+2 dync) · witgen **24** (+1 binaryang header) · typed_decl **50** (+3 refused
> literals, +1 accepted set) · wast 64,506 / 0 / 16 ALL CLEAN · cross-check **1368** on baseline,
> 0 regressed, then `--update-baseline` added the two new tests' 6 pairs (all `match`) · every
> other suite at its count. **Go suites ran with `GOFLAGS=-buildvcs=false`** (not needed since
> the owner's system-config fix the same day, ledger C9: go_bindgen 7 / 7 without it) (git's
> `safe.directory` does not cover the new path; machine config, cmem/local). Gate runner: one suite
> at a time, in workflow.md's order, each to its own log.

> **2026-10-24, later: binaryang 1.16.1 → 2.2.0 pinned, gate GREEN, NOTHING moved** (as predicted:
> no optimizer or printer change in 1.17.0–2.2.0). wasi 507/507 · golden-WAT 566 byte-identical ·
> wast 64,506 / 0 / 16, accepted-invalid 1 (`legacy/try_delegate`, pinned) · cross-check 1368 on
> baseline · `-Oz` guard 42 / 42 · go 7 / 7 / 12 · every other suite green.

> **2026-10-24, sw119 (the i32 check, on by default), sw137, sw138, ld114, gate GREEN.** wasi
> **507/507** (+`30_I32ArithmeticIsJavaScripts`, `30_I32OverflowThrows`,
> `30_I32OverflowTrapsWithoutTry`, `18zz_LibraryRangeErrorCaught`; `18i` extended, failing with
> `main`'s compiler) · golden-WAT **566**, re-recorded: 234 `.wat` (every i32 `+ - *` is now f64 with
> a checked store), 1 `.wit` (the relocfix library's new exports), 6 new; no `.status` moved ·
> cross-check **1368** on baseline (+9 new pairs recorded: `7j` from ld45, and the `30_I32*` tests;
> wasmer and wazero reject `30_I32OverflowThrows`, which uses exception handling), 0 regressed — as
> first built, 157 wazero pairs went `match → reject` (a tag in every program), cured by the owner's
> trap-without-try ruling · wast 64,506 / 0 / 16 · every other suite green. The wasi suite had no
> per-test TIMEOUT (a looping module, sw137's `main_arraymethods`, hung a run for an hour, silently):
> since 2026-10-24 every step is killed at `WASI_STEP_TIMEOUT_S` (default 300 s, the whole process
> tree) and fails, an expected failure included. Verified on a looping probe at 10 s: both runs
> killed, the file FAILED, no process left behind.

> **2026-10-24, ld45 (the object writer), ld113, sw134–sw136, gate GREEN.** wasi **503/503**
> (+`7j_ConsoleObjectWriter`, failing with `main`'s compiler; `7i_ConsoleWholeStructRefused` now the
> nullable-field refusal) · golden-WAT **560**, re-recorded: `7i` (the refusal text), `7j` (new),
> `13b_ZeroCostExceptions` (a call's struct result now goes through the writer: its helpers, data
> texts, heap start 260 → 297; output unchanged); the other 557 identical · typed_decl 46 · wast
> 64,506 / 0 / 16 · cross-check 1359 on baseline · go 7 / 7 / 12 · every other suite green.
> `wasic_seam` flagged a local named `rt` (its host-I/O pattern is `rt.`); renamed.

> **2026-10-23, ld106–ld109, ld111, ld112, sw133, gate GREEN.** wasi **502/502**
> (+`29_StringArgumentsAndFieldMethods`, +`28_TemplateHoles`, each failing with `main`'s compiler)
> · golden-WAT **559**, no existing entry moved (the template-scanning change reached no corpus
> program's output) · typed_decl **46** (+"located past a comment", ld109, inverted) · wast 64,506 /
> 0 / 16 · cross-check **1359** on baseline (+6, all `match`) · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-23, ld103–ld105, sw129–sw132, ld110, gate GREEN.** wasi **500/500**
> (+`29_FieldArraysAndCallResults`, +`29_FieldInitializersAndImplicitConstructors`,
> +`28_ArrayNamedMethodsAndStringUnshift`, each failing with `main`'s compiler) · golden-WAT **557**,
> no existing entry moved (no corpus program had an instance-field initialiser or a derived class
> without a constructor) · wast 64,506 / 0 / 16 · cross-check **1353** on baseline (+12, the three
> new modules, all `match`) · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-23, later: binaryang 1.15.0 → 1.16.1 pinned, gate GREEN, NOTHING moved** — as
> predicted from the changelog (1.16.0: `--target portable` and two lowerings, all opt-in, "without
> the new flags no output changes"; 1.16.1: a re-release, no package change). wasi 497/497 ·
> golden-WAT 554, **0 diverged** · wast 64,506 / 0 / 16, ALL CLEAN, 1 pinned spec-invalid
> acceptance (the legacy `delegate` defect, not fixed) · cross-check 1341 on baseline · go 7 / 7 /
> 12 · `-Oz` guard passes · all 28 suites exit 0.

> **2026-10-23, the engine cross-check baseline re-recorded:** +189 pairs (63 modules: the five
> `36_*` and every test added since 2026-09-30; 185 `match`, 4 wazero `reject`, exception
> handling), nothing removed or changed → **1341 on baseline, 0 not in it**. And the wast runner
> gained the mirror guard (`validatorAcceptedInvalid`): 1 spec-invalid module binaryang accepts,
> pinned (`legacy/try_delegate.wast`, a binaryang defect); wast still 64,506 / 0 / 16.

> **2026-10-23, binaryang 1.13.0 → 1.15.0 pinned, gate GREEN, nothing known-failing.** Predicted
> from the changelog: 1.14.0's `Memory64Lowering` runs only when asked (nothing moves); 1.15.0's
> `SSANoMerge` runs first at `-O3` / `-Os` / `-Oz`, so PIPELINE goldens merging a `-Oz` library
> move, corpus goldens do not, nothing we parse changed, wast and the guard unchanged. Held, every
> prediction: wast **64,506 / 0 / 16** (ALL CLEAN; 33 on 23 lowered modules; guard 0) ·
> golden-WAT 554, **43 moved, all PIPELINE entries merging a `-Oz` library**; compared function by
> function against the 1.13.0 snapshot: 56 distinct functions changed, every one a merged
> library's (`*_modc_*` / `*_Modc_*`), no main-program function and no text outside functions;
> re-recorded; failed compiles 11 (the on-purpose ones, as before) · wasi **497/497** (runs those
> pipelines against Deno) · cross-check 1152 on baseline, 0 regressed · go 7 / 7 / **12** · `-Oz`
> try_table guard passes · every other suite at its count. Timing: wasi 540 s, golden 67 s.

> **2026-10-22, ld100 (generic classes), ld101 (class string fields), ld102 (string method in
> console), gate GREEN.** wasi **497/497** (+`29_GenericAndStringClasses`, failing on the old
> compiler) · golden-WAT **554**, none moved · wast 64,506 / 0 / 16 · cross-check 1152 on baseline
> · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-22, ld96 (capturing callbacks, string-array callbacks) and sw128 (array literal
> arguments), gate GREEN.** wasi **496/496** (+`5h_CapturingCallbacks`, +`9_ArrayLiteralArguments`,
> both failing on the old compiler) · golden-WAT **553**, 1 existing entry moved and reviewed
> (`28_StringsTuplesAndObjects`: a top-level `k` read as its global, not captured) · wast 64,506 /
> 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface
> unchanged.

> **2026-10-22, ld94 (`string[][]`) and ld95 (function array literals), gate GREEN.** wasi
> **494/494** (+`63_StringMatrix`, +`44_FunctionArrayLiterals`, both failing on the old compiler)
> · golden-WAT **551**, none moved · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 /
> 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-22, sw123 (null vs undefined), gate GREEN.** wasi **492/492** (+`24_NullVersusUndefined`,
> failing on the old compiler) · golden-WAT **549**, 9 existing entries moved and reviewed (find /
> pop / out-of-range results carry kind 2; strict tests compare the kind; prints choose `null` or
> `undefined`; a first try moved 41, the out-of-range strict tests then folded) · wast 64,506 /
> 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface
> unchanged.

> **2026-10-22, loud tool rows group 3 (ld81 wasmbundle, ld82 / ld83 bindgen bindings), gate
> GREEN; all loud tool rows closed.** tool_rows **34** (+1) · merge_layout **10** (+1) · bindgen
> 142 (8 fixtures regenerated: the binding's env Proxy and loader) · wasi 491/491 · golden-WAT 548,
> none moved · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 /
> 199 exact · api-surface unchanged.

> **2026-10-22, loud tool rows group 2 (ld84, ld85 bundler; ld87 `mod` i64), gate GREEN.**
> merge_layout **9** (+2) · tool_rows **33** (+3) · wasi 491/491 · golden-WAT 548, none moved ·
> wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact ·
> api-surface unchanged.

> **2026-10-22, loud tool rows group 1 (ld89 dync, ld90 CLI flags), gate GREEN.** tool_rows **30**
> (+11, each failing on the old code) · wasi 491/491 · golden-WAT 548, none moved (the WAT is
> unchanged; only who prints a failure changed) · wast 64,506 / 0 / 16 · cross-check 1152 on
> baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-22, sw127 (a whole struct printed its address) refused, gate GREEN.** wasi **491/491**
> (+`7i_ConsoleWholeStructRefused`, expect-fail) · golden-WAT **548**, no existing entry moved (11
> recorded failures, the expect-fail tests, was 10) · wast 64,506 / 0 / 16 · cross-check 1152 on
> baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-22, loud refusals group 6 (ld74, ld79; sw126 found and fixed), gate GREEN.** wasi
> **490/490** (+`29_ClassDispatchAndChaining`, failing on the old compiler) · golden-WAT **547**,
> one existing entry moved and reviewed (`16_DeepGenericConstraintResolution`: a call on a
> base-typed parameter dispatches on the class tag; a first try dispatched static `new X`
> instances too and moved 3 more, then narrowed to run-time pointers) · wast 64,506 / 0 / 16 ·
> cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-22, loud refusals group 5 (ld78, ld91–ld93; ld97–ld99 found and fixed), gate GREEN.**
> wasi **489/489** (+`5h_CallbacksChainsAndLoops`, failing on the old compiler) · golden-WAT
> **546**, no existing entry moved · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 /
> 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged (the new helpers are private methods
> and module functions of `src/wasic.ts`, not exported).

> **2026-10-22, loud refusals group 4 (ld41, ld42: module 2D arrays and booleans), gate GREEN.**
> wasi **488/488** (+`63_ModuleGlobals2DAndBoolean`, failing on the old compiler) · golden-WAT
> **545**, 11 existing entries moved and reviewed (a top-level boolean is now a global:
> `local.get` → `global.get` and its `local.set` init dropped, nothing else) · wast 64,506 / 0 /
> 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface
> unchanged.

> **2026-10-22, loud refusals group 3 (ld76, ld77, ld80: strings, tuples, objects), gate GREEN.**
> wasi **487/487** (+`28_StringsTuplesAndObjects`, failing on the old compiler) · golden-WAT
> **544**, no existing entry moved · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 /
> 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-22, loud refusals group 2 (ld71–ld73, ld78's default and `for` forms), gate GREEN.**
> wasi **486/486** (+`5f_IncrementsAndCompoundForms`, failing on the old compiler;
> +`5f_CompoundIndexSideEffectRefused`, expect-fail) · golden-WAT **543**, one existing entry moved
> and reviewed (`7g_ConsoleConcatAndCompare`: `2 < 3` over integer literals is now `i32.lt_s`, was
> `f64.lt`, the same truth); a first try that sent every string-element store through `$__str_op`
> moved 3 sorting programs and was narrowed to the stores that need it · wast 64,506 / 0 / 16 ·
> cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged
> (a first try exported `bindDefaultParam` from `./console_log` and widened `FuncLookup`: the
> check said MAJOR; it moved to the internal `src/default_params.ts`).

> **2026-10-22, loud refusals group 1 (ld38 toFixed, ld43, ld66–ld70), gate GREEN.** wasi
> **484/484** (+`4m_ExpressionGaps`, failing to compile on the old compiler) · golden-WAT **541**,
> nothing else moved (the wider `.length` handler and `isStringExpr`'s `L + R` rule moved no
> existing program once kept out of sums and plain element reads; a first try moved
> `30_sorting-by-functions` and broke `4k_LastSilentRows`) · typed_decl 45 · wast 64,506 / 0 / 16 ·
> cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged.

> **2026-10-21, sw122 (correctly rounded parseFloat / Number(string) / parseInt radix 10), gate
> GREEN.** wasi **483/483** (+`53_NumberParseRounding`, 163 values; its probe battery differed on
> 263 of 483 lines on the old compiler) · a 4,078-value probe (edge cases + random literals of up to
> 30 digits, exponents ±350) identical to Deno · golden-WAT **540**, 41 moved, each reviewed: the
> dynrt library and the 37 programs merging it (dynrt's interpreter parses literals with
> `parseFloat`; `caps_bytes.ts` re-embedded, dynrt 38,653 → 40,369 bytes, the other five
> unchanged), `53_NumberParse` and `4l_MixedOperandTypes` (only the new `$__bn_*` /
> `$__dec_to_f64` helpers added), and the new test · typed_decl 45 · wast 64,506 / 0 / 16 ·
> cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath 151 / 199 exact · api-surface unchanged ·
> `check_try_table_oz` 42 / 42.

> **2026-10-21, the embedded capability libraries re-embedded (`src/wasm/caps_bytes.ts`), gate
> GREEN.** The six `*_lib_modc.wasm` rebuilt with `wasmtk modc` and embedded by
> `bun scripts/gen_caps_bytes.ts`: set 870 → 726, map 1171 → 980, date 992 → 929, json 2909 → 2447,
> regex 2007 → 1779, dynrt 45763 → 38653 bytes, every WIT unchanged. wasi **482/482** (its pipeline
> programs `18h_VirtualCapabilityImports`, `18k_DynRuntimeVirtualImport`, `18q_DynAnyFoundation`
> run the three bundles that import embedded capabilities; each self-checks and traps on a wrong
> result) · golden-WAT 539, exactly those 3 pipeline entries moved (`vcap_bundle`,
> `dynrt_vcap_bundle`, `dynrt_any_bundle`: the heap start, and dynrt's `$dynrt_global4` now a
> mutable global set at start-up instead of a constant), re-recorded · wast 64,506 / 0 / 16 ·
> cross-check 1152 on baseline · go 7 / 7 / 12 · wasMath L1 151, L2 199 exact · api-surface
> unchanged · `check_try_table_oz` 42 / 42 (the `try_table` `-Oz` skip it once decided has been
> gone since 2026-08-27; the script now reads as its guard).

> **2026-10-20, the loud rows' invalid-module group (ld48–ld50, ld52–ld57, ld59–ld61, ld63, ld64,
> ld75; sw124, sw125), gate GREEN.** wasi **482/482** (+`4l_MixedOperandTypes`,
> +`28_ArrayCallbackEdges`, both failing on the old compiler) · golden-WAT **539**, 4 old entries
> moved, each intended: `26_ForOf`, `28_SpreadLiterals` (a dropped `pop()` is `popn_i32`, which
> does not trap), `49_StringAt`, `49_Phase49Combined` (`s.at(i)` through `$__str_index`, which
> brings the string-ext helper family, as `s[i]` does: 403 → 964 lines unoptimised); failed
> compiles 9 · typed_decl 45 · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12
> · api-surface unchanged · all other suites as before. emitExpr's new i32 → f64 conversion moved
> nothing once guarded (`isI32Number`: a first try converted a struct POINTER in
> `9b_InlineStructArrays` and a string pointer in `Number(s)`).

> **2026-10-20, binaryang 1.12.1 → 1.13.0 pinned, gate GREEN, nothing known-failing.** Predicted
> from the letter (validation `result` fix + new refusals; optimizer output moves at -O2+): wast
> unchanged or `assert_invalid` up / skips down, guard 0; goldens move only where optimized output
> is captured. Held: wast **64,506 / 0 / 16** (every file on its pins; guard 0; nothing moved
> either way) · golden-WAT 537, **43 moved, all PIPELINE entries merging a `-Oz` library**, each
> only in the merged library's functions (optimizer restructuring), re-recorded; failed compiles 9 ·
> wasi 480/480 (runs those pipelines) · cross-check 1152 on baseline · go 7 / 7 / **12** · `-Oz`
> try_table guard passes · api-surface unchanged. The golden pass is slower: 55 s (about 35 s on
> 1.12.1), as binaryang said (-Oz about 2–2.5× the time).

> **2026-10-19, sw120 (a null string field is the 0 pointer; string field stores), gate GREEN.**
> wasi **480/480** (+`24_NullableStringFields`, failing to compile on the old compiler;
> −`7i_NullishStringFieldRefused`, whose refusal is gone) · golden-WAT **537**, nothing else moved
> (no corpus program assigned a string field or built one at run time: both were refused);
> failed compiles **9** (the stale golden of the removed test deleted by hand: `--record` keeps
> files of removed tests) · wast 64,506 / 0 / 16 · cross-check on baseline · go 7 / 7 / 12 ·
> api-surface unchanged.

> **2026-10-19, ld88 (the owner's rule 3: `wasmtk wast` exit codes), gate GREEN.** New suite
> **`wast_cli_tests` 4 / 4** (installed wasmtk; 2 fail on the old CLI, 2 controls) · the CLI on the
> vendored corpus: 288 files, 0 failed, 94 unbuilt modules in 21 files, all within
> `src/wast_known_unbuilt.ts`, exit 0 (its pass count, 63,932, is below the gate's 64,506: the
> gate lowers custom page sizes and enables more features) · wasi 480/480 · golden 537 / 0 ·
> wast 64,506 / 0 / 16 · cross-check on baseline · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-19, sw87 (the owner's rule 2: a bare `sort()` is in string order), gate GREEN.** wasi
> **480/480** (+`28_SortDefaultStringOrder`, failing on the old compiler) · golden-WAT **537**, 2
> moved (`28_ArrayMutationsAndSort`, `28_ExtendedArrayMethods`: `sort_i32`, `$__numstr_gt_i32`,
> the string helpers it needs) · failed compiles 10 · wast 64,506 / 0 / 16 · cross-check 1152 on
> baseline · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-19, sw95 (the owner's rule 1: an out-of-range array read is `undefined`), gate
> GREEN.** wasi **479/479** (+`9c_ArrayOutOfRangeUndefined`, failing on the old compiler) ·
> golden-WAT **536**, 32 moved (a first try also moved, and broke, `9_F32Containers`: an f32
> element's template is not built, so f32 arrays print as before), each reviewed by function: a console.log of an array element whose
> range is not known at compile time prints through the null printer's string conditional
> (`_start` / the printing functions, the string helpers it needs, `$__heap_ptr` up for the
> "undefined" text); a static array at a literal index is folded and did not move · failed
> compiles 10 · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · api-surface
> unchanged.

> **2026-10-19, sw97 / sw99 / sw100 / sw101 / sw108 / sw121 (+ ld58, ld65), gate GREEN.** wasi
> **478/478** (+`4k_LastSilentRows`, failing on the old compiler) · golden-WAT **535**, nothing
> else moved (a first try moved the date and dynrt libraries: sw97's parenthesis rule took
> inferExprType's f64 fallback for i32 arithmetic; it now needs a KNOWN float / bigint inside) ·
> failed compiles 10 · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 ·
> api-surface unchanged.

> **2026-10-19, sw86 / sw88 / sw89 / sw90 / sw93 / sw94 (+ ld51; method edge cases), gate
> GREEN.** wasi **477/477** (+`28_MethodEdgeCases`, failing on the old compiler) · golden-WAT
> **534**, 73 moved, each reviewed by function: the `$__str_split` helper (68, incl. the dynrt
> library's copy), `find`'s flag and its two `__null` reads (`12_ArrayMethods`), the charCodeAt NaN
> `select` in f64 contexts (`27_file-paths`, `27_number-parsing`, `27_string-formatting`) · failed
> compiles 10 · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · api-surface
> unchanged.

> **2026-10-19, sw96 / sw98 / sw102 / sw103 (+ sw75; console printing), gate GREEN.** wasi
> **476/476** (+`7i_ConsoleUnaryBoolStringFields`, +`7i_NullishStringFieldRefused` `@expect-fail:
> compile`; both fail on the old compiler) · golden-WAT **533**, nothing else moved (a first try
> broke `51_AtCharCodeChain`: the widened string-method test matched `s.at(0).charCodeAt(0)`; it now
> needs the WHOLE operand to be the call) · failed compiles **10** · wast 64,506 / 0 / 16 ·
> cross-check 1152 on baseline · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-19, sw104 / sw105 (block scoping), gate GREEN.** wasi **474/474**
> (+`5e_BlockScopedDeclarations`, failing on the old compiler) · golden-WAT **531**, NOTHING else
> moved (no corpus program declared in a top-level block or shadowed) · failed compiles 9 · wast
> 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-19, sw106 follow-up (a throw from `finally` leaves the whole try statement), gate
> GREEN.** wasi 473/473 (`15_FinallyOnEveryExit` gained 5 cases; the old build printed `3 1013` for
> `3 11`) · golden-WAT 530, 3 moved: `15_Exceptions` and `15_TestCase1-NestedEscalation` by ONE
> line each (the try_table's `)` now before the fall-through finally), `15_FinallyOnEveryExit` (its
> new cases); failed compiles 9 · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go
> 7 / 7 / 12 · api-surface unchanged.

> **2026-10-19, sw106 (`finally` on every exit), gate GREEN.** wasi **473/473**
> (+`15_FinallyOnEveryExit`, +`15_FinallyStringReturnRefused` `@expect-fail: compile`; both fail on
> the old compiler, which BUILT the refused case) · golden-WAT **530**, 1 moved, `15_Exceptions`:
> its string data in a new order (finally is emitted first) and the catch body's new `try_table`;
> failed compiles **9** · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 ·
> api-surface unchanged.

> **2026-10-19, sw76–sw79, sw107 (spread literals; string arrays join and search by text), gate
> GREEN.** wasi **471/471** (+`28_SpreadLiterals`, +`28_StringArrayJoinSearch`, both failing on the
> old compiler; +`28_SpreadOfExpressionRefused`, `@expect-fail: compile`, which the old compiler
> also failed, unclearly) · golden-WAT **528**, 10 moved, each reviewed by function: 6 gain only
> the new string join helpers, `13_RestAndSpread`'s `$_start` copies instead of aliasing (sw78);
> failed compiles **8** · wast 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 ·
> api-surface unchanged. Reaches: wasic.ts (spread, indexOf, join value), console_log.ts (join).

> **2026-10-19, sw80–sw85, sw91, sw92, ld47 (relative indices in the array / string helpers),
> gate GREEN.** wasi **468/468** (+`28_RelativeIndexMethods`, +`28_SpliceItemReadsArrayRefused`, an
> `@expect-fail: compile`; both fail on the old compiler) · golden-WAT **525**, 212 moved, EVERY one
> reviewed by function (scratchpad `golden_review.ts`, `modc` keys compiled in library mode): each
> changes only `$__str_slice`, `$__str_pad_start` / `_end`, `$__str_replace_all`,
> `$__dynarr_slice_*`, `$__dynarr_fill_*`, `$__ta_fill_*`, `$__dynarr_splice_*` (+ `$__splice_at`)
> and splice's call sites (`28_maps` `$mapDel`); failed compiles **7** (the new refusal) · wast
> 64,506 / 0 / 16 · cross-check 1152 on baseline · go 7 / 7 / 12 · api-surface unchanged.

> **2026-10-19, sw111 / sw115–sw118 (the last silent tool rows), gate GREEN.** New suite
> **`tool_rows_tests` 16 / 16** (`tests/tool_rows_tests.ts`, the installed wasmtk; 14 of 16 fail
> on the old code, the 2 that pass are controls; sw117's 4 need TinyGo and skip without it) · wasi
> 466/466 · golden-WAT 523, 0 diverged · wast 64,506 / 0 / 16 · engine cross-check 1152 on baseline
> (111 not in it) · go 7 / 7 / 12 · typed_decl 45 · outpath 12 · merge_layout 7 · api-surface
> unchanged. Reaches: main.ts (`run`), utils.ts (WASI argv, numeric args), wasmmerge.ts (dual
> exports), gowasic.ts, witgen.ts.

> **2026-10-19, sw109 / sw110 / sw112 / ld86 (merge and bundle layout), gate GREEN.** New suite
> **`merge_layout_tests` 7 / 7** (3 fail on the old code, a 4th cannot even compile) ·
> golden-WAT 523, 46 pipeline entries re-recorded: each changes ONLY `$__heap_ptr`'s initial value
> (+2–4 bytes, the new 8-alignment), checked line by line (scratchpad `golden_pipe_diff.ts`) ·
> api-surface re-baselined (`./wasmmerge` `dataExtent` added: minor) · every other count as below.

> **2026-10-19, sw113 + sw114 (no command writes over its input; `wasic x.wat` exit code), gate
> GREEN.** New suite **`outpath_tests` 12 / 12** (`tests/outpath_tests.ts`, the installed wasmtk on
> temp copies; 0 / 12 on the old code) · golden-WAT 523, 0 diverged · every other count as on
> 2026-10-15. Reaches: main.ts, utils.ts, bindgen.ts, jstyper.ts, wasic.ts (output paths only).

> **2026-10-15, the owner's string-index ruling (sw71), gate GREEN.** typed_decl **45** (+4
> refusals, +1 accepted) · golden-WAT **523**, 6 moved, function by function: the 5 programs that
> index strings (`$__str_index`, the "undefined" text in data) and `core_EmptyAndNullChecks`
> (`$__str_is_nullish`); failed compiles 6 · 3 corpus programs migrated to `i32` / `f64.toI32`
> indices (`1_regular-expressions`, `27_number-parsing`, `27_string-formatting`) · every other
> count as batch 2.
>
> **2026-10-15, H12 loud rows batch 2 (ld10, ld14, ld37; sw74, ld44 found and fixed), gate GREEN.**
> wasi **466/466** (+`7h_ConsoleWholeArrays`, `9b_InlineStructArrays`) · golden-WAT **523**, 7 moved
> entries checked function by function (`golden_diff.ts` with `BY_FUNC=1`): only `$__arr_elem_str`
> / `$__arr_inspect` grew (+106 lines), failed compiles 6 · wast 64,506 / 0 / 16 · engine
> cross-check 1152 on baseline (111 not in it) · go 7 / 7 / 12 · api-surface re-baselined
> (`./console_log` `ArrayLookup` gained an optional `structTypeName`; a review was refused as not a
> change since v2.0.3; the floor since v2.0.3 was already MAJOR).
>
> **2026-10-15, H12 loud rows batch 1 (18 rows closed; sw72, sw73 found and fixed), gate GREEN.**
> wasi **464/464** (+6: `7f_ConsoleStringIndex`, `7g_ConsoleConcatAndCompare`,
> `11c_StringBuildingChains`, `6d_Array2DAliases`, `9_ArrayLiteralArgsAndTuples`,
> `5h_ClosureFieldsAndReturns`) · golden-WAT **521**, re-recorded after a whole-WAT diff of every
> moved entry (scratchpad `golden_diff.ts`): 6 new; `4_OperatorSemantics`, `7b_ConsoleExprFallback`,
> `7b_ConsoleOperatorSplit` (an i32 in a parenthesised concat operand printed by `$__i32_to_str`,
> not via f64), `7b_ConsoleStringCallArg` (`count(a) + count(b)` an i32 add), `13_variadic-functions`
> (`nums` a local, not a module global: sw73); failed compiles 6 before and after · wast 64,506 / 0
> / 16 · engine cross-check 1152 on baseline (105 pairs not in it) · go_asyncify 12 / 12 · every
> other suite at its count · api-surface matches.

> **2026-10-15, binaryang 1.12.0 → 1.12.1 pinned, gate GREEN, nothing known-failing.** Predicted
> from the changelog (Asyncify only: operands restored on a rewind): `go_asyncify` 11 → 12, every
> other number still. Held exactly: `go_asyncify_tests` **12 / 12** (nested prints
> `nested-sum: 36`) · wasi **458/458** · golden-WAT **515, 0 diverged** (no re-record) · bindgen
> 142 · bundle 4 · merge 1 · mod 55 · varscope 12 · jstyper 73 · dync 3 + 3 · typed_decl 40 ·
> engine 11 · wast_runner 8 · wasmath 151 exact · wasmath_lower 199 exact · wasic_seam 10 · witgen
> 23 · hybrid + guard 17 · go_bindgen 7 · go_merge 7 · wast 64,506 / 0 / 16 · engine cross-check
> 1152 on baseline (87 pairs not in it: the `36_*` five plus the programs added since) · `-Oz`
> guard 42 / 42.
>
> **2026-10-13, sw68 (arguments evaluated before the console line), gate green except the known
> `go_asyncify_tests` 11 / 12. No silent-wrong row is open.** wasi **458/458**
> (+`7e_ConsoleNestedLog`; the 198 programs whose WAT moved print exactly as before) · golden-WAT
> **515**, 198 re-recorded, each checked capture-only against a copied snapshot (scratchpad
> `sw68/shape.ts` + reading) · api-surface re-baselined (`consoleTempLocals`) · every other count
> as on sw69 below.
>
> **2026-10-13, sw70 (a local array shadowing a module one), gate green except the known
> `go_asyncify_tests` 11 / 12.** wasi **457/457** (+`9_LocalArrayShadowsModule`) · golden-WAT
> **514**, only the new entry · every other count as on sw69 below.
>
> **2026-10-13, sw69 (array and struct literal values), gate green except the known
> `go_asyncify_tests` 11 / 12.** wasi **456/456** (+`9_LiteralElementValues`) · golden-WAT
> **513**, 4 re-recorded against a copied snapshot (the new test; `28_slices` and `6b_pointers`,
> whose literals were the bug; `6b_SimpleStructs`, now static), 6 entries failing on purpose, as
> before · typed_decl **40** (+3 float-literal refusals) · bindgen 142 · bundle 4 · merge 1 · mod
> 55 · varscope 12 · jstyper 73 · dync 3 + 3 · engine 11 · wast_runner 8 · wasmath_lower 199 exact
> · hybrid + guard 17 · go_bindgen 7 · go_merge 7 · wast 64,506 / 0 / 16 · engine cross-check
> 1152 on baseline · `-Oz` guard 42 / 42 · api-surface matches.
>
> **2026-10-13, binaryang 1.8.1 → 1.12.0 pinned, gate green except `go_asyncify_tests` 11 / 12
> (nested: binaryang's Asyncify, KNOWN, letter drafted).** Predictions written first: every
> `.wasm` moves, outputs do not (held: wasi **455/455**); golden holds but for pipeline entries
> merging modc libraries (held, but 35 of them had become FAILED compiles until the two merge fixes:
> block types by index, `$__malloc` inlined); `go_asyncify` → 12 (missed: 11, a second Asyncify
> bug); wast unmoved (held: 64,506 / 0 / 16, ALL CLEAN); `deno check` clean (held). Golden **512**,
> 53 re-recorded against a copy of the 1.8.1 snapshot (43 bundles: the libraries' optimized code;
> 10 libraries: the `__heap_ptr` export), 0 failed entries, no private 131072 heaps · bindgen 142 ·
> bundle 4 · merge 1 · mod 55 · varscope 12 · jstyper 73 · dync 3 + 3 · typed_decl 37 · engine 11 ·
> wast_runner 8 · wasmath_lower 199 exact · hybrid + guard **17** (+2 merge cases) · go_bindgen 7 ·
> go_merge 7 · engine cross-check 1152 on baseline · `-Oz` guard 42 / 42 · api-surface matches.
>
> **2026-10-13, sw66 + sw67 (arrays print as Deno prints them), gate green except the known
> `go_asyncify_tests` 9 / 12.** wasi **455/455** (+`7d_ConsoleArrays`) · golden-WAT **512**: 5
> entries changed (the new test; `12_InterfaceTypes` and three `31_*` typed-array programs, their
> output still Deno's); re-recorded · bindgen 142 · bundle 4 · merge 1 · mod 55 · varscope 12 ·
> jstyper 73 · dync 3 + 3 · typed_decl 37 · engine 11 · wast_runner 8 · wasmath_lower 199 exact ·
> hybrid + guard 15 · go_bindgen 7 · go_merge 7 · wast 64,506 / 0 / 16 · engine cross-check 1152
> on baseline · api-surface re-baselined (`LogSegment` arrptr `nameLen`, `arrInspectKind`).
>
> **2026-10-13, sw62 (console lines over 128 bytes), gate green except the known
> `go_asyncify_tests` 9 / 12.** wasi **454/454** (+`7c_ConsoleLongLines`) · golden-WAT 511: 348
> entries changed (the iov pointer stored before the write; lines that can exceed the scratch use
> `$__cbuf`), none refused; re-recorded · every other suite as before · wast 64,506 / 0 / 16 ·
> engine cross-check on baseline · api-surface matches.
>
> **2026-10-13, D6 (the located compile-error report), gate green except the known
> `go_asyncify_tests` 9 / 12.** wasi **453/453** · golden-WAT 510: 4 entries changed, the
> refused-by-design programs' recorded summary (`N error(s) in <file>; no .wasm was written.`);
> re-recorded · typed_decl **37** (locations asserted as `--> file:line:col`, +2: the
> wasMath-import line, the report's notes) · every other suite as below · wast 64,506 / 0 / 16 ·
> engine cross-check on baseline · api-surface: `BundleResult.files` added (minor), re-baselined.
>
> **2026-10-13, later, D3 (a float stored into an integer is refused; ld35, ld36 fixed), gate
> green except the known `go_asyncify_tests` 9 / 12 (binaryang, report SENT).** wasi **453/453** ·
> golden-WAT 510: 42 entries changed, none a refused compile (35 dynrt pipelines merge the
> library's `toI32Sat` helper; the 4 migrated corpus programs; 2 `vcap` bundles from the rebuilt
> embedded capabilities; the `dynrt_any` bundle's comparisons now `f64.eq`); re-recorded ·
> typed_decl **35** (+9 refused shapes, +1 accepted program) · `wasmath_lower_tests` 199 / 199,
> 34,846 calls · `wasmath_tests` 151 / 151 · every other suite as below · wast 64,506 / 0 / 16 ·
> engine cross-check on baseline · api-surface matches.
>
> **2026-10-13, wasMath L4 (ld29, ld30, ld31, sw64, u64 printed unsigned), gate green EXCEPT
> `go_asyncify_tests`, which is out of L4's reach (below).** wasi **453/453**
> (+`39_WasMathL4Operators`) · golden-WAT **510**: 3 existing entries changed, each by the intended
> rule (`39_WasMathAllFunctions` u64 results through `$__u64_to_str`; `45_random-numbers`' mulberry32
> and `62_GapNumericCoercion`'s `| 0` through `$__i32_toint32`), +1 new; re-recorded ·
> `wasmath_lower_tests` **199 / 199 exact, 34,846 calls** (+220: the u64 ≥ 2⁶³ inputs no longer
> skipped) · `wasmath_tests` 151 / 151 · typed_decl 26 (+bigint `>>>`) · bindgen 142 · bundle 4 ·
> merge 1 · mod 55 · dync 3 / 3 · hybrid + wasmmerge_guard 15 · engine 11 · wast_runner 8 ·
> varscope 12 · jstyper 73 · witgen 23 · zig 20 · rust 10 · Go bindgen 7 / merge 7 · wast
> 64,506 / 0 / 16 · engine cross-check on baseline · wasic_seam 10.
> ⚠️ **`go_asyncify_tests` 9 / 12: the machine's toolchain moved to Go 1.27.2 + TinyGo 0.43.0**
> (scoop; recorded green pair: Go 1.26.7 + TinyGo 0.41.1). Three programs (WaitGroup+Mutex,
> pipeline, nested) fail in wasmtk's in-house asyncify step: `binaryen asyncify pass failed:
> Flatten: unresolved call target "$asyncify_stop_unwind"`. **The same 9 / 12 on `main` with L4
> stashed** (measured), so not L4. Open item in next-work.md.
>
> **2026-10-09, later that night, integer `/` is a compile error (owner; sw36, sw37), full gate
> green.** wasi **452/452** (10 corpus programs rewritten to `i32.div` / f64 operands, same
> output) · golden-WAT **509**: exactly those 11 entries changed (10 programs + the date bundle's
> wasic step), re-recorded · typed_decl **25** (+6 refused shapes, +1 accepted) · wasic_seam 10 ·
> every other suite as below · wast 64,506 / 0 / 16 · engine cross-check on baseline ·
> api-surface matches.
>
> **2026-10-09, night, wasMath L3 ("CR, in both"; sw57–sw59, sw61, sw63, ld27, ld28, ld33),
> full gate green.** wasi **452/452** (+`38_MathEdgeCasesL3`) · golden-WAT **509**: 15 entries
> changed ONLY inside the merged mathlib (checked with the mathlib functions stripped: program code
> identical), `39_WasMathAllFunctions` regenerated (all 199), +1 new; re-recorded ·
> `wasmath_tests` 151 / 151 · `wasmath_lower_tests` **199 / 199 exact** · bindgen 142 · bundle 4 ·
> merge 1 · mod 55 · dync 3 / 3 · hybrid + wasmmerge_guard 15 · typed_decl 18 · engine 11 ·
> wast_runner 8 · varscope 12 · jstyper 0 failed · witgen 23 · zig 20 · rust 10 · Go 7 / 7 / 12 ·
> wast 64,506 / 0 / 16 · engine cross-check 1152 on baseline · wasic_seam 10 · api-surface
> re-baselined (wasMath's f64 Math members now typed; floor MAJOR, as before).
>
> **2026-10-09, evening, wasMath L2 + the corpus on wasMath (ld32, sw65), full gate green.**
> wasi **451/451** (+`39_WasMathAllFunctions`, +`39_WasMathStopsTheSame`; the 278 programs that
> declared their own numeric aliases now import them from wasMath) · golden-WAT **508 / 0**: 0
> existing entries changed (the migration, the bundler's string-literal fix and ld32 all
> byte-neutral on the corpus), +2 new · `wasmath_tests` 151 / 151 · `wasmath_lower_tests` 199
> functions, 176 exact, 23 known (Math, L3), 0 failed · bindgen 142 (its 7 migrated fixtures go
> through `modc`) · engine 1152 on baseline · wast 64,506 / 0 / 16 · Go 7/7/12 · api-surface
> matches · every other suite as before. The repro verifier now has time limits (ld33 reads
> RUN-FAIL "HANG").
>
> **2026-10-09, wasMath L1 (a new, standalone module), gate by the impact map.** `src/wasmath.ts`
> is imported by nothing in `main.ts` / `src/` (grep, only its own doc example), and `deno.json`
> gained only an `exports` entry, so no CLI suite can reach the change: golden-WAT **506 / 0**
> (the compiler's output byte-identical), `wasic_seam` 10 / 0, `deno check main.ts` clean, and the
> new `wasmath_tests` **151 / 151 exact** (69,318 calls). The other suites were not run, by this
> reasoning; the next change to `wasic.ts` (L2) runs the full gate.
>
> **2026-10-09, late, nullable fields carry a flag word (sw51, owner's option A; sw54–sw56,
> ld26), full gate green.** wasi **449/449** (+`24_NullableFields`, which fails on main) ·
> golden-WAT **506 / 0** after a deliberate re-record: 3 entries changed (the nullable tuple's
> flag word in `24_NullableTupleReturnAndFlags`; the two `25_` tests print their nullable locals
> through the null printer, same output, larger WAT), +1 new · engine 1152 on baseline · wast
> 64,506 / 0 / 16 · Go 7/7/12 · every other suite as before. Round-1 repros: 2 DIFFER = open
> silent 2 (sw36, sw37, waiting on the owner); 16 + 3 = open loud 19.
>
> **2026-10-09, night, boxed f64 captures (sw53), full gate green.** wasi **448/448**
> (+`5h_CapturedFloatMutation`, which fails on main) · golden-WAT **505 / 0**: 2 entries changed
> (the box helper's comment only), +1 new · engine 1152 on baseline · wast 64,506 / 0 / 16 · Go
> 7/7/12 · every other suite as before; all 34 closure corpus tests identical to Deno. Round-1
> repros: 3 DIFFER = open silent 3 (sw36, sw37, sw51, all waiting on the owner); 16 + 3 = open
> loud 19.
>
> **2026-10-09, evening, closure result types (sw52, ld21), full gate green.** wasi **447/447**
> (+`5h_ClosureResultTypes`, which fails on main) · golden-WAT **504 / 0**: 1 entry changed (the
> sw48 prologue line's indentation), +1 new · engine 1152 on baseline · wast 64,506 / 0 / 16 · Go
> 7/7/12 · every other suite as before; all 34 closure corpus tests identical to Deno. Round-1
> repros: 4 DIFFER = open silent 4 (sw36, sw37, sw51, sw53); 16 + 3 = open loud 19.
>
> **2026-10-09, later, `&&` / `||` operands and boxed parameters (sw48, sw49), full gate green.**
> wasi **446/446** (+`4_LogicalOperands`, +`5h_CapturedParamMutation`; both fail on main) ·
> golden-WAT **503 / 0**: 0 entries changed, +2 new. A FIRST cut split `a || b || c` at the first
> operator and re-grouped 43 library entries (equivalent, not identical); splitting at the last
> (left-associative) made them byte-identical · engine 1152 on baseline · wast 64,506 / 0 / 16 ·
> Go 7/7/12 · every other suite as before. Round-1 repros: 4 DIFFER = open silent 4 (sw36, sw37,
> sw51, sw52); 17 + 3 = open loud 20.
>
> **2026-10-09, values converted to strings, `Math.min`/`max`, `??` on numbers (sw06–sw09, sw19,
> sw28; found and fixed sw50, ld24, ld25), full gate green.** wasi **444/444**
> (+`11_StringConversions`, which fails on main) · golden-WAT **501 / 0** after a deliberate
> re-record: 9 entries changed, each a console `String(x)` now built by the shared multi-value
> helper (`$__exn_str`, `$__<type>_to_new_str`; same values), +1 new. A FIRST cut also changed
> `24_NullableTupleReturnAndFlags` (`val ?? -1` lost its 0 test, so a null tuple element became
> 0): caught reading the golden diff, fixed before the gate, and it exposed sw51 · engine 1152 on
> baseline · wast 64,506 / 0 / 16 · Go 7/7/12 · bindgen 142 · bundle, merge, mod, jstyper, dync
> 0 failed · varscope 12 · typed_decl 18 · engine_tests 11 · wast_runner 8 · witgen 23 ·
> wasic_seam 10 · hybrid + wasmmerge_guard 15. Round-1 repros: 5 DIFFER = open silent 5 (sw36,
> sw37, sw48, sw49, sw51); 17 + 3 = open loud 20.
>
> **2026-10-06, operator precedence / grouping / typing (sw10–sw17), full gate green.** wasi
> **443/443** (+`4_OperatorSemantics`) · golden-WAT **500 / 0** after a deliberate re-record: 4
> entries changed (`a - b + c` regrouped in the date library, i32-identical; two `i32` vs
> declared-`f64` comparisons now in f64), +1 new. A FIRST cut changed 79 entries, 2 of them to
> compile failures and 3 to invalid `f64.mul` over `i32.load`: all three defects were in the fix
> and were found by reading the golden diff before the gate · engine 1152 on baseline · wast
> 64,506 / 0 / 16 · Go 7/7/12 · every other suite as before. Round-1 repros: 10 DIFFER = open
> silent 10; 17 + 3 = open loud 20.
>
> **2026-10-06, console `%` / escapes / boolean ternaries, closure state (sw20, sw24, sw25,
> sw32, ld02), full gate green.** wasi **442/442** (+`7b_ConsoleOperatorsAndClosures`) ·
> golden-WAT **499 / 0**: 1 entry changed (`rem_u` → `rem_s` on positive operands, same
> result), +1 new · engine 1152 on baseline · wast 64,506 / 0 / 16 · Go 7/7/12 · every other
> suite as before. Round-1 repros: 17 DIFFER = open silent 17; 17 + 2 = open loud 19.
>
> **2026-10-06, top-level code beside `main` (sw46, sw47), full gate green.** wasi **441/441**
> (+`56_TopLevelBesideMain`) · golden-WAT **498 / 0** after a deliberate re-record: 9 entries
> changed, all sw46 (7 now initialise their top-level `guard` array, 1 gains harmless comments for
> type-union continuation lines, whitespace in `(call $main )`); all 9 still match Deno; +1 new ·
> engine 1152 on baseline · wast 64,506 / 0 / 16 · Go 7/7/12 · every other suite as before.
> Round-1 repros: 20 DIFFER = open silent 20; 17 loud. NOTE: the installed `wasmtk` is a shim
> over this repo's `src/`, so a source edit DURING a gate run leaks into the rest of the run.
>
> **2026-10-06, the thrown kind (sw44), full gate green.** wasi **440/440** (+`15_ThrownKind`,
> +`15_ThrownKindAsync`) · golden-WAT **497 / 0** after a deliberate re-record: 25 entries
> changed, every line sw44's (the kind global and its sets, catch `__kind` locals, `$__exn_str`,
> run-time `instanceof`, the promise kind word, data offsets moved by the seven `Name: `
> strings), +2 new · engine 1152 on baseline (wasmtime / wasmer / wazero accept the new global) ·
> wast 64,506 / 0 / 16 · Go 7/7/12 · every other suite as before. Round-1 repros: 21 DIFFER =
> open silent 21 (sw44 out, sw46 in); 17 loud.
>
> **2026-10-06, f32 in containers + for-of over array params (sw43, ld18, sw45), full gate
> green.** wasi **438/438** (+`9_F32Containers`) · golden-WAT **495 / 0**: ZERO existing entries
> changed (every rewrite touches only f32 or a for-of over a parameter, and the corpus has
> neither), +1 new · engine 1152 on baseline · wast 64,506 / 0 / 16 · Go 7/7/12 · every other
> suite as before. Round-1 repros: 21 DIFFER = open silent 21; 15 + 2 = open loud 17.
>
> **2026-10-06, console number printing (sw41, sw42, ld16, ld17), full gate green.** wasi
> **437/437** (+`7b_ConsoleNumberFormatting`) · golden-WAT **494 / 0** after a deliberate
> re-record: 146 entries changed, 0 lines removed once `$__f64_to_str_console` is read as
> `$__f64_to_str`; 144 gain that helper, 2 gain unused `$__str_op` locals; +1 new · engine 1152
> on baseline · wast 64,506 / 0 / 16 · Go 7/7/12 · every other suite as before. One regression
> caught BEFORE the gate: routing every console `String(...)` through emitStringAssign made
> `15_Exceptions` print `Error: custom error` for a thrown string (sw44); `String(<string
> local>)` keeps the old pass-through. Round-1 repros: 22 DIFFER = open silent 22; 17 = open loud.
>
> **2026-10-06, wasm-math Phase 1 (exact `Math`; Math results at the declared type), full gate
> green.** wasi **436/436** (+`38_MathExactSemantics`) · golden-WAT **493 / 0** after a deliberate
> re-record: 42 entries changed, every line explained (inline round / sign / hypot → helper calls;
> 35 dynrt pipelines also renumber functions around the new helper), +1 new · engine 1152 on
> baseline, 0 regressed · wast 64,506 / 0 / 16 · Go 7/7/12 · bindgen 142 · bundle 4 · merge 1 ·
> mod 55 · varscope 12 · jstyper 73 · dync 3 + 3 · typed_decl 18 · engine_tests 11 ·
> wast_runner 8 · hybrid + wasmmerge_guard 15. Round-1 repros: sw38–sw40, ld04, ld15 MATCH; 21
> DIFFER = open silent-wrong 21; 18 compile/run failures = open loud 18. A 392-line battery
> (224 `hypot` calls, `round` / `sign` on 84 values) is identical to Deno bar sw41's `-0` printing.
>
> **2026-09-30, H12 sw18 + sw22 + sw23 (operator split in `console.log`), full gate green.** wasi
> **435/435** (+`7b_ConsoleOperatorSplit`) · golden-WAT **492 / 0** after a deliberate re-record:
> 490 identical, ONE changed correctly (`38_MathTrig`: `-Math.PI / 2` now `(-π) / 2`,
> bit-identical), +1 new · engine 1152 on baseline, 0 regressed · wast 64,506 / 0 / 16 · Go
> 7/7/12 · every other suite as before. Round-1 repros: sw18/sw22/sw23 MATCH; ld06 stays RUN-FAIL
> (checked: a mid-fix widening had made it print `ok: 1`); 19 DIFFER = open silent-wrong 19.
>
> **2026-09-30, H12 sw05 + sw35 + sw21 (calls in `console.log`), full gate green.** wasi
> **434/434** (+`7b_ConsoleStringCallArg`) · golden-WAT **491 / 0** after a deliberate re-record:
> 465 identical, 25 differ ONLY by an unused `$__str_op_ptr/len` declaration (a script ignoring
> exactly those two lines found 0 other differences), +1 new entry · engine 1152 on baseline, 0
> regressed · wast 64,506 / 0 / 16 · Go 7/7/12 · bindgen 142 · bundle 4 · merge 1 · mod 55 ·
> varscope 12 · jstyper 73 · dync 3 + 3 · typed_decl 18 · engine_tests 11 · wast_runner 8 ·
> hybrid + wasmmerge_guard 15. Round-1 repros: sw05 and sw21 now MATCH, no row changed class.
>
> **2026-09-30, modc dynrt-merge fix + exit-code sweep, full gate green.** wasi **433/433** ·
> bindgen **142/142** on freshly built fixtures (127/2 without the `wasmmerge` fix) · golden-WAT
> 490 / 0 · engine 1152 on baseline, 0 regressed · wast 64,506 / 0 / 16 · Go 7/7/12.
>
> **2026-09-30, H12 console fallback (delegate or abort), full gate green.** wasi **433/433**
> (+`7b_ConsoleExprFallback`) · golden-WAT **490 / 0**: one entry re-recorded, the
> intentionally failing `34_InlinePredicateUnresolvable`, whose status now counts 2 causes (its
> `console.log(… s.weight)` is the same unresolvable read, now also reported) · engine **1152** on
> baseline (+3, all `match`), 0 regressed · wast 64,506 / 0 / 16 unchanged · Go 7/7/12 · every other
> suite green. Round-1 repros: sw04 and sw27 MATCH; 7 rows COMPILE-FAIL with the new diagnostic.

> **2026-09-30, custom-page-sizes lowering in the wast GATE.** wast **64,506 / 0 / 16** (from
> 64,473 / 66): 33 passes on 23 lowered modules, printed on their own line; 3 files re-recorded
> (`custom-page-sizes`, `-invalid`, `memory_max`). `wast_runner_tests` **8/8** (4 trap kind + 4
> lowering). Full gate, because `src/binaryen.ts` (compile path) gained a function: wasi 432/432,
> golden-WAT 489 / 0 byte-identical, Go 7/7/12, engine cross-check 1149 on baseline (0 regressed),
> `-Oz` guard 42/42, every other suite green.

> **2026-09-30, binaryang 1.8.1 pinned (from 1.7.1), full gate green, every prediction held.**
> `-Oz` guard 42/42 · wasi **432/432** · golden-WAT **489 / 0** after RE-RECORDING 60 entries whose
> change is layout and `;;` comments ONLY, checked token by token (0 token changes): the bundle
> pipelines and the programs that merge the math library, whose merged WAT includes compat
> `toText` output, which 1.7.2 re-laid-out (design-decisions.md); the other 429 byte-identical ·
> engine 1149 on baseline, 0 regressed, 0 improved · wast **64,473 / 0 / 66** unchanged, the
> validator-oracle guard at 0 · Go 7/7/12 · merge, bundle, mod, wasmmerge_guard (the merge paths,
> run first as the at-risk set) and every other suite green, `wast_runner_tests` 4/4.

> **2026-09-30, wast `assert_trap` checks the trap KIND.** New suite `wast_runner_tests.ts`
> **4/4** (fails 4/4 on the old runner). wast **64,473 / 0 / 66** unchanged (all 5,263 trap passes
> were already the right kind, measured). A `src/wast.ts`-only change: `main.ts` and three test
> files import it and nothing on the compile path does, so the gate was `wast_tests`,
> `engine_tests` 11/11, `wast_runner_tests`, plus a reinstall and the `^15_` wasi phase (12/12) as
> a CLI smoke. wasi, golden-WAT, Go, engine cross-check and the rest are out of reach.

> **2026-09-29, H12 sw03 + sw34 fixed, full gate green.** wasi **432/432** (+`7b_ConsoleTernaryBeforeOperators`,
> `15_ConsoleInstanceofCondition`) · golden-WAT **489 / 0**, one existing entry changed
> (`15_ThrowNonError`: the `e instanceof Error` stub became `(i32.const 1)`; full diff reviewed;
> moving the ternary block changed NO other output) · engine 1149 on baseline (+6 hand-added:
> 5 `match`, wazero `reject` on the try/catch one, as `15_Exceptions`) · wast 64,473 / 0 / 66
> unchanged · Go 7/7/12 · every other suite green.

> **2026-09-29, H12 sw02 fixed, full gate green.** wasi **430/430** (+`7b_ConsoleStringTernary`) ·
> golden-WAT **487 / 0**, RE-RECORDED with 11 existing entries changed, each reviewed by a full
> old-vs-new WAT diff: 9 only gained the unused `$__str_op_ptr/len` declaration (the console-`?`
> pre-scan over-declares; Binaryen strips it), 2 (`27_url-parsing`, `15_ThrowNonError`) turned a
> console string `select` into an `if`. Engine 1143 on baseline (+3 hand-added, all `match`) · wast
> 64,473 / 0 / 66 unchanged · Go 7/7/12 · every other suite green.

> **2026-09-29, binaryang 1.7.1 + the second `assert_invalid` oracle, full gate green.** wast
> **64,473 / 0 / 66** (from 64,434 / 105), measured in two steps: the pin alone 64,443 / 96
> (`memory.wast` +6, `table.wast` +3: limits above u32), then binaryang's validator where V8 cannot
> judge (+30, 9 files; guard: binaryang rejected 0 of the corpus's VALID modules, inversion-checked
> with `defaultFeatures()` → 3 flagged). The 66 left: 61 V8 (custom page sizes 54, stringref 3, its
> own size caps 4), 5 vendored `threads`. `-Oz` guard 42/42 · wasi 429/429 · golden-WAT 486 / 0 ·
> engine 1140 on baseline · engine_tests 11/11 (two pins updated) · Go 7/7/12 · all others green.

> **2026-09-29, H12 sw01 + sw33 fixed, full gate green.** wasi **429/429** (+3 `15_Throw*`) ·
> golden-WAT **486 / 0** (+3 recorded; the 483 existing outputs byte-identical) · engine 1134 on
> baseline, 0 regressed, + 6 new pairs hand-added for `15_ThrowNonError` / `15_ThrowTypeErrorUncaught`
> (same pattern as `15_Exceptions` / `15_panic`) · wast 64,434 / 0 / 105 unchanged · Go 7 / 7 / 12 ·
> every other suite green. ⚠️ The 5 `36_*` modules (15 pairs, all `match`) are still NOT in
> `engine_baseline.json`, since the Phase 36 restore; left for a deliberate `--update-baseline`.
>
> **2026-09-28 (after v2.0.3), engine-refusal rule + user explanations.** New suite
> `engine_tests.ts` **11/11** (`deno run`). wast **64,434 / 0 / 105** (24 false passes → skips).
> Full gate green: wasi 426/426 · engine 1134 on baseline, 0 regressed · golden-WAT 483 / 0 ·
> every other suite green · `deno doc --lint` clean on all 16 entrypoints.
>
> **2026-09-28, binaryang 1.7.0 pinned, full gate green.** `-Oz` guard pre 42 / post 42 · golden-WAT
> 483 / 0 diverged (1.7.0 changed none of wasic's output) · wasi 426/426 · engine 1134 on baseline,
> 0 regressed · wast **64,458 / 0 failed / 81 skipped** (re-recorded: 17 files, all up) · every other
> suite green.
>
> **2026-09-28, Phase 36 restored + dync runtime table, full gate green.** wasi **426/426** (+5
> `36_*`) · engine 1134 on baseline, 0 regressed · golden-WAT 483 compared, 0 diverged (+5 recorded)
> · wast 63,800 / 0 / 804 · every other suite green.
>
> **2026-09-28, typed-declaration rule landed, full gate on the final binary, all green.** wasi
> 421/421 (71 sources annotated) · engine 1134 pairs on baseline, 0 regressed · wast 288 files /
> 63,800 / 0 failed / 804 skipped (unchanged) · golden-WAT 478 compared, 0 diverged (one entry,
> `18_Multi`, re-recorded as intended) · NEW `typed_decl_tests` 18 · hybrid 13 (+3) + guard 2 via
> `deno test` · every other suite unchanged and green.

> **2026-09-28, binaryang 1.6.0, full gate re-run, all green.** wasi 417/417 · engine 376 × 3 =
> 1128 pairs ALL ON BASELINE · bindgen 142 · bundle 4 · dync 3+3 · go_merge 7 · go_bindgen 7 ·
> go_asyncify 12 · jstyper 73 · merge 1 · mod 55 · varscope 12 · hybrid+guard 12 · **wast 288 files
> / 37,370 on the bump alone (+5 gained coverage; 15 pinned / 100 failures unchanged,
> 0 unrunnable), then 37,674 / 0 failures after the same-day runner fixes, then 63,732 / 886 skipped after the SIMD/NaN trampoline, then 63,880 / 726 after the runner-owned skip groups were closed, then 63,986 / 618 with `exnref` via the trampoline and the gate's V8 flag, then **63,800 / 804** after the false-pass audit (186 passes that rested on the wrong failure became skips)**. go_merge
> needed a `src/` fix first (see compiler-bugs.md).
