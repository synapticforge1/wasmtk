# Async / Promise design (roadmap #13) — COMPLETE (13.1a/13.2/13.3a/13.3b/13.1b/13.4/13.5)

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 2.** The sections continue in:

- [async-design-2.md](async-design-2.md): from "3. Approach A — concrete design"

**Status: roadmap track #13 — Promise/async — COMPLETE (2026-06-15).** All sub-phases 13.1a + 13.2 +
13.3a + 13.3b + 13.1b + 13.4 (all + allSettled) + 13.5 (hybrid async lift) implemented. Brief §5 / §7-#5.
Suite **317/317** (the async surface is the `tests/wasi/wasm_wasi/54_*…61_*` tests; 13.5 is validated by the
`tests/hybrid/hybrid_fixtures/async_hybrid.ts` fixture, run manually). The entire v1 Promise API surface ships:
async/await + Promise.resolve/reject + then/catch/finally + all/allSettled, standalone WASI. README can
now document the async surface (was held until feature-complete).

**13.5 hybrid async lift shipped (2026-06-15):** `wasmtk hybrid` no longer skips `async` functions — now
that wasic compiles async/await + the Promise combinators, an `async function f(p): Promise<T>` with
wasic-compatible param/inner types is routed into the wasic core. Subtlety: compiled by modc an async fn
returns a *promise pointer* (i32), not the value, so it can't be exposed to the host directly. Fix (all
`src/hybrid.ts`): each routed async fn is rewritten to an internal `f__impl` (calls to other routed async
fns inside any async body are renamed to `__impl` too, keeping the async call graph promise-typed), and a
SYNCHRONOUS exported wrapper `f` is emitted that `await`s `f__impl` and returns the unwrapped `T`. Under
wasic's eager model the body settles synchronously, so the wrapper returns a real value via the normal
bindgen path. `Promise<void>` wrappers just invoke the impl. `analyzeSignature` now parses `Promise<T>`
(routable when `T` is wasic/void; `promiseInner` exposed); the async-skip is gone (an async fn WITHOUT a
`Promise<T>` annotation stays non-routable — the wrapper can't determine the return type). Fixture
`tests/hybrid/hybrid_fixtures/async_hybrid.ts` (value i32/f64 + a void async + intra-module `await` chain) →
runner output == original ts-run (`process(4): 50`, `scale(2.0): 5`); non-async fixtures unaffected.
**Limit:** the awaited graph must be intra-module (no host I/O — an async fn that awaits a host call still
belongs in the TS runner).

**13.4b `Promise.allSettled` shipped (suite 316→317, output-verified, zero regressions):**
`Promise.allSettled([…])` NEVER rejects — it fulfills with a struct array of `{status, value|reason}`
records. A synthesized element struct `__settled_<T>` (`ensureSettledStruct`) has fields `status:
string @0`, `value: T @8`, `reason: string @<after value>`; the result var is registered (in the
emitFunction pre-scan) as a struct array of it (`structTypeName`, ptr=-2, dynamic — the
`__Anon_<var>` struct-array precedent) so `results[i].status/.value/.reason` resolve through the existing
struct-array field-access paths. The per-call-site combinator `genPromiseAllSettledSite(n, elemT)`
drains, then for each element allocs a `__settled_<T>` record — fulfilled → `{status:"fulfilled",
value}`, rejected → `{status:"rejected", reason}` (the two status literals are static `allocString`
constants; unwritten fields are 0 since fresh bump memory is zero) — and stores the record ptr in an
`i32[]` outer array, fulfilling with the array ptr (vtype=3). Test `61_AsyncAllSettled` (mixed
fulfil/reject; `results[i].status`/`.value`/`.reason`). **Companion fix (general):** the two console.log
struct-lookup closures' `arr[idx].field` handler returned a STRING field with only the ptr (`watLoad`,
no `watLoadLen`) → `console.log(results[i].status)` printed the raw ptr; now returns ptr+len for string
fields (any struct-array string field in console.log benefits). **v1 limits:** ARRAY-LITERAL argument
only; value types i32/f64; access the field matching `status` (the other reads 0/empty, as the TS other
field is `undefined`).

