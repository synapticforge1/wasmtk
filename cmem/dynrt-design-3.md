# dynrt-design — part 3 of 6

Continues [dynrt-design.md](dynrt-design.md) (split by size on 2026-11-20, letter H38). Sections:

- #14 — memory / GC track (mark-sweep, built in tested parts) (STARTED 2
- Functions-as-`any` — Phase 1 (pin table + core→host proxy) ✅ SHIPPED 2

## #14 — memory / GC track (mark-sweep, built in tested parts) (STARTED 2026-06-22)

Decision (owner 2026-06-22): build a **full mark-sweep GC**, but **in parts that are each tested +
integrated** (same cadence as the rest of #14). **The hard part is ROOT-FINDING:** wasic locals
holding `any` handles aren't distinguishable from plain-i32 locals at runtime, so a precise collector
eventually needs an explicit **shadow-stack** of live handles (a real but bounded redesign, in the
mark phase). Staged plan: **P1 auto-grow** → P2 free-list (`$__free` + reuse) → P3 GC object headers /
cell registry → P4 roots (shadow-stack) + mark → P5 sweep + `collect()` + trigger integration.

**Part 1 — auto-grow `$__malloc` — ✅ SHIPPED 2026-06-22** (test `18r`). `$__malloc` now `memory.grow`s
by `ceil(deficit / 64KiB)` pages when the bump pointer runs past the allocated pages, lifting the
fixed ~2-page limit (that capped deep recursion / long dynamic loops) to WASM's multi-GiB memory
limit. It does NOT free — a truly unbounded loop still exhausts eventually (that's P2–P5) — but it
fixes the immediate symptom: `fib(10)` (≈177 interpreter calls) used to overflow; **`fib(15)` (≈1973
calls) now runs** (`tests/wasi/wasm_wasi_bundle/dynrt_eval_bundle/main_gc.ts`).
**CRITICAL gotcha:** auto-grow is emitted **only in executable (WASI) modules**, NOT modc libraries.
A merged library's `$__malloc` is dropped + replaced by the host's during wasmmerge allocator
unification, AND the `memory.grow`/`memory.size` opcodes defeat `detectBumpAllocator` (so the lib's
malloc wouldn't be recognized/dropped) **and break the merge's wabt-ts re-assembly** ("Cannot read
imported WASM"). Gating on `this.mode !== "library"` keeps libraries' malloc simple (merge-safe) while
the surviving executable malloc auto-grows — so merged programs (incl. the dynrt interpreter) still
benefit. (Unrelated bug noticed while testing: a `const x` inside a SINGLE-physical-line nested block
isn't declared as a WAT local → "local $x cannot be resolved"; the test uses a multi-line `check`.)

**Part 2 — free-list allocator — ✅ SHIPPED 2026-06-22** (test `18s`). The allocator can now RECLAIM:
`$__free(ptr, size)` links a block (>= 8 bytes; smaller blocks leak — can't hold the header) into a
new `$__free_list` global, storing `[blockSize@0, nextFree@4]` in the block's own first 8 bytes;
`$__malloc` walks the free list FIRST-FIT before bumping. **No splitting in v1** (returns the whole
block — internal frag is fine). Executable-only (same gating reason as P1: a merged library's malloc
is dropped + replaced by the host's, and the free-list loads/stores/loop would defeat
`detectBumpAllocator` + break the merge). On its own the free list is **dormant** — nothing calls
`$__free` yet (the GC sweep will, in P5). Tested directly via three new wasic intrinsics added for the
GC + its tests: **`__malloc(size)` / `__free(ptr, size)` / `__heapPtr()`** (emitExpr + emitStatement
handlers → `call $__malloc` / `call $__free` / `global.get $__heap_ptr`). Test
(`tests/wasi/wasm_wasi_bundle/gc_bundle/freelist.ts`) self-checks (trap-on-failure): a freed 64-byte block
is reused by a later `__malloc(64)` (same ptr, bump cursor unchanged) and by a smaller `__malloc(32)`;
a fresh `__malloc(48)` with an empty list bumps (ptr advances). **Edit gotcha:** the malloc template
shared one `parts.push(\`…\`)` with `$cabi_realloc`; splitting malloc into a mode if/else left
`cabi_realloc` dangling — re-wrap it in its own `parts.push`.

**Part 3 — cell registry — ✅ SHIPPED 2026-06-22** (test `18t`). Every boxed value cell now flows
through `mkCell()` (4-slot) / `mkCell5()` (5-slot user-function), which allocate the cell AND record
its pointer in a registry list `__gc_reg` (the self-managed Set/Map list idiom) — so P4 (mark) / P5
(sweep) can ENUMERATE all allocations. Only value cells are registered; payloads (Float64Array /
Uint8Array / container lists) are reached THROUGH a cell and will be freed by reading its fields.
Exposed `dynGcCellCount()` for testing. The registry append is INLINED into `mkCell` (only the rare
grow path calls listPush) because `mkCell` is the hot allocation site at the DEEPEST interpreter
recursion point, and every extra WAT frame lowers the max depth before V8's call-stack overflows.

**Three traps hit building P3 (all instructive):**
1. **`replace_all` self-recursion.** Routing the 8 `new Int32Array(4)` cell sites through a new helper
   via `replace_all` ALSO rewrote the `new Int32Array(4)` INSIDE the helper's own body → the helper
   called itself → WASM stack overflow on EVERY dynrt program. (The helper was also renamed
   `newCell`→**`mkCell`**; a name starting with `new` was a red herring — wasic parses `newCell()` fine
   — but `mk*` avoids any confusion.)
2. **V8 call-stack, not heap.** `mkCell`'s extra frame tightened the interpreter's max recursion
   (bound by V8's WASM call stack, SEPARATE from the heap limit P1 lifted). Mitigated by inlining the
   registry append; `18p` is fib(8), `18r`'s fib(15) still passes.
3. **The merge mutable-global clobber (the real bug).** `__gc_reg`'s `0` sentinel was being rewritten
   to 131072 by wasmmerge → registry never initialized → heap corruption / OOB at ~3–4k cells. Fixed
   in `src/wasmmerge.ts` (see cmem/compiler-bugs.md "wasmmerge clobbered ALL merged mutable globals").
   This is what unblocked P3 — and `dynGcCellCount()` returning garbage (768) with the registry
   DISABLED was the diagnostic tell.

**Registry overhead caveat (matters for P5):** until the sweep reclaims, the registry is pure overhead
(tracks every cell + the list's doubling leaks old copies, nothing freed). P5's `collect()` is what
makes it pay off — and should also free the registry's own stale doublings (via P2's `__free`).

**Part 4 — roots + mark — ROOT STRATEGY DECIDED (owner 2026-06-22): interpreter SHADOW-STACK.** The
dynrt interpreter will maintain an explicit stack of its live handles (push on bind/alloc, pop on
scope exit); mark traverses from that stack + the env chain. Precise and safe to run mid-interpretation
(reclaims fib-style churn — the real win). It does NOT collect `any` handles sitting in arbitrary
compiled-wasic locals (not enumerable without compiler root-maps) — documented scope, not a bug.
Part 4 is split into **P4a (mark mechanics, explicit roots)** and **P4b (wire the shadow-stack)**.

**Part 4a — mark phase — ✅ SHIPPED 2026-06-22** (test `18u`). From a root handle, `gcMark` recursively
marks every reachable cell. **Mark bit = bit 8 (256) of slot-0 tag** — uniform across 4-slot and
5-slot cells, NO extra storage; real tag = `slot0 & 255`. The bit doubles as the visited set so cycles
terminate. Only CELLS are followed: array/object element handles (the list at slot a) and a
user-function's body/params/defEnv (slots 2/3/4 when slot1 = -1); number/string payloads + object key
byte-pairs are owned non-cell allocations (the sweep frees them via the owning cell). Exports
`dynGcMarkClear` / `dynGcMark(root)` / `dynGcMarkedCount`. **Key invariant:** the rest of the runtime
never sees the mark bit because a full collect() clears every survivor's mark before returning, so
between collections all tags are clean and `dynTag`/`dynTypeof` need no masking (only mark/sweep mask).
Test verifies mark reaches exactly the live set across nesting (`obj → arr → 3 numbers` = 5) and leaves
orphans unmarked. **Caveat:** `gcMark` is recursive — a very deep object graph could overflow the WAT
stack; an explicit work-list is a later hardening if needed. **Next: P4b** (shadow-stack) then **P5**
(sweep: free unmarked cells + their payloads via P2's `__free`, then clear marks; + trigger policy).

**Part 4b — interpreter shadow-stack (roots) — ✅ SHIPPED 2026-06-23** (test `18v`). A precise
collector must know every live handle; wasic locals holding `any` aren't enumerable, but the
interpreter's live state is exactly its chain of active scopes. New explicit root stack `__gc_roots`:
`dynRun` `gcPushRoot(env)` on entry / `gcPopRoot()` on its single exit, so during a nested call the
stack holds `[driver-env, scope1, scope2, …]` — every frame that will resume. `dynGcMarkRoots()`
clears marks then marks from every root. Exports `dynGcPushRoot`/`dynGcPopRoot` (host registers its
OWN top-level roots — needed by P5), `dynGcRootCount`, `dynGcMarkRoots`.

**Critical companion fix to `gcMark`:** an ENV is a tag-6 object whose PARENT scope link lives in
**slot 2** (`en[2]`; regular objects keep 0 there). P4a's `gcMark` did NOT follow slot 2, so marking
an inner scope missed all enclosing scopes. Now `gcMark` follows `n[2]` for tag-6 cells (harmless
no-op for regular objects) — so marking one scope (or a closure's defining env) keeps the whole
lexical chain + captured vars alive. Also guarded the `-1` "no env" sentinel (`evalEnv`/top-level
parent) alongside `0` so it's never dereferenced.

Test verifies: push/pop **balance** (root count back to 0 after a nested `f(4)` run); **mark-from-
roots** reaches a driver-pushed `[1,2,3]` graph (exactly 4 cells); and marking a returned **closure**
traverses tag-7 → defEnv → bound values + slot-2 parent (≥5 cells). **Stack-depth note:** the
push/pop calls return before `runStatements`, so they're NOT on the WAT stack during the deep
recursion — `18r`'s fib(15) still passes. **Next: P5** — `collect()` = `dynGcMarkRoots()` → sweep
(free every unmarked registered cell + its payloads via P2's `__free`, compact the registry) → marks
already cleared on survivors; + a trigger policy (collect when the registry passes a threshold).

**Part 5a — mark-sweep collect (cells) — ✅ SHIPPED 2026-06-23** (test `18w`). The capstone:
`dynGcCollect()` = `dynGcMarkRoots()` → sweep the registry → reclaim every UNMARKED cell and compact
the registry in place; survivors keep their slot, mark cleared. Returns the count reclaimed.

**Allocator decision — dynrt owns a recycling free list (does NOT reuse the wasic `$__free`).** The
clean way to feed P2's `$__free` would need wasmmerge to UNIFY a `$__free_list` global across the
merge (like `$__heap_ptr`) — extra surgery on the delicate merge, AND low memory (0–259, iov+scratch)
has no safe fixed address for a shared head. Instead dynrt has its OWN free list: `dynAlloc(size)`
hands out `8 + n*elemSize` blocks, REUSING ones `dynFreeBlock` returned (first-fit, head `__dyn_free`)
before bumping via the `__malloc` intrinsic; `mkCell`/`mkCell5` now allocate through it. So the GC
reclaims into the same pool it allocates from, fully inside the lib — no wasmmerge/wasic change. A
freed block stores `[size, next]` in its first two view slots (base+8/+12) so it must be ≥16 bytes
(cells are 24/28); **reused blocks are ZEROED** because constructors rely on unset slots being 0 (a
plain object's slot-2 parent link especially — a stale value there would make `gcMark` follow a bogus
parent). Sizes are exact from the wasic formula: 4-slot cell **24**, 5-slot **28**, number payload
**16**, string **8+len**, list **8+(cap+2)*4**.

`dynGcMarkRoots` was extended to also mark the interpreter "registers" (`evalEnv` / `lastValue` /
`evalReturnVal`) so a collection is safe to run at any point / right after a `dynRun`. **Consequence
(broke + fixed `18v`):** mark-from-roots now also marks those registers, so a test asserting an EXACT
marked count from `dynGcMarkRoots` must run with clean interpreter state (before any `dynRun`, when
`evalEnv=-1` / regs=0) — `18v`'s driver-root case was reordered to run first.

Test verifies: collect reclaims the garbage, the registry shrinks by exactly `freed`, the freed cells
land on the recycle list (`dynGcFreeCount`), a live value in a rooted env survives intact, and later
allocations REUSE reclaimed blocks (free count drops). **P5b (remaining):** reclaim the PAYLOADS too
(route the constructors' Float64Array/Uint8Array/list allocations through `dynAlloc`, free them in the
sweep) — payloads are the bulk, so this is what actually bounds memory; plus a TRIGGER policy
(auto-collect at interpreter statement boundaries past a registry threshold) so deep recursion / long
loops collect without an explicit call.

**Part 5b — payload reclamation + auto-collect trigger — ✅ SHIPPED 2026-06-23. THE GC TRACK IS
COMPLETE.** (test `18x`). Two pieces:

(1) **Payloads reclaimed too.** The constructors' `Float64Array(1)` / `Uint8Array(len)` / list
allocations now flow through `dynAlloc` (the same `... as unknown as TypedArray` view — base+8 data,
no header length is ever read), and the sweep frees each garbage cell's payloads by tag (`gcFreePayload`
+ `freeList`): number→16, string→8+len, array→element list, object→values list + keys list + each key
Uint8Array. Referenced CELLS are not freed here (registered + swept on their own). Payloads are ~⅔ of
dynrt's memory, so this is what actually bounds memory.

(2) **Auto-collect trigger.** `maybeCollect()` runs at every interpreter statement boundary in
`runStatements` (a safe point: the previous statement is complete, the next hasn't begun); it collects
once the registry passes `__gc_threshold`, then raises the threshold to 2× the surviving live set (min
8192) — the standard grow-to-amortize heuristic.

**The hard correctness piece — root mid-expression temporaries.** A statement boundary is safe ONLY
for values already bound to a scope; a recursive-descent evaluator also holds **intermediate** operands
(`left` in `a OP b`, the callee + partial args in a call) that live across a right-operand parse, and
that parse can run a user function whose nested statement boundary triggers a collect. So
`fib(n-1) + fib(n-2)` would let the nested `fib(n-2)` free the pending `fib(n-1)` → corruption (seen as
`float unrepresentable in integer range` when the garbage NaN hit `$__f64_to_str`). Fix: the evaluator
now `gcPushRoot`/`gcPopRoot` the accumulated operand across each right-operand parse at EVERY binary
level (`parseMul`/`parseAdd`/`parseRel`/`parseEq`/`parseAnd`/`parseOr`/ternary) and the callee + args
array across a call. **Gotcha hit:** wrapping `parseAnd`/`parseOr` accidentally dropped the
short-circuit `evalLive = saved;` restore → `18n`'s `inc()` short-circuit test failed; restored.

**Proof (`18x`):** a 10000-iteration interpreter loop (`s = s + (i+1)`) allocates ~30000 cells but runs
in BOUNDED memory (auto-collect reclaims each iteration's garbage); the sum is correct (50005000 — no
live value wrongly collected) and a final explicit collect leaves only **5** live cells. `18r`'s fib(15)
also passes with auto-collect firing during the recursion.

**GC track summary (P1–P5b, all shipped 2026-06-22/23):** auto-grow heap → free-list intrinsic → cell
registry → mark (tag-bit-8, env-parent slot-2) → shadow-stack roots → collect (mark-sweep, dynrt-owned
recycling `dynAlloc`/`dynFreeBlock`) → payload reclamation + auto-collect (intermediate-rooted). dynrt
now runs long-lived dynamic code in bounded memory.

**GC polish — ✅ SHIPPED 2026-06-23 (after P5b):** the two memory leaks noted at P5b are FIXED.
(a) **<16-byte blocks** (short strings / object keys — Uint8Array < 16B) used to leak because the
free-list header needs 16 bytes; now both `dynAlloc` AND `dynFreeBlock` round size UP to
`GC_MIN_BLOCK = 16`, so EVERY block is recyclable (a few wasted bytes, no leak — this was the only
*growing* leak). (b) **registry doubling** — `mkCell`'s grow branch now `dynFreeBlock`s the old
backing array after `listPush` copies into the larger one (one-time recovery; the registry stops
growing at steady state). (c) **Free-list SPLITTING — ✅ SHIPPED 2026-06-23** (test `18y`): the real
"coalescing" gap turned out to be the opposite — `dynAlloc` reused an oversized block without
splitting, so when a big block served a small request and was later freed at its smaller logical size,
the leftover bytes were LOST (a slow size-mismatch leak). Now `dynAlloc` carves the remainder (≥16B)
off the chosen block as its own free block at `cur + size`, so nothing is lost. (Number-heavy code
already did exact reuse via first-fit and never splits; this only bit mixed-size workloads.) Verified
with a mixed-size build-large-array / drop / collect cycle that forces the split path — correctness
holds and memory is fully reclaimed (0 live cells). No-regression verified (full dynrt set green).

**(d) Adjacency-COALESCING via a HYBRID allocator — ✅ SHIPPED 2026-06-23 (test `18z`).** First
attempt (address-sorted coalesce-ON-FREE) hung mid-allocation — a free-list CYCLE under split-churn +
registry-array-free (NOT a double-free; a `cur===ptr` guard didn't fix it → a coalescing mis-link
caused by **re-entrancy**: `dynAlloc` splits and frees the remainder *mid-allocation*, interleaving
with the sorted-list pointers). Reverted, then RE-DONE as a three-tier hybrid that isolates the
fragile part:
  • **Segregated buckets** for the dominant exact sizes (16 number-payload / 24 4-cell / 28 5-cell /
    32 smallest list) — pure LIFO push/pop, O(1), structurally CAN'T cycle. Number-heavy code lives
    here and pays nothing; also gives perfect exact reuse (kills the residual sub-16 leftover loss).
  • **Tier 2** (`__dyn_free`) general pool for other sizes — LIFO first-fit + split.
  • **Batch `defragFull`** — the ONLY coalescing site: a SNAPSHOT pass (gather all lists → address
    merge-sort (iterative merge, O(log n) recursion) → merge adjacent → redistribute), so it never
    interleaves with allocation → the re-entrancy bug is impossible. Two triggers: PROACTIVE adaptive
    node threshold (`__free_nodes > __defrag_threshold`, reset ×2 after → amortized O(1)/free) and
    ON-DEMAND (`__free_bytes >= request` before bumping — recover freed runs for a large request only
    when it could plausibly help). Counters `__free_nodes`/`__free_bytes` drive both.
Verified with a `dynGcCheckHeap()` integrity hook (no cycle / valid sizes / counters consistent) run
after every phase of the exact stress that hung the first attempt — all clean, memory fully reclaimed.
**Balance achieved:** hot path O(1) bucket churn (never defrags), Tier-2 + large requests get
coalescing memory-efficiency, defrag amortized + self-gated. **wasic gotchas hit:** an inline
`(cur as Int32Array)[1]` index isn't supported (bind the view first); a `let` global initialized from
a `const` identifier is mis-detected as immutable (init `__defrag_threshold` to a literal `512`); a
ternary assigned to a global isn't supported (use `if`). Tunables (`GC_DEFRAG_BASE=512`, bucket sizes)
are named constants. The root-stack's own (tiny) doublings are still left (negligible).

**Minor wasic gap surfaced (worked around in the split test):** `f64call() | 0` (truncating a
function call that returns f64, in an i32 context) miscompiles — `i32.add[1] expected i32, found call
of type f64` — the `| 0` truncation doesn't fire on a call result. Worked around by comparing the f64
elements directly. Logged in compiler-bugs.md.

**Remaining #14 odds-and-ends (NOT GC, won't fix soon):** **functions-as-`any`** still cross the host
boundary as opaque handles — and this is fundamental, not a quick fix: unlike numbers/strings/objects
(which bindgen deep-COPIES into JS values), a function is code, so it must stay a dynrt handle; but a
host-held handle CAN'T be rooted across collections (the documented root-model limit — the GC only
sees interpreter roots, not host locals), so a host-held function proxy would be unsafe the moment any
later core call triggers a collect. Shipping it would be shipping a use-after-free. Deferred until/if
there's a host-pinning mechanism (e.g. an explicit handle table the GC also roots).

## Functions-as-`any` — Phase 1 (pin table + core→host proxy) ✅ SHIPPED 2026-06-23

The pin table + bindgen proxy are DONE (tests `18za` + bindgen `testGenBindingsAnyFunction`):

**Pin table (dynrt lib).** `__gc_pins` slot-list; `dynGcMarkRoots` also marks every non-zero pin.
Exports `dynGcPin(h) → slot` (reuses a released 0-slot, else appends) / `dynGcUnpin(slot)`. The list is
allocated via listNew (not mkCell) so it's never swept. Non-moving GC ⇒ pinning only needs to keep the
handle marked. Test `18za`: create a function via the interpreter, pin it, make it GC-unreachable
except via the pin, collect under garbage, then call it via `dynApply` — correct result (42) proves it
survived (integrity-checked).

**bindgen `_unbox` tag-7 proxy.** On `dynTag(h)===7`, `_dynGcPin(h)` then return a JS proxy
`(...args) => _unbox(_dynApply(h, argsArr(args.map(_box))))` with a `.release()` (→ `_dynGcUnpin`) and a
`FinalizationRegistry` backstop. Added `dynApply`/`dynGcPin`/`dynGcUnpin` to `dynrtMarshalExportNames`
(wasic.ts) so they're exported post-merge. bindgen 119/119 (the proxy generates + type-checks; existing
`any` marshalling unaffected).

**Function PRODUCER + full END-TO-END — ✅ SHIPPED 2026-06-23.** Typed wasic source can now create a
function value: **`Function(params, body)`** (and `new Function(...)`) lowers — via a wasic.ts pre-pass
(`/\b(?:new\s+)?Function\s*\(/` → `dynrt_dynMakeFn(`) — to a new dynrt export `dynMakeFn(paramNames,
body)` (splits the comma-separated names into a value-model array, builds a user function over a fresh
env). The tsbundler trigger gained `usesFunction` + `dynMakeFn` in the auto-import set. **Full
end-to-end verified** (bindgen `testIntegrationFnAny` + the `anysig_bundle` host): a modc lib
`getDoubler(): any { return Function("x", "return x * 2;"); }` → bindgen → host calls
`m.getDoubler()(21)` → **42** (the proxy boxes the arg, calls `dynApply`, unboxes the result; the
handle is pinned). bindgen 119/119.
**Gotcha (real bug hit + fixed):** the `usesFunction` trigger matched `Function(` inside dynrt's OWN
doc-comment → the dynrt lib auto-merged ITSELF (circular, broke every dynrt test at the wasic step).
Fixed by NOT sniffing triggers over comments/strings.
**Post-publish "look for code issues" audit (2026-06-24) — 3 latent correctness bugs fixed; full detail
in compiler-bugs.md (bindgen 119→122, suite 336/336):** (1) the bindgen tag-7 proxy registered with a
`FinalizationRegistry` WITHOUT an unregister token, so `release()` + later GC double-unpinned the slot →
if reused by a newer pin in between, the live handle was wrongly unpinned (ABA → use-after-free) — fixed
with an idempotent `_released` guard + `unregister(_fn)` + a 3rd-arg unregister token. (2) the tsbundler
comment-only strip ate a `//` inside a string literal (URL) and the rest of that line, hiding a real
trigger after it → replaced with a single-pass `stripCommentsAndStrings()` scanner that tracks comment
AND string state. (3) the wasic `eval(`/`Function(` source pre-passes rewrote inside string literals +
comments (a printed `"…Function()…"` came out `"…dynrt_dynMakeFn()…"`) → new code-only scanner
`rewriteOutsideStringsAndComments()`; regression `18zb`.
**Phase 2 (host→core, a JS function INTO the core) — ✅ SHIPPED 2026-06-24.** A JS function passed into
the core as `any` is registered in a bindgen host-fn table; `_box` wraps the index via a new dynrt export
`dynMakeHostFn(index)` → a tag-7 cell with marker slot[1] = -2, slot[2] = index. `dynApply` routes such a
value back to the host through a single `env.__host_call` import (declared in the dynrt lib via Phase 40
`declare const __host: { call(...) }`). bindgen's loader implements `env.__host_call(fnIdx, argsArr)`:
look up the JS fn, unbox the args array → JS args, invoke, box the result. The import↔impl chicken-and-egg
(import needed at instantiate, impl needs the exports) is solved with a function-scoped `_hostCallImpl`
holder assigned after `_box`/`_unbox` exist, forward-referenced by `env.__host_call`. Verified end-to-end
(bindgen `testIntegrationHostFn`, fixture `hostfn_50`): `m.applyTwice(n=>n+1, 10)` → **12** (core calls the
host fn twice), `m.combine((a,b)=>a*b, 6, 7)` → **42** (two args). Surfaced + FIXED a real wasmmerge bug
(non-WASI imports were spliced after function definitions → malformed module / OOB; see compiler-bugs.md).
**With Phase 2, functions-as-`any` is bidirectional and #14 is COMPLETE with no deferred pieces.**
`dynMakeHostFn` added to the marshal-export set; bindgen 131/131.

