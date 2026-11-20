# Polyglot producer congruence + ABI / P2 posture

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 4.** The sections continue in:

- [polyglot-producers-2.md](polyglot-producers-2.md): from "VERIFIED: native-producer mergeability — allocation is the gate, allocator-contr"
- [polyglot-producers-3.md](polyglot-producers-3.md): from "ADR: Go → wasm ingestion path — TinyGo producer, WASI-first, run via wasmtk host"
- [polyglot-producers-4.md](polyglot-producers-4.md): from "ADR: Go → wasm ingestion path — TinyGo producer, WASI-first, run via wasmtk host"

> Added 2026-06-03. Authoritative, portable memory (this folder supersedes the gitignored
> machine-local `CLAUDE.md`). Links: [architecture.md](architecture.md) (Canonical ABI / build
> pipeline), [roadmap.md](roadmap.md) (execution order), [vision.md](vision.md) (polyglot
> ecosystem).

## UPDATED 2026-07-28 — unified producer verbs + `--lang` auto-detect + Go browser removal

> **This section supersedes the per-producer command tables further down** (which described the older
> shape: `init`→library, `--go-target=wasm` browser build, rust-only `initmod`/`build`). Owner
> directives, all shipped this session (code in `main.ts`, `src/gowasic.ts`, `src/zigwasic.ts`):

- **Same verbs across every producer (the Rust model).** `init` = scaffold a **WASI program**
  (`func main` / `pub fn main` / rust script); `initmod` = scaffold a **wasm library** (exports, no
  entry point); `build` = compile a WASI program → standalone `.wasm` (no run); `modc` = compile a
  wasm library → `.wasm`; `run` = build + run. Go/Zig gained program scaffolds (`MAIN_GO_PROGRAM`,
  `MAIN_ZIG_PROGRAM`) and a `GoScaffold`/`ZigScaffold` `"program"|"library"` param; `initmod` now
  branches to go/zig (not just rust).
- **`--lang` is OPTIONAL for `run`/`build`/`modc`** — auto-detected from the target: a `.go`/`.zig`/
  `.rs` file, or a directory with `go.mod`/`Cargo.toml`. Implemented via a shared `effLang` in
  `main.ts` (`= explicit --lang ?? detectRunLang(langPath)` for those three verbs). `init`/`initmod`
  still REQUIRE `--lang` (nothing to detect from). `detectRunLang` (already used by `run`) is now the
  single source of truth. `run <dir>` with no `go.mod`/`Cargo.toml` → a clear "no Go/Rust project
  found" error (instead of a cryptic wasm-instantiate failure).
