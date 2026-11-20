# design-decisions — part 6 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Async / Promise (#13, 2026-06-15) — load-bearing invariants

## Async / Promise (#13, 2026-06-15) — load-bearing invariants

Full design + implementation log in [async-design.md](async-design.md). The rules a refactor must NOT
silently break (all `src/wasic.ts`):

- **Promise runtime is INLINE, never a merged capability.** It uses `call_indirect` to invoke `.then`
  reactions, and `wasmmerge`'s `call_indirect` guard forbids that in a merged module. The runtime is
  emitted by `getPromiseRuntimeWat()` (gated by `needsPromiseRuntime`) in the main module, sharing one
  funcref table + the `$ftype_i32_i32_i32_r_void` reaction functype with the compiler-emitted trampolines.
  Do NOT move it to a `wasmtk:promise` capability.
- **The reaction functype carries an `env` slot: `(env i32, src i32, result i32) -> void` (13.1b).** The
  reaction RECORD is 20 bytes `[tramp@0 | env@4 | src@8 | result@12 | next@16]`; `$__promise_then` /
  `$__promise_enqueue` take `env` (the capturing-closure struct ptr, 0 for a named callback); the drain
  `call_indirect`s `(env, src, result, tramp)`. Keep this functype/record in lockstep — it is the §3.6
  design-locked shape (the earlier 2-param `(src,result)` form was a 13.2 simplification, corrected here).
  A trampoline invokes a NAMED cb via `(call $name <args>)` (env unused) and a CLOSURE cb via
  `(call_indirect (type [i32,…args]→U) (local.get $env) <args> (i32.load (local.get $env)))`. At most ONE
  closure callback per reaction (one env slot).
- **`promiseInnerType: Map<varName,WatType>` tracks promise-holding locals (13.1b).** Reset per function;
  populated by a non-consuming observer at the TOP of `emitStatement` for `const/let/var p = <promiseExpr>`;
  `isPromiseExpr`/`promiseInnerTypeOf` consult it for a bare identifier (so `await p` / `p.then` work and
  pick `await_<T>`). `promiseInnerTypeOf` resolves a callback's return type via `cbResult`, which covers
  BOTH a named fn AND the `__anon_N__factory(caps)` capturing-closure form — do not regress it to
  named-only or an f64 closure cb mis-picks `await_i32`.
- **Capturing `.catch` (string-param closure) is guarded OUT** (`resolveCb` returns null if a closure's
  real params include `string`). wasic's closure trampoline (`emitClosureFactory`) keeps a `string` param
  as one i32 instead of expanding to (ptr,len), so dispatching it would be arity-mismatched. Use a NAMED
  reject callback. Fixing the closure trampoline's string-param expansion would lift this.
- **`Promise.all`/`Promise.allSettled` lower to per-call-site combinators, NOT reactions (13.4).**
  `genPromiseAllSite(n, elemT)` / `genPromiseAllSettledSite(n, elemT)` have fixed arity = the
  array-LITERAL length; they `$__drain_microtasks` then collect (eager model = all elements settled
  post-drain). `all`: first rejected element wins → reject; else build a fresh `T[]`. `allSettled`: never
  rejects → build an `i32[]` of `__settled_<T>` struct-record ptrs (`{status:string, value:T,
  reason:string}` via `ensureSettledStruct`), the result var registered as a struct array of that synth
  type in the emitFunction pre-scan (the `__Anon_<var>` precedent). Both fulfill with an array ptr
  (vtype=3 → `await_i32`). ARRAY-LITERAL arg ONLY (count must be a compile-time constant); element types
  i32/f64; `Promise.all(arrVar)` unsupported. Do not regress `isPromiseExpr` to drop `all`/`allSettled`.
- **A struct-array string field in console.log returns ptr+len (`watLoadLen`), not just the ptr.** Both
  console.log/console.error `arr[idx].field` struct-lookup closures special-case `field.type ===
  "string"` (else the field prints as a raw i32 ptr). Surfaced by `allSettled`'s `results[i].status`.
