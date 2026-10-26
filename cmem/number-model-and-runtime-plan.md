# number-model-and-runtime-plan.md — plain TypeScript numbers + the Bun transition (2026-10-26)

**Status: MEASURED, nothing built.** The owner's direction of 2026-10-26 (design-decisions.md, top of
the number-model section): no type hints, no wasMath — `number` is f64 in wasm, `bigint` is i64,
loop counters and indices are integers in wasm. And the owner, the same day: scope the Bun
transition with it ("I agree"), so the corpus and the harnesses change ONCE. This file holds the
measurement, what a build needs, the refreshed Deno-exit order, and the decisions that are the
owner's. Every number has a date; re-measure before acting on one.

## The harness (Deno-exit P0, built 2026-10-26)

`scripts/migr/` (TypeScript on Bun, `node:` builtins):

- **`wasi_host.ts`** — ONE WASI preview-1 host that runs a compiled module the same way under
  Deno, Bun and Node (erasable TypeScript only, so Node strips it). Refuses non-WASI imports.
- **`corpus_matrix.ts`** — for every program of a corpus (a COPY in a temp dir, the repo's layout
  kept so `../../../src/…` imports resolve): the TypeScript reference on Deno, Bun and Node 24,
  `wasic` through the repo's `main.ts`, the module through the host on all three; outputs, exit
  codes, sizes, times, stderr. `--mode number` rewrites the copy to plain numbers (every
  `i32`/`u32`/`f32`/`f64` type → `number`, `i64`/`u64` → `bigint`, the aliases and type-only
  wasMath imports dropped; a program that CALLS wasMath is skipped). `--summary a.json b.json`
  compares two runs program by program. Classes it separates: `@allow-output-diff` files and
  modules that need host imports (the host refuses them; the wasi suite supplies them).
- **`survey.ts`** — `Deno.*` / `Bun.*` / `Deno.test` / `jsr:`-`npm:` / `enum`-`namespace` per area,
  `upstream/` excluded.

## The P0 baseline (typed corpus as it is, 2026-10-26)

Deno 2.9.8, Bun 1.4.4, Node 24.21.0 (fnm), binaryang 2.2.0, wasmtk `main` after the second purge.

