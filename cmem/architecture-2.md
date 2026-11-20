# architecture — part 2 of 2

Continues [architecture.md](architecture.md) (split by size on 2026-11-20, letter H38). Sections:

- The merge (wasmmerge.ts) — the "DLL linker"
- Bump allocator / instance lifecycle
- Canonical ABI (Stage 0 + return-side forward-alignment, 2026-06-15)

## The merge (wasmmerge.ts) — the "DLL linker"

Splicing a modc `.wasm` into a host module needs three hard parts, all handled:

- **Prefix-mangling** — every internal name → `${prefix}_name` (collision-free).
- **Data relocation** — `relocateDataPtrs` shifts data-segment pointers by the combined data offset,
  **scoped to the merged module's own `(data …)` address extent** so arithmetic constants aren't
  mistaken for pointers (the Date fix; a pure leaf with no data segments relocates nothing).
- **Allocator unification (Stage 0.6)** — `detectBumpAllocator` finds each module's `$__malloc`
  (semantic gate: `(param i32)(result i32)`, touches exactly one global read **once** + written
  **once**, `local.get 0` + `i32.add`, no loads/stores/calls), drops duplicates, and redirects call
  sites + the heap-ptr global to the host's single `$__malloc`/`$__heap_ptr`. This makes a structure
  built in one merged unit share one live heap with another. `WatMergeResult.
  droppedAllocator`
  signals it; a leaf lib (no malloc) skips it.
- **Merge guards (loud failure, not silent corruption)** — a merged-in module must not carry
  constructs that can't survive the WAT-splice; `wasmmerge` throws a clear diagnostic instead of
  emitting a broken/corrupt module: (1) **`call_indirect`** (2026-06-05) — Phase 18 strips imported
  type sections, so a `(type N)`/table ref would dangle; (2) **`memory.grow`** (2026-06-07) —
  signals a foreign allocator that claims linear memory upward (Go runtime alloc / Rust dlmalloc /
  Zig `page_allocator`) instead of sharing the host bump heap, which would silently corrupt once it
  allocates. The `memory.grow` diagnostic names the per-language fix (static-arena allocator) or
  points to keeping the module standalone as a WIT/bindgen component. wasmtk's own producers
  (wasic/modc) emit neither — their bump allocator runs over fixed pre-declared pages — so the
  guards fire only on heap-using foreign-language modules. (Background: the native-producer
  mergeability matrix in [polyglot-producers.md](polyglot-producers.md).)

## Bump allocator / instance lifecycle

`$__malloc` advances `$__heap_ptr`; **no `free`**. Allocations accumulate for the instance lifetime
— intentional and correct for the DLL/singleton use case (CLI tools, bounded calls). For servers
doing many string-param calls, the planned mitigation is an instance **pool** (`createPool`) in the
universalWasmLoader, cycling fresh instances. `cabi_post_return` (full Component Model) would remove
the need but is deferred.

## Canonical ABI (Stage 0 + return-side forward-alignment, 2026-06-15)

**Accuracy note (updated 2026-06-15):** the realloc/param side AND the **return side** are now
canonical-aligned; what remains non-canonical is only the **container** — the artifact is a P1
**core module** with a **sidecar** `.wit` (not an embedded component-type section), and boundary
marshalling is still done **host-side** in bindgen rather than by the binary. So: "aligned with the
Component Model Canonical ABI calling convention, shipped as a P1 core module + sidecar WIT" is the
accurate phrasing. The remaining P1→P2 step (embed the component type + `wasm-tools component new`)
is now a **wrap, not a rewrite** — see [polyglot-producers.md](polyglot-producers.md).

- Exports `cabi_realloc(ptr,old,align,new)` (a `select`-based wrapper over `$__malloc`) instead of
  `__malloc`, when any export has a string param/return.
- **String returns use the canonical callee-allocated convention (2026-06-15).** A `$fn__cabi` shim
  (exported as `"fn"`, signature `(...params) -> i32`) allocates an 8-byte `[ptr, len]` return area
  via `cabi_realloc`, calls the internal void `$fn` (which sets `$__str_ret_ptr`/`$__str_ret_len`
  globals), writes ptr+len into that area, and **returns the area pointer**. A paired
  `cabi_post_<fn>` export (empty body — the bump allocator has no free, but the export must exist
  for the contract) lets the host release the buffer. The `$__str_ret_*` globals stay internal.
- bindgen host: numerics direct; bool `x?1:0` / `r!==0`; string params `TextEncoder`+`cabi_realloc`;
  string returns call the export → read `[ptr,len]` at the returned pointer via `DataView.getInt32`
  at 0/4 → decode → call `cabi_post_<fn>(retPtr)`. (The host no longer allocates the return area.)

