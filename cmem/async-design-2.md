# async-design — part 2 of 2

Continues [async-design.md](async-design.md) (split by size on 2026-11-20, letter H38). Sections:

- 3. Approach A — concrete design
- 4. Where it plugs into `wasic`
- 5. Phased implementation plan (each ships with output-verified tests)
- 6. Known v1 limitations (document in README on ship)
- 7. Decisions (ALL RESOLVED 2026-06-15 — value-engineering pass)
- 8. Why this is unblocked and self-contained

## 3. Approach A — concrete design

### 3.1 Promise heap object

A promise is a bump-allocated struct. The **handle the program passes around is an opaque i32** —
today it equals the base ptr, but user code must never do pointer arithmetic on it, so we can later
intern it into a component resource/future handle table (the `polyglot-producers.md` ADR rule
"model resources as opaque handle indices NOW") without touching user code or codegen call sites.

The value slot is a **type-tagged 8-byte union** so one generic runtime can hold `Promise<i32>`,
`Promise<f64>`, `Promise<string>`, or `Promise<ptr>` (struct/array) without monomorphizing the
runtime. **Crucially, the settled-value sub-image (`disc` + `payload`) is laid out as the Canonical
ABI `result<T, E>` shape** — discriminant i32 then naturally-aligned payload — so a fulfilled
`Promise<T>` *is* `result<T, string>::ok(T)` and a rejection is `::err(reason)`. This is the
"align the layer-1 representation now, defer only the container" bet (`polyglot-producers.md` §1)
applied to promises: a future WASI-P3 / async-component lift reads existing memory with no re-layout.

| Offset | Field | Notes |
| --- | --- | --- |
| +0 | `state` i32 | 0=pending, 1=settled. Scheduling state — internal, NOT part of the canonical sub-image. |
| +4 | `vtype` i32 | 0=i32, 1=f64, 2=string(ptr+len), 3=ptr(struct/array/promise). Internal dispatch tag for the generic runtime. |
| +8 | **`disc`** i32 | **Canonical `result` discriminant: 0=ok (fulfilled), 1=err (rejected).** Start of the lift-ready sub-image. |
| +12 | pad i32 | alignment to 8 for the f64/i64 payload case |
| +16 | **`payload`** 8 bytes | canonical payload: i32 / f64 / string-ptr (len in +24) / ptr — read per `vtype`/`disc` |
| +24 | `plen` i32 | string byte length when payload is a string (ok with `vtype==2`, or the err reason) |
| +28 | `reactions` i32 | head ptr of the reaction list (dynamic `i32[]` of reaction-record ptrs), 0 if none. Internal. |

Note the deliberate split: `state`/`vtype`/`reactions` are **internal scheduling fields**; `disc` +
`payload` (+`plen`) are the **boundary value image** in canonical `result<T,E>` form. A future lift
projects the `[disc, payload]` window; the scheduling fields are dropped. (Exact offsets/padding are
an implementation detail to finalize at 13.1; the invariant is: canonical `result` window is a
contiguous, naturally-aligned sub-region.)

A **reaction record** (one `.then` registration):

| Offset | Field | Notes |
| --- | --- | --- |
| +0 | `onF_tramp` i32 | per-T trampoline table index for the fulfill callback (0 = none / passthrough) |
| +4 | `onF_clo` i32 | the user closure ptr (or func-table idx) for the fulfill callback |
| +8 | `onR_tramp` i32 | trampoline for the reject callback |
| +12 | `onR_clo` i32 | closure for the reject callback |
| +16 | `result` i32 | the promise returned by this `.then`, settled when the reaction runs |
| +20 | `kind` i32 | 0=then, 1=finally, 2=all-element, 3=allSettled-element (for combinator glue) |

### 3.2 Microtask queue + drain

- Global `__mt_queue: i32[]` (wasic dynamic array) of *pending reaction-record ptrs* (each paired
  with the settled promise it reacts to — store the promise ptr in a parallel slot or widen the
  record). Enqueued when a promise settles and has reactions, or when `.then` is called on an
  already-settled promise.
- `__drain_microtasks()`: while queue non-empty, pop the front reaction, run it (invoke the
  appropriate trampoline+closure via `call_indirect`, settle its `result` promise with the callback's
  return value, which may enqueue further reactions). FIFO order.
- Drained: (a) inside `__promise_await` until the awaited promise settles; (b) once at the end of
  `_start` so trailing `.then` callbacks fire before exit.