- 509 programs; 49 pipelines (tool steps, not single programs); **460 measured, 449 compile**
  (the 11 others are the corpus's deliberate refusals); **437 match Deno**, and the 12 others are
  all explained: 8 need host imports (harness), 2 are rule 4 by design (`30_I32Overflow*`: a
  checked store throws where JavaScript gives 4294967296), 2 are `@allow-output-diff` (wasic's
  zero-sentinel destructuring defaults).
- **The module runs the same on Deno, Bun and Node 24: 449 / 449.**
- **The TypeScript reference:** Bun matches Deno on 448 / 460, Node 24 on 435 / 460 (Node strips
  types only: `enum` / `namespace` fail before running, as on 2026-10-13).
- **Survey:** shipped code calls `Deno.*` in 5 files for real (`main.ts`, `rt.ts`, `jstyper.ts`,
  `wast.ts`, and new since 2026-10-13 `outpath.ts`, `Deno.build.os`); the other two hits are the
  Deno binding bindgen GENERATES and a comment. `rt.ts` still has 6 `Bun.*` lines (the guide's rule
  is `node:` builtins). Test harnesses: 295 `Deno.*` lines in 31 files, `Deno.test` in 2.

## The number-type measurement (the corpus rewritten to plain numbers, TODAY's compiler)

- 509 programs; 66 skipped (pipelines + the 18 that CALL wasMath); **443 measured, 413 compile, 371
  match Deno**; the module still runs identically on Deno, Bun and Node (413 / 413).
- **Right only as plain numbers: 2** — the rule-4 programs, now JavaScript's answer.
  **Right only as typed: 51.** Size, where both compiled: **+16 %** (corpus); +15 % / +61 % / +33 %
  on round 3's console / codegen / fall-through repros.
- **Speed: not measurable on this corpus** — 369 comparable programs, total ×0.997, median 95 ms
  either way; NO program runs long enough (none over 250 ms) for compute to show over process
  start. A benchmark set is needed before integer inference can be judged (below).
- **What the 51 are** (the compiler's f64 path is far less exercised than its i32 path):
  - **27 INVALID MODULES reported as a successful compile** (i32 / f64 mismatches in `call`,
    `local.set`, `i32.eq`, `if`, `f64.convert_i32_s`…; found only when the runtime compiles the
    module). A finding for TODAY too: wasic never validates its output.
  - **4 silent-wrong**: an array of plain numbers in a struct read at the wrong element width
    (`[95, 88, 72]` → `1.86e-312, 3.56e-322, 0`; a struct field typed `number` is i32,
    wasic.ts:~4979, while an array of `number` is f64), a value read wrong through a class
    (`42` → `2.08e-322`), a 2-D alias, the object writer's column layout.
  - **30 refused or failed compiles**: the D3 / float-string-index rules firing on values that are
    now f64 (~10; these rules retire with the hints), 6 IR errors on the f64 path ("local … cannot
    be resolved"), ND-array printing, and the corpus's deliberate refusals (fail in both modes).
- **Round 3's repros, typed vs plain numbers:** plain numbers alone fix sw160 (f235, f236, f245),
  sw162 (k02), sw163 (k03), the `% 0` trap (c93), and four loud invalid-module rows (k20, k23, c61,
  c62); nothing gets worse.
- **sw146 (item 7 of the 2026-10-26 open list) needs no ruling:** as plain numbers `k08` / `c94`
  still print `0` for `-0` — because wasic's FLOAT `%` (`x - trunc(x/y)*y`) loses it, which is
  sw145. Make float `%` exact (fmod: the dividend's sign, `-0` kept, `x % ±Infinity` = x) and both
  close.

## What the build needs (a work list, not yet ordered)

1. **`number` is f64 on every path** — the 27 invalid modules and 6 IR errors above are the list;
   the struct field `number` → i32 inconsistency goes (a field is f64 like everything else).
2. **wasic validates its output** before reporting success (binaryang's `wasmValidate` under the
   module's features): an invalid module becomes a compile error naming the function, never a
   "✅" and a crash at load. Worth doing FIRST, on today's compiler.
3. **Retire, with the hints:** D3 (float stored into an integer), the float-string-index rule,
   integer `/` refused, rule 4 / sw119's `$__i32_fit_*` (an f64 `+ - *` IS JavaScript's), the
   `i32`/`f32`/`u32` aliases in programs. **`./wasMath` is PUBLISHED**: a release that marks it
   `@deprecated` first (Rule 4), removal in the major after.
4. **Integer inference** (the size / speed recovery): a counting-`for` counter, an index, a
   `.length`, a `| 0` / `>>> 0` / `& m` result, `Math.floor` / `trunc` into an index — i32 where
   PROVEN (integral and in range), f64 otherwise. Never visible in a program's output: a wrong
   proof is a silent-wrong bug, so each rule needs a test that drives the value out of range.
   **The owner's note (2026-10-26):** JavaScript carries type hints in COMMENTS (JSDoc,
   `/** @type {number} */`, read by TypeScript's `checkJs` and editors; a convention, not part of
   ECMAScript — the TC39 types-as-comments proposal was at Stage 1 when last known here). An
   optional comment hint could ask for an integer where inference cannot prove one, never
   changing what the program computes (decision N2).
5. **`undefined` for numbers** (sw144: optional parameters and fields; the corpus's two
   `@allow-output-diff` destructuring files): the new model must say how an f64 slot holds
   `undefined` (decision N3) — today a 0 sentinel.
6. **Exact float `%`** (sw145, absorbs sw146).
7. **`Math` stays correctly rounded in wasm** ("CR, in both" — compiled `Math` uses wasmtk's
   mathlib); without wasMath, the TypeScript side of a comparison is the ENGINE's `Math`, which
   JavaScriptCore (Bun) and V8 round differently by 1 ulp on some inputs (measured 2026-10-13: 2
   programs). That is decision M2/M4 reopened (below).
8. **A benchmark set**: a handful of compute-bound programs (numeric loops, array kernels, string
   building, recursion) run long enough to time, typed vs plain, before and after integer
   inference.
9. **The corpus migrates once**: `type i32 = number` and the wasMath type imports go
   (`corpus_matrix.ts`'s rewrite is the start of the migration script), the 18 wasMath-calling
   programs are rewritten or retired, together with P6's harness port.

## The Bun transition, refreshed (deno-exit-plan.md is the full plan; what changed)

- **P0: DONE 2026-10-26** (the harness above; the baseline above).
- **The precondition is met:** universal-wasm-loader-js is at 1.1.1 on JSR and npm with
  provenance, runs on Bun / Node / Deno, bundles for the browser, no `@std` (its
  `cmem/open-work.md`, read 2026-10-26; a real headless-browser RUN is still unmeasured there, as
  in binaryang). P2 / P6 no longer wait on it; whether bindgen's per-runtime loader code (the
  `--runtime` switch) delegates to it is a P2 design question.
- **Linting is Biome** (owner, 2026-10-13, recorded in the loader's `open-work.md`: "We are making
  the same switch for those projects also"); the loader's `linting.md` holds the verified rule map
  and the `"preset": "none"` trap. P4 = dprint matched to `deno fmt` + Biome.
- **The web (M1, M6, decided 2026-10-13) is IN scope, for the library**: wasic's core and
  binaryang are pure TypeScript (the seam gate proves the core has no host access), so compiling
  in a page through bytes-in / bytes-out APIs is realistic; the CLI, file reading / writing and the
  Go / Zig / Rust producers are not web features. Proof needed: one real headless-browser run.
- **REOPENED by the number direction: M2 and M4** (🗓️ owner). M4 said corpus lines that compare a
  transcendental `Math` value move to wasMath; with wasMath gone that answer is gone. M2 (Bun is
  the TypeScript reference) leaned on M4. Options: (a) the reference runs on V8 (Node 24), Bun
  and Deno legs compare too; (b) Bun stays the reference and `Math` lines compare within 1 ulp;
  (c) those lines leave the corpus (the `Math` exactness stays tested by `wasmath`-style batteries
  against a correctly rounded oracle, not against an engine).
- **Order (proposed):** P0 ✅ → the owner's decisions below → **wasic validates its output** (work
  item 2; independent, valuable today) → **P1** (the manifest to `jsr.json`; small, independent)
  → **the number build** (items 1, 3–7, with item 8's benchmarks first) **together with P6** (the
  corpus and the harnesses move once) → P2 (product on `node:` builtins, the web) → P3, P4, P7, P8.
  P5 (scripts) is done. Deno's runtime support ends ~2027-10; no date pressure inside that.

## Decisions for the owner

- **N1.** Build the number model (this file's work list), in the order above?
- **N2.** Integers: inference only, or inference plus an optional comment hint (JSDoc-style) for
  what inference cannot prove?
- **N3.** `undefined` in a number slot: how it is represented (a NaN payload, a side flag as the
  nullable fields have today, or refused for parameters).
- **N4.** wasMath: deprecated in the next minor, removed in the major that ships the model?
- **M2 / M4 (reopened):** which TypeScript reference, and how `Math` lines compare (a, b or c
  above).
