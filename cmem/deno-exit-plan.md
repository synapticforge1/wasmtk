# Leaving Deno, staying on JSR: wasmtk's migration plan (SCOPE, 2026-10-13)

**Status: scoped, nothing started.** Source: binaryang's `cmem/jsr-deno-exit-guide.md` (read
2026-10-13; findings F1–F11, steps § 4, the "both Bun and Node, Bun main" decision § 5, binaryang's
recipes § 5a, npm as a second registry § 5b). This file holds what is SPECIFIC to wasmtk: the
re-measured facts, the decisions only the owner can make, and the order of work. Every number has
a date; re-measure before acting on one.

**Why:** Deno's runtime development ends around 2027-10 (the team joined Cloudflare, 2026-10-09);
JSR keeps running. **Owner, 2026-10-12** (for all `@jrmarcum` packages): move development off
Deno toward Bun; JSR stays the source; "code that runs on both, but bun as the main runtime".

## What was measured (2026-10-13, Deno 2.9.7, Bun 1.4.3, Node 22.23.3 / 24.21.0 / 26.11.1, Windows 11)

Scratch scripts (`scratchpad/migr/`: `survey.ts`, `runwasi.mjs`, `engines.ts`, `tsref.ts`); turn
them into repo scripts in phase P0.

1. **The guide's wasmtk survey counted `upstream/`** (the gitignored binaryang co-development
   checkout, 285 files). Without it: **`Deno.test` 15 (2 files, not 506), `@std/testing/bdd` 0
   (not 133), shipped `enum`s 0, shipped `jsr:` / `npm:` prefixes in source 0** (every
   dependency goes through `deno.json`'s import map by bare name). Worth telling binaryang via the
   workspace (a handoff note; nothing is written there from here).
2. **Shipped code (`main.ts`, `src/*.ts`, `src/wasm/*.ts`, 26 files) calling Deno:** `main.ts` 31
   lines (`Deno.exit` ×28, `Deno.args`, `Deno.build`, **`Deno.dlopen`** of kernel32 for the Windows
   UTF-8 console), `src/rt.ts` 22 (the runtime layer), `src/jstyper.ts` 6, `src/wast.ts` 2.
   Everything else already goes through `rt`. **`src/rt.ts` already has a Bun branch, but it
   calls `Bun.*`** (`Bun.file`, `Bun.write`, `Bun.spawn`): the guide's rule is `node:` builtins,
   which also run on Deno, so one branch serves all three. One constructor parameter property
   (`src/wast.ts:65`) blocks `erasableSyntaxOnly`.
3. **Dependencies (import map):** `@std/cli/parse-args`, `@std/path` (JSR-only), binaryang 1.8.1
   (`compat/wabt`, `compat/binaryen`, `wasm-validate`), `npm:wasm2js`. **Three version sources:**
   `deno.json`, `package.json` (2.0.3, with a `bin` JSR does not publish, F4) and `src/utils.ts`
   (propagated by `scripts/sync-version.ts`).
4. **wasic's OUTPUT runs the same everywhere:** all 410 compiled corpus modules, through one WASI
   host written on `node:` builtins, gave identical exit codes and output on **Deno, Bun
   (JavaScriptCore), Node 22, 24 and 26** (410 / 410 each; legacy exception handling included).
   The guide's engine warning (F10) is about the spec testsuite's proposal features, which wasic
   does not emit; it still applies to `wast_tests` and the engine cross-check (below).
5. **The TypeScript reference** (the wasi suite's `run-ts`, which `runWasi` runs as
   `deno run -A x.ts`) on the 453 corpus programs:
   - **Bun: 447 / 453 the same as Deno.** The 6: `18_DenoExitNonZero` (calls `Deno.exit`),
     `18_Multi-ScopeScaleAndMemoryLongevityTest` (imports a `.wasm` directly: F11, Bun cannot);
     `13b_ZeroCostExceptions` and `6d_Multi-DimensionalArrays` (**Bun's `console.log` of an object
     or nested array is laid out differently**: multi-line where Deno is one line; wasic's printer
     follows Deno's layout); `38_MathEdgeCasesL3` and `67_TrigCorrectlyRounded` (**JavaScriptCore's
     `Math.tan` / `Math.sin` differ from V8 by 1 ulp** on inputs where V8 happens to be correctly
     rounded).
   - **Node 24 and 26: 432 / 453.** 16 fail before running: `enum` (10) and `namespace` (6) are
     not erasable, and Node only strips types. Those are wasic INPUTS the corpus must keep. The
     rest: the same `Deno.exit` and two output differences.
6. **CI today is one workflow, `publish.yml`.** No gate runs in CI; the gate is local.

## What Deno does for wasmtk today: five roles, each moves differently

| role | today | moves to | phase |
| --- | --- | --- | --- |
| A. the PRODUCT's runtime: `wasmtk` CLI and the library exports | `Deno.*` in 4 shipped files; installed with `deno install -g` | `node:` builtins; runs on Bun, Node and Deno | P2 |
| B. the TypeScript REFERENCE in the suites (`run-ts`, "same value in TS and wasm") | `deno run -A x.ts` | owner's call, **M2** | P6 |
| C. the ENGINE ORACLE (`wast_tests` with `--v8-flags`, `engine_cross_check`) | Deno's V8 15.0 | a pinned Node through fnm (binaryang's `scripts/v8.ts` pattern) | P6 |
| D. the TOOLCHAIN: check, fmt, lint, tasks, 15 scripts and ~40 test harnesses using `Deno.*` | `deno check` / `fmt` / `task`, `Deno.Command`, `Deno.test` | `tsc` 7, dprint, Biome, `package.json` scripts on `node:` | P3–P6 |
| E. PUBLISHING to JSR | `scripts/publish.ts`, `publish.yml`, `deno publish` | stays `deno publish --config jsr.json` (F2; the one Deno dependency nobody can remove yet) | P1, P7 |

