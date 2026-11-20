# Testing

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 5.** The sections continue in:

- [testing-2.md](testing-2.md): from "Current pass counts (2026-11-20, binaryang **4.1.1**; latest release v3.0.0)"
- [testing-3.md](testing-3.md): from "Current pass counts (2026-11-20, binaryang **4.1.1**; latest release v3.0.0) (co"
- [testing-4.md](testing-4.md): from "The multi-engine gate — `engine_cross_check_tests.ts` (added 2026-08-24)"
- [testing-5.md](testing-5.md): from "Conventions"

## Running the suites

```bash
# Full wasm_wasi suite (phase tests + Go-by-Example + capability pipelines)
deno run --allow-read --allow-write --allow-run --allow-env tests/wasi_tests.ts

# Optional 2nd arg = regex filter on file basenames (scope to one phase/feature):
deno run ... tests/wasi_tests.ts tests/wasi/wasm_wasi "^15_"       # phase 15
deno run ... tests/wasi_tests.ts tests/wasi/wasm_wasi "^18[c-g]_"  # all 5 capability pipelines

# Separate runners:
deno run ... tests/bindgen_tests.ts     # bindgen unit + integration
deno run ... tests/jstyper_tests.ts     # jstyper unit

# ⚠️ TWO suites are Deno.test-based and need `deno test`, NOT `deno run`:
deno test --no-check --allow-read --allow-write --allow-run --allow-env \
  tests/hybrid_tests.ts tests/wasmmerge_guard_tests.ts     # expect 15 passed (13 + 2)
```

(2026-09-28: a hand-rolled gate script ran EVERY suite with `deno run` and reported both as PASS
in 0 s. The trap still bites; a gate script must switch to `deno test` when a file contains
`Deno.test(`.)

