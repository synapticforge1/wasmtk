# testing — part 5 of 5

Continues [testing.md](testing.md) (split by size on 2026-11-20, letter H38). Sections:

- Conventions
- Single-test quick loop

## Conventions

- **File naming:** `NN_Label.ext` (phase number first) so listings sort by phase.
- **Stress-test batches (owner workflow, 2026-07-28).** The owner supplies hand-written stress
  programs to probe a phase for latent bugs. Each lands in `tests/wasi/wasm_wasi/` as
  `NN_DescriptiveLabel.ts`, where `NN` is the phase whose feature is under test (pick the phase that
  owns the core mechanic — e.g. a nullable-return test crossing tuples and `??` is Phase 24, because
  nullable returns are the mechanic). Run the batch with the phase filter (`"^25_"`) first. **Escalate
  to the FULL suite only if the batch forced a `src/` fix** — a fix in shared codegen regresses other
  phases (the 2026-07-28 batch regressed two Phase 24/25 tests mid-fix). **If every test passed as
  written, the phase filter ends the batch** (see the corollary under "Which suites to run" above).
  Confirm any newly-failing adjacent suite against a clean tree
  (`git stash` + reinstall + re-run) before attributing it to the batch. Record the batch as ONE
  unit in `compiler-bugs.md`; update the counts here; and add **per-phase** rows to the README table
  — see the placement/labelling directive at the top of [roadmap.md](roadmap.md).
- **Generated artifacts are NOT tracked (2026-07-01):** the `.wasm`/`.wat`/`.wit` in
  `tests/wasi/wasm_wasi/` that pair 1:1 with a `.ts` are BUILD OUTPUTS (the runner regenerates them
  from the `.ts` on every run) and are `.gitignore`d — committing them had pushed the folder past
  GitHub's **1,000-file-per-directory** display cap (was 1,380 files → now ~402 tracked) and bloated
  the repo/pack (the `geometric-repack` errors). **When adding a NEW input fixture** (a `.wasm`/
  `.wat`/`.wit` with NO same-named `.ts` — e.g. an imported module like `18_symbol_table.wasm`, a
  `.wat`-runner source, or a prebuilt rust/zig output), add a `!tests/wasi/wasm_wasi/<name>`
  un-ignore line to `.gitignore`, else it won't be tracked and the test breaks on a fresh clone. A
  fresh clone has only the `.ts` + ~21 fixtures; the first suite run regenerates all outputs.
- **Extended 2026-07-02 to the bundle / bindgen / dync outputs:** `tests/wasi/wasm_wasi_bundle/**`,
  `tests/module/bindgen_fixtures/*`, `tests/wasi/wasm_wasi_dync/*` `.wasm`/`.wat`/`.wit` are ALSO
  `.gitignore`d — the `@test-pipeline` (modc→wasic→run steps), `bindgen_tests.ts`
  (`modc fixture -n …`), and the dync gate recompile them from their `.ts` every run. **Verified by
  clean regeneration** (deleted all 214, re-ran the suites → 375/375 + bindgen 131/131) so nothing
  among them was a silent INPUT. INPUT fixtures that tests READ are deliberately still tracked:
  `tests/module/wasm_mod/**` (mod_tests iterates the prebuilt `.wasm`), `tests/module/wasm_wast/**`
  (hand-authored WAT / Art-of-WebAssembly samples), and `tests/hybrid/hybrid_fixtures/**` (no test
  regenerates them). **These outputs double as cross-runtime validation fixtures** — always
  regenerate with a green suite before validating another wasm runtime against them, so you compare
  against current-compiler output (a stale committed binary would be a false positive). The
  canonical math fixtures (`src/wasm/mathlib.wasm` + `.wat`, `caps_bytes.ts`) stay tracked under
  `src/` and are the primary CR-math validation targets.
- **`@expect-fail: compile|run-ts|run-wasm`** in the first 10 lines → failure counts as PASS.
  ⚠️ It also switches OFF the run-ts vs run-wasm output comparison.
- **`@expect-exit: N`** in the first 10 lines (added 2026-09-28) → both run steps must exit
  **exactly N**, and the output comparison STILL runs. Use it for programs that die on purpose
  (an uncaught throw exits 1 since the exit-code parity fix). Today: `15_panic`,
  `15_Trap-On-Error`, `13_SecureMatrixManagerIntegration`.
- **`@test-pipeline` + `@step <subcmd> <args…>`** (comment header) → run custom wasmtk sub-commands
  instead of the standard compile/run-ts/run-wasm flow; paths resolve relative to the test file.
  Used by the capability pipelines and Phase 18 bundle tests.
- **Self-checking driver pattern** (capability fixtures): a `guard: i32[] = [0]` + `check(cond)`
  that does `guard[5000000]` (OOB read → trap → nonzero exit) on failure. A passing `run` proves
  semantics. (Written when a wasic uncaught `throw` exited 0; since sw01, 2026-09-29, it exits 1,
  but the guard pattern is still the one the fixtures use.)
- **Integer division** in tests (2026-10-09): `i32.div(a, b)` (wasMath) for the truncated
  quotient, `f64.div(a, b)` or f64 operands for the fraction. A plain `/` between integers,
  `(a / b) | 0` included, is a COMPILE ERROR since the owner's decision (design-decisions.md §
  "Wasm types in TypeScript"). The old `(a / b) | 0` convention is gone from the corpus.

## Single-test quick loop

```bash
wasmtk wasic tests/wasi/wasm_wasi/MyTest.ts && wasmtk run tests/wasi/wasm_wasi/MyTest.wasm
# For a capability: wasmtk modc <lib> ; wasmtk wasic <driver> ; wasmtk run <driver>.wasm
```


