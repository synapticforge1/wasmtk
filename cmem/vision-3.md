# vision — part 3 of 3

Continues [vision.md](vision.md) (split by size on 2026-11-20, letter H38). Sections:

- Phased Roadmap
- Repository Summary
- Immediate Next Steps

## Phased Roadmap

### Stage 0 — Canonical ABI Alignment ✅ COMPLETE (wasmtk, 2026-05-19)

*Completed. wasic now exports `cabi_realloc` instead of `__malloc` and uses the
out-parameter convention for string returns. 446/446 tests pass under npm:wabt +
npm:binaryen (historical baseline, 2026-05-25). Under the current dual JSR
/compat stack (wabt-ts/compat 1.2.9 + binaryen-ts/compat 1.2.9), the wasic
population is 260/270 PASS (96.3%); Stage 0 functionality (Canonical ABI shim
generation, bindgen out-parameter convention) is unchanged at the wasic /
bindgen layer.*

- ✅ Replaced `__malloc` export with `cabi_realloc(ptr, old_size, align, new_size) → i32`
- ✅ Changed string return emission: shim wrappers write ptr+len to caller-provided 8-byte
  return area (`_r = cabi_realloc(0,0,4,8)` passed as trailing arg)
- ✅ Updated `bindgen.ts`: uses `cabi_realloc` + `DataView` out-parameter pattern
- ✅ `utils.ts` test runner verified — no changes needed (internal WASM calls unaffected)
- ✅ WIT generation confirmed — `string` type in WIT, no regression
- ✅ 446/446 tests pass under npm:wabt (270 wasic + Go-by-Example + 103 bindgen + 73 jstyper; +3 Phase 21 stress tests, +3 Phase 22 stress tests added 2026-05-25)

---

### Stage 0.5 — Dual JSR /compat Migration ✅ COMPLETE (wasmtk, 2026-05-28)

*Substantively complete. Both wasmtk compiler-toolkit dependencies (wabt and
binaryen) now resolve to JSR-native TypeScript ports in the jrmarcum ecosystem:
`npm:wabt@^1.0.36` → `jsr:@jrmarcum/wabt-ts@^1.2.9/compat`, and
`npm:binaryen@^116.0.0` → `jsr:@jrmarcum/binaryen-ts@^1.2.9/compat`. The wasmtk
source code calls the upstream-npm-shaped API (`await wabt()` + `parseWat` /
`readWasm`; `binaryen.readBinary(...)` + `Module` methods) — both compat modules
deliberately mirror that shape, so deno.json is the single switch point. A
3-line `src/binaryen.ts` wrapper handles the only structural asymmetry (CJS
default-export under npm vs ES namespace under JSR). Fifteen toolchain bugs
discovered during this work — 10 in wabt-ts (folded expression parsing, type
section omission, call/call_indirect name resolution, tag-export parsing,
f64 literal encoding, multi-value return, memory alignment defaults,
store-with-call ordering, parenless-folded opcodes, br_if-cond global.get
resolution, try/catch encoding) and 5 in binaryen-ts (if-without-else
inversion, RemoveUnusedModuleElements tag mangling, elem-segment drop on
round-trip, CoalesceLocals signature mismatch, catch-body spurious block
wrapper) — were all filed and fixed upstream by 1.2.9. See CLAUDE.md §
"Pluggable wabt + binaryen backends" for the full bug tables.*

- ✅ `deno.json`: `"wabt": "jsr:@jrmarcum/wabt-ts@^1.2.9/compat"`, `"binaryen": "jsr:@jrmarcum/binaryen-ts@^1.2.9/compat"`
- ✅ `src/binaryen.ts` wrapper handles CJS-default vs ES-namespace asymmetry
- ✅ Call-site shape preserved (upstream-npm-shaped API works against both backends)
- ✅ Wasic-side patch: explicit `inlineExport: false` on `.toText(...)` calls (wabt-ts/compat's default differs from npm:wabt's)
- ✅ Full wasic suite: **260/270 PASS (96.3%)** under dual /compat 1.2.9 — historical snapshot; the
  10 then-failing tests (9 wasic-side codegen + 1 binaryen-ts `-Oz` interaction) have all since been
  fixed (suite is now **293/293**; see compiler-bugs.md / testing.md)