## Decisions for the owner

**Decided 2026-10-13 (owner):** M1 "bun, deno, node lts current versions, and web"; M5 "the
users will install via the bun, node, deno instructions on the jsr"; M6 yes; M7 "for
compatibility yes". Then, the same day: **M3 and M4 as recommended**, and **M2: "bun runtime"**.
**Every decision M1–M7 is settled**; P0 can start when the owner says so.

- **M1. DECIDED: Bun, Deno, every CURRENT Node LTS line, and the web.** Bun is the main runtime
  (2026-10-12). "Current LTS" is read from Node's own schedule, never a hand list (§ 5a); on
  2026-10-13 that is 22 and 24, with 26 becoming LTS on 2026-10-28. Deno is a SUPPORTED runtime,
  not only the publisher, so its CI leg stays. "Web" makes M6 part of P2.
- (was) The guide's default: Bun and every current Node LTS,
  Bun main; keep a Deno leg while consumers use Deno.
- **M2. DECIDED (owner, 2026-10-13): Bun is the TypeScript reference** (`run-ts` and every
  "same value in TypeScript and in wasm" comparison), with Node LTS and Deno legs in CI comparing
  the same outputs. `runWasi` of a `.ts` runs `bun x.ts` when the reference is asked for. The
  reasoning: with M3 and M4 decided, **Bun works as the reference**: of its 6 differences, 2
  are layout (M3), 2 are `Math` (M4), and the other 2 are corpus programs to fix anyway
  (`18_DenoExitNonZero` calls `Deno.exit`; `18_Multi-Scope…` imports a `.wasm`, which Bun cannot,
  F11). Node 24 on pre-compiled code still needs the transpile step for enums and namespaces.
  Updated recommendation: **Bun as the reference** (it runs wasic's input as written, and it is
  the main runtime), with a Node 24 and a Deno leg in CI comparing the same outputs. The original
  analysis follows.
