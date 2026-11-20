# next-work — part 3 of 3

Continues [next-work.md](next-work.md) (split by size on 2026-11-20, letter H38). Sections:

- Open now (continued)
- Planned
- Waiting on others
- Deferred (no consumer)

## Open now (continued, 2)

> **2026-10-09, state.** binaryang shipped 1.9.0 (`./definitions`) and 1.10.0 (`wasm-bundle`,
> `(@reloc data)`); the owner ordered the open compiler bugs FIRST, then those items (§ "binaryang
> caught up" below). Five H12 batches merged locally today, each through the full gate:
> `7528042` (string conversions, sw06–sw09, sw19, sw28, sw50, ld24, ld25), `93aa40a` (`&&` / `||`
> operands, boxed parameters: sw48, sw49), `3fb3b27` (closure result types: sw52, ld21), `e657fff`
> (boxed f64 captures: sw53), `c40c16d` (nullable fields carry a flag word, owner's option A:
> sw51, sw54–sw56, ld26). Suite 449/449. Nothing is pushed; nothing is half-done; `main` is
> clean. Then the wasm number types were scoped (wasm-number-types.md); its `Math` scan found
> sw57–sw61 and ld27–ld29 (and sw62, a console bug). wasMath L1, L2, L3 followed (L3 closed the
> `Math` rows), then the owner's division decision (integer `/` is a compile error; sw36, sw37
> closed). Open silent-wrong: sw62, sw64.

