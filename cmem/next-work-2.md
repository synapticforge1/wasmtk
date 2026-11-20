# next-work — part 2 of 3

Continues [next-work.md](next-work.md) (split by size on 2026-11-20, letter H38). Sections:

- Open now

## Open now

> **2026-10-23, the owner's order: the smaller items, then the remaining compiler fixes, then
> sw119.** Smaller items done (wast mirror guard: S1 BLOCKED on binaryang's `delegate` fix;
> engine baseline +189; `wasmbundle` imports; H6 Rule 4 + CI's gate on the tag); binaryang 1.15.0
> then 1.16.1 pinned. **ld103–ld105 FIXED**, and with them **four silent bugs found and fixed**
> (sw129 a `push` method compiled as an array push; sw130 a string `unshift` appended; sw131
> class field initialisers dropped; sw132 a derived class without a constructor skipped its
> base's) plus ld110; then **ld106–ld109 FIXED** (owner: "fix the items left open"), with ld111,
> ld112 and sw133 (silent) found and fixed: open now silent 1 (sw119), loud 1 (ld45)
> (compiler-bugs.md, the 2026-10-23 entries).
> **2026-10-24: ld45 FIXED** (the object writer, `src/inspect_wat.ts` + wasic's per-type writers;
> design-decisions.md "console.log's object writer"), with **ld113 and sw134–sw136 (silent) found
> and fixed** (compiler-bugs.md, the 2026-10-24 entry): open then silent 1 (sw119), loud 0.
> **2026-10-24: sw119 FIXED** (on by default, the `--i32-check` flag removed; console / template
> operators, comparisons, `++` / `--` covered; `45_random-numbers` passes unchanged), with **sw137,
> sw138 (silent) and ld114 found and fixed** in the merge (compiler-bugs.md, the 2026-10-24 sw119
> entry): **open now silent 0, loud 0.** Found with it and FIXED the same day (owner: "add a per
> test timeout"): the wasi suite had no per-test timeout — a module that loops (sw137's
> `main_arraymethods`) hung the run for an hour with no output. Every `runStep` is killed at
> `WASI_STEP_TIMEOUT_S` (default 300; the whole process tree, `taskkill /T` on Windows, where
> `wasmtk` is a `.cmd` shim) and FAILS, even where a failure is expected. The superseded branch
> `feat/i32-overflow-check` (643a33c6, local only) deleted (owner).
> **2026-10-24: binaryang 1.16.1 → 2.2.0 PINNED** (owner: "bump and push"; 2.2.0 came out the same
> day, after 2.1.0), gate GREEN, **NOTHING moved, as predicted** from the changelog (1.17.0: new
> flags only; 2.0.0: removes the `sat-float-to-int` spelling, which wasmtk never used; 2.1.0 and
> 2.2.0: validator feature checks, and the default-features bug that refused every function table —
> wasmtk validates only with `allFeatures()` or a set derived from it, `src/wast.ts`). Golden 566
> byte-identical, wast 64,506 / 0 / 16 with the one known accepted-invalid (`try_delegate`, the
> `delegate` defect, still not fixed in 2.2.0; report `scripts/binaryang-report.md` still unsent),
> cross-check 1368, `-Oz` guard 42 / 42, wasi 507/507. Reference: binaryang `docs/opcode-guide.md`
> (the portable opcode set; `throw` / `try_table` portable, legacy `try` lowered by
> `TranslateToExnref`; standalone runtimes measured at their maximum switches — wazero at its
> defaults refuses exception handling, which is why sw119 traps without a try).
> **2026-10-24: 3.0.0 PUBLISHED** (owner: "push", then "Publish 3.0.0 now"): `deno task publish`
> tagged `v3.0.0` (at `4708daa4`) and pushed; CI run 40083193079 green in every step — the
> compatibility gate on the tag, `deno publish`, the `release/v3.0.0` branch, the GitHub Release,
> and **provenance RECORDED on JSR** (the verify step passed). JSR latest 3.0.0. **H20 DONE:** JSR's
> `@jrmarcum/wasmtk` is linked to `synapticforge1/wasmtk` (api.jsr.io `githubRepository`), and the
> publish from it worked. (The bump, before it:)
> **2026-10-24: 3.0.0 BUMPED and pushed (owner: "lets bump and push"), NOT tagged, NOT published.**
> The gate's floor since v2.0.3 is MAJOR. Before it: `deno doc --lint` was RED (8 errors: five
> setters typed `typeof` a private variable, three exports whose JSDoc had been separated from them)
> — fixed, surface re-baselined in its own commit. CHANGELOG § 3.0.0, the README's Breaking
> Changes rows versioned, roadmap promoted. **To publish (owner's word):** H20 first (JSR publishing
> from `synapticforge1`: the JSR package is `@jrmarcum/wasmtk`, linked to the moved repo?), then
> `deno task publish` (tags v3.0.0 and pushes; CI's gate on the tag, then `deno publish`).
> **Next:** nothing open in the compiler (silent 0, loud 0). Open elsewhere: the binaryang report
> (`delegate`) and the GitHub Support request, both for the owner to send. (H20 and the 3.0.0
> publish: DONE, above.)

> **PAUSED 2026-10-22 (owner: "update the project memory files and pause until later today").**
> Branch `fix/loud-refusals` = main (main PUSHED 2026-10-23 after the H19 purge; the branch
> itself is local only), last compiler commit "fix(wasic): generic classes
> (ld100) …", every gate green, wasi 497/497, golden 554. **Resume at ld45** (an object writer for
> `console.log(p)` / `console.log(ps)`: util.inspect's `{ k: v }` and its line breaking; a whole
> struct is refused today, sw127), then ld103 (`this.items.push(x)` on an array field), ld104 (a
> field of a call's result, `c.bump().n`), ld105 (`xs.filter(…).length` in console.log). sw119
> (i32 overflow) waits for the owner. Then items 3–5 (binaryang 1.10.0 items, H10, nullable gaps).
> Workspace-review notes W1–W5: all taken up 2026-10-23 (section above).

> **2026-10-22, the loud refusals in progress, branch `fix/loud-refusals`, one commit per group:**
> group 1 (expressions: ld38 `toFixed`, ld43, ld66–ld70) DONE, gate green, `4m_ExpressionGaps`;
> group 2 (statements: ld71 `++` / `--` as a value, ld72 compound assignment on elements, ld73
> one-line `do`, ld78's default-from-an-earlier-parameter and two `for` declarations) DONE,
> `5f_IncrementsAndCompoundForms`, `5f_CompoundIndexSideEffectRefused`; group 3 (strings, tuples,
> objects: ld76, ld77, ld80) DONE, `28_StringsTuplesAndObjects`; group 4 (module globals: ld41,
> ld42) DONE, `63_ModuleGlobals2DAndBoolean`, found ld94 (`string[][]`, refused everywhere).
> Group 5 (callbacks / loops: ld78's last forms, ld91–ld93) DONE, `5h_CallbacksChainsAndLoops`;
> found and fixed ld97–ld99, found ld95 (a literal array of functions) and ld96 (a capturing
> array-method callback), both open and refused with a message. Group 6 (classes: ld74, ld79)
> DONE, `29_ClassDispatchAndChaining`; found and fixed sw126 (silent: overridden methods ran the
> base's version through `this` or a base-typed parameter); generic classes split off as ld100.
> ld45 (struct-array printing) looked at: a SINGLE struct printed its address (sw127, silent);
> now refused, as the array is. ld45 is the object writer (util.inspect's `{ k: v }` and its line
> breaking), a feature, NOT started. The loud compiler groups are done; left: ld45, ld94–ld96,
> ld100 (features / gaps, each refused with a message), then the 9 tool rows. Tool group 1
> (ld89 `dync`, ld90 CLI flags) DONE; group 2 (ld84 bundler exports, ld85 same-basename imports,
> ld87 `mod` i64) DONE; group 3 (ld81 wasmbundle memory, ld82 bindgen camelCase, ld83 deno
> binding) DONE: **all loud tool rows closed**. Owner 2026-10-22: "fix the compiler issues first":
> sw123 DONE (null vs undefined, `24_NullVersusUndefined`); ld94 (`string[][]`) and ld95 (function
> array literals) DONE; ld96 (capturing callbacks) DONE, sw128 found and fixed; ld100 (generic
> classes) DONE, ld101 (class string fields) and ld102 (string method in console) found and fixed;
> found and open: ld103 (array-field push), ld104 (field of a call's result), ld105 (`.length` of a
> method result in console). Next ld45 (object printing), then ld103–ld105; sw119 waits for the
> owner. Then items 3–5.

> **2026-10-21, the Deno-exit plan's P5 (scripts) DONE, ahead of P0–P4 by the owner's order:**
> the repo scripts and the 5 script tasks run with `bun` on `node:` builtins, and the probe rule
> says `bun` (deno-exit-plan.md § P5 has every A/B and the two scripts that stay Deno). Then the
> same day: (1) the `try_table` `-Oz` skip was found ALREADY removed (2026-08-27, binaryang
> 1.5.2); `check_try_table_oz` (42 / 42 on 1.13.0) now reads as the regression guard it is;
> (2) `src/wasm/caps_bytes.ts`'s six embedded capability libraries re-embedded from fresh `modc`
> builds (6–17 % smaller each, WIT unchanged); (3) the workspace items above; (4) **sw122 FIXED**
> (parseFloat / Number / parseInt correctly rounded, `$__dec_to_f64`; 4,078 values identical to
> Deno; dynrt re-embedded, it parses literals with parseFloat; `53_NumberParseRounding`).
> **Next:** the 22 loud compiler rows (all refusals: ld38, ld41–ld43, ld45, ld66–ld74, ld76–ld80,
> ld91–ld93), then the 9 tool rows, then items 3–5. Silent open: sw119 (owner-ruled, a branch),
> sw123 (nullable gaps, item 5).

> **2026-10-20, the loud rows, group 1 DONE: every round-2 row that built an INVALID module or
> trapped** (ld48–ld50, ld52–ld57, ld59–ld61, ld63, ld64, ld75; ld46, ld62 found already passing;
> silent sw124, sw125 found and fixed). Gate green: wasi 482/482, golden 539, wast 64,506 / 0 / 16,
> go 7 / 7 / 12. Tests `4l_MixedOperandTypes`, `28_ArrayCallbackEdges`. Found and OPEN: sw122
> (`parseFloat` not correctly rounded; silent, so ahead of the loud rows in the owner's order),
> sw123 (`T | undefined` holding undefined prints `null`; with the nullable gaps, item 5), loud
> ld91–ld93. **Next:** sw122, then the 22 remaining loud compiler rows (all clean refusals: ld38,
> ld41–ld43, ld45, ld66–ld74, ld76–ld80, ld91–ld93), then the 9 tool rows (ld81–ld85, ld87,
> ld89, ld90), then items 3–5.

> **PAUSED 2026-10-19, end of day (owner).** `main` is clean at `6068e6d7b48` and green on
> binaryang 1.12.1: wasi **480/480**, golden **537** (9 fail on purpose), typed_decl 45, wast
> 64,506 / 0 / 16, cross-check 1152 on baseline, go 7 / 7 / 12, outpath 12, merge_layout 7,
> tool_rows 16, wast_cli 4; api-surface unchanged since its last re-baseline. Nothing pushed,
> published or tagged. **Done today:** every silent TOOL row (sw109–sw118) and every unruled silent
> COMPILER row of audit round 2 (sw75–sw108, sw121, with loud ld47, ld51, ld58, ld65); the owner's
> rulings 1–3 built (sw95, sw87, ld88); sw120 (null string fields; string field assignment);
> ruling 4 (sw119) MEASURED on branch `feat/i32-overflow-check` (643a33c, not merged). Tally:
> silent 1 open (sw119), loud 36 compiler + 9 tool open. **Resume with (owner's order):** (1) the
> loud rows, grouped by root (compiler-bugs.md § audit round 2, "Loud, compiler" / "Loud, tools",
> plus the round-1 table's open loud rows); (2) items 3–5 (binaryang 1.10.0 items, H10, the
> remaining nullable gaps, e.g. ld64 a nullable string LOCAL); (3) THEN scope the number-type
> reversion and inference model (§ "Owner's direction, 2026-10-19, late" below).
> **Owner's decisions, 2026-10-19, end of day (NOT BUILT; design-decisions.md § "Owner's
> decisions of 2026-10-19, end of day"):** (a) **the i32 overflow check is ON by default**
> (sw119): finish branch `feat/i32-overflow-check` (cover console.log's operator path, template
> parts, `++` / `--`), migrate `45_random-numbers` to wasMath's wrapping `i32.*`, decide what the
> `--i32-check` flag becomes (an opt-OUT, or removed), full gate, re-baseline the API in its own
> commit; (b) **retire the `u32` / `u64` TYPES now** (the `u32.*` / `u64.*` operations stay):
> remove the aliases from wasMath, wasic's u64 print-unsigned tracking, migrate the 2 corpus
> programs and wasMath's own tests; (c) **bindgen checks at the boundary and reports every
> issue**: an i32 argument must be an integer in range (else a RangeError naming the parameter
> and type), i64 takes a bigint (a safe-integer number converted), f32 rounds, unsigned RESULTS
> returned unsigned; the WIT u32 / u64 → s32 / s64 collapse (bindgen.ts:73–79) to be revisited
> with (b). **Order (owner, 2026-10-19): AFTER the bug fixes** (the loud rows and items 3–5);
> "do not add to the issue we are trying to fix" — no new behaviour while the fix list is open. **2026-10-20: binaryang 1.13.0 PINNED, gate green
> (wast 64,506 / 0 / 16, guard 0, go 7 / 7 / 12, wasi 480/480); the reply was SENT 2026-10-20
> (`scripts/binaryang-report.md`).** Still pending from before: the 3.0.0
> release, the Deno-exit plan P0.
>
> **PAUSED 2026-10-15, end of day (owner).** `main` is clean at `6a833d4` and green on binaryang
> 1.12.1 (wasi 466/466, golden 523, typed_decl 45, wast 64,506 / 0 / 16, go 7 / 7 / 12; nothing
> pushed, published or tagged). Done today: binaryang 1.12.1 pinned (`go_asyncify` 12 / 12, count
> sent); the `wasmValidate` letter answered; all 21 loud rows of 2026-10-13 closed (two batches,
> with sw72–sw74 found and fixed); the owner's string-index ruling built (sw71); audit round 2
> (below). **Resume with:** the fix order below (steps 1–2b done 2026-10-19; step 3, the compiler silent
> rows: every unruled silent row done 2026-10-19 (`4k_LastSilentRows` the last); next: the
> owner-ruled ~~sw95 (array out-of-range → undefined)~~ DONE 2026-10-19, ~~sw87 (bare sort() as strings)~~ DONE 2026-10-19, sw119 (i32
> overflow store check: MEASURED 2026-10-19 on branch `feat/i32-overflow-check`, not merged; 460 / 461
> programs identical, 1 throws (an LCG relying on wrapping), +2.8% size, an arithmetic loop ~2.3×
> slower; console.log / templates / `++` not covered yet; OWNER'S DECISION: finish and turn on?) and ~~ld88 (wast exit codes)~~ DONE 2026-10-19; ~~sw120~~ DONE 2026-10-19
> (`24_NullableStringFields`); then the loud rows, step 4), then items 3–5 (binaryang 1.10.0
> items, H10, nullable gaps). **Owner, 2026-10-19: finish the current fixes before anything that
> can break more, THEN scope the reversion and the inference model for all the number types**
> (the "Owner's direction" note below).
>
> **Owner's direction, 2026-10-19, late: JavaScript projects and npm (design-decisions.md §
> "Direction of 2026-10-19: untyped is JavaScript's number; JavaScript and npm through the
> bundle"). NOT BUILT; plan, in order:** (a) MEASURE `number` inference: re-allow untyped
> declarations as JavaScript's `number` (f64), `bigint` as i64, wasm types as opt-in hints; run
> the corpus with its annotations stripped (matches Deno? speed cost?), as sw119 was measured
> first; (b) jstyper inside the bundle (a `.js` import runs it; `wasmtk wasic x.js` too) and jstyper
> INFERENCE when there is no `.d.ts` (a shipped `.d.ts` / JSDoc first, then call sites and use,
> then the `number` default; the rest reported, never guessed); (c) npm: resolution
> (`npm:` / `node_modules`, `exports` / `main`, transitive deps), **CommonJS converted by esbuild
> (owner's choice)**, then (b); jstyper must unwrap esbuild's `__commonJS` / `__toESM` shims;
> per-package verdict (compiled / `dync` / kept on the host as an import); then try a handful of
> real packages. Open questions with it: sw119 on by default? retire the `u32` / `u64` TYPE
> annotations (wasMath is unreleased, 2 corpus programs use them)? boundary checks in bindgen
> (i32 integer + range, unsigned results)?
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
> mis-seat data or rename wrongly; (2b) ~~the other tool rows sw111, sw115–sw118~~ **DONE
> 2026-10-19** (`tests/tool_rows_tests.ts`): **all ten silent tool rows are closed**; (3) the compiler silent rows grouped by root: ~~array /
> string helper index normalisation (sw80–sw85, sw81, sw91, sw92)~~ **DONE 2026-10-19** (with ld47;
> `28_RelativeIndexMethods`), ~~spread (sw77–sw79), string-array
> paths (sw76, sw107)~~ **DONE 2026-10-19** (`28_SpreadLiterals`, `28_StringArrayJoinSearch`), ~~finally~~ **DONE 2026-10-19**
> (`15_FinallyOnEveryExit`; a throw from finally too, the owner's follow-up), ~~block scoping
> (sw104, sw105)~~ **DONE 2026-10-19** (`5e_BlockScopedDeclarations`), ~~console printing (sw96,
> sw98, sw102, sw103)~~ **DONE 2026-10-19** (with sw75; `7i_ConsoleUnaryBoolStringFields`; found
> sw120 null string fields, sw121 a struct variable as an array-literal element) (sw106), block scoping (sw104, sw105), console unary / boolean /
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
> **2026-10-13: Go asyncify broken by a toolchain update — CLOSED 2026-10-15** (binaryang 1.12.1
> fixed both Asyncify bugs; `go_asyncify_tests` 12 / 12 since that pin, and on 1.13.0 2026-10-20;
> the "9 / 12 is EXPECTED" rule below is retired). The record as written: the machine now has Go
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

> Continues in [next-work-2b.md](next-work-2b.md).
