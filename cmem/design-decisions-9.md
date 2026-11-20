# design-decisions — part 9 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Tooling (continued)
- Go producer (CLI / build invariants — set 2026-06-07)
- Zig & Rust producers (CLI / build invariants — set 2026-06-07)
- Intentional fallbacks — NOT workarounds (do not "fix" or remove)
- Silent-stub audit (2026-06-05) — why a blanket "make stubs loud" was N

## Tooling (continued, 3)

  1. **The dependency change.** v2.0.1 is the first release built on the merged
     `@jrmarcum/binaryang` instead of `wabt-ts` + `binaryen-ts`. `usesNpm` stayed `true` across the
     boundary, so npm is still not the discriminator.
  2. **A JSR- or GitHub-side change** in the window since v2.0.0 — previously the leading hypothesis,
     refuted only as an explanation for why *other* packages were fine, never as a cause of a fix.
  3. Something else untracked.

  🎓 **The lesson is the sequencing, not the outcome.** For ten releases a green publish run was
  read as evidence of provenance; it never was. The verify step made absence visible, the cache-bust
  made presence *believable*, and only then did a PASS mean anything. **v2.0.1 is the first release
  where this answer could be trusted in either direction — and it is a pass.** Had the cache-bust not
  landed first, this result would have been indistinguishable from the false negatives that preceded
  it.

  **Next:** watch v2.0.2. One attested release after twelve absent ones is a data point, not a trend
  — if the cause is the dependency swap it will hold, and if it was environmental it may not.

- 🆕 **Three more suspects RULED OUT (2026-08-27), from the binaryang side.** Reported by the
  binaryang merge, which published three packages from this same scope on the same day and hit — and
  then did not hit — the same problem.

  1. ~~**A global JSR- or GitHub-side change is REFUTED.**~~ **WITHDRAWN 2026-10-23** (see the
     next entry): the three attested publishes below came AFTER the outage had ended for the whole
     scope, so they say nothing about the window. The original text: that was the standing leading hypothesis
     ("remaining suspects: JSR-side or GitHub-side changes in the 2026-07-03 → 07-09 window").
     `binaryen-ts@1.5.1`, `wabt-ts@1.5.1` and `binaryang@1.5.1` all published **attested** on
     2026-08-27 — `rekorLogId` 2618865672, 2618866200 and 2618802426. Provenance works on this
     account, this scope and this workflow shape today. **Whatever this is, it is specific to
     wasmtk.**
  2. **`usesNpm` is not it.** The JSR version metadata reports `usesNpm: true` on **both** sides of
     the boundary — v1.11.1 and v1.11.2 (attested) as well as v1.11.3 onward (not). The npm
     dependency is not the discriminator.
  3. **A cached/stale API read is not it either.** The absence was re-verified with cache-busted
     requests: v1.11.2 returns `rekorLogId` 2053916008, and v1.11.3, v1.11.5, v1.11.12 and v2.0.0
     all return null with `updatedAt == createdAt`. **The absence is real.**