- ⏳ **H6 (workspace letter, owner chose it 2026-09-30).** Done: H6.1 SemVer `3542840`, H6.2 the ★
  block `f075a60`, H6.3 the compatibility gate `1348f60` + reviewed exceptions `66a3bfb`, H6.4 the
  CLI surface `2d15171` (rules: design-decisions.md § Semantic Versioning and § The compatibility
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
    (INDEX 21.4 → 9.4 KB, one line per file; this file 97.8 → 5.6 KB; the bump checklist moved to
    workflow.md; 14 references retargeted; the ★ stamp wording; H4 verified item by item, T7's one
    live count fixed).
    Bootstrap (INDEX + CLAUDE.md) is 14.5 KB against a ~10 KB guideline; the rest is the INDEX's
    policy section, which is the owner's to trim.
  - ✅ **Rule 4 (deprecate before remove) and CI's repeat of the gate on the tag: BUILT
    2026-10-23.** `scripts/api-surface.ts`: a `@deprecated` doc tag (own line) is a
    `(deprecated)` / `(deprecated):<member>` surface key; `Floor.undeprecatedRemovals` lists every
    removal the last release did not deprecate (symbol, member, entrypoint; the CLI surface is
    exempt, it has no doc comments); `bump` refuses one at ANY kind; `--verify-tag <tag>` runs in
    `publish.yml` before `deno publish` (snapshot matches, version = tag, one SemVer step at or
    above the floor since the previous tag, Rule 4; `fetch-depth: 0`). Tests:
    `tests/api_surface_tests.ts` (24, inverted: deprecation ignored → the 4 allowed-removal cases
    fail) and `scripts/check_compat_gate.ts` F1–F4 (19 / 19). **Found with them:** (1) the gate
    recorded `./utils VERSION` by its literal type, so every bump made the snapshot stale and the
    next floor major — CI would have refused every release; now recorded as `string`
    (re-baselined in its own commit); (2) `check_compat_gate` A1, A2, D1 had failed since
    2026-10-09 (they assumed a MINOR floor; it is MAJOR) — corrected.
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
  `wasmValidate` ACCEPTING it could be the verdict, if binaryang accepts no INVALID module.
  **2026-10-23: that condition is now MEASURED, and it does not hold — BLOCKED on binaryang.** The
  guard (`WastResult.validatorAcceptedInvalid`, the mirror of `validatorRejectedValid`) runs on
  every `assert_invalid` module that decodes, under the FILE's features. Over the corpus on 1.15.0:
  5 threads modules are valid only because multi-memory is on (excluded, as binaryang's data
  records), 6 `br_on_cast` modules only because `customDescriptors` was on outside its directory
  (now on only in it, as binaryang's data says), and **1 is a binaryang defect: a legacy
  `delegate`'s label depth is not checked** (`legacy/try_delegate.wast`; probed: `delegate 1` and
  `delegate 2` out of range both VALID to binaryang, invalid to V8). Pinned in
  `tests/wast_tests.ts` `KNOWN_ACCEPTED_INVALID`; inverted both ways (pin removed: that file red;
  customDescriptors everywhere: the two br_on_cast files red, 3 each). Reported in the DRAFT to
  binaryang. **2026-11-05: FIXED upstream** (binaryang `12e6c042d`, reply in their `handoffs.md`
  § 47; ledger C12 closed): their tag `v2.2.2` carries it (JSR availability not checked here).
  **2026-11-18: binaryang 4.0.0 PINNED, the pin is 0** (`KNOWN_ACCEPTED_INVALID` emptied; with the
  old entry the file read "accepted 1 → 0", red; emptied, ALL CLEAN — so the pin is inverted).
  **Next, now unblocked:** the definition verdict is a few lines in
  the `kind === "definition"` catch (judge only an engine SIZE-CAP refusal, not an unimplemented
  proposal — two custom-descriptors definitions would otherwise be judged too), then re-record the
  4 files' `unbuilt`. The plain `memory64.wast` module `(module (memory i64 0 0x1_0000_0000_0000))`
  must instantiate: it stays an engine skip.
- ✅ **The five `36_*` modules are in `tests/engine_baseline.json` (2026-10-23)**, with every other
  module added since the baseline was last recorded: 189 pairs over 63 modules (185 `match`, 4
  wazero `reject` in exception-handling tests, the class 33 pinned wazero rejects already are);
  the re-record only ADDED (0 removed, 0 changed). Cross-check: 1341 on baseline, 0 unpinned.
- ✅ **`wasmbundle` routes `importWat` (2026-10-23)**: a non-WASI import in a bundled module was
  dropped (the bundle did not compile); now kept before every function. Test in
  `merge_layout_tests` (11 / 11); tool_rows, witgen, the go suites and the one corpus pipeline that
  bundles (`18_WasmImportMerge`) green.


## Planned

- **Leaving Deno for Bun + Node, JSR stays** (deno-exit-plan.md, scoped 2026-10-13; owner's
  direction 2026-10-12). Phases P0–P8. All owner decisions M1–M7 settled 2026-10-13 (Bun is the
  TypeScript reference; Bun + Deno + Node LTS + web supported; run-time `.wasm` loading through
  universal-wasm-loader, which lands first). Not started; P0 waits on the owner's word.

- **`wasic` modularization, Phases 1–3** (wasic-modularization-plan.md; letter H12): output-
  preserving, gated by golden-WAT and `wasic_seam_tests`.
- **Offload #1: our regex-over-WAT merging gives way to binaryang's parser** (offload-inventory.md;
  I2 / H11). The trigger is MET on our pin (2.2.0). The bundle path moved 2026-10-26; the wasic
  MERGE path (`import … from "x.wasm"`, wasmmerge.ts) is what remains.
- **The next release after 3.0.0** (roadmap.md § "The unreleased block (on `main`, after
  v3.0.0)"): not scheduled; the owner's word. The package SURFACE gained nothing and lost nothing
  this session (`runWasmBundle`'s signature unchanged; `deno task api-surface --floor` is what
  decides — re-measure before bumping). BEHAVIOUR changes it must name: an i32 literal that does
  not fit is now refused (sw160, BREAKING row in README), `wasmbundle` output laid out per image
  (README row), fresh `new`, switch order. Before a patch / minor: Rule 3's previous-tag tests
  (`bun scripts/check_prev_tests.ts`) and, once they exist, the consumer suites (H6.5b). The
  owner's number-type direction, if built first, would make it a MAJOR (hints and wasMath
  removed, after a deprecating release). (The 3.0.0 run-up text this item held is in git:
  `git log -S"The next release" -- cmem/next-work.md`.)

