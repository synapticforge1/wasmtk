# Next-work — the ONE list of what is open

Only open items, each pointing at its record (workspace `memory-conventions.md`: working memory,
not an archive; git is the archive). Completed work appears below only as dated summaries with
commits. **The full text this file held before 2026-09-30 (1,240 lines: every census, bump log,
branch audit and superseded plan):** `git show ab5d1273644:cmem/next-work.md`.

## Open now

> **PAUSED 2026-10-15, end of day (owner).** `main` is clean at `33b3e0e` and green on binaryang
> 1.12.1 (wasi 466/466, golden 523, typed_decl 45, wast 64,506 / 0 / 16, go 7 / 7 / 12; nothing
> pushed, published or tagged). Done today: binaryang 1.12.1 pinned (`go_asyncify` 12 / 12, count
> sent); the `wasmValidate` letter answered; all 21 loud rows of 2026-10-13 closed (two batches,
> with sw72–sw74 found and fixed); the owner's string-index ruling built (sw71); audit round 2
> (below). **Resume with:** the fix order below (sw113 first), then items 3–5 (binaryang 1.10.0
> items, H10, nullable gaps).
>
> **Owner's answers, 2026-10-19: all four questions decided, none built yet** (design-decisions.md
> § "Owner's rulings of 2026-10-19"): (1) an out-of-range ARRAY read gives `undefined`, as for
> strings; a float array index keeps D3's conversion (sw95); (2) semantics follow the function's
> origin: a JavaScript / TypeScript function does what JavaScript does (sw87: a bare numeric
> `sort()` sorts as strings), a wasm-specific function does what the wasm instruction does; (3)
> `wasmtk wast` exits 1 on an unbuilt module not on a known list and on 0 files (ld88); (4) i32
> overflow: `+ - *` give JavaScript's result, and storing a value that does not fit an `i32` slot
> throws a run-time error; wrapping is wasMath's `i32.*` (new row sw119; measure the corpus
> before building). All four join the round-2 fix order.
>
> **2026-10-15: Phase 0b audit round 2 DONE (item 2 of the owner's list)** — compiler-bugs.md §
> "audit round 2". Four parallel auditors, every row RUN; repros in `scripts/phase0/round2/`.
> **Found: 33 silent-wrong compiler bugs (sw76–sw108), 10 silent tool defects (sw109–sw118),
> 34 loud compiler rows (ld47–ld80), 10 loud tool rows (ld81–ld90)**, and a grep-verified dead-code
> list. **Proposed fix order** (silent first, the owner's standing order): (1) ~~sw113, the CLI
> overwriting its INPUT file~~ **DONE 2026-10-19** (with sw114; `src/outpath.ts`,
> `tests/outpath_tests.ts`); (2) ~~sw109 / sw110 / sw112~~ **DONE 2026-10-19** (with ld86;
> `tests/merge_layout_tests.ts`; sw112 as a refusal), merges and bundles that
> mis-seat data or rename wrongly; (3) the compiler silent rows grouped by root: array / string
> helper index normalisation (sw80–sw85, sw81, sw91, sw92), spread (sw77–sw79), string-array
> paths (sw76, sw107), finally (sw106), block scoping (sw104, sw105), console unary / boolean /
> pointer printing (sw96, sw98, sw102, sw103), then the rest; (4) the loud rows. **Owner's
> questions:** sw95 (array out-of-range reads: refuse, or undefined like the string ruling?),
> sw87 (a bare numeric `sort()`: implement string order, or refuse?), ld88 (`wast` exits 0 on
> unbuilt modules: intended?), and i32 overflow wrapping (the contract?). Items 3–5 (the
> binaryang 1.10.0 items, H10, the nullable gaps) wait behind this unless the owner reorders.
>
> **2026-10-15: H12 loud rows, batch 1 DONE** (compiler-bugs.md; the owner asked for items 1–5 of
> the open list: the loud rows, audit round 2, the binaryang 1.10.0 items, H10, the nullable gaps).
> Closed: sw26, sw30, sw31, ld01, ld03, ld05–ld09, ld11–ld13, ld19, ld20, ld22, ld23, ld34; found
> and fixed sw72 (a function-typed declaration emitted nothing), sw73 (a function's local array
> made a same-named top-level one read zeros), ld39, ld40. **Batch 2 (the same day): ld10, ld14,
> ld37 closed, sw74 (a struct array printed addresses) and ld44 found and fixed: ALL 21 loud rows
> of 2026-10-13 are closed.** **Open now: 1 silent (sw71, an out-of-range string index gives
> `""`), 5 loud, all found 2026-10-15: ld38 (`toFixed`), ld41 (top-level 2D array in a function),
> ld42 (top-level boolean in a function), ld43 (`(…).length` in console.log), ld45 (printing a
> struct array).** **Owner's ruling (2026-10-15): a float string index is a compile error, and an
> out-of-range `s[i]` is `undefined`, as JavaScript** — BUILT the same day (sw71 fixed;
> design-decisions.md § "A STRING index is an integer"; README Breaking Changes row; 3 corpus
> programs migrated). Found with it: sw75 (silent), ld46. **Open: 1 silent (sw75), 6 loud (ld38,
> ld41–ld43, ld45, ld46).** **Next:** items 2–5 (audit round 2, the binaryang 1.10.0 items, H10,
> the nullable gaps).
>
> **2026-10-15: binaryang PINNED at 1.12.1** (from 1.12.0; its one change restores a paused
> call's operands on an Asyncify rewind). **`go_asyncify_tests` 12 / 12**: the nested goroutine
> program runs; nothing is KNOWN-failing any more. Full gate green, every other number unchanged
> (testing.md). Reply with the count SENT 2026-10-15 (owner; `scripts/binaryang-report.md`).
> Next, unchanged: the 21 loud rows.
>
> **2026-10-15, binaryang letter: `wasmValidate` could return `Ok` with an error in `errors`;
> fixed on their `main`, in the release AFTER 1.12.1** (plus seven more shapes V8 refuses, now
> refused). Ours reads `result`: `src/wast.ts` `binaryangInvalid`, the second `assert_invalid`
> oracle and the `validatorRejectedValid` guard. The defect could only turn a pass into a skip;
> the guard has read 0 throughout. **On that release:** bump the pin, run the wast gate, expect
> `assert_invalid` passes up / skips (16) down, guard 0; explain each moved file; send the
> numbers. Reply SENT 2026-10-15 (owner; `scripts/binaryang-report.md`).
>
> **PAUSED 2026-10-13, end of day (owner).** `main` is clean and green on binaryang 1.12.0 (wasi
> 458/458, golden 515, wast 64,506 / 0 / 16; `go_asyncify` 11 / 12 KNOWN). **No silent-wrong row is
> open.** Resume with: the 21 loud rows (compiler-bugs.md; ld34 a float index into a string in
> console.log, ld37 a whole string / boolean / bigint array in console.log, the oracle for its
> layout in `scripts/console/inspect_array_ref.ts`). Waiting on others: ~~binaryang's release with
> the nested-Asyncify fix~~ (1.12.1, pinned 2026-10-15, 12 / 12, count sent); the owner's word on the
> Deno-exit plan (deno-exit-plan.md, P0–P8) and on releasing 3.0.0 (roadmap.md items 27–33;
> nothing pushed, published or tagged).
>
> **2026-10-13, later: binaryang PINNED at 1.12.0** (from 1.8.1; the owner's choice to skip
> 1.11.0). `go_asyncify_tests` **9 → 11 / 12**: binaryang's Flatten fix holds; the NESTED goroutine
> program now builds but TRAPS (`uninitialized element` during a rewind into `$main.main$1`), while
> upstream `wasm-opt` 133 `--asyncify` on the same bytes runs it: a second binaryang Asyncify bug.
> Reproducer `scripts/repros/tinygo043_nested_pre_asyncify.wasm`; letter **SENT 2026-10-13**
> (owner; `scripts/binaryang-report.md`). **binaryang replied the same day: fixed on their main,
> UNRELEASED** (the rewind did not restore a `call_indirect`'s operand temps); a 1.12.1 would
> carry it. On that release: bump the pin, re-run `go_asyncify_tests` (expect 12 / 12), send them
> the count. The gate carries nested as KNOWN (11 / 12).
> The new optimizer also broke two merge assumptions, fixed with the bump (design-decisions.md §
> "Merge (wasmmerge) invariants"): block types printed by index, and `$__malloc` inlined away
> (a wasic library now exports `__heap_ptr`).
>
> **2026-10-13: Go asyncify broken by a toolchain update (OPEN, loud).** The machine now has Go
> 1.27.2 + TinyGo 0.43.0 (testing.md records Go 1.26.7 + TinyGo 0.41.1 green, and that TinyGo 0.42
> was the first to support Go 1.27). `go_asyncify_tests` 9 / 12: WaitGroup+Mutex, pipeline and
> nested fail in the in-house asyncify step, `Flatten: unresolved call target
> "$asyncify_stop_unwind"`; identical on `main`. **Diagnosed the same day: a binaryang bug.**
> TinyGo 0.43 still imports the four `asyncify.*` functions, but now also calls `stop_unwind` from
> a new panic-catch wrapper (`…asyncifysuspendcatch.0.paniccatch`). binaryang's `Asyncify` fails on
> it in 1.8.1 AND 1.10.0; upstream binaryen.js 123 succeeds and the result runs (`wg-counter: 45`).
> Report SENT 2026-10-13 (owner; `scripts/binaryang-report.md`), reproducer
> `scripts/repros/tinygo043_waitgroup_pre_asyncify.wasm`. **binaryang replied the same day: fixed
> on their main (their analysis did not stop propagation at the bottom-most runtime, as
> upstream's does), UNRELEASED; it ships in 1.11.0, their owner's timing.** Our reply with
> upstream's `asyncify-verbose` set (25 functions; `…paniccatch` not instrumented) was SENT
> 2026-10-13 (`scripts/binaryang-report.md`). On 1.11.0: bump the pin (a binaryang bump
> is a full gate; the optimizer moves too), re-run `go_asyncify_tests`, send binaryang the count. **Owner, 2026-10-13:
> wait for binaryang** (no workaround in wasmtk): `go_asyncify_tests` 9 / 12 is EXPECTED on this
> machine until binaryang's fix and a pin bump; the gate treats those 3 as known, any other change
> as a failure.
>
> **2026-10-13: wasMath L4 DONE** (ld29, ld30, ld31, sw64, the u64 printer; wasm-number-types.md).
> **D6 BUILT 2026-10-13** (`src/diagnostics.ts`; design-decisions.md § "The compile-error report").
> **sw62 FIXED 2026-10-13** (any console line over 128 bytes corrupted memory; the line is built in
> a growable heap buffer now). **sw66 + sw67 FIXED 2026-10-13** (an array prints as Deno prints
> it, `$__arr_inspect`; found with them sw69, sw70 silent and ld37 loud). **binaryang 1.12.0
> PINNED** (above). **sw69 FIXED 2026-10-13** (array and struct literal values; compiler-bugs.md).
> **sw70 FIXED 2026-10-13** (a local array shadowing a module one). **sw68 FIXED 2026-10-13**
> (a nested console.log in an argument): **no silent-wrong row is open.** **Next, in order:** the 21 loud
> rows (ld34, ld37), then the rest of the binaryang items. The next release is MAJOR (3.0.0) and
> waits on the owner's word.
>
> **PAUSED 2026-10-09, end of day (owner).** `main` was clean at the integer-division commit
> (`7bda25f`). Decided later the
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

> **2026-10-09, state.** binaryang shipped 1.9.0 (`./definitions`) and 1.10.0 (`wasm-bundle`,
> `(@reloc data)`); the owner ordered the open compiler bugs FIRST, then those items (§ "binaryang
> caught up" below). Five H12 batches merged locally today, each through the full gate:
> `a364547` (string conversions, sw06–sw09, sw19, sw28, sw50, ld24, ld25), `4f4e145` (`&&` / `||`
> operands, boxed parameters: sw48, sw49), `7e0fe0b` (closure result types: sw52, ld21), `a4f2171`
> (boxed f64 captures: sw53), `cd61fb9` (nullable fields carry a flag word, owner's option A:
> sw51, sw54–sw56, ld26). Suite 449/449. Nothing is pushed; nothing is half-done; `main` is
> clean. Then the wasm number types were scoped (wasm-number-types.md); its `Math` scan found
> sw57–sw61 and ld27–ld29 (and sw62, a console bug). wasMath L1, L2, L3 followed (L3 closed the
> `Math` rows), then the owner's division decision (integer `/` is a compile error; sw36, sw37
> closed). Open silent-wrong: sw62, sw64.

- ⏳ **H6 (workspace letter, owner chose it 2026-09-30).** Done: H6.1 SemVer `2465ad0`, H6.2 the ★
  block `159e0df`, H6.3 the compatibility gate `4d7d8da` + reviewed exceptions `17e2054`, H6.4 the
  CLI surface `ab5d127` (rules: design-decisions.md § Semantic Versioning and § The compatibility
  gate). **Open:**
  - ✅ **H6.5a DONE 2026-09-30:** Rule 3, the previous release's `tests/` against the new `src/`,
    `scripts/check_prev_tests.ts` (fresh clone, v2.0.3's `tests/`, `--only` to re-run, red rows
    keep their failure lines). First run: **19 of 21 green**. Red, classified: `wast_tests` =
    IMPROVEMENT (5 files, all passes UP: `align` +4, `branch_hint` +1, `memory` +6, `memory_max`
    +1, `table` +3; binaryang 1.7.1/1.8.1 and the oracle); `bindgen_tests` = a PRE-EXISTING DEFECT
    the real repo hid behind a stale artifact (below). Neither raises the floor.
  - **H6.5b** consumers: the ten loaders' fixture suites and LeptonPad against the unpublished
    build, run in temp copies (write-never). Not started; needs the owner's go-ahead (other repos,
    several toolchains).
  - **H6.6** memory layout per `../cmem/memory-conventions.md`, with H4: in progress 2026-09-30
    (INDEX 21.4 → 9.4 KB, one line per file; this file 97.8 → 5.6 KB; the bump checklist moved to workflow.md; 14 references retargeted; the ★ stamp wording; H4 verified item by item, T7's one live count fixed).
    Bootstrap (INDEX + CLAUDE.md) is 14.5 KB against a ~10 KB guideline; the rest is the INDEX's
    policy section, which is the owner's to trim.
  - Rule 4 (deprecate before remove) and a CI repeat of the gate on the tagged commit: not built.
- ⏳ **Wasm types in TypeScript** (wasm-math-plan.md). **All decisions D1–D6 settled 2026-10-09**
  (owner): integer `/` is a compile error (built); D3, refuse an implicit f64 → i32 (BUILT
  2026-10-13); D6, a located compile-error report (BUILT 2026-10-13); both recorded in the note at
  the top and in design-decisions.md. Before that: the owner
  ruled (2026-09-30): the declared
  type decides; `i32 / i32` truncates; an explicit `f64` destination or a `Math` argument divides
  as floats. **Phase 1 DONE 2026-10-06** (sw38–sw40, ld15, ld04). Phase 2 (sw36, sw37), Phase 3
  (the `Math` additions) and Phase 4 (the user page) wait on the owner's decisions D1–D6. The
  owner, 2026-10-09: "the division question deserves more thought first". Offered, not started:
  measure each D1 option's effect on the corpus on a scratch branch before the decision.
  - **Scoped 2026-10-09: wasm-number-types.md.** The owner: `Math` cannot be made to follow the
    wasm types, so `Math` stays JavaScript's (Track M: every member exact against Deno; of 39
    functions, 23 identical today, 14 wrong: sw57–sw61, ld27–ld29, bugs, no decision; 2 unsupported:
    `f16round`, `sumPrecise`)
    and the wasm types are a TypeScript library with exact bodies (Track T: decisions T1–T6).
  - **Owner, 2026-10-09: build it as a COMPLETE library, f64 included**: namespaces `f64`, `f32`,
    `i32`, `i64` (+ `u32` / `u64` views), each function a TypeScript body exact to wasm plus a
    lowering; `Math.*` and `f64.*` share the V8-exact helpers. Order L1 (bodies + batteries) → L2
    (wasic lowering) → L3 (f64 parity, the Math bugs) → L4 (operator bugs). T1 decided: a wasmtk
    module `wasMath`; T6: traps are throws. **L1 DONE 2026-10-09** (`src/wasmath.ts`, export
    `./wasMath`, 151 functions exact to the real instructions, `tests/wasmath_tests.ts`).
    **L2 DONE 2026-10-09** (wasic / modc lower the calls; 176 of 199 exact from compiled programs,
    0 failed, 23 = the Math bugs; corpus programs `39_WasMath*`; the whole corpus takes its types
    from wasMath; README section "The same values in TypeScript and in WebAssembly"). **L3 DONE
    2026-10-09** under the owner's **"CR, in both"** (compiled `Math` stays correctly rounded;
    wasMath's Math-style members run the same mathlib in Deno; plain `Math` in Deno may be 1 ulp
    off, documented): sw57–sw59, sw61, sw63, ld27, ld28, ld33 fixed, sw60 closed by decision;
    Payne–Hanek trig reduction; 199 / 199 exact from compiled programs. **L4 DONE 2026-10-13**
    (ld29, ld30, ld31, sw64, u64 printed unsigned). The library's track is complete; its one known
    gap (an out-of-range f64 into an `i32.*` argument trapped) is CLOSED by D3 (2026-10-13): a
    float into a wasMath integer parameter is now a compile error.
- ⏳ **H12 compiler bugs** (compiler-bugs.md, the round-1 table): **0 open silent-wrong, 21 open
  loud** (2026-10-13: sw62, sw66–sw70 fixed; ld34, ld37 found; L4 closed sw64, ld29–ld31; 2026-10-09, night: sw36, sw37 closed by the owner's division decision; before that,
  wasMath L3: the `Math` rows sw57–sw61, sw63 and loud ld27, ld28, ld33; earlier the same day
  sw06–sw09, sw19, sw28, sw48, sw49, sw51–sw53 and friends).
  - Open silent: NONE (2026-10-13: sw68, sw69, sw70 fixed).
  - NEXT: the 21 loud rows, then Phase 0b audit round 2. The owner's order (2026-10-09): these
    compiler bugs BEFORE the binaryang 1.10.0 items below.
  - Nullable gaps left by sw51's option A (no corpus use; design-decisions.md § "Nullable FIELDS
    carry a flag word"): class-embedded tuple destructuring, union-variant / `Record` fields,
    nullable PARAMETERS (no flag), `p.x ??= v`.
- ⏳ **wast: 7 `(module definition …)`s V8 refuses for its own size caps** (`memory64` 1, `table`
  1, `table64` 1, `memory_max_i64` 4). A definition asserts only validity, so binaryang's
  `wasmValidate` ACCEPTING it can be the verdict; its soundness condition is the mirror of the
  existing guard: evidence that binaryang accepts no INVALID module (e.g. over every corpus
  `assert_invalid` module that decodes). The plain `memory64.wast` module
  `(module (memory i64 0 0x1_0000_0000_0000))` must instantiate: it stays an engine skip.
- ⏳ **The five `36_*` modules are not in `tests/engine_baseline.json`** (15 pairs, all `match`),
  since the Phase 36 restore (2026-09-28). A deliberate `--update-baseline`.
- ⏳ **`wasmbundle` does not route `importWat`** (compiler-bugs.md, the 2026-06-24 wasmmerge entry,
  re-verified open 2026-09-30): a non-WASI import in a bundled module is dropped. No test covers it.

## Planned

- **Leaving Deno for Bun + Node, JSR stays** (deno-exit-plan.md, scoped 2026-10-13; owner's
  direction 2026-10-12). Phases P0–P8. All owner decisions M1–M7 settled 2026-10-13 (Bun is the
  TypeScript reference; Bun + Deno + Node LTS + web supported; run-time `.wasm` loading through
  universal-wasm-loader, which lands first). Not started; P0 waits on the owner's word.

- **`wasic` modularization, Phases 1–3** (wasic-modularization-plan.md; letter H12): output-
  preserving, gated by golden-WAT and `wasic_seam_tests`.
- **Offload #1: our regex-over-WAT merging gives way to binaryang's parser** (offload-inventory.md;
  I2 / H11). Trigger: binaryang RELEASES its one-front-end stage 5 (not in 1.8.x).
- **The next release** (roadmap.md, the unreleased block since v2.0.3): the compatibility gate's
  floor since v2.0.3 is now **MAJOR** (re-measured 2026-10-09, `deno task api-surface --floor`),
  set by ONE symbol: `./console_log` `LogSegment`, whose four variants gained an OPTIONAL property
  (`console?` sw41, `strConv?` sw50). Every v2.0.3 value is still valid. **DECIDED (owner,
  2026-10-09): the next release is MAJOR** (3.0.0; no reviewed exception for `LogSegment`). The
  notes still name every behaviour change below. Everything else since v2.0.3 is minor (incl. the
  new `./wasMath` entrypoint); the Deno floor is
  written then (workflow.md, release step 2b). **The notes must name the BEHAVIOUR changes since
  v2.0.3** (the package surface is unchanged, but programs can print differently):
  - `e instanceof Error` is false for a thrown string or number, and `String(e)` follows what
    was thrown (sw44);
  - top-level code beside a `main` function now runs (sw46);
  - operators group as in JavaScript, and an `i32` mixed with a known float computes as a float
    (sw10–sw17);
  - `console.log(-0)` prints `-0` (sw41);
  - `Math.round` / `sign` / `hypot` match JavaScript exactly (wasm-math Phase 1);
  - an array in a template, concat or `String(...)` is its join; a bigint there drops its `n`;
    `Math.min` / `max` take every argument; `x ?? d` on a plain number is `x` (2026-10-09);
  - `a && b` / `a || b` give an operand, not a boolean (`x || 7` is 7), and a closure keeps its
    changes to a captured parameter (sw48, sw49);
  - a closure in a returned object returns its real type: a boolean prints `true`, an f64 keeps
    its fraction (sw52), and a closure keeps its changes to a captured f64 (sw53);
  - a `number | null` field or tuple element holding 0 is no longer null, a null one prints
    `null`, and nullable records are 4 bytes larger per such field (sw51, sw54–sw56).

  Whether any of these makes the release MAJOR is the owner's call.

- **Review WasmEdge's AOT shared-library output** (owner, 2026-09-30):
  https://github.com/WasmEdge/WasmEdge. How a wasm module becomes a native library through
  `wasmedge compile app.wasm app_aot.so` (`.so` / `.dylib` / `.dll` by extension), run as
  `wasmedge app_aot.so`. Its own docs say the output "is only for WasmEdge use and cannot be used
  by other WebAssembly runtimes", so the question is whether it yields a C library a host can link
  (exported symbols, ABI, whether the WasmEdge runtime must be linked beside it) or only a WasmEdge
  artifact, and what that means for wasmtk's "TypeScript as a DLL" goal (vision.md). Scoping
  only: not started.

## binaryang caught up (letter 2026-10-09)

> **Owner, 2026-10-09: the open COMPILER BUGS FIRST, then these items**, so the two do not get
> conflated (a pin bump moves every optimised binary; a bug fix must be judged on the old pin).

- **binaryang 1.9.0** published `./definitions` (H9: D1 instruction table, 582 entries; D2
  features; D3 trap vocabulary; each with `dataVersion` + `sha256`). **Our H10 is unblocked.**
  1.9.0 also rewrote the optimizer (output moves at every level, within 2% of upstream `-Oz`).
- **binaryang 1.10.0** published `wasm-bundle` (CLI + `…/tools/wasm-bundle`: `bundle()`,
  `wasmBundle()`) and the WAT annotation `(@reloc data)`.
  - The annotation goes before an `i32.const` (in a function or a global initializer), or before
    a data string, where it means every 4-byte word is an address. A mark elsewhere is a PARSE
    ERROR.
  - The bundler gives one memory, each input's whole image at its own base, and VERIFIES the
    relocations. An unmarked module with memory is refused, or range-relocated with
    `--unmarked=guess`.
  - It writes the `.wit` beside the output by default.
  - Caveats: each module keeps its own table, so a function pointer crossing modules is
    unsupported. A TinyGo-style heap that ends at `memory.size` must come LAST.
  - **Their ask:** once wasic marks its addresses, bundle `18_bundle`, `sharedheap_bundle` and
    `relocfix_bundle` through `wasm-bundle` and report what runs.
  - **Ours to do:**
    1. ~~Bump the pin 1.8.1 → 1.10.0~~ DONE 2026-10-13 as 1.8.1 → 1.12.0.
    2. wasic emits `(@reloc data)` on every data address: strings, arrays, structs,
       string-array pointer words, `$__heap_ptr`'s initial value.
    3. Bundle the three projects UNOPTIMISED and report.
    4. Then retire `wasmbundle.ts` and its range relocation.
  - Our `witgen` check should accept binaryang's header line (`// Generated by binaryang from
    core wasm signatures`), or the log "not generated from core signatures" is false.

## Waiting on others

- **`wasm-bundle` (binaryang letter, 2026-10-06):** the owner decided `wasmbundle` moves to
  binaryang as `wasm-bundle`, which we import back (`./wasm-bundle`), with relocation done
  EXACTLY from the tool-conventions `linking` / `reloc.*` sections. They asked whether each
  producer can emit them. Measured 2026-10-06, reply SENT 2026-10-06 (`scripts/binaryang-report.md`):
  - Rust: yes, correct.
  - Zig: yes, via `build-obj` + `zig wasm-ld`.
  - TinyGo: its post-link `wasm-opt` leaves the relocations STALE; the `.o` + `wasm-ld` route
    works.
  - wasic: no; it needs a relocatable assembler from binaryang, and bundling before `-Oz`.

  The measurement scripts (`check_relocs.ts` and its friends) were scratch; their method is in
  the draft.
  - **binaryang reviewed the draft (2026-10-06): accurate, fine to send as is.** Their positions:
    - Bundle before optimising and verify first; this applies to binaryang too, whose reader and
      writer re-encode the 5-byte padded LEBs at relocation sites. So `wasm-bundle` ties each
      relocation to its instruction AS IT READS, and refuses stale relocations like missing
      ones. Our check is their starting test.
    - DWARF: their default is to DROP debug sections in a bundle, with a printed note; they will
      put it to the owner when building.
    - `linking` with no `reloc.CODE` means nothing to relocate: agreed.

    SENT 2026-10-06; binaryang's response is above. Nothing of ours is open on it; they build next.

- ~~**H10** waits on **H9**~~: UNBLOCKED. binaryang 1.9.0 published `./definitions` (D1, D2, D3;
  § "binaryang caught up" above), and our pin (1.12.x) carries it. H10 is ours to start, after the
  compiler bugs (the owner's order, 2026-10-09). Our original request (SENT 2026-09-30) is in
  `scripts/binaryang-report.md`.
- **H4 and H11** are answered here (H4 re-verified item by item 2026-09-30); the workspace closes
  them in `../cmem/handoffs.md`.
- **binaryang's release after 1.12.1** (the `wasmValidate` `result` fix and eight new refusals,
  letter 2026-10-15; "Open now" above): bump, run the wast gate, explain each moved file, send the
  numbers.
- **binaryang: nothing of ours is open.** Every report and reply is marked SENT in
  `scripts/binaryang-report.md` (last: 2026-10-15, the 1.12.1 count and the `wasmValidate` answer).

## Deferred (no consumer)

- **B6**, asyncify list-options ↔ binary-parse name retention (now binaryang's domain).
- **The P2 component container**: waits on browser-native WASI P2 / the Component Model.

## Completed — dated summaries (details in the files named)

- **2026-10-06 — operator precedence, grouping and typing** (compiler-bugs.md sw10–sw17), in wasic
  and the console path.
- **2026-10-06 — console `%`, escapes, boolean ternaries; closure state** (compiler-bugs.md sw20,
  sw24, sw25, sw32, ld02).
- **2026-10-06 — top-level code beside `main`** (compiler-bugs.md sw46, sw47): the top level runs
  as written; a function's `console.log` reads top-level arrays correctly.
- **2026-10-06 — the thrown kind** (compiler-bugs.md sw44; owner approved): `String(e)`, `${e}`,
  `instanceof` of a caught value follow what was thrown.
- **2026-10-06 — f32 in containers** (compiler-bugs.md sw43, ld18, sw45): f32 arrays and struct
  fields store, load and convert as f32; a for-of over an array parameter skips the header.
- **2026-10-06 — the Phase 1 finds** (compiler-bugs.md): `console.log(-0)` prints `-0` (sw41);
  console `String(x)` (ld16) and `String(<string>)` (sw42); `console.log` of an f32 (ld17).
- **2026-10-06 — wasm-math Phase 1** (wasm-math-plan.md; compiler-bugs.md): exact `Math.sign`,
  `Math.round`, n-ary `Math.hypot` (V8's algorithm, bit-identical) as shared helpers; every Math
  result at the declared type (ld15); console helper requests (ld04). Silent-wrong 23 → 21.
- **2026-09-30 — the wasm-types ruling and the Math scope** (`7142f68`): design-decisions.md,
  wasm-math-plan.md; sw36 narrowed, sw37–sw40 and ld15 found.
- **2026-09-30 — the `modc` / exit-code defect** found by H6.5a (compiler-bugs.md, FIXED):
  `modc` of a dynrt-merged library assembles again (`wasmmerge` resolves a copied import's
  `(type N)`); `modc`, `info`, `mod <file>` and `wasic x.js` exit 1 on failure (an exit sweep of
  every command); `bindgen_tests` can no longer grade a stale fixture (two had been, for five
  weeks). `compileModule` returns `boolean` (re-baselined, reviewed `minor`).

- **2026-09-30 — H6.1–H6.4** (above). The SemVer bump, the ★ block, the compatibility gate with
  reviewed exceptions (the floor since v2.0.3 is MINOR), the CLI surface. Self-test
  `scripts/check_compat_gate.ts` 15/15.
- **2026-09-30 — the binaryang 1.8.1 round ("THE ORDER")**: the five-engine check of
  `LowerCustomPageSizes` held on 1.8.1 (`8e73327`); `assert_trap` checks the trap KIND
  (`a31f929`, from 5,263 logged passes); pin 1.8.1 (`89cf8b0`; compat `toText` re-laid-out,
  tokens identical, 60 golden entries layout-only); the lowering wired into the wast gate, skips
  66 → 16 (`709a596`); reply SENT (`2e7db63`). design-decisions.md and testing.md hold the rules.
- **2026-09-29/30 — H12 fixes**: sw01 + sw33 (`a58a426`), sw02 (`d8f8e7b`), sw03 + sw34
  (`673d7e3`), the console fallback delegates or aborts: sw04 + sw27 fixed, 7 rows loud
  (`b4cebd6`); sw05 + sw35 found with it, sw21 (`cec1606`); sw18 + sw22 + sw23, loud rows (2026-09-30,
  `fix/h12-sw18-sw22-sw23`). Open silent-wrong 31 → 18, then 19 with sw36 found.
- **2026-09-29 — binaryang 1.7.1 and the validator oracle** (`230f45a`): wast 64,434 / 105 →
  64,473 / 66, the guard at 0 valid modules rejected.
- **2026-09-30 — stale-item sweep** (`02dcb7c`): every open marker re-checked against code or a
  test; three closed, one sharpened.
- Everything earlier (the binaryang 1.5.3 → 1.7.0 bumps, the false-pass audit, the wast census
  history, the EH migration, the runner fixes, the branch audit): `git show
  ab5d1273644:cmem/next-work.md`.
