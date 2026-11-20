# polyglot-producers — part 4 of 4

Continues [polyglot-producers.md](polyglot-producers.md) (split by size on 2026-11-20, letter H38). Sections:

- ADR: Go → wasm ingestion path — TinyGo producer, WASI-first, run via w

## ADR: Go → wasm ingestion path — TinyGo producer, WASI-first, run via wasmtk host (2026-06-03) (continued, 2)

**wasm-opt handling (the load-bearing detail).** TinyGo's internal `wasm-opt` call is
`--asyncify -Oz -g`. `--asyncify` is **mandatory codegen** (TinyGo's goroutine scheduler), NOT
optimization — a passthrough that skips it leaves unresolved `asyncify` imports (won't instantiate).
So:

- **Real `wasm-opt` present** (on PATH or `$WASMOPT`) → TinyGo uses it → full support incl.
  goroutines. (Skip this and force the in-house path with `WASMTK_GO_BINARYEN_ASYNCIFY=1`.)
- **Absent** (or forced) → **GOROUTINES NOW WORK with no external binaryen (2026-07-08).** `gowasic`
  writes a **passthrough `wasm-opt` shim** (answers `--version`; copies input → `-o` output, no opt;
  cross-platform `.cmd`/`.sh` launcher + a runtime-agnostic Deno/Bun shim) and builds with
  **`-scheduler=asyncify`** — so TinyGo emits the goroutine code that IMPORTS the in-wasm
  `asyncify.*` control API and leaves it un-instrumented (the shim did nothing). Then `gowasic` runs
  **`binaryenAsyncify` (`src/binaryen.ts`)** = binaryen-ts **Asyncify pass + `-Oz`**: the Asyncify
  pass (binaryen-ts ≥ 1.4.1's in-wasm asyncify-import mode) removes those imports and wires the
  calls to the synthesized control functions, then `-Oz` shrinks. Verified e2e
  (`tests/go_asyncify_tests.ts`, TinyGo-gated) — **B3 broadened the coverage 2026-07-09** to the
  full goroutine surface: worker-pool (`sum: 30`), `select` over unbuffered channels
  (`select-total: 300`), `time.Sleep` in a goroutine (`sleep-result: 42`),
  `sync.WaitGroup`+`Mutex`+closure+defer (`wg-counter: 45`), and a 3-stage fan-out pipeline with
  WaitGroup-driven channel close (`pipeline-total: 55`). `binaryenAsyncify` **throws** on failure
  (an un-asyncified module has unresolved `asyncify.*` imports and won't instantiate), so `gowasic`
  reports a hard error rather than shipping a broken module.

  **TinyGo 0.43 (Go 1.27.2), 2026-10-13: two binaryang Asyncify bugs, both on binaryang's side.**
  (1) TinyGo 0.43 calls `asyncify.stop_unwind` from a new panic-catch wrapper and binaryang's pass
  threw `Flatten: unresolved call target "$asyncify_stop_unwind"` (waitgroup, pipeline, nested);
  fixed in binaryang 1.11.0, pinned as **1.12.0** (the owner skipped 1.11.0). (2) Then NESTED built
  but trapped `uninitialized element` on a rewind: binaryang saved only the locals live AFTER an
  unwinding call, not that call's operands (a `call_indirect` index loaded from a defer frame);
  upstream `wasm-opt` 133 runs the same bytes. Fixed in binaryang **1.12.1**, pinned 2026-10-15:
  `go_asyncify_tests` **12 / 12**. Repros `scripts/repros/tinygo043_{waitgroup,nested}_pre_asyncify.wasm`;
  letters in `scripts/binaryang-report.md`. The owner's rule held: no workaround in wasmtk.

  **NESTED SUSPENSION — found (B3) then FIXED (2026-07-09), binaryen-ts 1.4.3.** A goroutine that
  itself suspends (blocks on `inner.Wait()`) while running *inside* another suspending goroutine
  trapped `RuntimeError: memory access out of bounds` under the in-house path (even a 2×2 = 4-goroutine
  case), while the SAME TinyGo module ran correctly via external `wasm-opt --asyncify`. **The
  in-house path (nested included) now passes** — `go_asyncify_tests.ts` runs `nested/` in the forced
  in-house list (`nested-sum: 36`).

  **Root cause (the real one) — a binaryen-ts BINARY-DECODER bug, NOT asyncify** (tracked as WT-2k in
  binaryen-ts `cmem/correctness.md`). TinyGo's goroutine trampoline (`tinygo_launch`) keeps the
  caller's `$__stack_pointer` (a `global.get`) live on the operand STACK across `global.set $sp …;
  call_indirect; call`, then a trailing `global.set $sp` RESTORES it. binaryen-ts's `readBinary`
  reconstructs the tree by taking the topmost value-producing entry, skipping void statements — so it
  grabbed that `global.get $sp` from BELOW the intervening `global.set $sp` and placed it as the
  restore's operand, **re-evaluating `global.get $sp` after `$sp` was overwritten** →
  `global.set $sp (global.get $sp)` self-assign. The shadow stack was never restored, so every later
  allocation corrupted memory → the boundary trap. **Fix:** the decoder now SPILLS such a reordered
  value into a temp local at its original position (a `Pop` placeholder is exempt); binaryen-ts 1.4.2
  (published as 1.4.3 after a JSR type-check fixup). wasmtk `deno.json` pins
  `jsr:@jrmarcum/binaryen-ts@^1.4.3/compat`.

  **Investigation lesson (worth keeping):** the earlier "memory-grow ordering" / "asyncify re-entrant
  unwind" hypotheses were RED HERRINGS — a runtime `stackPos` trace proved our asyncify save/restore
  matched `wasm-opt` byte-for-byte (same 13 goroutine buffers, ours used LESS per frame). What cracked
  it: bisecting the merged module function-by-function (splicing `wasm-opt`'s working functions into
  ours) to the single culprit `tinygo_launch`, then confirming a pure `readBinary→emitBinary` (no
  passes) reproduced the self-assign → the bug was upstream in the DECODER, not the pass. The B4
  liveness-minimized saving (binaryen-ts `967fbbb`) is a real, independent improvement (smaller frames)
  but did NOT fix nested — the decoder fix did. Repro + trace/bisect harness in scratchpad `b4/`;
  full write-up in binaryen-ts `cmem/correctness.md` § "WT-2k".
- Earlier this path used `-scheduler=none` + `binaryenOptimize` (`-Oz` only) and errored on
  goroutine code (binaryen-ts lacked the asyncify pass). The pass was ported into binaryen-ts (see
  its `cmem/passes.md` § "In-wasm asyncify-import mode") and wired here — the roadmap "asyncify
  pass" item is COMPLETE.

**Two `host.Command` (was `rt.Command`) gotchas baked into `gowasic.ts`:** (1) `host.Command.output()` always reads
`result.stdout`/`stderr`, which **throws unless they are `"piped"`** — never pass
`"null"`/`"inherit"` to a `.output()` call (use `"piped"` and decode). (2) `rt.remove` is single-arg
(unlink-based under Bun) — use `Deno.remove(dir, {recursive:true})` for the temp shim dir.
Subprocess env is built as `{ ...rt.env.toObject(), WASMOPT/GOOS/GOARCH }` so PATH is preserved.

**Go string/aggregate bindgen — ✅ SHIPPED 2026-07-08.** The old "Go's string/slice layout ≠
Canonical ABI" deferral was a **mischaracterization** (see the ABI-canonicity investigation below):
Go strings are UTF-8 `(ptr,len)` — exactly the Canonical ABI representation — so a TinyGo reactor
library exporting the canonical string convention is consumable by `wasmtk bindgen` with **zero
Go-specific host code**; the existing language-agnostic bindgen marshals it byte-for-byte the same
as a wasic module. Verified end-to-end (`tests/go_bindgen_tests.ts`, TinyGo-gated: `greet`/`strLen`
round-trip incl. UTF-8). Fixture: `tests/go_fixtures/strlib/` (`strlib.go` + `strlib.wit`).
~~reactor `modc --lang=go`~~ — **DONE 2026-06-07**. Browser `syscall/js` — shipped behind
`--go-target=wasm`.

**ABI-canonicity investigation + verdict (2026-07-08).** Question (owner-gated): can Go
string/aggregate marshalling work WITHOUT making wasmtk's ABI non-canonical vs wasmtime? **Verdict:
YES — fully canonical**, proven by construction with a TinyGo 0.41.1 probe:

- Go strings = UTF-8 `(ptr,len)` = canonical string lowering. A TinyGo `-buildmode=c-shared` reactor
  exports `malloc`/`realloc`/`free` + `memory` + `_initialize`.
- A **one-line `//go:linkname cabi_realloc` wrapper** over `malloc` gives the exact canonical
  allocator signature `(i32,i32,i32,i32)->i32`. String params cross as `(ptr,len)` via
  `cabi_realloc`; a returned string is the callee-allocated **i32 ptr → `[dataPtr,len]` pair +
  `cabi_post_<name>`** — identical wire format to wasic's `$fn__cabi` shim. All proven end-to-end
  (`greet("World")=="Hello, World!"`).
- **What differs from wasic is authoring, not the ABI:** TinyGo's `//go:wasmexport` is numeric-only,
  so the canonical string glue (`cabi_realloc`, ptr/len exports, `cabi_post`) is written by hand in
  Go (see `strlib.go`'s `goStr`/`retStr`/`freeRet` helper block) rather than compiler-generated. Not
  a canonicity violation — a code-ergonomics gap. A wasmtk-provided Go helper package could hide it
  later.

**The ONE host-side gap (fixed 2026-07-08) — SPEC §10 in the bindgen loader.** bindgen's generated
loader used `importObj = {}`, so it couldn't instantiate a module that imports
`wasi_snapshot_preview1` (a TinyGo runtime needs `random_get`; a `modc` lib that `console.log`s
needs `fd_write`), nor did it call `_initialize`. Fixed in `src/bindgen.ts` `genLoadModule`:
**always** attach a minimal WASI-P1 shim (`fd_write`→console, `random_get`, `clock_time_get`,
`proc_exit`, Proxy no-op fallback for the rest — unused import namespaces are ignored by
`WebAssembly.instantiate`, so pure-compute modules are unaffected) + call `_initialize` (SPEC
§10.1/§10.2, the same capability propagated to the loader ports). Additive: `bindgen` 131→135 (4 new
§10 codegen assertions), `dync` 3/3, no regression. This also lets any wasic `modc` library that
uses `console.log` be driven via bindgen.

### Architectural fit (producer → optimize → host stays ours)

- Producer: TinyGo emits **wasip1** core modules (or reactor libraries via `//go:wasmexport`).
- Optimize: through **binaryen-ts** (`-Oz`) — same step wasic uses.
- Link/merge: **wasmmerge/wasmbundle** at P1 (shared linear memory) — same as every producer.
- Host: wasmtk TS **WASI host** (`run`); **bindgen** bridges the canonical ABI.
- Net new native dependency: the **TinyGo binary** at build time (bundles its own LLVM). Runtime
  stays TS/Deno.

### Caveats / known friction

1. **Native toolchain dependency** (TinyGo binary, bundles LLVM) — same pragmatic-floor caveat as
   the Zig ADR and QuickJS for javyc. Pin a specific TinyGo version; expect CLI churn
   (pre/early-1.0).
2. **ABI/bindgen is the hard part.** Numeric exports bridge cleanly; Go strings/slices have their
   own in-memory layout, so generic string/aggregate marshalling depends on the **ABI
   forward-alignment** decision (canonical layout + return convention) above. Numerics-first, like
   every producer.
3. **Reactor exports** require recent TinyGo (`//go:wasmexport`) — verify the pinned version
   supports it; otherwise `-buildmode=c-shared`.
4. **P2:** TinyGo can target `wasip2` natively (~0.33+) — treat like Rust's wasip2 (deliberate
   terminal path only; do not feed native-P2 output into the P1 merge tier).

### Open question

TinyGo compiles a Go module/package cleanly; driving larger Go build setups (cgo, build tags,
vendored native deps) against the wasm target is the less-bounded part. Decide how far wasmtk wraps
`go.mod`/build invocation vs. ingests a single package.