- **Review WasmEdge's AOT shared-library output** (owner, 2026-09-30):
  https://github.com/WasmEdge/WasmEdge. How a wasm module becomes a native library through
  `wasmedge compile app.wasm app_aot.so` (`.so` / `.dylib` / `.dll` by extension), run as
  `wasmedge app_aot.so`. Its own docs say the output "is only for WasmEdge use and cannot be used
  by other WebAssembly runtimes", so the question is whether it yields a C library a host can link
  (exported symbols, ABI, whether the WasmEdge runtime must be linked beside it) or only a WasmEdge
  artifact, and what that means for wasmtk's "TypeScript as a DLL" goal (vision.md). Scoping
  only: not started.

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
- ~~binaryang's release after 1.12.1~~ **1.13.0 PINNED 2026-10-20** (letter of 2026-10-20): wast
  64,506 / 0 / 16, guard 0, `go_asyncify` 12 / 12, 43 pipeline goldens moved (optimizer). **The
  reply was SENT 2026-10-20** (`scripts/binaryang-report.md`, top section).
- **binaryang letter, 2026-10-23 (three items, no code asked of us):**
  1. **1.14.0 and 1.15.0 published** (JSR + npm, provenance on both; we pin 1.13.0; nothing removed
     or renamed). 1.14.0 adds `Memory64Lowering` (`--memory64-lowering`, opt-in; no other output
     moves). 1.15.0 runs `SSANoMerge` first at `-O3` / `-Os` / `-Oz`: **optimizer output moves**,
     so expect the golden-WAT PIPELINE entries that merge an `-Oz` library to move again (43 did on
     1.13.0); wasic's own output should not. **1.15.0 PINNED 2026-10-23** (owner: "bump now,
     first", ahead of the remaining fixes): gate green, every prediction held — wast 64,506 / 0 /
     16, guard 0, `go_asyncify` 12 / 12, 43 pipeline goldens moved, only merged-library functions
     (testing.md, 2026-10-23). Reply DRAFTED in `scripts/binaryang-report.md` (top section).
     **1.16.1 PINNED the same day** (owner: bump first again): nothing moved, every suite green;
     added to the same draft.
  2. **binaryang's history was rewritten too (H19, on GitHub 2026-10-23).** `upstream/binaryang`
     was RE-CLONED here the same day from `synapticforge1/binaryang` (the old clone had no local
     work: clean, no stash, `main` only; the new one is at `v1.15.0` `bc97aa573 (was ae9e871)`,
     22 tags). A binaryang hash quoted in this repo's records before 2026-10-22 is an OLD one;
     translate it with binaryang's `cmem/publishing.md` § "The history purge" (not translated in
     bulk here). **binaryang rewrote AGAIN on 2026-10-28** (ledger C26: DWARF paths in five bench
     binaries; ids from 2026-10-13 on changed, 14 tags moved): translate through § "The second
     purge" as well. Re-cloned for it 2026-11-05 (the C26 note above, under § "For the workspace
     review — 2026-10-26").
  3. **The provenance outage was scope-wide** — recorded in design-decisions.md § JSR provenance
     (2026-10-23 entry; our "specific to wasmtk" conclusion withdrawn).

  Nothing to reply on 2 and 3; the reply on 1 was SENT 2026-10-26 (ledger C12, with a note that
  2.2.0 was pinned since).

## Deferred (no consumer)

- **B6**, asyncify list-options ↔ binary-parse name retention (now binaryang's domain).
- **The P2 component container**: waits on browser-native WASI P2 / the Component Model.


