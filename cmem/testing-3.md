# testing — part 3 of 5

Continues [testing.md](testing.md) (split by size on 2026-11-20, letter H38). Sections:

- Current pass counts (2026-11-20, binaryang **4.1.1**; latest release v
- `wast_tests` is a PER-FILE BASELINE gate (rebuilt 2026-08-20)
- The `wast` runner leaks memory across files (OPEN, found 2026-08-20)

## Current pass counts (2026-11-20, binaryang **4.1.1**; latest release v3.0.0) (continued, 2)

### Snapshot as of 2026-07-08 (wabt-ts 1.3.5 + binaryen-ts 1.4.0)

(Table as a list — Suite · Result:)

- `tests/wasi/wasm_wasi` (full, HARDENED output-diff runner) — Result: **375 / 375**
  (+`67_TrigCorrectlyRounded` 2026-07-01 — mathlib `sin`/`cos`/`tan` are now IEEE-754
  **correctly-rounded** double-double (validated bit-for-bit vs a BigInt CR oracle through the full
  pipeline); the 23 printed values are correctly-rounded doubles that for these args also equal V8's
  `Math.*`, so wasm==ts. See compiler-bugs.md issue 5 + design-decisions.md. +`66_Dragon4Formatting`
  2026-07-01 — report issue 6: `$__f64_to_str` rewritten as pure Dragon4 (Burger-Dybvig), 100%
  byte-exact f64→string vs V8 incl. subnormals/max/scientific + fixes the old formatter's TRAP on `
- `bindgen_tests.ts` — Result: **142 / 142** (functions-as-`any` both directions: core→host
  `testIntegrationFnAny` `getDoubler()(21)=42` + proxy-robustness assertions; **#14 Phase 2
  host→core `testIntegrationHostFn`** — `applyTwice(n=>n+1,10)=12` / `combine((a,b)=>a*b,6,7)=42`
  via the `env.__host_call` import + host-fn table; **+4 SPEC §10 loader assertions 2026-07-08** —
  the generated loader always ships a minimal WASI-P1 shim + calls `_initialize`, so a
  WASI-importing library (TinyGo reactor, or a `modc` lib that `console.log`s) instantiates; **+7
  kebab-round-trip assertions 2026-07-08** — `testIntegrationKebab` (fixture `kebabcase_50`, exports
  `readID`/`toHTML`) proves the generated loader's `_ex()` resolver binds capital-heavy exports the
  lossy WIT kebab↔camel round-trip can't reconstruct (fails pre-fix with `exp["readId"] is not a
  function`). See `go_bindgen_tests.ts` + polyglot-producers.md § "Go string/aggregate bindgen" +
  compiler-bugs.md § "Code-audit sweep".)
- `go_bindgen_tests.ts` (TinyGo-gated; skips if absent) — Result: **7 / 7** — Go→bindgen
  integration: `wasmtk modc --lang=go tests/go_fixtures/strlib` → `wasmtk bindgen strlib.wit` →
  drive the generated loader: `greet`/`strLen` round-trip incl. UTF-8. Proves TinyGo string
  libraries are consumable by bindgen over the **canonical** ABI unchanged (Go strings are UTF-8
  (ptr,len); a `//go:linkname cabi_realloc` wrapper + `cabi_post_<name>` matches wasic's shape).
- `go_merge_tests.ts` (new 2026-07-08; TinyGo-gated) — Result: **7 / 7** — MERGEABLE Go leaf:
  `wasmtk modc --lang=go --go-target=wasm-unknown tests/go_fixtures/leaf/mathleaf.go` builds an
  alloc-free `wasm-unknown` leaf (0 imports, no `memory.grow`), then `wasmtk wasic use_mathleaf.ts`
  merges it (`import { addi, muli, clampi } from "./mathleaf.wasm"`) and `run` computes
  `addi(3,4)=7`/`muli(5,6)=30`/`clampi(42,0,10)=10`. Proves Go leaves `wasmmerge` like a Zig
  `FixedBufferAllocator` leaf (`mergeOneWasmImport` calls the leaf's `_initialize`). See
  polyglot-producers.md § "Mergeable Go leaf".
- `go_asyncify_tests.ts` (TinyGo-gated; broadened 2026-07-09) — Result: **12 / 12** — GOROUTINE Go
  with NO external binaryen, forced via `WASMTK_GO_BINARYEN_ASYNCIFY=1`: table-driven over the full
  surface — worker-pool (`sum: 30`), `select` over unbuffered channels (`select-total: 300`),
  `time.Sleep` (`sleep-result: 42`), `sync.WaitGroup`+`Mutex`+closure+defer (`wg-counter: 45`),
  3-stage fan-out pipeline (`pipeline-total: 55`), and **`nested/` — a goroutine that suspends
  INSIDE another suspending goroutine (`nested-sum: 36`)**. Each builds `-scheduler=asyncify` +
  passthrough shim, then `binaryenAsyncify` (binaryen-ts ≥ **1.4.3** Asyncify import-mode + `-Oz`).
  `nested/` was the reproducer for binaryen-ts **WT-2k** (a binary-DECODER reorder bug that
  miscompiled TinyGo's goroutine trampoline — NOT asyncify; fixed in 1.4.3). Asserts the in-house
  path was used + correct output.
- `jstyper_tests.ts` — Result: **73 / 73**
- `hybrid_tests.ts` (2026-07-08; +2 for B5 2026-07-09) — Result: **10 / 10** — unit tests for the
  context-aware `hybrid` scanners: `findCloseBrace`/`rewriteWasmCalls` must not be fooled by a
  `}`/quote/regex inside a string/comment/regex, must rewrite a routed call inside a template `${…}`
  interpolation, must NOT rewrite an object method shorthand, and must inject `loadModule` after a
  MULTI-LINE import. **+2 (B5, teeth-verified):** a **nested backtick template inside a `${…}`
  interpolation** — whose inner text holds a `}` — must not truncate a `@wasm` body (`skipLiteral`
  now descends into `${…}` via `findInterpEnd`), and a doubly-nested interpolation must not defeat
  call-rewriting. See design-decisions.md § "hybrid call-rewriting … MUST be context-aware".
- `wasmmerge_guard_tests.ts` (new 2026-07-09; Go-free) — Result: **2 / 2** — unit tests for the
  `wasmmerge` foreign-runtime guard: a hand-assembled module that calls `memory.grow` (stands in for
  STANDARD Go's full runtime / any growing allocator) is REJECTED with actionable guidance
  ("STANDARD Go … build a MERGEABLE leaf with TinyGo `--go-target=wasm-unknown`"), and NOT with the
  red-herring `call_indirect` "refactor to direct calls" message; an alloc-free leaf (no
  `memory.grow`) does NOT trip the guard. See polyglot-producers.md § "Ordering fix + std-Go
  coverage".
- `dync_conformance_tests.ts` (#14 2h Javy-parity gate) — Result: **3 / 3** — for each fixture in
  `tests/wasi/wasm_wasi_dync/` (demo1/2/3), `wasmtk dync`→`.wasm`→`run` stdout must byte-match a
  `deno run` JS baseline. Proves the OWN dynamic runtime is a drop-in `javyc` replacement (no
  Javy/QuickJS). Caught the `Math.min`/`max` 2-arg bug (now variadic). Out of scope: interactive
  `prompt` + ESM import/export of other modules.
- `dync_cross_runtime_tests.ts` (pure-WASI portability gate, 2026-07-27; external runtimes
  skip-if-absent) — Result: **3 / 3** — proves `wasmtk dync` output is PORTABLE. Per fixture in
  `tests/wasi/wasm_wasi_dync/`: compile, then (INVARIANT, always checked even in a runtime-free CI)
  the `.wasm` must import ONLY `wasi_snapshot_preview1`; then (EXECUTION, skip-if-absent like the
  TinyGo gates) under each of wasmtime/wasmer/wazero present, stdout must byte-match the `deno run`
  baseline. Guards `internalizeDynrtHostImports` (dropped the wasmtk-only
  `env.__host_print`/`__host_call` → inline WASI `fd_write` + `unreachable` trap). Run: `deno run
  --allow-read --allow-run --allow-write --allow-env tests/dync_cross_runtime_tests.ts`.
- Capability pipelines `18c`–`18g` (Set/Map/Date/JSON/RegExp) + `18h` (virtual `wasmtk:` imports) —
  Result: **6 / 6**
- `wast_tests.ts` (`.wast` spec-runner regression gate, 2026-07-02, wabt-ts 1.3.5) — Result: **41
  files, 12444 exec assertions pass / 0 fail** — the official WASM spec `.wast` core testsuite run
  clean through `wasmtk wast` (wabt assemble → host V8). Grew 31→40→41 as wabt-ts **1.3.4**
  (br_if/br_table-value + hex-float) and **1.3.5** (decimal→f32 double-rounding, Bug C) fixed all 3
  findings — `const.wast` now in the gate. Run `deno run --allow-read --allow-net
  tests/wast_tests.ts`; `wasmtk wast tests/module/wasm_wast/testsuite-main` for the whole suite.

The 7 previously-failing tests were fixed 2026-06-02: `5e_MixedSignatures`,
`19_NestedDiscriminantUnions`, `19_VariantMaximumMemoryAlignment` (value-fallthru codegen, fixed in
wasic); `38_MathExpLog`, `38_MathHyperbolic`, `38_MathTrig`, `38_Phase38Combined` (hex-float
literals encoded as 0, fixed in wabt-ts 1.3.1). See compiler-bugs.md.

Historical baseline under npm:wabt+npm:binaryen was 446/446 (2026-05-25); the per-phase historical
counts in README are a record of when each phase first went green, not a live invariant.

> Older dated pass-count notes (52) moved verbatim to [archive/testing-pass-counts-to-2026-11-20.md](archive/testing-pass-counts-to-2026-11-20.md) (H38).


## `wast_tests` is a PER-FILE BASELINE gate (rebuilt 2026-08-20)

**288 files, 64506 passing assertions, 0 failures, 16 skipped, 0 files pinned, 0 unrunnable — ALL
CLEAN** (re-recorded 2026-09-30 with the custom-page-sizes lowering: 3 files, +33, reported apart.
Before that, re-recorded 2026-09-29 on **binaryang 1.7.1** with binaryang's validator as the second
`assert_invalid` oracle: 9 files, +39, see Current pass counts. Before that, re-recorded 2026-09-28
after v2.0.3: an ENGINE refusal — unimplemented proposal, flag-gated feature, or a size above V8's
cap below the spec's — is never a verdict; 6 files, 24 passes → skips; `src/engine.ts` names the
feature for the user. Before that, re-recorded 2026-09-28 on **binaryang 1.7.0**: 17 files moved,
all up, none down — `return_call_indirect` 28 → 78, the custom-descriptors proposal from ~0 to 606
across 12 files, `name_annot` 0 → 3, `branch_hint` 1 → 2, `custom-page-sizes` 0 → 1; before it 63800
/ 804, after the false-pass audit). **The gate runs with experimental V8 flags, SCOPED:**
`GATE_V8_FEATURES` in `tests/wast_tests.ts`. wide-arithmetic applies to every file (the gate re-runs
itself flagged, so it needs `--allow-run`); custom-descriptors applies ONLY to
`proposals/custom-descriptors/`, which runs in its own child process (`--run-one` / scoped
`--scan-chunk`), because turning it on for everything made the CORE `br_on_cast.wast` /
`br_on_cast_fail.wast` lose 3 `assert_invalid` passes each (the proposal relaxes the cast rule). **A
flag that changes core semantics must be scoped.** `custom-page-sizes` has no V8 flag in this
engine: its 12 unbuilt modules are V8 refusing modules binaryang builds (an engine limit). The
unflagged `wasmtk wast` CLI reads 63,693 / 913 (measured 2026-09-28) — the SIMD/NaN trampoline took
skips 26,944 → 886 on 2026-09-28 (see compiler-bugs.md). Just before
it the gate stood at 37674 passing, 0 failures (re-recorded 2026-09-28 after three RUNNER fixes in `src/wast.ts`: `ref.extern`/`ref.host`
arguments and results, BOM-preserving string decode, and running `assert_trap` MODULES; see
[compiler-bugs.md](compiler-bugs.md). Before those, 37370 with 100 failures in 15 files, on
binaryang 1.6.0, +5 skip → pass; before that 37365, re-recorded 2026-09-19 after the vendored `proposals/threads/` patches AND the `assert_malformed` stage split;
was 37,367 / 37,370 earlier that day, 288 / 37247 on wabt-ts 1.4.1, and 287 / 27983 / 12 on 1.3.5) — up from 41 files / 12444, because the gate no
longer needs a hand-curated file list. Expected pass counts live in **`tests/wast_baseline.json`**
(tracked). Every baselined file must produce **exactly** its baseline: fewer → FAIL (coverage lost),
more → FAIL (baseline stale, re-record deliberately), any execution failure → FAIL as before.

**Why it changed.** The old gate asserted `failed === 0` plus one *global* floor
(`totalPass >= 10000` against ~12444). It could not see a single file losing coverage. When the
2026-08-20 corpus sync took `return_call.wast` from 44 passes to 12, the gate still printed
ALL CLEAN — the loss was caught by hand-measuring before/after, not by the gate. A module that fails
to assemble becomes SKIPs by design, so **silent coverage loss is indistinguishable from success**
unless something pins the per-file number. The corpus could have shed ~2400 more passes unnoticed.

- **A baseline of 0 is deliberate** — it pins a file the toolchain currently cannot assemble at all
  (e.g. `ref_null.wast`, 0 pass / 34 skip). When the backend learns to encode `ref.null`, the gate
  *says so* instead of absorbing the win silently.
- **7 files with genuine execution failures are excluded, not pinned** (`load1`, `linking`,
  `imports`, `annotations`, `type-equivalence`, `float_memory`, `linking0`). Pinning them would
  freeze real bugs in as expected. They are reported each run as "not in the baseline".
- **Re-record** (rewrites the tracked JSON — a reviewable act, not a side effect):
  ```bash
  deno run --allow-read --allow-write --allow-net --allow-run tests/wast_tests.ts --update-baseline
  ```
  Verified deterministic: two consecutive regenerations are byte-identical. `--allow-run` is
  required because the rescan chunks across subprocesses (see the memory limitation below).

## The `wast` runner leaks memory across files (OPEN, found 2026-08-20)

**`wasmtk wast <dir>` over the full 288-file corpus dies** with `Fatal JavaScript out of memory:
Ineffective mark-compacts near heap limit`. This is our bug, not the corpus's, and the directory
form is the one README documents.

> ✅ **FIXED — verified 2026-08-25. Everything in this bullet list is HISTORY; do not act on it.**
> A full 288-file directory run now completes in one process: `37365 passed, 100 failed, 27153
> skipped, 162 unbuilt modules`, no OOM, matching the chunked gate exactly. `exact.wast` reports
> `pass=20 fail=0 skip=16`. The causes were an infinite loop in our S-expr reader on a lone `;` and a
> wabt-ts `parseWat` blow-up on `(ref (exact any))` (fixed in wabt-ts 1.4.1) — **not** memory
> retention. See [compiler-bugs.md](compiler-bugs.md).

- Memory climbs to ~1.9 GB within the first handful of files and then creeps ~1–6 MB per file.
- **One file exhausts the heap on its own**: `proposals/custom-descriptors/exact.wast`.
- A partial fix landed 2026-08-20: `src/wast.ts` used to call `await wabt()` **per file**, creating a
  fresh WABT module that was never released; it is now a process-wide singleton (`getWabt()`). That
  was real, but **not sufficient** — the dir run still OOMs, so the bulk of the retention is
  elsewhere (most likely instantiated modules/memories, including the 64-bit memory tests).
- Consequences today: the 280-file gate *does* fit in one process; a 288-file rescan does not, which
  is why `--update-baseline` chunks across subprocesses and auto-discovers unrunnable files rather
  than carrying a hand-maintained skip list.
  - ⚠️ **The chunking stays regardless** — an OOM cannot be caught in-process, so a single-process
    full-corpus rescan is still one bad file away from losing every result. The fix removes the
    symptom, not the reason for the design.

