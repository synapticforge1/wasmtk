# testing — part 2 of 5

Continues [testing.md](testing.md) (split by size on 2026-11-20, letter H38). Sections:

- Current pass counts (2026-11-20, binaryang **4.1.1**; latest release v

## Current pass counts (2026-11-20, binaryang **4.1.1**; latest release v3.0.0)

> **2026-11-20, later: H39 — `src/host.ts` (every system call), atomic writes, `--self-check`;
> full gate GREEN on branch `refactor/host-ts-2026-11-20`.** wasi **509/509** · golden 568
> byte-identical · wast 64,506 / 0 / 16 ALL CLEAN · cross-check 1374 · outpath **17** (+3: `-o NUL`
> / `/dev/null` writes nothing beside it, no temporary file left, an existing output replaced) ·
> wasic_seam **11** (+1: `host.*` is host I/O — the pattern was `rt.` only) · check-host: 30 files,
> 0 findings; self-test 26 cases + 4 mutants · `wasmtk --self-check` every step ok (installed
> CLI, win-x64) · every other suite at its count. Mutant: the device mapping off → outpath's NUL
> case and the self-check FAIL (os error 87). Run order: workflow.md § The full gate, step 2d.

> **2026-11-20: binaryang 4.0.0 → 4.1.1 pinned, full gate GREEN, NOTHING moved, as predicted**
> (4.1.0: CLI device writes, `--self-check`; 4.1.1: an `-O2`+ RemoveUnusedBrs fix that only changes
> modules it used to refuse, and the validator refusing more than one supertype). Counts identical
> to 2026-11-18 below: wasi 509/509 · golden 568 byte-identical · wast 64,506 / 0 / 16 ALL CLEAN ·
> cross-check 1374 · `-Oz` guard 42 / 42 · go 7 / 7 / 12 · every other suite at its count.

> **2026-11-18: binaryang 2.2.0 → 4.0.0 pinned, full gate GREEN, ONE number moved, as predicted**
> (2.2.2's `delegate` depth check): wast `legacy/try_delegate.wast` accepted-invalid 1 → 0, so
> `KNOWN_ACCEPTED_INVALID` is now empty; wast 64,506 / 0 / 16 ALL CLEAN. Everything else
> unchanged: wasi **509/509** · golden-WAT **568** byte-identical (also run on 2.2.0 just before the
> pin: 568, 0 diverged) · `-Oz` guard 42 / 42 · cross-check **1374** on baseline · go 7 / 7 / 12 ·
> merge_layout 17 · tool_rows 37 · outpath 14 · witgen 24 · typed_decl 50 · bindgen 142 · mod 55 ·
> hybrid + wasmmerge_guard 17 · wasMath L1 151 / L2 199 exact · zig 20 · rust 10 · every other
> suite green. 3.0.x's optimizer fixes (tail-call inlining, SimplifyLocals in a `try`) moved no
> golden; 4.0.0's 256-level nesting limit and refusals met nothing in the corpus.

> ### EVERY suite in the repo is green (2026-07-30, re-measured on the v2.0.0 tree) — full roster
>
> | Suite | Result |
> | --- | --- |
> | `tests/wasi/wasm_wasi` (`wasi_tests.ts`) | **433 / 433** (2026-09-30: +
> `7b_ConsoleExprFallback`; 2026-09-29: + `7b_ConsoleTernaryBeforeOperators` (sw03),
> `15_ConsoleInstanceofCondition` (sw34), `15_ThrowNonError`, `15_ThrowTypeErrorUncaught`,
> `15_ThrowObjectRefused` (sw01), `7b_ConsoleStringTernary` (sw02); 2026-09-28 426 with the five
> `36_*`. Earlier, 421 (2026-09-28: + `11_StringConcatScalars`, `27_EscapedQuoteLiterals`,
> `22_UndeclaredReceiverDiagnostic`, all full-gated; before them 418 with + `18_DenoExitNonZero`,
> the `proc_exit(N)` regression, `@expect-exit: 3`; phase-filter verified, inversion-checked against
> the old exit handling) — before that 417: 412 + the Phase 34 type-predicate batch (3 owner stress
> tests; 2 passed as written, 1 exposed the inline-target bug) + 2 regressions, 2026-07-30. Full
> suite RE-RUN: the fix changed `src/wasic.ts`, so the gate applied |
> | `wast_tests.ts` | **288 files, 64506 passing, 0 failures, 16 skipped — ALL CLEAN** (2026-09-30:
> + custom-page-sizes lowering, 33 passes on 23 lowered modules, reported apart; before it
> 2026-09-29, binaryang 1.7.1 + the validator oracle; before it 64434 / 105 2026-09-28 after v2.0.3:
> 24 passes that rested on V8's own limitations became skips, see compiler-bugs.md; before it 64458
> / 81 on binaryang 1.7.0 + custom-descriptors flag scoped to its proposal directory; before it
> 63800 / 804. Earlier 2026-09-28: a false-pass audit demoted 186 passes to skips, see
> compiler-bugs.md; before it 63986 / 618: `exnref` via the trampoline and the gate's
> `--experimental-wasm-wide-arithmetic`, 726 → 618; the runner-owned skip groups before that, 886 →
> 726; before that the SIMD/NaN trampoline took 37674 / 26944 skipped to 63732 / 886. Before that,
> three runner fixes took 37370 / 100 failures to 37674 / 0; see compiler-bugs.md. The bump itself,
> on binaryang 1.6.0: +1 `memory_max_i64`, +1 `try_catch`, +2 `try_delegate`, +1 `tag`, all skip →
> pass. Before that, 37365, re-recorded 2026-09-19; `ref.null` took it to 37,370, the vendored
> `threads` patch gave back 3, and the `assert_malformed` stage split gave back 2 more that were
> passing for the wrong reason), with **15 files pinned WITH failures** and **0 unrunnable**. On
> **binaryang 1.6.0** (was wabt-ts 1.4.1 before the 2026-08-27 merge; unchanged across 1.5.1 → 1.5.2
> → 1.5.3). The +9264 passes are the 1.4.0/1.4.1 bump landing after the three malformations it
> exposed were fixed: an earlier 1.4.0 attempt was reverted when it took wasi to 378/417 and both
> dync suites to 0. **The gain is mostly recovered COVERAGE, not new correctness** — 14 of the 15
> newly-pinned files went `unbuilt → 0`, so modules that could not previously be assembled now run
> and expose real conformance gaps (`ref_cast`, `ref_test`, `br_on_cast`, `table_grow`, … —
> GC/ref-types). Those failures were always there; they were invisible. See compiler-bugs.md |
> | `bindgen_tests.ts` | 142, 0 failed (2026-09-30: every fixture rebuilt from scratch; the 142 of earlier dates rested partly on two stale fixtures, see compiler-bugs.md) |
> | `engine_cross_check_tests.ts` | **1152 pairs on baseline, 0 regressed (2026-09-30); the five
> `36_*` modules (15 pairs, all `match`) are not in the baseline yet** — earlier **376 modules × 3
> engines = 1128 pairs, ALL ON BASELINE** — the multi-engine gate (2026-08-24). V8 vs
> wasmtime/wasmer/wazero, byte-identical stdout. Baseline `tests/engine_baseline.json`.
> **Re-recorded 2026-09-28 with EXIT-CODE-aware comparison** (`match` = same stdout AND same exit
> code; a program that dies on an uncaught exception is in scope; an engine that fails having
> printed nothing is a `reject`; a baselined module that is no longer compared fails the gate as
> VANISHED, which was inversion-tested with a planted module): **wasmtime 367 match / 9 reject**
> (was 364/12: the three crashing programs now match, at exit-code parity), wasmer 363/13, wazero
> 346/30. **Re-recorded 2026-08-25 after the `try_table` migration: wasmtime 364 match / 12 reject /
> 0 differ** (was 354/22 — 10 modules flipped `reject → match` once EH stopped being legacy). The 37
> `differ` on the very first run were the `fd_write` short-write bug, fixed the same day.
> **Re-recorded AGAIN 2026-08-27 when the `-Oz` skip was lifted: wasmer 363 match / 13 reject** (was
> 353/23 — 10 modules that wasmer REJECTED as raw wabt output load once binaryen has optimised
> them). wazero unchanged at 346/30. Verified ALL ON BASELINE again on binaryang 1.5.3 with `0
> regressed, 0 improved`, and again on 1.6.0 (2026-09-28) |
> | `go_merge_tests.ts` · `go_bindgen_tests.ts` · `go_asyncify_tests.ts` | **7 / 7 · 7 / 7 · 12 /
> 12** — green on **Go 1.26.7 + TinyGo 0.41.1**. TinyGo 0.41.1 caps at Go 1.26; a Go 1.27 install
> breaks all three (`requires go version 1.19 through 1.26`). Keep the pair in step — Go 1.27 is
> safe only once TinyGo **0.42.0** ships (support is on `dev`). See [next-work.md](next-work.md) |
> | `zig_tests.ts` · `rust_tests.ts` | **18 / 18 · 10 / 10** (added 2026-09-28; zig includes 3
> checks of the `binaryenOptimize` failure CONTRACT, which runs even without zig) — green on **zig
> 0.16.0** and **rsxtk 0.4.4** (rustup with `wasm32-wasip1`). Both skip cleanly when their tool is
> absent. Neither is Deno.test-based: `deno run`, not `deno test` |
> | `bundle_tests.ts` | **4 / 4** — `StructImport` fixed, no longer a standing failure |
> | `mod_tests.ts` · `merge_tests.ts` · `varscope_tests.ts` · `wasmmerge_guard_tests.ts` | 0 failed |
> | `hybrid_tests.ts` · `jstyper_tests.ts` | 0 failed |
> | `go_bindgen_tests.ts` · `go_merge_tests.ts` · `go_asyncify_tests.ts` | 0 failed — TinyGo IS installed, so these genuinely ran; they did NOT self-skip |
> | `dync_conformance_tests.ts` · `dync_cross_runtime_tests.ts` | 0 failed |
>
> **How 375 → 400:** +8 stress tests in the 22/24/25/26 batch
> (`22_ConstEnumFoldingAndExponentCast`, `24_NullableTupleReturnAndFlags`,
> `25_NullishOnlyNullFallback`, `25_LogicalAssignmentOperators`,
> `25_NullishShortCircuitSideEffects`, `26_ForOfBreakContinue`, `26_ArrayDestructuringDefaults`,
> `26_NestedForOfMatrix`) — 5 of which surfaced real compiler bugs; +1
> `12_LowercaseStructTypeName` (the `bundle_tests` StructImport fix); +3 Phase 27 string tests
> (`27_StringSplitAndForOf`, `27_StringTrimPadReplace`, `27_CharCodeAndSubstringQuery`) which
> surfaced the `emitStringPtrLen` parity gap; +3 Phase 28 array-method tests
> (`28_ArrayPredicatesAndAt`, `28_ArrayMutationsAndSort`, `28_ArrayJoin`) which surfaced
> `join`-has-no-string-value; +1 `27_ConsoleLogBracketConcat` (the `]`/`)`-in-literal concat bug
> that `28_ArrayJoin` exposed as a side-discovery); **+3 Phase 29 class tests
> (`29_StaticFieldsAndGlobals`, `29_GettersAndSetters`, `29_StringEnumDispatch`) +1
> `22_MultiplicativeAssociativity`** — the getter/setter test exposed that `*`/`/`/`%` were parsed
> RIGHT-associatively (`180 * 5 / 9` gave 0), the single most consequential bug of the series;
> **+3 Phase 30 tests (`30_NamespaceConstAndFunction`, `30_InterfaceInheritanceExtends`,
> `30_ShorthandPropertyReturn`) +1 `30_NamespaceInternalRefs`** — the namespace test exposed that
> unqualified references to a namespace's own members were never rewritten, and probing that
> surfaced (and fixed) string-typed namespace members: **+1 `30_NamespaceStringMembers`**.
> All post-mortems in compiler-bugs.md.
>
> **412 → 417 (2026-07-30):** +3 Phase 34 type-predicate stress tests
> (`34_TypePredicateBasicNarrowing`, `34_TypePredicateElseIfChains`,
> `34_DiscUnionPredicateInlineTarget`) +2 regressions (`34_InlinePredicateTargetNarrowing`,
> `34_InlinePredicateUnresolvable` — `@expect-fail: compile`). Tests 1–2 passed as written; test 3
> writes the predicate target as an INLINE object type (`g is { type: "sphere"; r: f64 }`), which
> the function-header regex did not admit — so the predicate function was never parsed and the call
> died with a misleading "Unknown function". Fixing that exposed a second bug underneath: an inline
> target resolves to no registered type, so narrowing was skipped and a hierarchy field read printed
> `0` instead of `5`. See compiler-bugs.md § "Phase 34 inline predicate target".
>
> **410 → 412 (2026-07-30):** +2 Phase 33 regressions for the base-prefix guard —
> `33_IntersectionBasePrefixGuard` (`@expect-fail: compile`; the reversed-order shape that used to
> print `1.6` instead of `6`) and `33_IntersectionPrefixOk` (the four prefix-compatible shapes the
> guard must NOT reject). `src/wasic.ts` + `src/console_log.ts` changed, so the full gate applied.
>
> **407 → 410 (2026-07-30):** +3 Phase 33 intersection-type stress tests
> (`33_IntersectionMixedTypeMerge`, `33_ChainedIntersectionIntDivide`,
> `33_IntersectionBasePointerParam`). All three passed as written, every printed value matching the
> owner's inline `// Expected:` annotations, so the `"^33_"` filter (7/7) was the whole gate. **A
> follow-up probe on test 3's mechanic did surface a bug** — base-pointer passing is only sound when
> the base interface is the FIRST constituent of the intersection; see compiler-bugs.md § "Phase 33
> intersection base-prefix".
>
> **403 → 407 (2026-07-30):** +3 Phase 19 discriminated-union stress tests
> (`19_DiscUnionSuperStructLayout`, `19_SwitchCaseVariantDispatch`, `19_ElseIfNarrowingFieldCast`)
> +1 regression `19_UnionSharedFieldWidening`. Test 3 exposed that a field name shared by two
> variants took the FIRST variant's type — `val: i32 | f64` laid out as 4-byte i32, truncating
> `25.5` to `25` on store and emitting `i32.load` into an `(result f64)` function (invalid WASM).
> Fixed by resolving/widening shared fields instead of skipping them. See compiler-bugs.md.
>
> **400 → 403 (2026-07-30):** +3 Phase 31 TypedArray stress tests
> (`31_TypedArraySubWordAccess`, `31_TypedArrayLiteralInitializer`, `31_TypedArrayFillAndSet`).
> **The first batch of the series to surface NO bug** — all three passed as written, every printed
> value matching the owner's inline expectations. See compiler-bugs.md § "Phase 31 TypedArray
> stress batch" for what they cover and why the phase was already solid.
>
> ⚠️ **Do NOT run the Go suites concurrently with other suites on Windows.** Running
> `go_asyncify_tests` alongside the full wasi suite produced 4 spurious failures — all `os error 32`
> ("file is being used by another process") on `tests/go_fixtures/**/main.wasm`, i.e. the TinyGo
> build / asyncify write racing the OS file lock, NOT assertion failures.
>
> 🔁 **CORRECTION 2026-08-31 — "run alone it is 12/12" is NOT reliable.** Measured back-to-back with
> nothing else running: run 1 **11/1** (`nested (re-entrant suspend)`, `os error 32` on
> `writefile … nested/main.wasm`), run 2 **12/12**, same inputs. Concurrency with *other suites* is
> not the only trigger — a **preceding run of this same suite** is enough, because handles from the
> prior run's spawned processes are still closing. Practical rule: **let the machine settle between
> Go-suite runs, and re-run once before believing an `os error 32` failure.** It is an OS race, never
> an assertion failure — the tell is `os error 32` in the message and a passing assertion count
> everywhere else.
>
> ⚠️ **This can fail a release gate.** If a publish run trips it, re-run rather than investigating
> the Go producer. A retry-with-backoff around the asyncify write in `src/gowasic.ts` would remove it
> for good; deliberately NOT done inside a release batch — see [next-work.md](next-work.md) (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`).
>
> **Runner note:** a full `tests/wasi/wasm_wasi` pass now exceeds 10 minutes on this machine; run it
> backgrounded or with a raised timeout. Beware the shell idiom `… ; grep -c "FAILED"` as the last
> command — `grep -c` exits **1** when the count is 0, so a perfectly green run reports a non-zero
> script exit. Check the runner's own `EXIT=` / summary block, not the trailing pipeline status.