- (analysis) **Which runtime is the TypeScript reference** (what "the same value in TypeScript and in
  wasm" is measured against). Measured above:
  - **Bun:** runs every corpus program as written (enums included), but its `console.log` object
    layout and its `Math.sin` / `tan` differ from Deno's: 2 + 2 programs.
  - **Node 24 (V8, as Deno):** `Math` and the console layout agree with Deno, but enums and
    namespaces need a transpile step first (Bun's or tsc's emit, then `node`).
  - **Recommended: Node 24 on transpiled code** for the reference, so every value the corpus has
    checked against V8 stays checked against V8; Bun runs everything else. Then decide wasic's
    console layout (M3) and whether plain-`Math` corpus lines move to wasMath (M4).
- **M3. DECIDED (owner, 2026-10-13): wasic keeps the Deno / Node layout.** A Bun run shows the
  same values with Bun's spacing; documented, and a test that compares against a Bun run compares
  whole-object / nested-array lines ignoring layout (whitespace and a trailing comma), never the
  values. The analysis follows.
- (analysis) **Whose `console.log` layout for objects and nested arrays** wasic copies. Today Deno's.
  Measured 2026-10-13: **Deno, Node 24 and the compiled wasm print `{ value: 5, hasError: 0 }`
  and `[ [ 1, 2, 5 ], [ 3, 4 ] ]` on one line; Bun prints the object over four lines (with a
  trailing comma) and the nested array over three.** The values are the same; only the layout
  differs. If Bun becomes the reference, either wasic follows Bun, or those lines are compared
  modulo layout.
- **M4. DECIDED (owner, 2026-10-13): corpus lines that compare a transcendental `Math.*` value
  between TypeScript and wasm move to wasMath's `f64.*`**, which runs the same correctly rounded
  library in every runtime, so they agree by construction. Measured: `38_MathEdgeCasesL3` and
  `67_TrigCorrectlyRounded` differ on Bun (`Math.tan(-1e22)`: V8 and wasm `…988`, JavaScriptCore
  `…99`). The README's "plain `Math` in Deno may differ by 1 ulp" becomes "in your runtime". The
  analysis follows.
- (analysis) **Plain `Math` in the corpus.** Under "CR, in both" wasMath is the promise; plain `Math` in a
  JS runtime is that engine's own. JavaScriptCore differs from V8 on 2 programs measured. Move
  those lines to `f64.*` (then every runtime agrees, since wasMath runs the mathlib), or keep
  them and run the reference on V8.
- **M5. DECIDED: users install through JSR's own instructions** for Bun, Node and Deno (`bunx jsr
  add`, `npx jsr add`, `deno add jsr:`; F3). The README's install section shows those, then ONE
  bare import line, and says how to run the CLI on each runtime (with no `bin` on JSR's npm
  layer, F4: `bun node_modules/@jrmarcum/wasmtk/main.js …` / `node …`, a `package.json` script, or
  `deno run -A jsr:@jrmarcum/wasmtk@<version>`, pinned because of F9). No npm registry copy.
- (was) **How users install the CLI.** JSR's npm tarballs carry no `bin` (F4), so
  `deno install -g` has no direct equivalent. Options: document `bunx` / `npx` with the module
  path, a `package.json` script, or npm as a second registry (§ 5b) with a real `bin`. The
  guide's npm plan for binaryang is PARKED by the owner; wasmtk depends on binaryang, so it
  cannot go to npm before binaryang does.
- **M6. DECIDED: yes, every library export loads in a browser** (binaryang's § 5a "The web":
  no top-level runtime `node:` import anywhere in shipped code, CLI included; `node:` only inside
  functions through `await import`; `bun build --target=browser --external 'node:*'` over every
  export in CI PLUS the source-level portability check, both proven against a used `node:fs`
  mutant; bytes-in / bytes-out APIs beside path-taking ones). New scope inside P2. Expect work:
  `wasic` / `modc` read files, spawn backends and write outputs, and `src/rt.ts` imports
  `node:process` at the top today.
- **M7. DECIDED: keep the Windows UTF-8 console fix, for compatibility** (`main.ts`,
  `SetConsoleOutputCP(65001)` through Deno's FFI). It stays as a Deno-only, feature-detected
  branch (`typeof Deno !== "undefined"`), so Bun, Node and the web never reach it; whether Bun and
  Node need an equivalent is to be measured on a Windows console in P2.

## Loading `.wasm` on Bun, Node and the web: universal-wasm-loader (owner, 2026-10-13)

**Owner: "I am intending to use the universal wasm loader project to address the bun, node, and
web import issues with wasm files."** (F11: a direct `.wasm` import works on Deno and Node, not on
Bun, and is not generally available in browsers.) wasmtk does not solve this itself; it CONSUMES
the loader. Two meanings of "a `.wasm` import" in wasmtk (grep, 2026-10-13):

- **Compile-time, unaffected:** wasic / modc input that writes `import { f } from "./lib.wasm"`
  (the `wasm_wasi_bundle/*/main_wasic.ts` programs, `18_bundle`, the Go leaf driver). wasic
  merges the module at COMPILE time; no runtime ever loads that file.
- **Run-time, the loader's job:**
  - the TypeScript reference run of those programs (the wasi suite SKIPS `run-ts` for them
    today: ".wasm imports require modc-prereq") and `18_Multi-Scope…`, the one corpus program that
    imports a `.wasm` while running;
  - **bindgen's generated loader** (`src/bindgen.ts` `genLoadModule`, `--runtime deno | node |
    bun`): it writes its own instantiate + WASI-shim code per runtime, which is what
    universal-wasm-loader does; the candidate to delegate (or to emit code that calls the loader);
  - the bindgen host fixtures (`tests/module/bindgen_fixtures/*_host.ts`): to be read for how they
    load their module.

Consequences for the order: universal-wasm-loader's work lands FIRST (the owner's next project
after binaryang); wasmtk then takes it as a JSR dependency in P2 / P6. Until then the runtime
`.wasm` cases stay Deno / Node only and are marked so (not counted as Bun failures). Questions for
when the loader's API is known: does `bindgen` keep a `--runtime` switch, or emit one loader-based
form for every runtime and the web; does the loader carry the WASI preview-1 shim that
`genLoadModule` and `src/utils.ts` `runWasi` each implement today (three copies of it in wasmtk
counting the dync host).

## The order of work (each phase its own branch, through the full gate, merged locally)

- **P0. Measurement harness.** Turn the scratch scripts into `scripts/migr/`: the runtime survey,
  the cross-runtime WASI run of the corpus (410 / 410 today), the TypeScript-reference comparison
  (Bun 447, Node 432 today). They are the baseline every later phase is held to.
- **P1. `jsr.json` is the one manifest** (F1): move `name` / `version` / `license` / `exports` /
  `publish` out of `deno.json`; drop `version` and `bin` from `package.json`; point
  `sync-version.ts`, `bump.ts`, `publish.ts`, `api-surface.ts` and `publish.yml` at it; publish
  with `--config jsr.json`; a test that fails if `deno.json` carries `name` or `version` again.
  **Done when** `deno publish --dry-run --config jsr.json` lists the same files as before.
- **P2. The product runs on Bun, Node and Deno.**
  - `src/rt.ts` on `node:` builtins only (no `Bun.*`, no `Deno.*` except feature-detected where
    Deno behaviour must stay); `main.ts` on `process.argv` / `process.exit` / `process.platform`,
    `src/jstyper.ts`, `src/wast.ts`. Mind the conversion traps the guide lists (pooled `Buffer`
    from `readFile`, `Dirent.isFile()` a method, `child_process` env REPLACES, `process.execPath`
    plus `execArgv`).
  - `runWasi` of a `.ts` runs it with the CURRENT runtime (`bun x.ts`, `node x.ts`), not
    `<execPath> run -A`, which is Deno's syntax.
  - Dependencies by bare name for every runtime: `@std/path` → `node:path` (and `parseArgs` from
    `node:util`), so nothing shipped needs JSR at run time (a precondition of npm coverage, § 5b);
    binaryang through `jsr add` (`npm:@jsr/jrmarcum__binaryang`); `wasm2js` from npm.
    **Measure first** how JSR's npm tarball rewrites an import-map specifier (the guide did not).
  - The constructor parameter property in `src/wast.ts` → `declare readonly` + assignment
    (erasable TypeScript, § 5a).
  - **Done when** the CLI on each runtime (Bun, Node 22 / 24 / 26, Deno) gives byte-identical
    output for every command over a fixture set, and golden-WAT is identical when the compiler
    runs on each of them.
- **P3. Project files:** `package.json` (dev dependencies only), `bunfig.toml` (has the `@jsr`
  scope already), `tsconfig.json` with `erasableSyntaxOnly`, `types: ["node"]`, `@types/node`
  pinned to the Node floor; a lockfile (generate on NTFS: Bun cannot write `bun.lock` on exFAT).
  **Done when** `tsc --noEmit` accepts what `deno check` accepts.
- **P4. Format and lint:** dprint matched byte-for-byte to `deno fmt` (plugin versions from
  Deno 2.9.7's `Cargo.lock`; count the file scope first; a canary), Biome with
  `"preset": "recommended"` written by hand, `useAwait` / `noVar` on, a lint canary (binaryang's
  `scripts/check-lint-canary.ts` / `check-fmt-canary.ts`). `cmem/` stays unformatted (owner rule).
- **P5. Scripts** (15 files with `Deno.*`, 109 lines; 13 spawn `deno`) on `node:` builtins, each
  compared with its Deno run before the switch. The repro verifier and the wasMath batteries spawn
  `main.ts` through `Deno.execPath()`: they become `process.execPath` + the entry path.
- **P6. Tests.**
  - The suite harnesses (`tests/*_tests.ts`, 36 files with `Deno.*`, 259 lines; 16 spawn `deno`)
    on `node:` builtins; `hybrid_tests` / `wasmmerge_guard_tests` (`Deno.test`, 15) → `node:test`
    + `@std/expect` (F6).
  - The reference runner per M2; the corpus's `18_DenoExitNonZero` (rewrite with
    `process.exit`) and `18_Multi-Scope…` (a direct `.wasm` import: runs on Node and Deno only, so
    mark it, or load the bytes, F11).
  - The engine oracle (`wast_tests`, `engine_cross_check`) on a pinned Node through fnm. ⚠️ The
    wast baseline (64,506 / 0 / 16) was measured on Deno's V8 15.0; Node 24 is V8 13.6 and
    Node 26 is V8 14.6. **Re-baseline deliberately**, per proposal, as binaryang did
    (`scripts/proposals.ts` engine per row): a wide-arithmetic or custom-descriptors row may
    need a different engine.
  - **Stop installing to test.** The suites call the globally installed `wasmtk`, which is why
    "reinstall before testing" is a rule; run the repo's `main.ts` through the current runtime
    instead, and the stale-binary trap disappears.
  - **Done when** every suite's counts match its last Deno run, on Bun and on the Node LTS lines.
- **P7. CI and the release path:** a gate workflow (there is none) with Bun, the Node LTS lines
  from Node's own schedule (§ 5a), and a Deno leg; publishing stays `setup-deno` +
  `deno publish --config jsr.json`. Prove it with one real release and check provenance
  (`rekorLogId`). This is the only step that cannot be undone (a JSR version is permanent).
- **P8. Delete `deno.json` and `deno.lock`**, drop `--config jsr.json`; the `deno task` entries
  are `package.json` scripts by then; `CLAUDE.md`'s "reinstall before testing" rule is retired.

## Ordering against other work

- The **3.0.0 release** is decided (MAJOR) and independent; releasing it BEFORE P1 keeps the
  release path as it is today. P1 then lands on a clean base.
- **binaryang** is mid-migration; P2's dependency route depends on how binaryang ships (JSR's npm
  layer now; npm itself only if the owner un-parks it).
- **universal-wasm-loader** is the owner's next project after binaryang (2026-10-12: "since wasm is
  not directly importable … our next project needs to be the universal wasm load project"), and
  **wasmtk's run-time `.wasm` loading goes through it** (owner, 2026-10-13; § "Loading `.wasm`"
  above). It lands before wasmtk's P2 / P6 touch those paths.
- The open compiler work (D3, D6, sw62, the loud rows) does not depend on this; P2–P6 change the
  harness around it, so finish an open compiler batch before starting a migration phase.
