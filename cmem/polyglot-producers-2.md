# polyglot-producers — part 2 of 4

Continues [polyglot-producers.md](polyglot-producers.md) (split by size on 2026-11-20, letter H38). Sections:

- VERIFIED: native-producer mergeability — allocation is the gate, alloc
- SHIPPED 2026-06-07 — Zig producer (`--lang=zig`) + Rust producer (`--l

## VERIFIED: native-producer mergeability — allocation is the gate, allocator-control is the differentiator (2026-06-07)

Empirically tested end-to-end (TinyGo 0.41.1, Zig 0.16.0, Rust nightly 1.98
`wasm32-unknown-unknown`) by building leaf + allocating variants of each, disassembling with
wabt-ts, and running them through the **actual** `wasmtk wasic` import-merge pipeline
(`import { … } from "./leaf.wasm"` → `wasmmerge` → binaryen-ts `-Oz` → run). Probe artifacts were
under `tmp/go_merge_probe/`.

**One-line summary (owner-confirmed):** _Pure libraries of exported functions from Go, Rust, and Zig
are mergeable._ The gate is **whether the module allocates**, not the source language or the module
"style". For modules that DO allocate, only **Zig** stays mergeable, and only with a **static arena
allocator** (`FixedBufferAllocator`) — not a memory-growing one.

### Results matrix

| Module                                                     | `call_indirect` | `memory.grow` | Merge result                                                   |
| ---------------------------------------------------------- | --------------- | ------------- | -------------------------------------------------------------- |
| **Go** leaf (no alloc)                                     | —               | —             | ✅ merges + runs correct (984 B → 3.5 KB merged)               |
| **Go** allocating (`make`/`append`, `-gc=leaking`)         | none            | yes           | ❌ **silently corrupts**                                       |
| **Zig** leaf                                               | —               | —             | ✅ merges + runs (216 B → 3.6 KB)                              |
| **Zig** alloc — `FixedBufferAllocator` (static arena)      | none            | none          | ✅ **merges + runs correct**                                   |
| **Zig** alloc — `page_allocator` (growing heap)            | yes             | yes           | ❌ rejected **loudly** (call_indirect guard)                   |
| **Rust** leaf (`#![no_std]`, no allocator)                 | —               | —             | ✅ merges + runs                                               |
| **Rust** alloc — `Vec` + static-bump `#[global_allocator]` | yes             | none          | ❌ rejected loudly                                             |
| **Rust** alloc — manual `alloc()` + static-bump            | yes (6)         | none          | ❌ rejected loudly (panic/`unwrap`/fmt drag in indirect calls) |

NOTE: the merged leaves are NOT WASI modules — they are **freestanding** (`wasm-unknown` /
`wasm32-freestanding` / `wasm32-unknown-unknown`) library modules with **zero WASI imports**, merged
_into_ a wasic WASI program. "WASI-ness" is an axis of the consuming/main module, not the leaf.

### Why Go differs from Rust/Zig (the root cause)

- **Go has a mandatory runtime** whose allocator is welded in. Even `-gc=leaking` keeps a runtime
  allocator that (a) stores its heap metadata at **hardcoded absolute linear-memory addresses**
  (`i32.store offset=65540`, base `i32.const 0` — `offset=` _instruction immediates_, NOT
  relocatable `i32.const` data pointers, and Go emits no data segments so wasmmerge's pointer
  relocation is a no-op for it), (b) grows via `memory.grow` claiming all memory from a fixed base
  upward, and (c) relies on `_initialize` running to set that metadata — which the WAT-splice merge
  never calls. None of the three relocation levers (`global` rename, `call`-target rename,
  data-range `i32.const` shift) apply, and Go's allocator doesn't match `detectBumpAllocator` (it
  touches no wasm global and uses `memory.grow`). So it can't be unified — and worse, it **slips
  past the merge guard** (no `call_indirect`) and corrupts wasic's heap region (wasic
  `$__heap_ptr`≈65796 vs Go's hardcoded 65536–65568).
- **Rust and Zig are freestanding-capable with no mandatory runtime**, and the allocator is
  **swappable (Rust `#[global_allocator]`) or explicit (Zig passes an `Allocator`)**. So a
  self-contained **static-arena** allocator never calls `memory.grow`, never claims wasic's region,
  and lives high in memory (well above wasic's heap) — it merges cleanly. Verified with Zig's
  `FixedBufferAllocator` (allocates a slice, sums it, returns 4950 merged, no corruption).

### Failure mode is the real headline

- **Go** silently corrupts — `memory.grow`-based, no `call_indirect`, so the only guard misses it.
- **Rust** almost always gets caught: even minimal `alloc` use drags `call_indirect` in via
  panic/`unwrap`/fmt/drop-glue → rejected at merge. Hard to _accidentally_ merge a corrupting Rust
  module; also harder than Zig to hit the _working_ path (would need `panic=abort`, no `unwrap`,
  custom alloc-error handler, manual memory).
- **Zig** is the sweet spot: explicit allocators make the clean static-arena path natural, and the
  bad (growing-heap) path fails loudly via `call_indirect`.

### Guard gap — CLOSED 2026-06-07 (`memory.grow` merge guard implemented)

The `wasmmerge` guard originally rejected only `call_indirect`. **Go's allocating case proved that
necessary-but-not-sufficient**: a `memory.grow`-based, indirect-call-free allocator (Go's, or a
hand-rolled direct-call dlmalloc in Rust/Zig) slipped through and corrupted. **Now FIXED** —
`wasmmerge` also throws a loud, actionable error on a merged module containing `memory.grow`
(message names the per-language fix: static-arena allocator, or keep standalone as a WIT/bindgen
component), turning Go-style silent corruption into a loud failure across all languages. wasmtk's
own producers never emit `memory.grow`, so no false positives; verified against all 14 merge tests.
Full writeup + implementation: [compiler-bugs.md](compiler-bugs.md) "Merge guard #2". (Companion to
the `call_indirect`-in-merge guard, 2026-06-05.)

**Ordering fix + std-Go coverage — 2026-07-09.** The 2026-06-07 `memory.grow` check was
*per-function* and ran AFTER the per-function `call_indirect` guard. **Standard Go exposed the
gap**: a std-Go WASI reactor library (`go build -buildmode=c-shared` + `//go:wasmexport`, e.g.
1.86 MB for a one-line `add`, `memory.grow:1`, 10 imports, **89 `call_indirect`s**) hit the
`call_indirect` guard FIRST → the misleading "refactor the library to use only direct calls"
message, a red herring for a full-runtime module (you can't refactor away Go's runtime). **Fix**:
hoisted a **module-level** `memory.grow` guard to the very top of `mergeWasmWat` (before any
per-function guard), so a runtime module always gets the correct "carries its own growing
allocator / language runtime … STANDARD Go … build a MERGEABLE leaf with TinyGo
`--go-target=wasm-unknown` / `FixedBufferAllocator` / keep standalone via WIT+bindgen" message.
The per-function `memory.grow` guard (777) is now a backstop. **Std-Go answer, confirmed
empirically:** there is NO std-Go build mode that drops the runtime — command OR c-shared library,
`GOOS=wasip1` always links the full runtime + GC + `memory.grow`. The only mergeable Go is a
TinyGo `wasm-unknown` leaf. Companion guard in the producer: `gowasic.buildWithStd` now rejects
`--go-runtime=std --go-target=wasm-unknown` ("the mergeable leaf requires TinyGo — standard Go
always links the full runtime + allocator") so the impossible combo fails at build time, not
merge time. Regression test: `tests/wasmmerge_guard_tests.ts` (Go-free unit test — hand-built
`memory.grow` WAT is rejected with runtime guidance; an alloc-free leaf is not). Validated: wasi
375/375, go_merge 7/7, go_bindgen 7/7, go_asyncify 12/12 (as of 2026-07-09, binaryen-ts 1.4.3).

### Practical takeaway per language

- **Zig** — best merge fit. Leaf merges trivially; allocating code merges _iff_ it uses a static
  arena allocator. Document "use `FixedBufferAllocator`, not `page_allocator`" and Zig is a
  first-class merge producer.
- **Rust** — great for leaf (`no_std`, no allocator). Allocating Rust is realistically a
  **standalone component** (Canonical ABI / instance, not merge), because the toolchain pulls in
  indirect calls so readily.
- **Go** — **leaf-only** for merging; anything with a heap is a standalone component.

### Future — true shared-heap unification is tractable for Rust/Zig, not Go

The "option 4" that's intractable for Go (rebuild its runtime allocator) is **straightforward for
Rust/Zig** precisely because the allocator is user-replaceable: point a custom `#[global_allocator]`
(Rust) / `Allocator` wrapper (Zig) at an **imported wasmtk `$__malloc`/`$__heap_ptr`**, and they'd
share wasic's heap exactly like a modc capability — pointers and all, with full cross-module
interop. Not wired yet; the static-arena path is the available today-answer. This dovetails with the
cross-language-inclusion finding in [component-model-discussion.md](component-model-discussion.md)
(_cross-language merge is the exception; `instance`/WIT/bindgen is the default_).

---

## SHIPPED 2026-06-07 — Zig producer (`--lang=zig`) + Rust producer (`--lang=rust`, via rsxtk)

Both mirror the Go producer's command shape. Zig "stays in chain" (a native shell-out producer like
Go); Rust **delegates fully to `rsxtk`** (the owner's Rust WASM toolkit, installed on PATH — the
decision was: wrap rsxtk wholesale, incl. `run` via its wasmtime). New files: `src/zigwasic.ts`,
`src/rustwasic.ts`. `deno.json` exports both.

### Zig — `src/zigwasic.ts` (shell to `zig`; no wasm-opt shim — zig self-optimizes)

(Table as a list — Command · Action:)

- `wasmtk init --lang=zig [dir]` — Action: scaffold a wasm-library `main.zig` (`export fn` + a
  comptime-guarded `pub fn main` test harness)
- `wasmtk modc --lang=zig [path]` — Action: `zig build-exe -target wasm32-freestanding -O
  ReleaseSmall -fno-entry --export=<name>…` → clean library (only the `export fn`s + memory, no
  `_start`/WASI) + **binaryen-ts `-Oz`** (62-byte `add` lib in testing)
- `wasmtk run --lang=zig [path]` / `run <file.zig>` — Action: `zig build-exe -target wasm32-wasi -O
  ReleaseSmall` → WASI program, run on wasmtk's TS host (auto-detected `.zig`)

**Zig gotchas discovered (load-bearing):**

- **Zig semantically analyzes `pub fn main` even with `-fno-entry`** — so a single-file scaffold's
  std-using `main` breaks the freestanding (library) build (`std` I/O pulls `posix.getrandom`,
  absent on freestanding). FIX: the scaffold **comptime-guards** the test body to the WASI target
  (`if (builtin.os.tag == .wasi) { … std.debug.print … }`); Zig comptime-prunes the std branch for
  freestanding. Do not remove the guard.
- **Clean library exports via `--export=<name>`, not `-rdynamic`.** `-rdynamic` also exports `main`
  as `_start`; `export fn` alone isn't exported in `build-exe`. So `zigwasic.ts` **scans the root
  source for `export fn <name>`** (`scanExportFns`) and passes explicit `--export=<name>` (falls
  back to `-rdynamic` if none found — e.g. exports in imported files). The user confirmed this
  pattern (`zig build-exe math.zig -target wasm32-freestanding -fno-entry --export=add`).
- WASI target triple: `wasm32-wasi` (alias of `wasm32-wasi-musl` in Zig 0.16; both work, identical).

### Rust — `src/rustwasic.ts` (delegate to `rsxtk`)

A thin delegator: `runRust(subcommand, forwardArgs)` shells to `rsxtk` (spawn + inherited stdio so
its output streams), with a clear "install: `cargo install rsxtk`" error if absent. `main.ts` maps
each verb (the wasmtk command name + `--lang` stripped from the raw args, then forwarded):

| wasmtk command                               | rsxtk                       | Notes                                                                       |
| -------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `init --lang=rust <name>`                    | `rsxtk init`                | wasi **script** template (has `main`)                                       |
| `initmod --lang=rust <name>`                 | `rsxtk initmod`             | **library** script (`#[no_mangle]` exports, no `main`) → writes `<name>.rs` |
| `modc --lang=rust <path>`                    | `rsxtk build <path> wasm`   | library/universal wasm (TARGET `wasm` auto-appended)                        |
| `build --lang=rust <path>`                   | `rsxtk build <path> wasi`   | WASI program (TARGET `wasi` auto-appended)                                  |
| `run --lang=rust <path>` / `run <file.rs>`   | `rsxtk run <path>`          | build + run via rsxtk's wasmtime (auto-detected `.rs` / `Cargo.toml`)       |
| `add/remove/list --lang=rust <path> [crate]` | `rsxtk add/remove/list`     | rsxtk arg shape: `add <PATH> <CRATE>`, `list <PATH>`                        |
| `fmt --lang=rust` / `clean --lang=rust`      | `rsxtk fmt` / `rsxtk clean` | clean wipes the `.tk` cache                                                 |

- rsxtk's `build` signature is `<PATH> <TARGET>` (`wasi|wasm|wat`) — so `modc` auto-appends `wasm`,
  `build` auto-appends `wasi` (via `delegateRust(sub, extraArgs)`).
- The Rust-only verbs (`initmod build add remove list fmt clean`) **require `--lang=rust`** (else a
  one-line "use --lang=rust" error); they're new top-level `case`s in `main.ts`.
- **Prerequisite:** `rustup target add wasm32-wasip1` (rsxtk builds wasip1; not installed by default
  — rsxtk prints the exact hint if missing). Installed during verification.
- **Verified working:** `init`→`run` ("Hello from rsxtk!"), `build`→`tmp/rprog.wasm` (65 KB),
  `add`/`list` (manifest updated), `clean` (cache cleared), error case (no `--lang`).
- **rsxtk-side limitation (NOT a wasmtk bug):** `rsxtk 0.4.4`'s `initmod` library + `build`/`mod`
  flow compiles the script as a `bin` and errors `main function not found` — its `initmod` template
  lacks a `[lib]`/crate-type marker. So `modc --lang=rust` on an `initmod` library currently fails
  at the rsxtk layer; the wasmtk delegation is correct. To address in **rsxtk** (owner maintains
  it).

### Host change required by these (general win): WASI-import Proxy

`src/utils.ts` `runWasi` + `callExport` now build `wasi_snapshot_preview1` as a **Proxy**
(`makeWasiImport`) that stubs any WASI function we don't implement (→ `() => 0`), so modules
importing a _fuller_ WASI surface than our shims (Zig std imports ~28: `clock_res_get`, `path_*`,
`fd_pread`, `fd_readdir`, …) **instantiate** instead of failing `LinkError`. Implemented shims
(`fd_write`, `random_get`, …) are used as-is. Verified no regression (merge slice 14/14).

### Shared helper

`binaryenOptimize(bytes)` moved from `gowasic.ts` to **`src/binaryen.ts`** (exported); Go + Zig both
import it. Rust skips it (rsxtk optimizes).

---