- **Deadlock guard — routed through one `__on_quiescent()` seam (mode-scoped).** If `__promise_await`
  (or the `_start` final drain) finds the queue empty but a target still pending, it calls the single
  `__on_quiescent()` hook. In v1's **self-contained `_start` mode** that hook **traps with a
  diagnostic** ("awaited a promise that can never settle — no async source in WASI-P1") — the correct
  loud failure per the "no silent-wrong" rule, since with no external source the pending state is a
  *provable* deadlock. Keeping it behind one seam means the later **modc + host-driven mode** rebinds
  `__on_quiescent()` to *yield control to the host event loop* instead of trapping — no rework.

### 3.3 The central codegen challenge — generic runtime ↔ monomorphic callbacks

The runtime is generic (i32 handles, type-tagged value slot). But wasic **monomorphizes**: a
`Promise<i32>.then(v => …)` has `v: i32`, a `Promise<f64>.then(v => …)` has `v: f64`. The bridge:

- At each `.then`/`await`/combinator **call site**, the compiler knows `T` (the value type) and the
  callback's typed signature. It emits/reuses a **per-T trampoline** `(reactionValuePtr) → settle`
  that reads the generic value slot as `T` and invokes the user closure with a correctly-typed arg,
  then writes the typed result back into the result promise's value slot with the right `vtype`.
- The runtime stays type-agnostic; **all type-specific glue is inline compiler codegen** at call
  sites (same division of labor as Phase 44 function-pointer-array trampolines and the capability
  per-call-site adapters). This is the part that needs the most care and the most tests.

### 3.4 Lowering rules

(Table as a list — Source · Lowering:)

- `async function f(p): Promise<T> { … }` — Lowering: `FuncDef.isAsync=true`; result type ⇒
  promise-ptr i32; body wrapped so `return v` ⇒ `return __promise_resolve_T(v)`, and an uncaught
  throw ⇒ `return __promise_reject(reason)` (wrap body in an internal try/catch).
- `return expr;` (in async fn) — Lowering: `return __promise_resolve_T(expr)`
- `await expr` — Lowering: `__promise_await(expr)` → drains; fulfilled ⇒ value (typed via `vtype`);
  rejected ⇒ `(throw $__exn_tag reason)`
- `Promise.resolve(x)` — Lowering: `__promise_resolve_T(x)` (settled fulfilled)
- `Promise.reject(r)` — Lowering: `__promise_reject(r)` (settled rejected; `r` is a string reason)
- `p.then(onF, onR?)` — Lowering: build result promise; register reaction (per-T trampolines for
  `onF`/`onR`); if `p` settled, enqueue; return result
- `p.catch(onR)` — Lowering: source-desugar to `p.then(undefined, onR)`
- `p.finally(onFin)` — Lowering: runtime reaction `kind=1`: run `onFin()`, pass the original
  settlement through
- `Promise.all(arr)` — Lowering: counter = `arr.length`; per element register a reaction storing
  value at index `i`, decrement; at 0 ⇒ fulfill result with the `T[]`; first rejection ⇒ reject
  result. v1: element types **i32/f64** (string/struct later).
- `Promise.allSettled(arr)` — Lowering: like `all` but never rejects; each slot stores a `{status,
  value|reason}` record; fulfill when all settle.

### 3.5 Rejection ↔ exception integration

