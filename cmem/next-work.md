# Next-work — the ONE list of what is open

Only open items, each pointing at its record (workspace `memory-conventions.md`: working memory,
not an archive; git is the archive). Completed work appears below only as dated summaries with
commits. **The full text this file held before 2026-09-30 (1,240 lines: every census, bump log,
branch audit and superseded plan):** `git show ab5d1273644:cmem/next-work.md`.

## Open now

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
- ⏳ **H12 compiler bugs** (compiler-bugs.md, the round-1 table): **19 open silent-wrong, 21 open
  loud** (2026-09-30). NEXT: **sw05** (a string argument that is not a plain var or literal
  prints `0`). Three loud rows (sw18, sw22, sw23) share one root: an operator split hands the
  console fallback an EMPTY operand. Then H12 Phase 0b audit round 2.
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

- **`wasic` modularization, Phases 1–3** (wasic-modularization-plan.md; letter H12): output-
  preserving, gated by golden-WAT and `wasic_seam_tests`.
- **Offload #1: our regex-over-WAT merging gives way to binaryang's parser** (offload-inventory.md;
  I2 / H11). Trigger: binaryang RELEASES its one-front-end stage 5 (not in 1.8.x).
- **The next release** (roadmap.md, the unreleased block since v2.0.3): the compatibility gate's
  floor since v2.0.3 is MINOR (next ≥ 2.1.0; `deno task api-surface --floor`); the Deno floor is
  written then (workflow.md, release step 2b).

- **Review WasmEdge's AOT shared-library output** (owner, 2026-09-30):
  https://github.com/WasmEdge/WasmEdge. How a wasm module becomes a native library through
  `wasmedge compile app.wasm app_aot.so` (`.so` / `.dylib` / `.dll` by extension), run as
  `wasmedge app_aot.so`. Its own docs say the output "is only for WasmEdge use and cannot be used
  by other WebAssembly runtimes", so the question is whether it yields a C library a host can link
  (exported symbols, ABI, whether the WasmEdge runtime must be linked beside it) or only a WasmEdge
  artifact, and what that means for wasmtk's "TypeScript as a DLL" goal (vision.md). Scoping
  only: not started.

## Waiting on others

- **H10** (generated opcode / feature tables) waits on **H9**: binaryang 1.8.1 exports no
  `./definitions`. Our exact request (D2 + D3 first, then D1; field lists; a pinned subpath) was
  SENT 2026-09-30, and is in `scripts/binaryang-report.md`.
- **H4 and H11** are answered here (H4 re-verified item by item 2026-09-30); the workspace closes
  them in `../cmem/handoffs.md`.
- **binaryang: nothing of ours is open.** Every report and reply is marked SENT in
  `scripts/binaryang-report.md` (last: 2026-09-30, the 1.8.1 skip count).

## Deferred (no consumer)

- **B6**, asyncify list-options ↔ binary-parse name retention (now binaryang's domain).
- **The P2 component container**: waits on browser-native WASI P2 / the Component Model.

## Completed — dated summaries (details in the files named)

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
  (`b4cebd6`). Open silent-wrong 31 → 19.
- **2026-09-29 — binaryang 1.7.1 and the validator oracle** (`230f45a`): wast 64,434 / 105 →
  64,473 / 66, the guard at 0 valid modules rejected.
- **2026-09-30 — stale-item sweep** (`02dcb7c`): every open marker re-checked against code or a
  test; three closed, one sharpened.
- Everything earlier (the binaryang 1.5.3 → 1.7.0 bumps, the false-pass audit, the wast census
  history, the EH migration, the runner fixes, the branch audit): `git show
  ab5d1273644:cmem/next-work.md`.