- ✅ Switching back to `npm:wabt` / `npm:binaryen` is a one-line deno.json change — both backends remain supported as fallbacks

---

### Stage 0.6 — Allocator Unification in wasmmerge ✅ COMPLETE (wasmtk, 2026-05-30)

*Closes the last gap that prevented `wasmbundle` from acting as a real on-demand
linker for stdlib capability modules. Pre-unification, each `wasic` / `modc`
module shipped its own bump allocator: `$__malloc` advancing a module-local
`$__heap_ptr` seated past that module's static data. After prefix-mangling, a
merge produced two independent allocators over one linear memory, with
overlapping addresses on the first allocation from either side. With Stage 0.6,
`wasmmerge` detects the bump-allocator function form semantically, drops it from
each merged module, and redirects every call site and global reference to the
master module's shared `$__malloc` and `$__heap_ptr`. The master's heap cursor
is recomputed in `wasic.ts` / `wasmbundle.ts` to sit past the **combined**
post-relocation static data.*

- ✅ `src/wasmmerge.ts` — `detectBumpAllocator()` helper identifies the form
  semantically (single i32 param/result, one set/get on a single global,
  `local.get 0` + `i32.add`, no loads/stores/calls); dropped function index
  redirected to `$__malloc` in `funcName`; `renameGlobalRefs()` extended to
  redirect the heap-ptr global to `$__heap_ptr`. `WatMergeResult` gains
  `droppedAllocator: boolean`.
- ✅ `src/wasic.ts` — post-merge rewrite in `compileWasiTs` and `compileLibTs`
  rewrites `$__heap_ptr` to `(i32.const dataOffset)` and grows memory to
  `max(2, ceil(dataOffset / 65536) + 1)` pages when any sub-merge dropped an
  allocator.
- ✅ `src/wasmbundle.ts` — when any sub-merge dropped an allocator, the master
  WAT synthesizes a shared `$__heap_ptr` global and `$__malloc` function pair
  and recomputes pages.
- ✅ Regression test `tests/wasi/wasm_wasi/18b_SharedHeapTwoLibraries.ts` — two
  modc-compiled libraries both allocate via `.push()`; main asserts both
  return the expected length; PASSING.
- ✅ Runtime notice on each unified merge:
  `allocator unified: dropped $__malloc + heap-ptr global; call sites redirected
  to main module's $__malloc / $__heap_ptr.`
- ✅ Binaryen upgrade: `binaryen-ts/compat` 1.2.9 → 1.3.1 (fixes one prior wasic-side
  failure in the suite); full wasic suite **262/271 PASS (96.7%)** under
  wabt-ts/compat 1.2.9 + binaryen-ts/compat 1.3.1 + the unification pass.

This unblocks the Tier-1 stdlib capability libraries
(`stdlib-bundling-brief.md` §3) — delivered first in Stage 0.7 below.

---

### Stage 0.7 — Tier-1 stdlib capabilities: `Set<i32>` + `Map<i32,i32>` + `Date` (wasmtk, 2026-05-30/31)

*First three Tier-1 stdlib capabilities and the pattern-setter for the rest (JSON,
RegExp). Set/Map demonstrate the headline shared-heap case the Stage 0.6 allocator
unification was built for: a hash table built inside a separately-compiled `modc`
library shares ONE live heap with the `wasic` program that imports it. Date is the
first **leaf** capability — pure value-in/value-out with no heap, so the merge is a
straight function splice.*

- ✅ `tests/wasi/wasm_wasi_bundle/set_bundle/set_lib_modc.ts` — `Set<i32>` open-addressing
  hash table. Handle = i32 pointer to a 4-slot `Int32Array` header
  `[count, cap, keysPtr, usedPtr]`; two `Int32Array(cap)` bucket arrays; linear
  probing on `key & (cap-1)`; ×2 grow + rehash at load factor 0.5 (handle stays
  stable). Exports `setNew`/`setAdd`/`setHas`/`setSize`.
