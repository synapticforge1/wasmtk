# dynrt-design — part 4 of 6

Continues [dynrt-design.md](dynrt-design.md) (split by size on 2026-11-20, letter H38). Sections:

- Functions-as-`any` host↔core marshalling — SCOPE (drafted 2026-06-23)
- Does 14.3 let us drop `javyc`? — retirement criteria (decided framing 
- #14 own dynamic runtime — FINALIZED 2026-06-24 (shipped in v1.9.0)

## Functions-as-`any` host↔core marshalling — SCOPE (drafted 2026-06-23)

**Goal:** let a dynrt function value (tag 7) cross the host boundary as a real callable. Two directions,
very different difficulty:

**Why it's not like other values.** Numbers/strings/objects/arrays are bindgen-DEEP-COPIED into JS
values, so the host holds independent data. A function is CODE — it must stay a dynrt HANDLE. But the
GC only roots interpreter state (the shadow-stack), not host-held handles, so a host-held function
proxy is collectible the moment any later core call auto-collects → use-after-free. **The enabler is a
host-PIN table.**

**Pin table (the shared prerequisite).** dynrt's GC is NON-MOVING (sweep frees, never relocates), so a
pinned handle's address stays valid — pinning just needs to keep it MARKED. Add `__gc_pins` (a
slot list of pinned handles, 0 = empty); `dynGcMarkRoots` also `gcMark`s every non-zero pin. Exports:
`dynGcPin(h) → slot` (store h in a free/appended slot, return index), `dynGcUnpin(slot)` (clear it).
~30 lines + a test (pin → collect → survives; unpin → collect → reclaimed).

**Phase 1 — core→host (the 80% case; MODERATE effort).** A function RETURNED from a core call becomes
a JS function. bindgen `_unbox`, on `dynTag(h)===7`: `pin = dynGcPin(h)`; return a JS proxy
`(...args) => _unbox(dynApply(h, buildArgsArr(args.map(_box))))`, with a `.release()` that
`dynGcUnpin(pin)`s (+ a FinalizationRegistry backstop, since FR timing is non-deterministic). Needs
`dynTag`/`dynArray`/`dynPush`/`dynApply`/`dynGcPin`/`dynGcUnpin` in the marshal-export set (most already
exported). ~25 lines bindgen + a fixture (core returns a closure; host calls it). **Caveat:** pinned
functions LEAK until released — host responsibility (documented), FR backstop helps.

**Phase 2 — host→core (HARDER; defer).** A JS function passed INTO a core call must let the core call
BACK into JS. Needs: a "foreign function" dynrt value (new tag-7 marker holding a callback id); an
imported `env.__hostcall(id, argsArr) → resultHandle` (Phase-40-style import); the host maintains a JS
callback registry and provides `__hostcall` (look up id, `_unbox` the args, call the JS fn, `_box` the
result); and `dynApply` dispatches a foreign-function value to `__hostcall`. Bigger (import wiring +
dispatch + arg/return marshalling across the boundary mid-interpretation). Reuses the pin table for the
result/args lifetime.

**Recommended order:** pin table → Phase 1 (core→host) → ship + document the leak caveat → Phase 2 later
if needed. Phase 1 alone covers returning closures/callbacks from a core, which is the common ask.

## Does 14.3 let us drop `javyc`? — retirement criteria (decided framing 2026-06-22)

**No — not on 14.3 alone.** 14.3 is *wiring, not language growth*: it lowers `any` → a boxed handle,
auto-merges `dynrt`, and repoints `hybrid --auto`'s dynamic route from `javyc` → `dynrt`. It changes
*which engine dynamic code lands on*; it does not expand what the interpreter understands. `dynrt` is a
**v1 SUBSET interpreter**; `javyc`/QuickJS is a **full spec-compliant engine with a stdlib + GC**.

So after 14.3, **keep `javyc` as the FALLBACK** (route the covered subset to `dynrt`, everything else
to `javyc`) — matches the §7-#7 intent without over-claiming. The gap `javyc` still covers:

- **Language:** arrow fns, function *expressions*, `for`/`for-of`/`for-in`, `switch`, `try/catch` in
  eval, destructuring, spread, template literals, classes, generators, `async`/`await`, object/array
  **literals in eval source**, member-assignment, real block scoping + write-through assignment.
- **Stdlib / semantics:** prototype chains, `this`, `Array`/`String`/`Object`/`Map`/`Set`/`JSON`/
  `RegExp` *as dynamic objects with methods*, `Symbol`.
- **Runtime:** ~~no GC~~ — **GC gap CLOSED 2026-06-23** (the #14 mark-sweep GC P1–P5b + hybrid
  recycling allocator: long-running / deep-recursion dynamic code now runs in bounded memory). This was
  one of the three retirement gaps; the **Language** and **Stdlib/semantics** gaps above remain open.

**Phase 2 (host→core callbacks) does NOT change this answer** — it is marshalling plumbing (passing a JS
function INTO the core via an imported `__hostcall`), the reverse direction of the functions-as-`any`
already shipped in v1.9.0. Like 14.3 it is *wiring, not language growth*: it does not expand what the
interpreter understands, so it does not retire `javyc`.

**`javyc` is removable only when EITHER:** (1) `dynrt` grows to near-language-completeness + a dynamic
stdlib (a large multi-increment track — "2e language", "2f dynamic stdlib"; the "2g GC" piece is now
DONE); OR (2) the uncovered remainder is **declared out of scope** (the brief's "route (a)") and `javyc`
dropped by policy rather than coverage. Until one of those, the default flips to `dynrt` but `javyc`
stays as the safety net.
- **3 — wasic `any` + auto-merge:** add an `any` type to wasic that lowers to a boxed-value handle;
  auto-merge the runtime when `any`/dynamic features are used; migrate `hybrid --auto`'s dynamic
  routing target off `javyc` onto the own-runtime.

---

## #14 own dynamic runtime — FINALIZED 2026-06-24 (shipped in v1.9.0)

The #14 track — **wasmtk's own dynamic runtime** — is **COMPLETE** as the arc scoped in §6/§7-#7:
value model (1) → virtual import + tree-shake (1b) → recursive-descent interpreter `eval`/`new
Function` (2a–2d.2) → wasic `any` type + auto-merge + operators + member/index/call + hybrid `--auto`
migration (3.1–3.4) → host↔core marshalling of all value kinds incl. **functions** → bounded-memory
**mark-sweep GC** (P1–P5b) + **hybrid recycling allocator** → **functions-as-`any`** producer
(`Function(params,body)`) + pinned host proxy, end-to-end (`getDoubler()(21)=42`). Published v1.9.0.

**The ONE deferred #14 follow-up:** **Phase 2 — host→core callbacks** (pass a JS function INTO the core
via an imported `__hostcall`; the reverse of the core→host functions-as-`any` already shipped). It is
marshalling plumbing, independent of language coverage, and does NOT retire `javyc`.

`dynrt` is now the **primary** dynamic engine; `javyc` is the **fallback**. Retiring `javyc` from the
codebase is a SEPARATE, larger track scoped below.

