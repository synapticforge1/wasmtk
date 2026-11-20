# roadmap — part 4 of 5

Continues [roadmap.md](roadmap.md) (split by size on 2026-11-20, letter H38). Sections:

- Congruent polyglot-producer goal + ABI posture (added 2026-06-03 — ful
- "TypeScript as a DLL" vision
- Polyglot ecosystem vision (full detail in [vision.md](vision.md))
- Out of scope without more WASM proposals

## Congruent polyglot-producer goal + ABI posture (added 2026-06-03 — full detail in [polyglot-producers.md](polyglot-producers.md))

**Goal:** unify the **TS/JS, Rust, Zig, Go** toolchains into one congruent wasm capability —
heterogeneous _producers_ converging on the homogeneous middle/back end wasmtk already owns (WASI-P1
core-module output → bindgen ABI → binaryen-ts optimize → wasmmerge/wasmbundle link → wasmtk TS WASI
host). Adding a language = adding a producer, not a toolchain.

(Table as a list — Track · Scope · Status / gating:)

- **ABI forward-alignment (stay P1)** — Scope: Canonicalize the **in-memory boundary layout** + the
  **return convention** now (callee-allocated i32-ptr return + `cabi_post_<name>`; route all
  boundary allocs through `cabi_realloc`); keep P1 WASI imports behind a thin seam. Both P1-legal;
  makes future P2 a wrap, not a rewrite. — Status / gating: ✅ **return-side IMPLEMENTED 2026-06-15**
  (wasic `$fn__cabi` shim now returns the i32 ptr + emits `cabi_post_<name>`; bindgen host
  reads-then-posts; bindgen 104/104, `strings_50` end-to-end). In-memory layout already canonical
  for shipped types. Only the P2 container remains deferred.
- **Go producer (TinyGo)** — Scope: `tinygo build` → wasm → shared optimize/host path.
  Library-first; stdlib `go` heavier fallback. — Status / gating: ✅ **v1 SHIPPED 2026-06-06, refined
  2026-06-07** via `--lang=go` (path defaults to cwd): `init` (scaffold a **wasm library** by
  default; `--go-target=wasm` for a browser project), `modc` (**WASI reactor library** by default —
  `-buildmode=c-shared`: no `_start`, exports `//go:wasmexport` funcs, callable via `wasmtk
  mod`/bindgen; `--go-target=wasm` for a browser module + `wasm_exec.js`), `run` (build wasip1
  command + run; **auto-detects** a `.go` file or a dir with `go.mod`, no flag needed).
  `--go-runtime=tinygo`(default)/`std`. `src/gowasic.ts`. **wasm-opt:** real `wasm-opt` → TinyGo
  full (incl. goroutines); else (or `WASMTK_GO_BINARYEN_ASYNCIFY=1`) passthrough shim +
  `-scheduler=asyncify` + **`binaryenAsyncify` = binaryen-ts Asyncify+`-Oz`** → **goroutines work
  with NO external binaryen** (2026-07-08; binaryen-ts ≥ 1.4.1 in-wasm asyncify-import mode;
  `tests/go_asyncify_tests.ts`). **2026-06-07 changes:** `wasic --lang=go` REMOVED; `modc --lang=go`
  flipped browser→reactor-library (the formerly-deferred reactor/library item, now DONE — Go analog
  of TS `modc`); required a `_initialize` fix in `wasmtk mod`/`run` (reactor exports trap otherwise)
  + a `syscall/js`-in-library-build hint. Verified `modc --lang=go` lib → `wasmtk mod lib.wasm add 2
  3` → 5. **Go string/aggregate bindgen — ✅ SHIPPED 2026-07-08** (the "Go's layout ≠ Canonical ABI"
  deferral was a mischaracterization). ABI-canonicity verdict: **fully canonical vs wasmtime** — Go
  strings are UTF-8 `(ptr,len)`; a TinyGo reactor + a one-line `//go:linkname cabi_realloc` wrapper
  produces the exact canonical string convention (params `(ptr,len)`; returns callee-allocated
  i32-ptr + `cabi_post`), so the existing language-agnostic bindgen marshals it unchanged. The one
  host-side gap was that bindgen's generated loader lacked SPEC §10 (WASI shim + `_initialize`) —
  **fixed in `src/bindgen.ts`** (additive; `bindgen` 131→135, `dync` 3/3). Verified e2e in
  `tests/go_bindgen_tests.ts` (TinyGo-gated). Fixtures: `tests/go_fixtures/strlib/` (canonical
  string lib) + `hello.go`. Full detail in [polyglot-producers.md](polyglot-producers.md) § "Go
  string/aggregate bindgen". **Mergeable Go leaf — ✅ SHIPPED 2026-07-08** (`modc --lang=go
  --go-target=wasm-unknown` → `buildGoLeaf`): TinyGo's freestanding `wasm-unknown` target has 0
  imports + no `memory.grow` (no WASI/scheduler/allocator), so a pure-compute Go library
  `wasmmerge`s into a wasic/bundle build like a Zig `FixedBufferAllocator` leaf.
  `mergeOneWasmImport` calls the leaf's `_initialize` (TinyGo guards each export on a runtime-init
  flag at a fixed page-1 address → merged memory floored at 2 pages); caveat: the host must not use
  that page (fine for small hosts, else use reactor/bindgen). Verified `tests/go_merge_tests.ts`
  (7/7): `addi`/`muli`/`clampi` merged into a wasic program run correctly.
- **asyncify pass in binaryen-ts** — Scope: Port binaryen's `--asyncify` pass into
  `@jrmarcum/binaryen-ts` so wasmtk can be TinyGo's `wasm-opt` for **goroutine** code too (no
  external binaryen at all). — Status / gating: ✅ **THE PASS IS COMPLETE 2026-07-05** (binaryen-ts
  repo; **authoritative detail in binaryen-ts `cmem/passes.md` § "Asyncify"**). Faithful port of
  upstream `Asyncify.cpp` (2030 LOC) into native TS across 5 stages — **S1** runtime support
  (`2902fca`) / **S2** `analyzeModule` (`3b35d97`) / **S3a** a full `flatten` pass (`2e30ea4`,
  +`mapChildrenShallow` walk.ts fix) / **S3b** `flowInstrumentFunction` (`62a4573`,
  +`buildCallResultTypes` flatten fix) / **S4** `localsInstrumentFunction` + intrinsic lowering →
  RUNNABLE (`c446a3d`) / **S5** wire+register+CLI (`62f0fb0`). Registered `"Asyncify"` (opt-in);
  **runnable e2e that differentially matches `wasm-opt --asyncify` v130** (suspend/resume, locals
  survive rewind). Suite **379/379**. Along the way fixed 2 latent binaryen-ts bugs (walk
  one-level-mapper; flatten `Call.type===none`). **WASMTK-side wiring ✅ COMPLETE 2026-07-08:** (a)
  binaryen-ts published — 1.4.1 added the **in-wasm asyncify-import mode** (TinyGo imports
  `asyncify.start_unwind`/… and drives its own unwind/rewind; the pass removes those imports and
  wires the calls to the synthesized control functions); (b) `gowasic.ts` no-wasm-opt branch now
  builds `-scheduler=asyncify` + passthrough shim + `binaryenAsyncify` (binaryen-ts Asyncify+`-Oz`).
  Validated on real TinyGo goroutine output → `sum: 30` (`tests/go_asyncify_tests.ts`,
  TinyGo-gated). **Goroutine Go now runs with zero external binaryen.**
- **Zig producer** — Scope: `zig build-exe` (cleanest native path) — Status / gating: ✅ **SHIPPED
  2026-06-07** (`src/zigwasic.ts`, `--lang=zig`): `init` (wasm-library scaffold), `modc`
  (freestanding library, `--export=<name>` scanned + binaryen-ts `-Oz`), `run` (`wasm32-wasi` on
  wasmtk's TS host; auto-detects `.zig`). Comptime-guarded scaffold `main` (Zig analyzes `main` even
  with `-fno-entry`). See [polyglot-producers.md](polyglot-producers.md).
- **Rust producer** — Scope: Driver = **`rsxtk`** (owner's Rust WASM toolkit, crates.io `rsxtk`,
  repo `synapticforge1/rsxtk`). — Status / gating: ✅ **SHIPPED 2026-06-07** (`src/rustwasic.ts`,
  `--lang=rust`) — **delegates fully to rsxtk**: `init`/`initmod`/`modc`(→build wasm)/`build`(→build
  wasi)/`run`/`add`/`remove`/`list`/`fmt`/`clean`. Prereq `rustup target add wasm32-wasip1`. No
  WIT/bindgen yet (stays wasmtk's). Known rsxtk-side gap: `initmod` library + `build`/`mod` expects
  a `main` (rsxtk template lacks `[lib]`/crate-type — fix in rsxtk). `wasm32-wasip2` is the one
  native-P2 path — decide before mixing into a P1-merge flow.
- **P2 producer (real components)** — Scope: Embed component-type section + emit/wrap via
  `wasm-tools component new`; migrate WASI P1→`wasi:cli`/`wasi:io`. — Status / gating: ⬜ **DEFERRED
  — waiting for browser-native WASI P2 (Component Model) support.** Browsers load only _core_
  modules; a P2 component must be `jco transpile`d back to core wasm + JS glue to run in a browser,
  so a P2 wrap buys browser consumers nothing today (they'd transpile it back to ≈ wasmtk's current
  output anyway). It only pays off for _native component-runtime_ consumers
  (Wasmtime/WasmEdge/WAMR/Spin). Until browsers run components natively, **P1-core + sidecar `.wit`
  + bindgen stays the primary (browser-compatible) artifact**, and the P2 container is a thin
  terminal wrap (ABI already forward-aligned) we revisit when browser P2 support lands.

**Scope pin:** the congruent contract is **WASI Preview 1 / core modules**. Componentization is a
**terminal optional wrap** of the single merged module (`wasm-tools component new --adapt`), not a
merge-tier rewrite. wasmmerge merges P1 modules; never merge already-built _components_ (use `wac`).

**Verified 2026-06-03:** wasmtk itself is NOT a P2 producer — it emits P1 core modules + sidecar
`.wit` + host-side bindgen ABI ("bucket (b)"). Canonical ABI calling convention is now aligned on
both param and return sides (`cabi_realloc` + callee-allocated returns + `cabi_post_<name>`,
2026-06-15); only the P2 container is deferred. See [polyglot-producers.md](polyglot-producers.md)
for the raw evidence.

## "TypeScript as a DLL" vision

Compile TS business logic to `.wasm` libraries and load them from a TS host like C uses a DLL.

| C / DLL                        | wasic                               |
| ------------------------------ | ----------------------------------- |
| `.c` → `.dll`/`.so`            | `.ts` → `.wasm` via `modc`          |
| `.h` header                    | `.wit` (Phase 41, auto-generated)   |
| import lib (`.lib`)            | `.bindings.ts` (Phase 50 `bindgen`) |
| `LoadLibrary`/`GetProcAddress` | `loadModule()` from the binding     |

Prefer `modc` over `wasic` for consumer-facing modules. The DLL model is complete end-to-end.

## Polyglot ecosystem vision (full detail in [vision.md](vision.md))

WASM as the universal binary, WIT as the universal interface contract; any language → component;
components compose regardless of source language; pixi manages toolchains, wasmtk manages WASM.
Staged: Stage 1 `universalWasmLoader` (JS/TS reference loader + SPEC.md + InstancePool) is the
current priority; Stages 2–5 add Rust/Python/Go/JVM loaders, `wasmtk build`/`compose` via pixi,
registry + IDE integration.

## Out of scope without more WASM proposals

Goroutines/cooperative multitasking (needs stack-switching), shared memory + atomics (threads),
channels/select, `os.Exit` non-zero propagation (runner enhancement). And the irreducible dynamic
kernel — `eval`/`new Function`, pervasive `any`, open prototype mutation — stays in `javyc` unless
§7-#7 decides to build wasmtk's own dynamic runtime.