- **Rust-exclusive verbs need no `--lang`.** `add`/`remove`/`list`/`fmt`/`clean` are implicitly Rust
  (only Rust uses them) — `delegateRust` skips the `--lang=rust` guard for them, and `isProducerCmd`
  treats them as producer commands so bare `wasmtk fmt` reaches rsxtk instead of the help screen.
  `initmod`/`build` were moved OUT of the "rust-only" set (they're now shared go/zig/rust verbs).
- **Go browser scaffold REMOVED (owner: use the universal wasm loader instead).** Deleted the
  `"browser"` `GoScaffold`, the `"wasm"` `GoTarget`, `MAIN_GO_BROWSER`, and `copyWasmExecJs`;
  `GoTarget` is now `"wasip1" | "reactor" | "leaf"`. `init`/`modc --go-target=wasm` now ERROR with a
  pointer to `@jrmarcum/universal-wasm-loader` (a `goBrowserRemoved()` helper). `--go-target=wasm-unknown`
  (the alloc-free mergeable leaf) is KEPT. wasmtk produces only WASI modules now; browser consumption
  is the universal loader's job.
- ✅ **UPDATED 2026-09-28 — Go and Zig now auto-emit a `.wit`** (owner: every `.wasm` passed through an
  optimise or WAT→WASM step gets one). `src/witgen.ts` derives it from CORE signatures after the
  build: Zig `modc`, Go `modc`/`build`, plus `wasmbundle`, `convert x.wat`, `wasic x.wat`. It never
  overwrites a hand-written or `wasic`-generated `.wit` (so `strlib.wit`'s `string`s survive), and
  it lists untranslatable exports in a `// skipped` comment. TinyGo's libc/float runtime exports
  are filtered. **Rust is outside the rule:** rsxtk optimises its own output, so none of it passes
  through wasmtk's optimiser. Zig `build` (not optimised) and every `run` write none, and neither
  does a module with no interface to describe (only `_start`), matching the 2026-07-28 judgement that
  an empty-world `.wit` is noise (dync stopped writing one then). The correction below was accurate
  until then.
- **(superseded 2026-09-28) CORRECTION — Go/Zig/Rust do NOT auto-emit `.wit`.** Only the TypeScript path (`wasic`/`modc`,
  Phase 41 `generateWit`) auto-writes a `.wit`. The Go `bindgen` flow uses a **hand-written** `.wit`
  (e.g. `tests/go_fixtures/strlib/strlib.wit`); `bindgen` itself is language-agnostic (consumes any
  `.wit`), but `.wit` PRODUCTION for the producers is still ⏳ (the "producer WIT emission" roadmap
  item). Earlier notes implying Go emits `.wit` were wrong.

## Project goal — one congruent polyglot wasm capability

**wasmtk's goal is to unify the TS/JS, Rust, Zig, and Go toolchains into a single congruent wasm
build capability.** Point wasmtk at source in any of those languages and get a wasm artifact that
flows through one shared downstream contract — not five disjoint toolchains bolted together, but
heterogeneous _producers_ converging on a homogeneous middle/back end wasmtk already owns.

### The congruence (the shared contract all producers target)

- **Output:** core wasm module targeting **WASI Preview 1** (imports `wasi_snapshot_preview1`), or
  freestanding with a defined wasmtk import set.
- **ABI:** canonical-ABI marshalling via **bindgen** (auto-emitted `.wit` → typed TS host bindings).
- **Optimize/transform:** **binaryen-ts** (`-Oz` and passes).
- **Link/merge:** **wasmmerge / wasmbundle** (WAT-level merge into one module; shared linear memory,
  symbol prefix-mangling, data-section relocation).
- **Host/run:** wasmtk TS side is the **WASI host**; the `run` multi-format executor drives it.

Each language is a producer plugin; only the front end differs. Everything from optimize → merge →
host is the same code path, so adding a language = adding a producer, not a toolchain.

### Rust producer = `rsxtk` (owner's Rust-side toolkit, 2026-06-03)

**`rsxtk`** (crates.io: <https://crates.io/crates/rsxtk>; repo `synapticforge1/rsxtk`, moved from `jrmarcum` 2026-10-20; v0.4.4 2026-04-20;
MIT OR Apache-2.0) — _"A high-performance Rust WASM Toolkit for managing and running WASI scripts,
WAT, and WASM modules."_ This is the owner's Rust counterpart to wasmtk and is **the Rust producer's
build+run driver**. Run individual Rust files as scripts with dependency management + WASM compile.

- **Builds** Rust → **`wasm32-wasip1`** (the exact congruent contract), with `.cwasm` (native
  machine-code) pre-compilation for fast repeat runs. Also handles `.wat`/`.wasm`.
- **Runs** in a WASI sandbox via **wasmtime (~v40.x)** with disk caching; "smart entry" tries
  `_start` (WASI command) or lists/calls exported functions (library mode with CLI args).
- Subcommands: `init`, `run`, `csrun` (native via Cargo scripting), `build`, `add`, `remove`,
  `list`, `fmt`, `clean`, `resource` (`rsc/` assets), `build.rs` support.
- **No WIT / bindgen / component-model** — so interface generation + canonical-ABI marshalling
  remain **wasmtk's** job; rsxtk is the producer + native runner.

**Division of labor — RESOLVED 2026-06-07: delegate fully to `rsxtk`** (shipped, `src/rustwasic.ts`;
see "SHIPPED 2026-06-07" section below). rsxtk owns Rust _build + deps + native (wasmtime) run_;
wasmtk wraps its commands and still owns the _optimize (binaryen-ts) → merge (wasmmerge) →
WIT/bindgen_ tier (bindgen for Rust deferred). The earlier open question (delegate to rsxtk vs.
wasmtk shelling to `rustc`/`cargo` directly) was decided in favor of **delegation** — reuses rsxtk's
cargo/dep/cwasm machinery; `run --lang=rust` uses rsxtk's wasmtime runner (not wasmtk's TS host).
Still distinguish `rsxtk` (a build/run **CLI toolkit**) from the planned `universalWasmLoader-rs` (a
**library loader** implementing the loader SPEC) — adjacent, not the same; they may converge later.

### Producer → contract mapping

- **TS (typed subset):** `wasic` — direct TS → optimized WAT → wasm, no JS runtime. (existing)
- **TS/JS (dynamic):** `dync` — the whole program runs through wasmtk's OWN embedded dynamic runtime
  (`wasmtk:dynrt`), no external Javy/QuickJS. (`javyc`/QuickJS was deleted v1.11.1.)
- **Zig:** `zig build-exe -target wasm32-wasi` (or freestanding). Cleanest native path.
- **Rust:** build/run driver is **`rsxtk`** (jrmarcum's Rust WASM toolkit — see note below), which
  compiles Rust → `wasm32-wasip1` and runs it; underneath it's `rustc` `wasm32-wasip1` (WASI 0.1;
  the old `wasm32-wasi`, renamed in Rust 1.78, removed under the old name in 1.84). Use **Zig as the
  linker** for crates with native deps (cargo-zigbuild pattern). rustc does its own LLVM wasm
  codegen; Zig fills the link role.
- **Go:** **TinyGo** `tinygo build -target=wasip1` → WASI P1 core module (canonical producer; small
  output, clean wasip1/reactor targets). Library/`modc` analog = reactor exports via
  `//go:wasmexport` (or `-buildmode=c-shared`), no `_start`. Stdlib `GOOS=wasip1 go build` is a
  heavier optional fallback (full Go runtime/GC → large binaries). (per ADR below)

### Scope boundary — pin the contract to WASI Preview 1 / core modules (for now)

**None of the native producers emit WASI Preview 2 / components natively, except Rust.** Ecosystem
norm, not a per-toolchain gap:

- **Zig:** stdlib still targets WASI P1; emits a single core module. P2 only via post-compile
  adapter (`wasm-tools component new --adapt wasi_snapshot_preview1.wasm`), scriptable in build.zig.
  (confirmed 2026-06-03)
- **Rust:** the one exception — `wasm32-wasip2` is native P2 (tier-2 since Rust 1.82, Oct 2024).
  `wasm32-wasip1` is still P1 + adapter.
- **Go (TinyGo):** primarily P1 (`-target=wasip1`), but recent TinyGo (~0.33+) also has a native
  `-target=wasip2` — so, like Rust, it's a native-P2-capable producer. Same rule as Rust: keep it
  behind the P1-merge contract; only emit P2 as the deliberate terminal path, not into a P1 merge.
- (WASI 0.2 "P2" stable since early 2024; latest 0.2.x as of mid-2026. P3 = async/threads, later.)

**This confirms the architecture rather than threatening it.** The whole ecosystem builds components
by starting from a P1 core module and adapting it. Pipeline: producers emit **P1 core modules** →
**wasmmerge** merges at P1 (shared linear memory) → **binaryen-ts** optimizes → _then optionally_
one terminal `wasm-tools component new --adapt` wraps the single merged module into a P2 component.

The earlier "components can't be merged" tension only bites if you try to wasmmerge already-built
**components** (each encapsulates its own memory → use `wac` for that). Merging P1 modules and
componentizing the **result** at the end is fine. So **P2 is a final optional wrap step, not a
merge-tier rewrite.** Keep the congruent contract at P1 core modules; treat componentization as a
terminal stage. Only Rust's `wasm32-wasip2` would bypass the merge tier — decide deliberately before
mixing native-P2 output into a P1-merge flow.

## VERIFIED: wasmtk's own output is NOT a Component Model / P2 producer (2026-06-03)

Confirmed by direct inspection of wasmtk output (`strings_rep.wasm` from `modc`, `wasi_rep.wasm`
from `wasic`), using `jco`/`wasm-tools` + byte parsing. wasmtk emits **WASI Preview 1 core modules

- a sidecar `.wit` schema + TypeScript host glue (bindgen).**

* **Container:** core module, layer 0 (header `00 61 73 6d 01 00 00 00`, top form `(module`). A
  component is layer 1 (`00 61 73 6d 0d 00 01 00`, top form `(component`). Output only becomes a
  component after an _external_ `wasm-tools component new` / `jco new` wrap.
  - NOTE: `wasm-tools validate --features component-model` is **non-discriminating** — a core module
    passes it too (the flag enables component parsing, doesn't require a component). Decisive checks
    are the byte header (layer word) + top form.
* **WIT:** sidecar file only; **not embedded**. No component-type custom section (`jco wit` yields
  an empty `world root {}`). The interface lives in the `.wit` consumed only by our TS bindgen.
* **Canonical ABI:** calling-convention aligned (param + return), container deferred. `cabi_realloc`
  is exported (the canonical allocator primitive); string PARAMS flatten to (ptr, len); and as of
  **2026-06-15** string RETURNS use the canonical **callee-allocated i32-ptr + `cabi_post_<name>`**
  convention (`greet(name_ptr,name_len) -> i32` returns a pointer to an `[ptr,len]` pair, paired
  with `cabi_post_greet`). What stays non-canonical is the **container**: exports are still raw core
  in a P1 module (e.g. `strLen` is `(i32 i32)->i32`, not a lifted `func(string)->s32`) with a
  sidecar `.wit`, and string/list/record/variant marshalling still happens **host-side** in the
  generated `bindings.ts` at call time. The P1→P2 step (embed component type +
  `wasm-tools component new`) is now a wrap.
* **WASI:** Preview 1 (`wasi_snapshot_preview1`: `proc_exit`, `fd_write`). `modc` library output has
  no imports. Not `wasi:cli/*` / `wasi:io/*` 0.2 worlds.

**Bucket (b): WIT-as-IDL over a core module — portable to wasmtk's TS host, not to an arbitrary P2
runtime.** This is fine and works today; it is the pragmatic pattern. The only correctness issue is
documentation: README/cmem lines claiming the ABI is "aligned with the Component Model Canonical
ABI" **overstate the return-path alignment** and should be tightened — the realloc/input side is
adjacent, the lift/return side is not. (Tightening applied 2026-06-03 in architecture.md + roadmap
Stage 0 line + README; see those files.)

## DECISION: forward-align the current ABI to the Canonical ABI while staying P1 (2026-06-03)

> **STATUS — return-side IMPLEMENTED 2026-06-15.** Layer 2's RETURN change below is done: exported
> string-returning functions now use the canonical **callee-allocated i32-ptr return +
> `cabi_post_<name>`** convention (wasic `$fn__cabi` shim + `bindgen` host read-then-post).
> Validated end-to-end by the `strings_50` bindgen integration test; suite bindgen 104/104. Layer 1
> (in-memory representation) is already canonical for the shipped types (string/bool/numeric); only
> the **container** (P1 core + sidecar WIT vs. embedded component) remains deferred — now a wrap,
> not a rewrite.

P2 is a future endeavor; current output stays P1 core modules. But shape the ABI _now_ so the future
P2 step is a wrap, not a rewrite. Separate three layers — align the first two now (both P1-legal,
mostly free), defer only the third:

1. **In-memory data representation — align FULLY now (free, pure upside).** Make the byte image of
   every boundary value match Canonical ABI layout so a future lift reads existing memory with no
   re-layout:
   - strings: UTF-8 (already, via TextEncoder) as (ptr, len). Keep UTF-8 — canonical default; avoid
     bespoke encodings (no canonopt mismatch later).
   - `list<T>`: (ptr, len) over canonically sized/aligned elements.
   - records / tuples: field concatenation with canonical alignment + padding.
   - variants / option / result: discriminant i32 + payload flattened over joined cases.
   - bool = 0/1 i32; char = Unicode scalar i32.
   - model resources as opaque i32 handle indices NOW (not raw pointers) so the later move to
     component resource tables is a representation swap, not a semantic one.

2. **Boundary calling convention — param side already canonical; RETURN side ✅ DONE.**
   - Params: a `string` arg flattening to (ptr, len) is already canonical. ✓
   - Returns (THE change): **IMPLEMENTED** — aggregate/string returns now use the canonical
     callee-allocated single i32 pointer (allocated via `cabi_realloc(0,0,4,8)`, returned by the
     `$fn__cabi` shim) + a `cabi_post_<name>` that frees it; the host (`bindgen.ts`) reads via the
     returned ptr then calls post-return. This replaced the earlier caller-allocated out-param form.
     Fully P1-legal. See `design-decisions.md` § "Runner / ABI invariants".
   - `MAX_FLAT_RESULTS` = 1: scalar results stay direct. `str-len -> s32` keeps returning i32 with
     no pointer/post-return; only aggregate returns (greet/shout) move to the pointer convention.
   - Route EVERY boundary allocation through the already-exported `cabi_realloc` (right signature
     `(i32 i32 i32 i32)->i32`) — it's the load-bearing primitive; keep it sole.

3. **Component container — DEFER entirely (the only P2-only piece).** Type section, canon
   lift/lower, instance wrapper. Once (1) and (2) are canonical, producing it later =
   `wasm-tools component embed` (already-generated WIT) + `wasm-tools component new`. A wrap.

**Rule of thumb:** make the linear-memory image and the realloc/return convention canonical now (all
P1-legal); defer only the container. Keep P1 WASI imports behind a thin seam so the later
`wasi_snapshot_preview1` → `wasi:cli`/`wasi:io` swap (or P1→P2 adapter) is a boundary change.

**Honest cost:** the callee-allocated + `cabi_post_*` return path adds a post-return call per
aggregate return and moves return-buffer ownership into the module; the caller-allocated out-param
is simpler/faster in a pure host-glue world. Accepted: small runtime cost now to make future
componentization mechanical. Status: (2) has landed — the return path IS now Canonical-ABI-aligned
(callee-allocated pointer + `cabi_post`); README/cmem wording updated accordingly.

**Consumer caveat (why P2-producer stays deferred — the gating condition is BROWSER-NATIVE WASI P2 /
Component Model support):** for JS-runtime targets (Node/Deno/Bun/**browser**) NONE load components
natively — `jco` transpiles a component back down to core wasm + ESM + preview2-shim to run. That
transpiled shape ≈ wasmtk's current bucket-(b) output. So real P2 only pays off when the CONSUMER is
a native component runtime (Wasmtime/WasmEdge/WAMR/Spin/wasmCloud). **Crucially, flipping to a P2
producer would NOT lose browser compatibility — but it would not gain anything for the browser
either, because a browser must transpile the component back to core wasm anyway.** So the item is
parked specifically **waiting for browsers to load WASI P2 components natively**; until then,
P1-core + sidecar `.wit` + bindgen remains the browser-compatible primary, and the P2 wrap is an
optional terminal add-on. Forward-aligning the ABI (this decision) is worthwhile regardless;
flipping to a P2 _producer_ is not, until either a native-component-runtime target exists OR
browsers gain native component support.

## Path to a real P2 producer (only if portability-to-any-host is pursued)

Not required for the congruent-toolchain goal (P1-core + adapter covers it). With the
forward-alignment above already in place, this reduces to:

1. Embed a component-type section (`wasm-tools component embed`) so WIT travels in the binary.
2. (Already done by the forward-alignment return-convention change — callee-returns-pointer +
   `cabi_post_*`.)
3. Emit components directly, or shell out to `wasm-tools component new` as a terminal stage.
4. Migrate WASI imports from P1 to `wasi:cli` / `wasi:io` 0.2 worlds, or ship the P1→P2 adapter.

## Open scope question (shared with the Go ADR below)

Producers ingest single translation units / crates cleanly; driving full existing build systems
(cargo / `go.mod` with native deps) against the wasm target is the harder, less-bounded part. Decide
per language how far wasmtk wraps the build system vs. ingests pre-built units.