⚠️ **Probing the compiler: `wasmtk run x.ts` does NOT compile.** It runs the `.ts` under Deno
(`src/utils.ts` `runWasi`: it is the corpus's reference run). A scratch probe that compares
`deno run x.ts` with `wasmtk run x.ts` compares Deno with Deno and always agrees (2026-10-23: three
"open" rows looked fixed that way, and four silent bugs were hidden behind them). Compile it:
`wasmtk wasic x.ts -o x.wasm`, then `wasmtk run x.wasm`. The `.wat` text is written beside the
`.wasm` (`-o x.wat` writes the BINARY under that name).

**Typed-declaration rule (2026-09-28): every wasi test states its declarations' types.** A new test
with `let x = 1` now fails to COMPILE, which reads as a test failure for the wrong reason. Type
integer literals `: i32` to keep the old i32 behaviour; `tests/typed_decl_tests.ts` is the rule's
own gate (reasons asserted, accepted forms run). Round-1 repros in `scripts/phase0/round1/` are
typed too; a repro with an untyped declaration would report COMPILE-FAIL instead of its bug.

**`deno run` on those two exits 0 having executed NOTHING** — no output, no failures, a silent pass.
Every other `tests/*_tests.ts` is a self-driving script with its own summary block; only
`hybrid_tests.ts` and `wasmmerge_guard_tests.ts` register `Deno.test(...)` cases (verify with
`grep -l "Deno.test(" tests/*_tests.ts`). `--no-check` is required: `hybrid_tests.ts:69` has a
pre-existing `new Set(...)` inference error that fails type-checking but not the tests. (Found
2026-07-30 — the Phase 19 gate ran them with `deno run` and got two empty results that looked green.)

**CRITICAL:** the runner invokes the **globally installed** `wasmtk` (`WASMTK_BIN = "wasmtk"`).
After editing anything in `src/` or `deno.json` you MUST reinstall before the suite reflects it.
**Always reinstall via the `install` task** — it is the single source of truth for the permission
flag set, so the launcher can never drift:

```bash
deno task install
```

The task (in `deno.json`) expands to:

```bash
deno install -g --allow-run --allow-read --allow-write --allow-env --allow-ffi --allow-net \
  --config deno.json --force -n wasmtk main.ts
```

⚠️ Do NOT hand-write the `deno install` line — **`--allow-ffi` is required**. If it is omitted, the
installed launcher prompts interactively (`Deno requests ffi access … [y/n/A]`) on every `wasmtk`
invocation, which stalls the whole test run. (Regression history: a documented reinstall command
here once omitted `--allow-ffi`; fixed 2026-06-08 by deferring to `deno task install`.)

## Which suites to run for a given change (owner policy, 2026-07-28)

**Rule: when a BUG IS FOUND/FIXED, run the ENTIRE suite set — including `wast_tests` — to catch
overlapping regressions.** Skip suites only when the change is *provably* outside their reach; the
map below is the evidence for that call. "Outlier" is relative to WHICH FILE changed, never absolute.

**Corollary — no bug, no `src/` change, no full suite (owner directive 2026-07-30).** The gate is
triggered by a CHANGE, not by the act of running a batch. When every new stress test passes as
written and nothing under `src/` was edited, the phase filter is the complete gate — **stop there.**
New `.ts` files in `tests/wasi/wasm_wasi/` are inert with respect to the rest of the corpus: each
test compiles and runs in isolation, so they cannot perturb another test's result. Spending >10
minutes to re-confirm 400 untouched tests buys nothing. (Recorded after the Phase 31 TypedArray
batch, where all three tests passed first try and a full run was started needlessly.)

**A change to `src/wasic.ts` / `src/console_log.ts` (the compiler) reaches:**

(Table as a list — Suite · Why it is reached:)

- `wasi_tests` — Why it is reached: drives `wasic` / `modc` / `run`
- `bundle_tests` — Why it is reached: `wasic` on multi-file projects
- `bindgen_tests` — Why it is reached: `modc` = wasic library mode, INCLUDING the `wasmmerge` import
  path when a fixture merges dynrt (`fnany_50`, `hostfn_50`). Since 2026-09-30 it rebuilds every
  fixture from scratch (`compileFixture` deletes the old `.wasm` / `.wit` and requires a fresh one);
  before, it graded stale gitignored binaries for five weeks
- `merge_tests` — Why it is reached: `wasic` + `modc`
- **`go_merge_tests`** — Why it is reached: **compiles a TypeScript driver with `wasic`
  (`tests/go_merge_tests.ts:70`)** — only the merged *leaf* is Go, so this is NOT a Go-only suite
- `dync_conformance_tests`, `dync_cross_runtime_tests` — Why it is reached: `src/dync.ts` imports
  `compileWasiTs` from `wasic.ts`, so every dync program is wasic-compiled

**Independent of wasic codegen (safe to skip for a pure-wasic change) — each with its OWN trigger:**

(Table as a list — Suite · Exercises · Its own trigger:)

- `hybrid_tests` — Exercises: `src/hybrid.ts` parser/scanners (unit) — Its own trigger:
  `src/hybrid.ts`
- `jstyper_tests` — Exercises: `src/jstyper.ts` (unit; emits `.ts`, never compiles) — Its own
  trigger: `src/jstyper.ts`
- `wast_tests` — Exercises: `src/wast.ts` → `wabt` only — Its own trigger: **any `binaryang` backend
  bump** (one package since 2026-08-27 — a bump moves the assembler AND the optimiser together),
  `src/wast.ts`. A bump makes this gate go RED by design — `GAINED COVERAGE` and/or `failures N → M`
  — see next-work.md
- `wast_runner_tests` (2026-09-30) — Exercises: the wast RUNNER against fixtures with PLANTED
  outcomes (`tests/wast_runner/`): the trap-kind check (right kind passes, wrong kind FAILS,
  unmapped message SKIPS) and the custom-page-sizes lowering (on: lowered and run; off: engine skip;
  `assert_invalid` never lowered). The corpus gate cannot show a runner is too lenient; this can.
  `deno run`, 8/8 (2026-09-30) — Its own trigger: `src/wast.ts`
- `engine_cross_check_tests` — Exercises: the built `.wasm` corpus → standalone engines — Its own
  trigger: **any codegen change** (`src/wasic.ts`, `src/console_log.ts`), any backend bump, any
  WASI-ABI change. Run it after `wasi_tests` regenerates the corpus
- `varscope_tests` — Exercises: `src/varscope.ts` — Its own trigger: `src/varscope.ts`
- `wasmmerge_guard_tests` — Exercises: `src/wasmmerge.ts` — Its own trigger: `src/wasmmerge.ts` —
  **and wasic merge-path changes**, which call into it
- `mod_tests` — Exercises: loads 36 **committed** `.wasm` fixtures under `tests/module/wasm_mod/`;
  no compile step — Its own trigger: the loader, `src/utils.ts`
- `go_bindgen_tests`, `go_asyncify_tests` — Exercises: `--lang=go` → `gowasic` (+ `bindgen.ts`) —
  Its own trigger: `src/gowasic.ts`, `src/bindgen.ts`
- `golden_wat_tests` (2026-09-28, H12 Phase 0a) — Exercises: BYTE-EXACT compiler output: every
  corpus `.ts` + every pipeline `wasic`/`modc` step (478 entries) against the local, gitignored
  snapshot `tests/.golden/`. `--record` freezes; the default checks and prints the first differing
  line per entry/section. `deno run -A`, ~16s. Proven by inversion (a planted golden edit; a real
  emitter change, caught in corpus and pipeline entries) — Its own trigger: **every Phase 1–3
  modularization commit** (must show ZERO diff), and any `src/wasic.ts` / `src/console_log.ts`
  change (the diff must show ONLY the intended change, then re-record). NOT a gate on a fresh clone:
  record first
- `witgen_tests` (2026-09-28) — Exercises: `.wit` auto-emission (`src/witgen.ts`) through the real
  CLI: `convert x.wat`, `wasic x.wat`, `wasmbundle`; types and names parse in bindgen's `parseWit`;
  a hand-written `.wit` is KEPT; a generated one is REFRESHED; v128/multi-value exports LISTED as
  skipped; a module with no interface gets NO `.wit`. 23 checks — Its own trigger: `src/witgen.ts`,
  and the six emit sites (`main.ts` Go/Zig `modc`/`build`, `utils.ts` `convertFile`,
  `wasmbundle.ts`, `wasic.ts` `compileWat`). Zig and Go emission is also asserted by `zig_tests` and
  exercised by the go suites
- `wasmath_tests` (2026-10-09, wasMath L1) — Exercises: Every `src/wasmath.ts` function with a wasm
  counterpart against the REAL instruction: a one-instruction (or `select`) WAT function per
  function, assembled by binaryang (`wabt` import), run by the engine's WebAssembly; the body must
  match bit for bit on a battery of edge values (every pair; ±0, NaN, ±∞, subnormals, overflow
  edges, double-rounding traps) and THROW exactly where the instruction TRAPS. The body's result is
  checked to be a VALID value of its type first (an i32 −0 or 3.5 is a failure, never normalised).
  `pow` and `toI32Wrap` against BigInt references. 151 functions, 69,318 calls. Inversion-checked
  (2026-10-09): 4 planted bodies (`i32.div` without `\| 0`, `nearest` as `Math.round`, `i64.div`
  without its overflow throw, `f32.fromI64` double-rounding) all caught, the last only after adding
  the double-rounding inputs. NOT covered: the f64 / f32 `Math` functions (no instruction to
  compare; L2 / L3). `deno run -A`, ~5 s — Its own trigger: `src/wasmath.ts`; a backend bump (the
  reference module is assembled by binaryang)
- `wasmath_lower_tests` (2026-10-09, wasMath L2) — Exercises: Every wasMath function called from
  real PROGRAMS compiled by `wasic` and run, against the same program in Deno: one program per
  function prints every non-throwing input; each throwing input (≤ 2 per function) gets its own
  program and BOTH must stop (non-zero exit, nothing printed). Runs `main.ts` with `Deno.execPath()`
  (NOT the `.cmd` shim, which a timeout cannot kill on Windows) with time limits (compile 120 s, run
  30 s): a hang is reported, never waited on (two runs stalled on ld33 before this). u64 ≥ 2⁶³
  inputs are NOT skipped since L4 (2026-10-13; they were, 220 of them, until the u64 printer). Since
  L3 (2026-10-09) the `Math`-style members must match too (they run the same mathlib in Deno; the
  "known: Math" class was removed): 199 functions, 34,626 calls: **199 exact, 0 failed** (L2 had 176
  exact + 23 known). `deno run -A`, **~15 min**; optional filter regex — Its own trigger:
  `src/wasmath_lower.ts`, `src/wasmath.ts`'s Math-style bodies, `src/wasm/mathlib.wat`, the
  bundler's wasMath branch, `WasicTranspiler`'s helper registration; NOT every gate (the corpus's
  `39_WasMathAllFunctions` covers all 151 instruction functions on every gate)
- `wasic_seam_tests` (2026-09-28, H12) — Exercises: STRUCTURAL: the compiler core (the
  `WasicTranspiler` body; later every core module under `src/wasic/`) touches no host or backend
  (`rt.*`, `Deno.*`, `console.*`, `process.exit`, wabt, binaryen, merge, bundler). Own
  string/comment/regex/template masker with a desync detector (all `this.diagnostics.push(` must
  survive masking); inversion-checked against the pre-fix `wasic.ts` (flags exactly the 4 lines) —
  Its own trigger: **any change to `src/wasic.ts`** and every Phase 1–3 modularization commit. `deno
  run --allow-read`, milliseconds
- `zig_tests` (2026-09-28) — Exercises: `--lang=zig` → `zigwasic`: library (freestanding, exports
  called), program (run on wasmtk + wasmtime), compile-error path (non-zero, no artifact). Skips
  without `zig` — Its own trigger: `src/zigwasic.ts`, main.ts's zig dispatch, `runWasi`
  (`src/utils.ts`), **any backend bump** (the library build runs binaryen `-Oz`)
- `rust_tests` (2026-09-28) — Exercises: `--lang=rust` → `rustwasic` → rsxtk: init/run/build, the
  built module on wasmtk's own host, the missing-file and rsxtk-ABSENT paths. Skips without `rsxtk`
  — Its own trigger: `src/rustwasic.ts`, main.ts's `rsxtkForwardArgs`/`delegateRust`, `runWasi`
  (`src/utils.ts`)

**Verify, don't assume.** The quickest check of what a suite actually drives:

```bash
grep -ohE '"(wasic|modc|dync|bindgen|run)"' tests/<suite>.ts | sort -u   # CLI verbs it shells out to
grep -ohE '^import .*from "\.\./src/[a-z_]+\.ts"' tests/<suite>.ts       # src modules it unit-tests
```

`go_merge_tests` was mis-classified as a Go-only outlier until this grep showed the `wasic` call.