- ✅ Driver imports the library; the library's `$__malloc` resolves to the host
  module's bump cursor via Stage 0.6 unification → one shared heap. Self-checking
  (`@test-pipeline` `18c_SetCapabilityLibrary.ts`, PASSING; traps on any wrong
  result so the `run` step proves Set semantics).
- ✅ Two supporting compiler fixes the shared-heap pointer pattern required:
  (1) **TypedArray view over a raw pointer** (`src/wasic.ts`) — `const v: Int32Array
  = ptr as unknown as Int32Array` now registers a typed-array view so element
  **writes** through it work (previously stubbed; reads worked only by a
  coincidental i32-pointer fallback); (2) **imported-function signature resolution
  from inline params** (`src/wasmmerge.ts`) — `mergeWasmWat` now parses
  `(param i32 i32)` headers when wabt-ts 1.3.0 emits them without a `(type N)`
  reference (otherwise import args defaulted to f64 → `call[0] expected i32, found
  f64`).
- ✅ Backend bump to `wabt-ts@^1.3.0/compat` (fixes the folded call-before-return
  encoder bug — see brief §7a / CLAUDE.md bug table). Recovered `15_panic` and
  `18_Multi-Scope`.
- ✅ Fixed a pre-existing modc bug: string-**returning** library functions imported
  an unused `wasi_snapshot_preview1.fd_write` (the bindgen loader can't supply it).
  `allocString` no longer sets `hasConsoleLog`. `bindgen_tests.ts` 99/103 → 103/103.
- ✅ `tests/wasi/wasm_wasi_bundle/map_bundle/map_lib_modc.ts` — `Map<i32,i32>` reuses the
  Set hash core (linear probing + ×2 grow/rehash) and adds a parallel values array.
  Handle = i32 pointer to a 5-slot `Int32Array` header
  `[count, cap, keysPtr, valsPtr, usedPtr]` over three `Int32Array(cap)` bucket arrays.
  Exports `mapNew`/`mapSet`/`mapGet`/`mapHas`/`mapSize`; `mapSet` updates in place on
  an existing key (count stable), `mapGet(h, key, fallback)` returns the caller's
  fallback for absent keys; key→value association survives rehash. Self-checking
  `@test-pipeline` `18d_MapCapabilityLibrary.ts` (PASSING). **No new compiler fixes
  required** — built entirely on the wasic features the Set capability established.
- ✅ `tests/wasi/wasm_wasi_bundle/date_bundle/date_lib_modc.ts` — `Date` UTC integer
  calendar math (first leaf capability). Howard Hinnant's exact-integer civil↔days
  algorithms, valid across the whole proleptic Gregorian calendar incl. pre-epoch /
  negative day counts. Exports `isLeapYear`, `daysInMonth`, `daysFromCivil`,
  `weekdayFromDays`, `yearFromDays`, `monthFromDays`, `dayFromDays`. Self-checking
  `@test-pipeline` `18e_DateCapabilityLibrary.ts` (PASSING). As the first merged
  library that is dense integer arithmetic over large constants, Date surfaced
  **two merge-path codegen bugs**: (1) `wasmmerge`'s blanket `i32.const >= 260`
  data-pointer relocation corrupted arithmetic literals (`% 400` → `% 668`) — fixed by
  scoping relocation to the merged module's own `(data …)` address extent; (2)
  binaryen-ts/compat's optimizer miscompiled the doubly-merged module — **fixed upstream
  in binaryen-ts/compat 1.3.2** (the temporary skip-Binaryen-on-merge workaround was
  removed once 1.3.2 landed). Full `tests/wasi/wasm_wasi` suite: **268/275** (7 pre-existing
  failures, no regressions).

All five Tier-1 capabilities (Set/Map/Date/JSON/RegExp) are shipped.

---

### Stage 1 — WIT-Aware Loader + Spec (universalWasmLoader)

*universalWasmLoader repo. **CURRENT PRIORITY.** Approximately 2–3 sessions.*

Reference implementation: `wasmtk/src/bindgen.ts` (Phase 50) — the compile-time code
generator that Stage 1 replicates at runtime. All ABI details are authoritative there.

**Core loader:**

- `wit-parser.js` — parse WIT exports, imports, function signatures and types;
  same regex approach as `wasmtk/src/bindgen.ts` `parseWit()`
- `abi.js` — ABI encode/decode; primary `"component"` profile matches the Canonical ABI
  in `src/bindgen.ts` exactly (`cabi_realloc`, out-parameter string returns, bool as i32,
  numerics direct); `"raw"` profile for modules not following the Canonical ABI
- Update `universal-wasm-loader.js` — WIT auto-detection, options interface
  `wasm_import(path, { abi?, wit?, imports? })`, typed export proxy
- Update `universal-wasm-loader.d.ts` — `WasmImportOptions`, `InstancePool`, generic
  return type

**Instance lifecycle (bump-allocator memory model):**

wasic uses a bump allocator with no `free`. Each WASM instance has its own isolated
linear memory that accumulates allocations for the lifetime of the instance. The two
supported patterns and their correct usage:

- **Singleton** `wasm_import(path, opts)` — one instance, cached after first load.
  Correct for: CLI tools, applications that load a library at startup, modules with
  numeric-only exports, any bounded-call scenario. Memory accumulates but never
  meaningfully fills up in normal application lifetimes.

- **Pool** `createPool(path, { size, ...opts })` — returns an `InstancePool` that
  holds `size` fresh WASM instances and cycles through them. Each checkout gets a
  fresh bump pointer; no memory reset logic needed. Correct for: servers handling
  many requests with string-param calls, loop-intensive processing.

`InstancePool` API to implement in `universal-wasm-loader.js`:

```javascript
// Singleton (DLL pattern — default)
const lib = await wasm_import("./module.wasm");
lib.greet("world");

// Pool (server/loop pattern)
const pool = await createPool("./module.wasm", { size: 4 });
const result = await pool.run(lib => lib.greet("world"));  // acquire → call → release

// Manual acquire/release
const lib2 = await pool.acquire();
try { lib2.greet("world"); }
finally { pool.release(lib2); }
```

`InstancePool` interface:

- `acquire(): Promise<T>` — checks out an instance (waits if all busy)
- `release(instance: T): void` — returns instance to the pool
- `run<R>(fn: (lib: T) => R | Promise<R>): Promise<R>` — acquire + call + release
- `size: number` — total pool capacity
- `available: number` — instances currently idle
- `destroy(): void` — tears down all instances

**Spec and tests:**

- `SPEC.md` — full cross-language specification; sections: core interface, WIT
  auto-detection, ABI profiles, Canonical ABI definition, instance lifecycle model
  (singleton vs. pool, bump allocator memory model), language port requirements,
  reference test suite, versioning
- Reference test suite — `.wasm` + `.wit` pairs from wasmtk Phase 50 fixtures
  (`math_50`, `booleans_50`, `strings_50`, `imports_50`) with known I/O; plus a
  pool test using `strings_50` with 100 iterations to verify no memory exhaustion

---

### Stage 2 — High-Priority Cross-Language Loaders

*Separate repos. Approximately 2–3 sessions each.*

- `universalWasmLoader-rs` — Rust (crates.io)
- `universalWasmLoader-py` — Python (PyPI)

These two cover the highest-demand use cases outside the JS ecosystem and validate
that the spec is implementable before committing to additional ports.

---

### Stage 3 — Build Orchestration Foundation

*wasmtk repo. Approximately 3–4 sessions.*

- `[wasmtk]` section parser in wasmtk CLI
- `wasmtk build` command — reads manifest, invokes per-language compilation
- Language recipes: TypeScript (wasic), Rust (cargo-component), Python
  (componentize-py)
- WIT validation — verify interface contracts across components before composition
- `wasmtk compose` — wraps `wasm-tools compose` with WIT-aware wiring
- `wasmtk run` — runs composed output via configured host runtime
- Dependency graph — build components in correct WIT-consumption order

---

### Stage 4 — Full Polyglot Project System

*wasmtk repo + additional language repos. Ongoing.*

- `wasmtk setup <language>` — scaffolds component + adds pixi.toml configuration
- `wasmtk port <component> --to <language>` — new language scaffold with same WIT
- `wasmtk activate <component>` — swaps implementation, validates WIT compatibility
- Incremental builds — source hashing, only rebuild what changed
- Additional language recipes: Go, Zig
- Additional loaders: `universalWasmLoader-go`, `universalWasmLoader-jvm`, `universalWasmLoader-c`

---

### Stage 5 — Ecosystem

*Long-term.*

- Component registry — publish and consume pre-built WASM components
- IDE integration — WIT-aware cross-language intellisense at component boundaries
- Cross-component debug adapter — WASM DWARF debugging across language boundaries
- Cross-component profiler — trace call paths across component boundaries regardless
  of source language

---

## Repository Summary

```text
jrmarcum/
├── wasmtk                        ← TypeScript compiler + polyglot build CLI
├── binaryang                     ← wabt + binaryen TS ports in one package; consumed by wasmtk via /compat/wabt + /compat/binaryen
│                                   (merged 2026-08-27; wabt-ts and binaryen-ts are its FROZEN predecessors)
├── universalWasmLoader           ← JS/TS loader + SPEC.md (reference impl)
├── universalWasmLoader-rs        ← Rust port (Stage 2)
├── universalWasmLoader-py        ← Python port (Stage 2)
├── universalWasmLoader-go        ← Go port (Stage 4)
├── universalWasmLoader-jvm       ← Java/Kotlin port (Stage 4)
└── universalWasmLoader-c         ← Zig/V/Julia header (Stage 4)
```

The spec in `universalWasmLoader/SPEC.md` is the single written contract that all
repos agree on. The ABI conventions in `wasmtk/cmem/architecture.md` § "Canonical ABI" (with
`cmem/polyglot-producers.md` for the forward-alignment decision) are the authoritative source for
what wasmtk emits — not `wasmtk/CLAUDE.md`, which is now a gitignored pointer file. The two
documents cross-reference each other.

---

## Immediate Next Steps

In order:

1. **Stage 1** — Enhance universalWasmLoader + write SPEC.md — **CURRENT PRIORITY**
   Reference: `wasmtk/src/bindgen.ts` (Phase 50) for ABI details (Canonical ABI alignment is
   *partial* — see [polyglot-producers.md](polyglot-producers.md); realloc/param side adjacent,
   return side not yet canonical)
2. **stdlib-bundling-brief.md §5–7** — Tier-1 capability libraries as `modc` modules,
   plus tree-shake wiring in `wasmbundle`; unblocked by Stage 0.6 allocator unification.
   `Set<i32>` + `Map<i32,i32>` + `Date` + `JSON` (parse+navigate, integer v1) + `RegExp`
   (backtracking matcher) all shipped (Stage 0.7, 2026-05-30/31). Parallel track to Stage 1.
3. **Stage 2** — `universalWasmLoader-rs` and `universalWasmLoader-py` — validates the spec
4. **Stage 3** — Build orchestration — the pixi integration becomes real
5. **Stage 0** ✅ COMPLETE (partial alignment) — `cabi_realloc` export + out-param string returns
   (2026-05-19); 446/446 pass under npm:wabt baseline (2026-05-25). NOTE: this is *partial*
   Canonical ABI alignment — return side not yet canonical, output is a P1 core module + sidecar WIT
   (see [polyglot-producers.md](polyglot-producers.md)); full forward-alignment is a
   decided-but-unimplemented track
6. **Stage 0.5** ✅ COMPLETE — Dual JSR /compat migration done (2026-05-28); wabt-ts/compat 1.2.9 +
   binaryen-ts/compat 1.2.9; 260/270 PASS on the wasic population; 15 toolchain bugs filed and fixed
   during rollout; deno.json is the single switch point for npm ↔ JSR backends
7. **Stage 0.6** ✅ COMPLETE — Allocator unification in wasmmerge done (2026-05-30); binaryen-ts/compat bumped to 1.3.1; 262/271 PASS; `wasmbundle` now functions as an on-demand stdlib linker