- **`hybrid` routes async fns via `f__impl` + a sync unwrapping wrapper (13.5, `src/hybrid.ts`).** A
  compiled async fn returns a promise PTR, not the value — so a routed `async function f(p): Promise<T>`
  is rewritten to an internal `f__impl` (intra-body calls to other routed async fns renamed to `__impl`
  to keep the async call graph promise-typed) plus a SYNCHRONOUS exported `f` that does `return await
  f__impl(args)` (eager model settles synchronously). `Promise<void>` wrappers just invoke the impl.
  Don't expose the raw async fn to bindgen (the host would get a ptr). Async without a `Promise<T>`
  annotation stays in the TS host. The awaited graph must be intra-module (host-I/O async → host).
- **Promise object layout is the canonical `result<T,E>` window** `[state@0, vtype@4, disc@8, payload@16,
  plen@24, reactions@28]` (32 B). `disc`/`payload` are the lift-ready Canonical-ABI image — keep them
  contiguous + naturally aligned (forward-compat for a future WASI-P3 lift). Fresh bump memory is zero
  → a new promise is pending/ok/no-reactions without explicit init.
- **`isPromiseExpr` / the react routers recurse on the receiver for `.then|catch|finally`**, never a
  loose `/\.(then|catch|finally)\(/` substring test. The substring form mis-classified `const y =
  p.then(f)` as a promise statement and mis-routed it. Same trap class as the scanner rules above.
- **Reaction trampolines are DUAL-PATH and chosen by `genReactionTrampoline({kind})` (13.3b)** — they
  read `src.disc` (+8) and branch: `then` → fulfilled runs `onF(value:T)` / rejected propagates (or
  runs `onR` for `.then(onF,onR)`); `catch` → fulfilled passes through / rejected runs `onR(reasonPtr,
  reasonLen)` (the reject reason is a STRING at payload@16 + plen@24, so `onR` is a string-param fn);
  `finally` → runs `onFin()` on both paths then passes through. Passthrough/propagate use a type-agnostic
  `copySettlement` (full 32-B image incl. the 8-B payload via `i64`). The fixed reaction functype
  `(src i32, result i32) → void` is UNCHANGED — only the body differs (so Approach B stays drop-in).
  `promiseInnerTypeOf`: `.catch` → `onR`'s return type, `.finally` → src's inner type.
- **Greedy `Promise.resolve(…)` / `.then(…)` regexes MUST carry a `parenDepthNeverNegative` guard**
  (in `promiseInnerTypeOf`, the `emitExpr` handlers, and the statement router) — without it,
  `Promise.resolve(2).then(triple)` is mis-split as resolve-with-arg `2).then(triple` → wrong inner type
  → f64/i32 trampoline mismatch at instantiate.
- **When `needsPromiseRuntime`, the reaction functype + a funcref table are FORCED** even with no `.then`
  (`getPromiseRuntimeWat` registers `$ftype_i32_i32_r_void`; `emitFuncrefTable` emits `(table 1 funcref)`
  when `funcTable` is empty) — the drain's `call_indirect` references both and would otherwise be a
  dangling type / missing table for an await/resolve-only program.
- **Rejection support is gated by `needsPromiseReject` (separate from `needsPromiseRuntime`)** so
  resolve/then-only programs stay exception-free. When set: `await` helpers gain the `disc==1 → (throw
  $__exn_tag …)` re-throw, `$__promise_reject` is emitted, and `needsExceptionTag` is set. async-body
  `throw` → caught at the `await` site is FREE under the eager model (eager run + WASM exception
  propagation) — no reject-wrapping; do not add one expecting JS deferred-rejection timing.
- **async `Promise<void>` fns are plain void fns** (body runs eagerly, no promise returned); only
  `Promise<T>` with T≠void is promise-returning (`asyncInner` non-null → `return` wraps in
  `$__promise_resolve_<T>`). The `parseFunctions` header regex, `parseTopLevel`, and the nested-fn skip
  all accept an optional `async`; the return-annotation regex accepts `Promise<…>`.

