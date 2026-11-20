# roadmap-2b — continues [roadmap-2.md](roadmap-2.md)

(Split by size on 2026-11-20, letter H38.)

    calls in `parsePostfix` (`f(args)`, any arity, nested); real short-circuit via an `evalLive`
    skip-parse flag guarding the call dispatch (the only side-effecting op), proven observable via
    the `inc()` counter. Surfaced 1 wasic gap (i32 global / typed-array element as an f64 call-arg
    skips the `f64.convert` — bind to a local; logged in compiler-bugs.md). **Increment 2d.1 —
    statements + control flow (`dynRun`) — SHIPPED 2026-06-22** (test `18o`): a statement
    interpreter over the expression evaluator — let/const/var + bare-identifier assignment (mutate
    the env via `dynSet`), if/else, while, `{ }` blocks, expression statements, return; control flow
    uses the DIRECT-eval re-parse trick (while re-sets the cursor to the condition start each
    iteration; dead branches reuse the 2c `evalLive` skip-parse) so no AST is needed; ran factorial
    / fibonacci(10)=55 / nested loops / early return / builtin calls in statements. **Authoring
    decision held — STILL in the subset (no wall → no `rtcore`/hand-WAT needed); NO new compiler
    gaps.** **Increment 2d.2 — user-defined functions + `new Function` — SHIPPED 2026-06-22
    (COMPLETES interpreter increment 2)** (test `18p`): user function values (5-slot cell = body +
    params + defining env), in-source `function name(params){…}` declarations (body source captured
    by a brace scan) + `dynMakeFunc(params, bodyStr, env)` (the `new Function` =
    runtime-code-from-strings capability); a call runs the body via `dynRun` in a fresh scope whose
    parent is the defining env, so RECURSION + closures work via an `envLookup` scope chain; the
    hard part — parser reentrancy — is handled by saving/restoring the shared parser globals around
    the nested `dynRun`. Still authored in the subset (the `rtcore`/hand-WAT path was never forced).
    Known limitation: deep recursion is heap-bound (bump allocator, no GC — `fib(10)` overflows ~2
    pages; `fib(8)` used). **#14 interpreter (2a–2d.2) DONE — the §6 `eval`/`new Function` kernel is
    covered, entirely in the wasic subset.** **Increment 3 STARTED (first wasic-COMPILER change of
    the track): 3.1 — wasic `any` type + auto-merge — SHIPPED 2026-06-22** (test `18q`):
    `mapType("any")→i32` (boxed handle; no test used `any` so safe); the bundler auto-injects a
    synthetic `wasmtk:dynrt` import on `any`/`eval` usage (reuses the virtual-cap merge; `any`-free
    programs unaffected); implicit boxing of literal `: any =` initialisers (source pre-pass) +
    `as`-unboxing via an `anyVars` side-set; new dynrt export `dynStrBytes`. Wiring lesson: the
    bundler rewrites explicit `dynX`→`dynrt_dynX`, so compiler-INTRODUCED calls must be pre-prefixed
    `dynrt_`. **3.2 — operators on `any` — SHIPPED 2026-06-22** (test `18q`): a guarded block in
    `emitExpr`'s binary-op loop routes to dynrt ONLY when an operand is a simple `any` var (else the
    existing typed paths run untouched — the safety invariant for the hottest path); `boxAnyOperand`
    helper boxes the other operand; arithmetic `+ - * / %` → `dynrt_dynAdd/…` (an `any` handle),
    comparisons → raw i32 0/1 (work in conditions), `&&`/`||` → truthiness short-circuit, string
    concat dispatches via `dynAdd`. Full suite stayed green (zero impact on non-`any` code). **3.3 —
    member/index/call on `any` + bare `eval` — SHIPPED 2026-06-22** (test `18q`): a guarded
    any-dispatch block in `emitExpr` routes `x.foo`→`dynrt_dynMember`, `x[i]`→`dynrt_dynIndexValue`,
    `x(args)`→`dynrt_dynCall0/1/2/3` (the library now EXPORTS `dynMember`/`dynIndexValue` + new
    fixed-arity `dynCall0-3` helpers — wasic can't build an args array inline); bare `eval(...)`
    rewritten to `dynrt_dynEval`. All results are `any` handles; single-level forms (chained
    `x.a.b`/`x.a()` use an intermediate var). **3.4 — hybrid `--auto` migration — SHIPPED 2026-06-22
    (COMPLETES increment 3 + the #14 arc):** functions with a TYPED signature + a DYNAMIC
    (`any`/`eval`) body now compile to the wasic+dynrt core (their typed signature marshals to the
    host normally; `any`-signature functions stay in the host — boxed-handle marshalling is a
    follow-up); a **try-compile / fall-back-to-host** ladder (`runHybrid`: compile the full core; on
    failure keep the dynamic-bodied fns in the host and recompile the static remainder — failure
    detected by whether the core `.wit` was produced, since modc doesn't throw). Fixed a real bug
    found here: `compileLibTs` (modc) didn't handle embedded virtual-cap `entry.bytes`/`witText`
    like `compileWasiTs`, so auto-merged `wasmtk:dynrt` failed in the modc core compile — now fixed.
    Verified: `dynamic_hybrid` (eval+any body) routes → `evalScaled(8)=50`;
    `dynamic_fallback_hybrid` falls back to host; `math_hybrid` unchanged. **`hybrid --auto`'s
    dynamic target is now the own runtime, not `javyc`.** **#14 own-dynamic-runtime track — CORE
    COMPLETE.** **Follow-up — any-signature host↔core marshalling — SHIPPED 2026-06-22** (full
    detail in dynrt-design.md): a function with an `any` param/return is now callable from the host
    with real JS values (number/string/bool) — wasic tracks `any` sigs
    (`FuncParam.isAny`/`FuncDef.isAnyResult`; any-params added to `anyVars`), `generateWit` emits an
    `any` WIT marker, the core exports the dynrt box/unbox helpers (`injectDynrtMarshalExports`,
    both compile paths), and bindgen generates `_box`/`_unbox`. Verified end-to-end
    (`tests/wasi/wasm_wasi_bundle/anysig_bundle/`); bindgen 104/104. **Follow-up — hybrid fallback
    refinement — SHIPPED 2026-06-22**: per-function fallback (was all-or-nothing) — on core-compile
    failure, probe each dynamic fn against the static context and move ONLY the failing ones to host
    (`parseHybridFile` `excludeFns` + `probeCompiles` to a cleaned-up `_probe.*` module); safety
    ladders preserved. Verified `tests/hybrid/hybrid_fixtures/dynamic_partial_hybrid.ts`.
    **Follow-up — objects/arrays as `any` STRUCTURAL marshalling — SHIPPED 2026-06-22**:
    objects/arrays now cross the host boundary as real, recursively-converted JS objects/arrays (was
    opaque handles) — dynrt gained `dynObjKeyPtr`/`dynObjKeyLen`/`dynObjValAt`, the marshal-export +
    tsbundler auto-import lists gained the container accessors, and bindgen `_box`/`_unbox` recurse
    on the raw `dynTag` (5=array/6=object). Verified `tests/wasi/wasm_wasi_bundle/anysig_bundle/`
    (`makePoint`→`{x,y}`, `triple`→`[…]`, `sumArr([…])`→sum, `getX({…})`→field). **#14 memory/GC
    track — building a full mark-sweep GC in TESTED PARTS (owner 2026-06-22; the hard part is
    root-finding → an explicit shadow-stack in the mark phase). Part 1 — auto-grow `$__malloc` —
    SHIPPED 2026-06-22** (test `18r`): `memory.grow` by ceil(deficit/64KiB) pages when the bump ptr
    runs past the allocated pages, lifting the fixed ~2-page limit to WASM's multi-GiB limit →
    `fib(15)` (≈1973 interpreter calls) now runs (was overflowing at `fib(10)`); gated to
    executable/WASI modules (a merged lib's malloc is dropped+replaced by the host's, and
    `memory.grow` defeats `detectBumpAllocator` + the wabt-ts merge re-assembly). **Part 2 —
    free-list allocator — SHIPPED 2026-06-22** (test `18s`): `$__free(ptr,size)` links blocks ≥8B
    into a `$__free_list` (storing [size@0,next@4] in the block); `$__malloc` first-fits the list
    before bumping; no splitting v1; executable-only; dormant until the GC sweep calls free in P5;
    tested via new `__malloc`/`__free`/`__heapPtr` wasic intrinsics. **Part 3 — cell registry —
    SHIPPED 2026-06-22** (test `18t`): every value cell flows through `mkCell`/`mkCell5` → recorded
    in a registry list (`__gc_reg`) so P4/P5 can enumerate all allocations; `dynGcCellCount()` hook;
    append inlined to limit recursion-depth cost. Surfaced + fixed a latent wasmmerge bug (it
    clobbered ALL merged mutable globals to 131072, destroying `__gc_reg`'s 0-sentinel → corruption
    at ~3-4k cells; now gated to the non-allocator-unified case — see compiler-bugs.md). **Part 4
    root strategy DECIDED (owner): interpreter SHADOW-STACK** (precise, safe mid-interpretation;
    won't collect `any` handles in arbitrary wasic locals — documented scope). Split into P4a (mark
    mechanics) + P4b (wire shadow-stack). **Part 4a — mark phase — SHIPPED 2026-06-22** (test
    `18u`): `gcMark(root)` recursively marks reachable cells; mark bit = tag bit 8 (uniform, no
    extra storage, doubles as visited-set, cleared by collect()); follows array/object handles +
    user-fn body/params/env; exports `dynGcMarkClear`/`dynGcMark`/`dynGcMarkedCount`. **Part 4b —
    shadow-stack roots — SHIPPED 2026-06-23** (test `18v`): `dynRun` pushes/pops its scope on
    `__gc_roots`; `dynGcMarkRoots` marks from all roots; exports `dynGcPushRoot`/`dynGcPopRoot`/
    `dynGcRootCount`; companion fix — `gcMark` follows an env's parent link (object slot 2) + guards
    the -1 no-env sentinel, so marking one scope keeps the whole lexical chain + closure captures.
    **Part 5a — mark-sweep collect (cells) — SHIPPED 2026-06-23** (test `18w`): `dynGcCollect()` =
    mark-roots → sweep registry → reclaim unmarked cells + compact; dynrt now allocates cells
    through its OWN recycling free list (`dynAlloc`/`dynFreeBlock`/`__dyn_free`, reused blocks
    zeroed) so the GC reclaims into the same pool — NO wasmmerge `$__free` unification needed;
    `dynGcMarkRoots` also marks the interpreter registers; exports `dynGcCollect`/`dynGcFreeCount`.
    **Part 5b — payloads + auto-collect — SHIPPED 2026-06-23; GC TRACK COMPLETE** (test `18x`):
    constructor payload allocs now via `dynAlloc`
    - sweep frees them by tag; `maybeCollect` auto-collects at interpreter statement boundaries
      (adaptive threshold); the evaluator ROOTS mid-expression intermediates (across right-operand
      parses + calls) so recursion like `fib(n-1)+fib(n-2)` is safe. A 10000-iter loop allocating
      ~30000 cells runs in BOUNDED memory (5 live cells after a final collect). **#14 GC done
      (P1–P5b): dynrt runs long-lived dynamic code in bounded memory.** **GC polish SHIPPED
      2026-06-23:** both leaks FIXED — `dynAlloc`/ `dynFreeBlock` round to `GC_MIN_BLOCK=16`
      (short-string/key payloads <16B now recycle — the only growing leak), and `mkCell` frees the
      old registry array on grow. Remaining #14 odds-and-ends: functions-as-`any` stay opaque across
      the host boundary — FUNDAMENTAL (a function is code → must stay a handle, but host-held
      handles can't be rooted across collections → a proxy is use-after-free; deferred pending a
      host-pin mechanism). **Free-list SPLITTING SHIPPED 2026-06-23** (test `18y`): `dynAlloc`
      carves the leftover (≥16B) off an oversized reused block at `cur+size` (closes a slow
      size-mismatch leak; only bit mixed-size workloads). **Adjacency-coalescing SHIPPED 2026-06-23
      as a HYBRID allocator (test `18z`)**: coalesce-on-free hung (re-entrancy cycle), so re-done as
      segregated buckets (16/24/28/32, O(1)) + Tier-2 general (first-fit+split) + a BATCH
      `defragFull` (snapshot, no re-entrancy) triggered proactively (adaptive, amortized) +
      on-demand (free-bytes≥request). Integrity- verified (`dynGcCheckHeap`) through the stress that
      hung the first attempt. Balance: hot path never defrags; large/odd sizes get coalescing
      efficiency. See dynrt-design.md. **Functions-as-`any` — Phase 1 SHIPPED 2026-06-23 (the #14
      final item):** host PIN TABLE (`dynGcPin`/`dynGcUnpin`, marked by `dynGcMarkRoots`; non-moving
      GC) + bindgen `_unbox` tag-7 JS proxy (pins, calls back via `dynApply`, `.release()` +
      FinalizationRegistry); marshal-exports extended; tests `18za` + bindgen
      `testGenBindingsAnyFunction`. **PRODUCER + FULL END-TO-END SHIPPED 2026-06-23:**
      `Function(params, body)`/`new Function` lowers to a new dynrt `dynMakeFn` (auto-merge
      `usesFunction` trigger); modc `getDoubler(): any { return Function("x","return x*2;"); }` →
      bindgen → host `m.getDoubler()(21)` → 42 (bindgen `testIntegrationFnAny`, 119/119). Gotcha
      fixed: trigger matched `Function(` in a COMMENT → now strip comments before sniffing.
      **Core→host functions-as-`any` DONE end-to-end.** Phase 2 (host→core `__hostcall`) still
      deferred. `javyc` stays as the full-JS fallback — see dynrt-design.md.