- 🆕 **The outage was SCOPE-WIDE, outside this repo (binaryang letter, 2026-10-23; spot-checked
  here the same day).** binaryang read `rekorLogId` for every version of all five `@jrmarcum`
  packages published 2026-06-01 → 09-01:
  - **Every publish in the scope from 07-08 00:36 to 07-30 lacked provenance, 17 of 17**:
    binaryen-ts 1.3.6–1.4.3 (7) and wasmtk 1.11.3–2.0.0 (10). The last attested before it: wabt-ts
    1.3.5 and wasmtk 1.11.2, both 07-03 ~03:30–03:52.
  - Nothing in the scope published 07-31 → 08-24; from 08-25 every publish was attested (wabt-ts,
    binaryen-ts, binaryang, then wasmtk 2.0.1 on 08-27).
  - An earlier, shorter gap of the same shape, **06-10 → 06-11**: binaryen-ts 1.3.5, wabt-ts 1.3.3
    and wasmtk 1.6.5 all unattested, everything before and after attested.

  Re-read here, cache-busted (`api.jsr.io/scopes/jrmarcum/packages/wasmtk/versions/<v>`): 1.6.4
  (06-07) attested · **1.6.5 (06-11) none** · 1.7.0 (06-15) attested · 1.11.2 (07-03 03:52)
  attested · **1.11.3 (07-09), 1.11.12, 2.0.0 (07-30 22:26) none** · 2.0.1 (08-27), 2.0.3 attested —
  every figure as the letter gives it. **Conclusion:** the start falls between 07-03 03:52 and
  07-08 00:36 and the end between 07-30 22:26 and 08-25 00:06, in two independent repos at once, so
  the cause was outside both (JSR, GitHub's OIDC or Sigstore; the data does not say which). This is
  the 2026-07-30 suspect ("JSR-side or GitHub-side changes in the 07-03 → 07-09 window"), and
  candidate 2 of "we do not know why it came back". **Nothing in wasmtk has to explain the outage
  or its end**; it does not show the v2.0.1-era changes were unneeded — the cache-busted verify
  step stays, it is what makes a pass believable. "Specific to wasmtk" (item 1 above) is withdrawn.

- 🆕 **The verify step could not have been believed — it did not cache-bust. FIXED.** The JSR version
  endpoint is cached, and attestation is written a few seconds AFTER publish, so a plain re-read can
  keep returning the pre-attestation record for minutes.

  Measured on `wabt-ts@1.5.1`: **eight consecutive plain reads over ~3 minutes all returned null**,
  while a single cache-busted read returned `rekorLogId` 2618866200, written 4 seconds after publish.
  That release had provenance the whole time and was briefly reported as having none.

  For wasmtk the bug has been **masked by a true negative** — the step failed, and provenance really
  was absent — so it cost nothing so far. It would cost everything at exactly the wrong moment:
  **when provenance starts working again, the uncached step could still report failure**, hiding the
  fix. `publish.yml` now sends `Cache-Control: no-cache` and a unique `?cb=` per attempt.

  **The tell, worth knowing without any tooling:** an attested version has `updatedAt` a few seconds
  after `createdAt`. Equal timestamps mean not-yet-attested *or* never-attested, and only a
  cache-busted read tells those two apart.


## Go producer (CLI / build invariants — set 2026-06-07)

The Go command surface was deliberately shaped to mirror the TS commands' *meaning*. Do not silently
revert these (full rationale in [polyglot-producers.md](polyglot-producers.md)):

- **`wasic --lang=go` is REMOVED** — there is no standalone Go→WASI *compile* command (a bare WASI
  executable isn't merge/bindgen-consumable). The `wasic` case intercepts `--lang=go` and prints a
  pointer to `run`. The Go→wasip1 build lives ONLY inside `run`. Don't re-add it as a compile command.
- **`modc --lang=go` = WASI reactor library by default** (`-target=wasip1 -buildmode=c-shared`: no
  `_start`, exports `//go:wasmexport` funcs, callable via `wasmtk mod`/bindgen) — the Go analog of TS
  `modc` (library mode). The **browser** build (`-target=wasm`, syscall/js + `wasm_exec.js`) is opt-in
  via `--go-target=wasm`. Do NOT flip the default back to browser.
- **`run --lang=go` builds a wasip1 COMMAND** (`target: "wasip1"`, has `_start`) and runs it — NOT a
  reactor. It also **auto-detects** Go: a `.go` file or a dir containing `go.mod` routes to the Go
  build+run without `--lang=go`. The detection (`isGoRunTarget`) lives in `main.ts`, deliberately NOT
  in `gowasic.ts`, so a plain `wasmtk run x.wasm` doesn't import the Go module (which pulls in
  binaryen) just to decide.
- **`init --lang=go` defaults to a wasm LIBRARY scaffold** (`GoScaffold = "library" | "browser"`;
  templates `MAIN_GO_LIBRARY` / `MAIN_GO_BROWSER`). No flag needed for the library (the producer's
  primary output); `--go-target=wasm` scaffolds a browser project. The library scaffold is one file:
  `//go:wasmexport` funcs + a `func main` test harness (run with `run`, DCE-stripped by `modc`).
- **Reactor exports require `_initialize`** — `callExport` (`wasmtk mod`) and `runWasi`'s named-export
  path MUST call `exports._initialize()` (if present) before any export, or a reactor library traps
  (`unreachable`). No-op for runtime-free TS libraries. Don't remove.
- **Merge guards (loud-fail, `wasmmerge`)** — a module merged via `wasmbundle`/`.wasm`-import must not
  contain `call_indirect` (Phase 18 strips imported type sections → dangling ref) or `memory.grow` (a
  foreign growing-heap allocator that would corrupt the shared bump heap). Both throw clear,
  actionable diagnostics; wasmtk's own producers emit neither. Keep both guards.

## Zig & Rust producers (CLI / build invariants — set 2026-06-07)

- **Zig (`src/zigwasic.ts`, shell to `zig`):** `init --lang=zig`=library scaffold, `modc --lang=zig`=
  freestanding library, `run --lang=zig`=`wasm32-wasi` program on wasmtk's TS host. Two load-bearing
  details: (1) the scaffold **comptime-guards** the test `main`'s std I/O to `builtin.os.tag == .wasi`
  — Zig analyzes `pub fn main` even with `-fno-entry`, so an unguarded std-using main breaks the
  freestanding library build (`posix.getrandom` absent). (2) the library build passes
  **`--export=<name>` scanned from the root source** (`scanExportFns`), not `-rdynamic` (which also
  exports `main` as `_start`); falls back to `-rdynamic` only if no `export fn` is found. WASI triple
  is `wasm32-wasi`.
- **Rust (`src/rustwasic.ts`) — delegates fully to `rsxtk`** (do NOT reimplement via cargo). wasmtk
  wraps rsxtk: `init`→init, `initmod`→initmod, `modc`→`build … wasm`, `build`→`build … wasi`, `run`→
  run, `add`/`remove`/`list`/`fmt`/`clean`→same. **UPDATED 2026-07-28:** the Rust-exclusive verbs
  (`add remove list fmt clean`) need **no** `--lang` (implicitly Rust); `initmod`/`build` are now
  shared go/zig/rust verbs; `run`/`build`/`modc` auto-detect the language; only `init`/`initmod`
  still require `--lang` (see [polyglot-producers.md](polyglot-producers.md) § "UPDATED 2026-07-28"). Args are forwarded raw (command + `--lang` stripped) so
  rsxtk's own positionals/flags pass through; `modc`/`build` auto-append the rsxtk `build` TARGET
  (`wasm`/`wasi`). Prereq: `rustup target add wasm32-wasip1`.
- **Run auto-detect** (`detectRunLang` in `main.ts`, NOT the producer modules): `.go`/`go.mod`→go,
  `.zig`→zig, `.rs`/`Cargo.toml`→rust. Keep it in main.ts so a plain `wasmtk run x.wasm` never loads a
  producer module (binaryen / toolchain shell-out) just to decide.
- **WASI-import Proxy** (`makeWasiImport` in `src/utils.ts`): `runWasi`/`callExport` stub any
  unimplemented `wasi_snapshot_preview1` function (→ `()=>0`) so modules importing a fuller WASI
  surface (Zig/Rust std) instantiate. Don't revert to the fixed `wasiImports` object.
- **`binaryenOptimize`** lives in `src/binaryen.ts` (shared by Go + Zig). Don't duplicate it back into
  the producer modules.

## Intentional fallbacks — NOT workarounds (do not "fix" or remove)

These are deliberate design choices that can look like workarounds in a sweep. They are correct as-is;
removing them would break things. Listed so a future audit doesn't re-flag them.

- **~~`javyc` (QuickJS) as the interim dynamic runtime~~ — SUPERSEDED + DELETED v1.11.1.** wasmtk's
  OWN dynamic runtime (the `wasmtk:dynrt` interpreter, roadmap §7-#7 / dynrt-design.md) now covers the
  dynamic kernel (`eval`/`new Function`, pervasive `any`, open-prototype mutation). It's auto-merged on
  `: any`/`eval` in a `wasic` program, and `wasmtk dync` runs a whole fully-dynamic file through it —
  both with NO external Javy/QuickJS. `src/javyc.ts` and the Javy dependency were removed (#14 2h).
- **`npm:wabt` / `npm:binaryen` as fallback backends.** `deno.json` is the single switch; the JSR
  `/compat` packages are the default, npm is the always-available fallback for the migration's
  lifetime. Both code paths are intentional (see architecture.md).
- **Env-import no-op `Proxy` in the runner** (`utils.ts` `runWasi`): returns a `() => 0` stub for any
  `env` import a module declares but the host doesn't supply (Phase 40 externals). Lets
  `declare const`-importing modules instantiate under `wasmtk run` without a real host. By design.
- **`modc` drops non-`export` top-level statements.** Library mode emits only `export function`s; a
  runner `main()` / module-level code in a modc input is intentionally ignored (it's a library, not
  an executable). By design.
- **Bump allocator with no `free`.** Allocations live for the instance lifetime; this is the documented
  DLL memory model (singleton or pool, see vision.md), not a leak to fix.

## Silent-stub audit (2026-06-05) — why a blanket "make stubs loud" was NOT done

The class-construction gaps were hard to find because the compiler emits silent comment-stubs
(`(;? … ;) 0` in `emitExpr`, `(;; … ;)` in `emitStatement`, and the `emitStringAssign`
complex-expression stub) for code it doesn't fully handle. The obvious fix — route all three to the
`this.diagnostics` channel (which **hard-aborts** the compile) — was **measured and rejected**:
temporary instrumentation logged **77 stub hits across the currently-passing suite**, almost all
**benign**: (a) discriminated-union type-declaration continuation lines (`| { kind: "rect"; … }`) and
multi-line literal element lines reaching `emitStatement` after the type/literal is already parsed
(genuine no-ops); (b) **speculative/pre-scan `emitExpr`/`emitStatement`/`emitStringAssign` calls whose
result is discarded** (e.g. type inference, the `s = "["; for(…)` string-gather mega-lines). The real
emission for those uses correct paths — the tests produce correct output. So a blanket abort would
break valid programs, and a blanket warning would flood noise people learn to ignore. **The stub
fallbacks are deliberate, load-bearing tolerance — keep them.**

The audit DID surface one genuine silent wrong-answer: the chained `s.at(i).charCodeAt(j)` fell to the
expr stub and returned 0 (the plain `charCodeAt` handler only matches a `\w+` receiver). **Fixed**
2026-06-05 with a targeted `atChainMatch` handler in `emitExpr` (norm-index → `$__str_char_code_at`).
Bare `.at()` in other contexts is already handled by the string paths (emitStringAssign /
emitStringPtrLen / parseSingleArg).

RULE going forward: when adding a NEW feature path, prefer pushing a `this.diagnostics` entry (which
aborts) over a silent stub — but do NOT retro-fit aborts onto the existing catch-all stubs (they
absorb benign remnants + speculative calls). For genuinely-broken merges, fail loudly: `wasmmerge`
throws on `call_indirect` inside a merged module (Phase 18 strips imported type sections, so the
table/type ref would dangle), and `main.ts` surfaces thrown errors as a clean `❌ wasmtk:` line.