Promise rejection reasons are **strings** (matching wasic's existing `throw "msg"` / `throw new
Error("msg")`, whose catch-vars are strings — Phase 15). `__promise_await` on a rejected promise
emits `(throw $__exn_tag reasonPtr reasonLen)`, so:

```ts
try { const x = await mightReject(); }
catch (e) { console.log("caught:", e); }   // works via existing EH machinery
```

An async function whose body throws ⇒ the wrapper catch turns it into `__promise_reject(reason)`.
**Unhandled rejection policy (RESOLVED):** at end of `_start`, a rejected promise that never had a
`.catch`/reject handler ⇒ **warn to stderr** (via `fd_write`), **exit code unchanged**. This matches
the project's existing uncaught-error posture (`utils.ts` already catches `WebAssembly.Exception` and
exits 0 with a stderr message; run-ts parity). A future **`--strict-async`** knob may switch this to
trap / nonzero-exit for CI-failing semantics, but the default stays warn.

### 3.6 Runtime delivery — inline WAT helpers (NOT a merged capability)

**Why not a capability library (the corrected decision).** Set/Map/Date/JSON/RegExp ship as merged
`modc` capabilities because they are **callback-free** (value-in / value-out). The Promise runtime is
**callback-bearing** — `.then`/`all`/the drain loop must invoke user reactions via `call_indirect`.
But `wasmmerge` has a hard guard (`src/wasmmerge.ts:728`) that **throws on any `call_indirect` in a
merged module** (Phase 18 strips imported type sections, so a merged `call_indirect (type N)` / table
ref would dangle). Therefore the Promise runtime **cannot** be a merged capability — it must live
**inline in the main module**, where it shares the one function table and one type section with the
compiler-emitted trampolines.

**Delivery mechanism:** a `getPromiseRuntimeWat()` template emitted on demand (gated by a
`needsPromiseRuntime` flag set when async/Promise syntax is seen), appended by `emitHelpers()`
alongside `getStringHelperWat()` / `emitDynArrHelpers()` (`src/wasic.ts` ~line 13268). The runtime
is hand-written WAT (the established helper-template pattern), calling the main module's `$__malloc`
directly. Non-async programs set no flag and pay nothing; `-Oz` strips any unreached helper.

- **The one fixed reaction functype.** All reactions are invoked through a single named type
  `$__promise_reaction = (param $env i32) (param $src i32) (param $result i32)` (void). The runtime
  `call_indirect`s `(type $__promise_reaction)` over a stored `(tramp_idx, env)` pair; the per-`T`
  trampoline (compiler-emitted, monomorphic) reads the settled value from `$src`'s canonical
  `result<T,E>` window as `T`, invokes the user closure, and writes the typed result into `$result`.
- **LOCKED INVARIANT — the runtime NEVER introspects callbacks.** It only stores/invokes the opaque
  `(tramp_idx, env)` pair through `$__promise_reaction`; it must not branch on callback identity,
  body, or shape. This is what makes **Approach B drop-in**: B's per-frame *resume thunk* conforms to
  the same `$__promise_reaction` functype and goes in the same slot, so switching from eager bodies
  (A) to suspendable state machines (B) changes only compiler-emitted lowering — the runtime is
  untouched.
- **Per-T trampolines + all the lowering** are emitted inline by the compiler at call sites (§3.3),
  in the same module/table as the runtime they call.

### 3.7 `_start` integration

After the last top-level statement in `_start`, emit `__drain_microtasks()`. Top-level `await` in
`_start` lowers exactly like in-function `await` (`__promise_await`), so a standalone WASI program
can `await` at module scope.

---

## 4. Where it plugs into `wasic`

- **Source desugar pre-pass** (small): `.catch(f)` → `.then(undefined, f)`; recognize `async`
  modifier positions. Runs alongside the other `expand*` pre-passes in `transpile()`
  (`src/wasic.ts` ~line 16873+).
- **`parseFunctions`** (~line 142 pattern already tolerates `async`): set `FuncDef.isAsync`, rewrite
  result type to promise-ptr, wrap the body (try/catch → resolve/reject).
- **`emitExpr` / `emitStatement`**: handle `await`, `Promise.resolve/reject/all/allSettled`,
  `.then/.finally`; emit per-T trampolines; thread `vtype` through value reads/writes.
- **`inferInitType`**: `async` call results and `Promise.*` ⇒ promise-ptr (i32) with a tracked
  inner type `T` (new side-table, e.g. `promiseInnerType: Map<varName, WatType>`), so `await x`
  recovers `T`.
- **Inline runtime**: a `getPromiseRuntimeWat()` hand-written WAT template + `needsPromiseRuntime`
  flag, appended by `emitHelpers()` (NOT a `modc` capability / virtual import — §3.6). Defines the
  `$__promise_*` runtime functions and the `$__promise_reaction` functype in the main module.

---

## 5. Phased implementation plan (each ships with output-verified tests)

(Table as a list — Sub-phase · Scope · Test(s):)

- **13.1a** ✅ — Scope: Promise object (canonical `result<T,E>`) + `resolve` (i32/f64) + `await`
  (drain no-op) + async-fn-returns-promise + `Promise.resolve` — Test(s): ✅ `54_AsyncBasic.ts`
  (async fn value, sequential `await`, `await Promise.resolve`, f64, un-annotated infer)
- **13.2** ✅ — Scope: `.then(namedCb)` (per-`T` trampolines via `call_indirect`) + microtask queue +
  drain (in `await` and at `_start` end) — Test(s): ✅ `55_AsyncThen.ts` (ordering vs sync, FIFO,
  value/void cb, chained `.then().then()`, f64, `await` of a `.then`)
- **13.1b** ✅ — Scope: promise-holding-var inner-type tracking (`const p = f(); await p` /
  `p.then`); capturing-closure callbacks for `.then`/`.finally` (env-bearing reaction record) —
  Test(s): ✅ `58_AsyncPromiseVar` (var await i32/f64 + `.then` on var + aliasing),
  `59_AsyncClosureCb` (capturing `.then` i32/f64 + `.finally`)
- **13.3a** ✅ — Scope: `Promise.reject` + rejection→exception (`await` rejected → `throw`, caught by
  `try/catch`) + async-body-throw (free, eager model) — Test(s): ✅ `56_AsyncReject.ts`
- **13.3b** ✅ — Scope: `.catch`/`.finally` rejection *reactions* (string reasons, dual-path
  trampoline) + `.then(onF,onR)` — Test(s): ✅ `57_AsyncCatch.ts` (`.catch` recover +
  fulfilled-passthrough, `.finally` passthrough, `.then(dbl).catch(recover)` chain)
- **13.4** ✅ — Scope: `Promise.all` + `Promise.allSettled` (i32/f64 element types v1, array-literal
  arg) — Test(s): ✅ `60_AsyncAll` (i32/f64/mixed sources/first-rejection) + `61_AsyncAllSettled`
  (mixed fulfil/reject, status/value/reason struct array)
- **13.5** ✅ — Scope: Lift the `hybrid` async exclusion — route async fns into the wasic core via an
  internal `f__impl` + a sync unwrapping wrapper (`src/hybrid.ts`) — Test(s): ✅
  `tests/hybrid/hybrid_fixtures/async_hybrid.ts` (value i32/f64 + void async + intra-module await
  chain; runner == ts-run)

**Test discipline (project rule):** the runner judges by per-step **exit code**, but a broad codegen
change can be green-but-wrong — **output-diff ts-run vs wasm-run** for every async test
(`testing.md` / the Phase-51.3 process note). Add a `tests/wasi/wasm_wasi/NN_*.ts` per sub-phase.

---

## 6. Known v1 limitations (document in README on ship)

1. **Interleaving order** across concurrently-pending async functions not preserved (eager body
   execution) — §2.A example. Sequential/`.then`-chained ordering *is* correct.
2. **No real async sources** (timers/I/O); awaiting a never-settled promise traps with a diagnostic
   (the deadlock guard), not a hang.
3. **`Promise.all`/`allSettled` element types** limited to i32/f64 in v1 (string/struct later).
4. **`Promise.race`/`any`** not in v1 (deferred).
5. **modc library + host-driven event loop** not in v1 (standalone WASI only).

---

## 7. Decisions (ALL RESOLVED 2026-06-15 — value-engineering pass)

1. **Strategy:** ✅ **Approach A for v1, expand to B later.** A's runtime is reused by B unchanged.
2. **Value-slot:** ✅ **type-tagged union internally + settled value as Canonical ABI `result<T,E>`
   + opaque handle** (§3.1). Canonical chosen for maximum forward-compatibility (future P3 lift = wrap).
3. **Runtime delivery:** ✅ **inline WAT helpers** (`getPromiseRuntimeWat()` + `needsPromiseRuntime`),
   NOT a merged capability — the `wasmmerge` `call_indirect` guard forbids a callback-bearing merged
   module (§3.6). Locked "never introspects callbacks" invariant preserved so B is drop-in.
4. **Unhandled rejection:** ✅ **warn to stderr, exit unchanged** (matches `utils.ts` posture); future
   `--strict-async` knob optional (§3.5).
5. **Deadlock:** ✅ **trap + diagnostic via the `__on_quiescent()` seam** (mode-scoped so the future
   host mode rebinds to yield-to-host) (§3.2).

No open questions remain blocking sub-phase 13.1. Implementation-time details still to finalize (not
blockers): exact promise-struct offsets/padding (§3.1), the per-`T` trampoline emission mechanism
(§3.3), and whether `Promise.all` element types beyond i32/f64 land in 13.4 or later.

---

## 8. Why this is unblocked and self-contained

Track #13 is gated only by Phase 51 (language hardening), which is **complete** — and it *lowers
onto* exactly the hardened paths (struct layout, field access, closures + `call_indirect` through
named functypes, exception machinery, on-demand inline WAT helpers). It needs **none** of the
polyglot loaders (orthogonal/ungated) and shares its runtime with the future Approach B, so no work
here is throwaway.