**13.4 `Promise.all` shipped (suite 315→316, output-verified, zero regressions):** `Promise.all([p0,p1,…])`
fulfills with a `T[]` of the settled values, or rejects with the FIRST element's reason (re-thrown by
`await`, caught by `try/catch`). Under the eager model every element settles after a drain, so a
**per-call-site combinator** (`genPromiseAllSite(n, elemT)`, fixed arity = the array-literal length)
takes each element's promise ptr as a param, `$__drain_microtasks` first (settles any pending `.then`
element), then: first rejected element → copy its reason → reject the combined promise; else build a
fresh wasic dynamic `T[]` (`[length,capacity,…elems]`) of the values (read from each element's payload@16)
and fulfill with the array ptr (vtype=3). `emitExpr` handler matches `Promise.all([...])`, infers element
type from the first element via `promiseInnerTypeOf`, and emits `(call $__promise_all_K <ptr exprs…>)`.
`isPromiseExpr` recognizes `Promise.all(...)`; `promiseInnerTypeOf` returns i32 (the result is an array
ptr → `await_i32`). Test `60_AsyncAll` (i32, f64, mixed `resolve`/async-call/pending-`.then` elements,
first-rejection→caught). **v1 limits:** ARRAY-LITERAL argument only (count fixed at the call site; a
promise-array variable isn't supported — its element inner type isn't tracked); element types i32/f64
(string/struct later). **`Promise.allSettled` DEFERRED to 13.4b** — it returns an array of
`{status, value|reason}` objects, which needs a synthesized struct type + struct-array result var +
`r.status === "fulfilled"` string compare; substantial and split out (same incremental-scope spirit as
JSON-v1 / RegExp-subset).

**13.1b shipped (suite 313→315, output-verified, zero regressions):** TWO parts. **(1) Promise-holding-var
inner-type tracking** — a new `promiseInnerType: Map<varName, WatType>` side-table (reset per fn) is
populated by a non-consuming observer at the top of `emitStatement` whenever `const/let/var p = <promiseExpr>`
(`isPromiseExpr(rhs)` → `promiseInnerTypeOf(rhs)`); `isPromiseExpr`/`promiseInnerTypeOf` consult it for a
bare identifier. So `const p = computeF(); const v: f64 = await p` picks `$__promise_await_f64` (was i32
default), and `p.then(cb)` is recognized as a promise. Aliasing (`const q = p`) is tracked for free
(test `58_AsyncPromiseVar`: i32+f64 await-via-var, `.then` on a var, aliasing). **(2) Capturing-closure
callbacks** for `.then`/`.finally` — a capturing arrow lifts to `__anon_N__factory(caps)` (a closure
struct ptr); the reaction RECORD + functype were migrated to carry an **`env` slot**
(`(env i32, src i32, result i32) -> void`, 20-byte record `[tramp@0|env@4|src@8|result@12|next@16]`), and
the trampoline dispatches a closure cb via `call_indirect (type [i32,…args]→U) (env) (args) (i32.load env)`.
`genReactionTrampoline` now takes pre-built call exprs (the react block decides named-fn vs closure); at
most ONE closure cb per reaction (one env slot). Test `59_AsyncClosureCb` (capturing `.then` i32+f64,
capturing `.finally`). **Two bugs fixed under 13.1b:** (a) a LATENT arrow-result-inference bug — an
expression-body arrow's result was inferred with only the arrow's own params in scope, so a CAPTURED var
(`v => base + v`) was unknown → defaulted to f64; fixed by seeding the enclosing fn's params/locals into
the inference scope for BOTH the block-body and expression-body paths (`substituteOneArrow`). (b)
`promiseInnerTypeOf` `.then`/`.catch` only resolved NAMED callbacks → an f64 closure cb mis-picked
`await_i32`; added a `cbResult` resolver covering the `__anon_N__factory` form. **Known limits:**
capturing `.catch` needs a string-param closure, which wasic's closure trampoline can't expand to
(ptr,len) — guarded out (clean unsupported error; use a NAMED recover, e.g. 57); un-annotated
`const v = await pVar` of an f64 promise var still defaults to i32 (use a `: f64` annotation — the common
style; `inferInitType` is a free fn with no access to the side-table).

**13.1a shipped (suite 309→310):** `async` functions with `Promise<T>` returns (i32/f64); `await`
on async calls (with/without params) and on `Promise.resolve(...)`; un-annotated `const x = await …`
inference. Inline runtime (`getPromiseRuntimeWat`, gated by `needsPromiseRuntime`); promise object
in the canonical `result<T,E>` layout (§3.1). async-`Promise<void>` fns are plain void fns (body
runs eagerly) per §2.A. Test `54_AsyncBasic.ts`.

**13.2 shipped (suite 310→311, output-verified, zero regressions):** `.then(cb)` with a NAMED
callback (or a non-capturing arrow already lifted to one) — registers a reaction that runs as a
**microtask** (correct ordering vs sync code; FIFO across reactions), value-returning + void
callbacks, chained `.then().then()`, f64 callbacks, and `await` of a `.then` result. Microtask queue
= a FIFO linked list (`$__mt_head`/`$__mt_tail` globals, 16-byte reaction records); `$__drain_microtasks`
runs reactions via `call_indirect (type $ftype_i32_i32_r_void)` through **per-call-site trampolines**
(`genThenTrampoline`, registered in the funcref table). Drain runs inside `await` and once at the end
of `_start`. Test `55_AsyncThen.ts`. New touchpoints (all `src/wasic.ts`): `promiseTrampolineWat`/
`promiseThenCounter`; runtime gained `$__promise_enqueue`/`$__promise_then`/real `$__drain_microtasks`;
`genThenTrampoline` + `isPromiseExpr` (receiver-recursive, NOT a loose `.then(` substring match);
`emitExpr` `.then` handler + `emitStatement` fire-and-forget `.then` routing; `promiseInnerTypeOf`
`.then`/guarded-resolve cases; `emitFuncrefTable` forces a minimal table + `getPromiseRuntimeWat`
registers the reaction functype when `needsPromiseRuntime` (so await/resolve-only programs validate);
`_start` drain injection. **Two bugs found+fixed during 13.2:** (1) `isPromiseExpr` loose `.then(`
match mis-routed `const y = p.then(f)` as a statement → made it receiver-recursive; (2) greedy
`Promise.resolve(…)` regex in `promiseInnerTypeOf` swallowed a `.then` chain → added the
`parenDepthNeverNegative` guard.

**13.3a shipped (suite 311→312, output-verified, zero regressions):** `Promise.reject(reason)` (a
settled-rejected promise carrying the string reason) + **rejection→exception** — a rejected `await`
re-throws the reason via `(throw $__exn_tag …)`, caught by a surrounding `try/catch` (reuses the
Phase-15 EH machinery). Also: an **async function body that throws** is caught at the `await` site
**for free** under the eager model (eager execution + WASM exception propagation — no reject-wrapping
needed). Gated by a separate `needsPromiseReject` flag so resolve/then-only programs stay
exception-free: when set, the `await` helpers gain the `disc==1 → throw` check, `$__promise_reject`
is emitted, and `$__exn_tag` is declared. Test `56_AsyncReject.ts`. Known limit: `await
Promise.reject(x)` uses the i32 await helper (default), so an `f64`-typed assignment target would
mismatch — use an i32 context, or rely on the value never being read (it throws first).

**13.3b shipped (suite 312→313, output-verified, zero regressions):** `.catch(onR)` / `.finally(onFin)`
rejection *reactions* + `.then(onF, onR)` two-arg form. `genThenTrampoline` was generalized to
`genReactionTrampoline({kind: then|catch|finally, t, u, onF?, onR?, onFin?})` — a **dual-path**
trampoline that reads `src.disc` (+8) and branches: `then` fulfilled→`onF(value:T)` / rejected→propagate
(or `onR` when `.then(onF,onR)`); `catch` fulfilled→passthrough / rejected→`onR(reasonPtr,reasonLen)`
(reason is the STRING at payload@16+plen@24, so `onR` is a string-param fn); `finally` runs `onFin()`
on both paths then passes the settlement through. Passthrough/propagate use a type-agnostic
`copySettlement` (full 32-B image, 8-B payload via `i64`). The fixed `(src,result)→void` reaction
functype is unchanged. `.catch`/`.finally` reuse the existing `$__promise_then` runtime (it just
registers a reaction regardless of `src.disc`) — no new runtime fn. The `emitExpr` `.then` handler and
the statement router were widened to `(then|catch|finally)` with `splitArgs` (handles `.then(onF,onR)`);
`isPromiseExpr` recurses through all three; `promiseInnerTypeOf` adds `.catch`→`onR.result` and
`.finally`→src inner type. Test `57_AsyncCatch.ts` (`.catch` recover + fulfilled-passthrough, `.finally`
passthrough, `.then(dbl).catch(recover)` chain). Plain `.then` trampolines are now dual-path too
(propagate on rejected) — strictly more correct; 55's sources are fulfilled so output is unchanged.

**#13 async track: COMPLETE.** No async sub-phases remain. Remaining `#`-track work elsewhere: #14 own
dynamic runtime, the deferred P2 container, finishing #12 loaders (stub ports). See [roadmap.md](roadmap.md).

## STATUS — async track complete (2026-06-15)

**State:** 13.1a + 13.2 + 13.3a + 13.3b + 13.1b + 13.4 (all + allSettled) + 13.5 (hybrid lift) all done —
**the entire #13 async track is complete.** Full `tests/wasi/wasm_wasi` suite **317/317**, output-verified,
zero regressions; bindgen 104/104, jstyper 73/73. Tests: `54_AsyncBasic` … `61_AsyncAllSettled` (compiler
surface) + `tests/hybrid/hybrid_fixtures/async_hybrid.ts` (13.5, manual). Compiler code in `src/wasic.ts`; 13.5
in `src/hybrid.ts`. Load-bearing invariants in [design-decisions.md](design-decisions.md) → "Async /
Promise (#13)".

**Possible follow-ups (NOT in v1 scope, only if a need appears):** Approach B (state-machine CPS) for true
interleaving order; `Promise.race`/`any`; `Promise.all`/`allSettled` over a promise-array *variable* (not
just a literal) and string/struct element types; capturing `.catch` (string-param closure — needs the
closure trampoline's string-param expansion); a modc library + host-driven event loop (vs standalone
`_start` drain); documenting the async surface in the README (held until now — can be written).

**v1 limits (document on README):** eager interleaving order (not V8's suspend-order — §2.A); no real
async sources (awaiting a never-settled promise traps via the deadlock guard); combinator element types
i32/f64; `Promise.race`/`any` out; standalone WASI only; hybrid async lift requires an intra-module
awaited graph.

**13.4 notes:** both `Promise.all` and `Promise.allSettled` are ARRAY-LITERAL arg only (count fixed at
the call site; a promise-array *variable* isn't supported — element inner type isn't tracked); value
types i32/f64. `all` → per-site `genPromiseAllSite` (drain, first-rejection-wins, build `T[]`);
`allSettled` → per-site `genPromiseAllSettledSite` + synth `__settled_<T>` struct (never rejects).

**13.5 notes:** `src/hybrid.ts` — async fns route via an internal `f__impl` + a sync unwrapping wrapper
`f` (`return await f__impl(args)`); intra-body async calls renamed to `__impl`; `Promise<void>` wrappers
just invoke the impl. Async without a `Promise<T>` annotation stays in the host.

**13.1b notes for future work:** capturing `.catch` (string-param closure) is guarded out — wasic's
closure trampoline (`emitClosureFactory`, ~line 16981) keeps a `string` param as ONE i32 instead of
expanding to (ptr,len), so the trampoline arity mismatches the inner fn. Fixing that in the closure
machinery would unblock capturing reject callbacks (and string-param capturing closures generally).

**Dev environment (must-do each session):**
- The test runner shells out to a GLOBAL `wasmtk` (`WASMTK_BIN="wasmtk"`). This machine has no global
  install by default — install it and re-install after EVERY `src/` change, else the suite runs stale code:
  `deno install -g --allow-read --allow-write --allow-run --allow-env --allow-ffi --allow-net --config deno.json --force -n wasmtk main.ts`
  then `export PATH="$HOME/.deno/bin:$PATH"`.
- Fast inner-loop (no reinstall needed): `deno run --allow-read --allow-write --allow-run --allow-env main.ts wasic <f.ts>` then `… main.ts run <f.wasm>`.
- ALWAYS output-diff ts-run vs wasm-run (`deno run <f.ts>` vs the wasm). Full suite: `deno run -A
  tests/wasi_tests.ts` (capture to a file — don't `| tail`, it truncates; ~3–5 min; runs in
  background here).
- Filter one phase: `… tests/wasi_tests.ts tests/wasi/wasm_wasi "^5[4-7]_"`.

**After 13.3b:** 13.4 `Promise.all`/`allSettled` (i32/f64 element types v1); 13.1b promise-var inner-type
tracking + capturing-closure callbacks; 13.5 lift the `hybrid` async exclusion (`src/hybrid.ts` ~line
90/166). README stays untouched until the async surface is feature-complete enough to document.

---

**Design (below) — agreed before coding.** No design questions remain open (see §7).

**Owner scope decisions (2026-06-15) — ALL RESOLVED after the value-engineering pass:**

- **Lowering strategy:** **Approach A (microtask-drain) for v1, expand to Approach B (state-machine
  CPS) later** to add true-interleaving capability. A's runtime is reused by B unchanged (only the
  async-body lowering changes), so A is not throwaway.
- **API surface for v1:** `async`/`await` + `Promise.resolve`/`Promise.reject`; `.then`/`.catch`/
  `.finally`; `Promise.all`/`Promise.allSettled`. (`Promise.race`/`any` explicitly **out** of v1.)
- **Execution target:** **standalone WASI, self-contained** — `wasic` `_start` embeds the microtask
  loop and drains it at end of `_start`. No host-driven event loop in v1. (`modc` library + host
  loop is a later track.)
- **Value-slot representation (§3.1):** **type-tagged union internally** (generic runtime, heterogeneous
  promises) **+ the settled-value memory image laid out as the Canonical ABI `result<T,E>`**
  (discriminant i32 + naturally-aligned payload) **+ opaque promise handles**. Chosen for **maximum
  forward-compatibility** — same "align layer-1 representation now, container later" bet as the
  string-return ABI (`polyglot-producers.md` §1). Free now; makes a future WASI-P3 / async-component
  lift mechanical.
- **Runtime delivery (§3.6):** **inline WAT helpers emitted on demand** (gated by a
  `needsPromiseRuntime` flag, like `needsStringHelpers`/`needsMathLib`/`dynArrHelpers`), **NOT a
  merged `wasmtk:promise` capability.** *(Corrected 2026-06-15 from the earlier capability-library
  rec — see §3.6 for the reason: the `wasmmerge` `call_indirect` guard at `src/wasmmerge.ts:728`
  rejects any merged module containing `call_indirect`, and the Promise runtime fundamentally needs
  `call_indirect` to invoke reaction callbacks. Set/Map/JSON merge cleanly only because they are
  callback-free.)* The **locked invariant still holds**: the generic runtime NEVER introspects
  callbacks — it stores/invokes opaque `(trampoline_idx, env_ptr)` pairs through one fixed
  `$__promise_reaction` functype — so Approach B drops in (B's frame-resume thunk uses the same slot).
  Inline delivery actually *simplifies* this: runtime + compiler-emitted per-`T` trampolines live in
  **one module sharing one function table and one type section**, so `call_indirect` just works — no
  merge, no virtual import, no allocator unification (the runtime calls the main module's `$__malloc`
  directly). Tree-shaking is preserved at the function level (emitted only when async is used; `-Oz`
  strips unreached helpers).
- **Policies (§3.5):** **unhandled rejection → warn to stderr** (exit unchanged — matches the project's
  existing exit-0-on-uncaught posture in `utils.ts`; future `--strict-async` knob may trap/exit-nonzero).
  **Deadlock (queue empty, awaited still pending) → trap + diagnostic**, but routed through a single
  `__on_quiescent()` seam so the later host-driven mode can rebind it to *yield-to-host* without rework.

**Cross-language note (why the canonical choices, not foreign interop):** there is **no cross-language
async ABI in WASI-P1** (async-across-components is WASI-P3: `wasi:io/poll` + the async Canonical ABI),
and the runtime is callback-bearing so it lives **inline in the main module** (not mergeable — §3.6) —
i.e. v1 async is **strictly intra-module**. "Max compatibility" therefore means *canonical-shaped
in-memory representation now* (so a future P3 lift is a wrap), **not** making the wasic Promise
callable from Rust/Go/Zig today.

---

## 1. The governing constraint (read this first)

A WASI Preview 1 module is **single-stack, single-threaded, and has no event loop and no external
async source** — no timers, no network, no host callbacks. True suspension (awaiting a value that
is settled *later* by something outside the module) is **impossible** without the WASM
**stack-switching proposal**, which the project already lists as out-of-scope
(`roadmap.md` "Out of scope without more WASM proposals").

Consequence: **async in this target is deterministic deferral with ordering guarantees, not
concurrency.** A Promise can only ever be settled by *code running* (an async body completing, a
`.then` reaction firing, or an explicit `resolve`/`reject`). There is nothing to "wait for" that
isn't itself just more synchronous code. Every async function therefore *can* run to completion
synchronously; the only thing Promises add over plain calls is **microtask ordering**.

This reshapes "implement async": v1 is a **mini Promises/A+ runtime + a lowering that resolves
synchronously by draining the microtask queue**, not a coroutine/scheduler with real suspension.

---

## 2. Two strategies

### Approach A — Microtask-drain (RECOMMENDED for v1)

- Ship a **Promise runtime** (heap promise objects + a global microtask queue + a `__drain` loop),
  congruent with the existing Set/Map/JSON capability libraries.
- `async function f(): Promise<T>` compiles to a normal function returning a **promise pointer
  (i32)**. The body runs **eagerly to completion**; `return v` ⇒ return a *fulfilled* promise, a
  thrown error ⇒ return a *rejected* promise.
- `await p` ⇒ `__promise_await(p)`: if `p` is already settled (the common case under eager
  execution), take its value; if pending, **drain microtasks until `p` settles**, then take the
  value. A rejected `p` re-`throw`s the reason (integrates with the Phase-15 exception machinery so
  `try/catch` around `await` works).
- `.then`/`.catch`/`.finally` register reactions; reactions on a settled promise are enqueued as
  microtasks; the queue is drained at each `await` and once more at the end of `_start`.

**Covers:** sequential `await`s computing a value, `.then`/`.catch` chains, `Promise.all`/
`allSettled` over computed promises — i.e. essentially all *pure-compute* async code.

**Documented gap:** microtask **interleaving order across concurrently-pending async functions** is
not preserved, because async bodies run eagerly rather than suspending. Example that diverges from
Node/V8 ordering:

```ts
let log = "";
async function a() { log += "1"; await Promise.resolve(0); log += "3"; }
async function b() { log += "2"; }
a(); b();          // V8: "123"   (a suspends at await, b runs, then a's continuation)
                   // A:   "132"   (a runs eagerly through its await, then b)
```

This pattern (observing interleaving via shared mutable state) is the *only* class A gets wrong, and
the cases that genuinely *require* suspension are impossible under any approach here without
stack-switching. Honest framing, same spirit as "JSON integer-number v1" / "RegExp v1 subset."

**Cost / risk:** ~1–2 weeks; fits wasic's capability-library + inline-helper patterns. Low risk.

### Approach B — Full state-machine (CPS) lowering (LATER / general)

Split each async body at every `await` into a resumable state machine with a **heap-allocated frame**
holding live locals, and register continuations on the awaited promise. This is what Babel
regenerator / Rust async / C# do. Fully general: correct interleaving, `await` inside loops /
branches / `try-catch`.

**Cost / risk:** multi-week; the hardest single feature in the compiler. wasic's codegen is
regex/string-based with no real CFG/SSA, so splitting control flow at await points across loops and
persisting locals into a frame struct is high-effort and error-prone. Recommended **only if** a real
need for true interleaving appears after A ships.

**Recommendation:** ship **A** for v1; keep B documented as the escalation path. A's runtime
(promise objects, queue, combinators, rejection↔exception bridge) is **reused unchanged** by B — B
only replaces the *lowering* of async bodies, not the runtime. So A is not throwaway work.

---

