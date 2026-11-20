# dynrt-design — part 2 of 6

Continues [dynrt-design.md](dynrt-design.md) (split by size on 2026-11-20, letter H38). Sections:

- Next increments
- Increment 3 — wasic `any` + auto-merge + hybrid migration — SCOPED 202
- #14 follow-up — any-signature host↔core marshalling (SHIPPED 2026-06-2
- #14 follow-up — hybrid fallback refinement (per-function) (SHIPPED 202

## Next increments

- **1a — value + object model — ✅ SHIPPED 2026-06-22** (test `18j`; see above).
- **1b — `wasmtk:dynrt` virtual import + tree-shake — ✅ SHIPPED 2026-06-22** (test `18k`; see above).
  Deferred extras (optional, not started): hashmap-backed property map; f64-aware `dynToNumber(string)`.
- **2a — `eval` of a pure expression language — ✅ SHIPPED 2026-06-22** (test `18l`; see above).
  Authoring decision resolved: continue in the subset (no `rtcore`/hand-WAT needed yet).
- **2b — variables + environment + member/index access — ✅ SHIPPED 2026-06-22** (test `18m`; see
  above). Scope split: calls + real short-circuit moved to 2c (short-circuit is only observable with
  side-effecting calls; guarded member access makes 2b trap-safe without it).
- **2c — function values (tag 7) + calls + REAL short-circuit — ✅ SHIPPED 2026-06-22** (test `18n`;
  see above). Built-ins via static-switch dispatch (no `call_indirect`, merge-safe); `evalLive`
  skip-parse short-circuit guarding the call dispatch.
- **2d.1 — statements + control flow (`dynRun`) — ✅ SHIPPED 2026-06-22** (test `18o`; see above).
  let/const/assignment, if/else, while, blocks, return; direct-eval re-parse loops; still in the
  subset (no wall → no `rtcore`/hand-WAT needed).
- **2d.2 — user-defined functions + `new Function` — ✅ SHIPPED 2026-06-22** (test `18p`; see above).
  **COMPLETES interpreter increment 2.** User function values (5-slot cell + scope-chain); in-source
  `function` decls + `dynMakeFunc` (new Function); recursion/closures via `envLookup`; parser
  reentrancy save/restore. Still in the subset — the `rtcore`/hand-WAT path was never forced.

**Interpreter increment 2 (2a–2d.2) COMPLETE — the whole #14 §6 kernel-of-`eval`/`new Function` is
covered, authored entirely in the wasic TS subset (no `rtcore` extraction / hand-WAT needed).**
Remaining for #14: **increment 3 — wasic `any` type + auto-merge + migrate `hybrid --auto`'s dynamic
target off `javyc`** (lower a wasic `any` to a boxed-value handle and route dynamic-shaped functions
to this runtime), plus an optional memory pass to lift the heap-bound-recursion limit.

## Increment 3 — wasic `any` + auto-merge + hybrid migration — SCOPED 2026-06-22 (not started)

**Decisions (owner 2026-06-22):** (1) **DEEP `any`** — box/unbox + operators + member/index/call on
`any` route to `dynrt`; (2) **hybrid migration IN this increment** (repoint `hybrid --auto`'s dynamic
route to wasic+dynrt, host fallback); (3) **auto-merge on `any`/`eval` usage** (inject a synthetic
`wasmtk:dynrt` import). This is the **largest, most invasive increment of the whole #14 track** — it
modifies the wasic COMPILER (type system, the hot binary-op path, member/call emission), not just the
dynrt library. Recommended BUILD ORDER (land + full-suite-verify each before the next; delivered
collectively as "14.3"):

- **3.1 — `any` as a tracked type + box/unbox + auto-merge.**
  **3.1-foundation ✅ SHIPPED 2026-06-22** (test `18q`): `mapType("any") → i32` (a boxed handle; no
  test used `any` before — it had fallen through to f64, so the change is safe). AUTO-MERGE works —
  the bundler (`tsbundler.ts`, in `load()` for the entry) injects a synthetic `import { …ops… } from
  "wasmtk:dynrt"` when the entry uses `: any` / `any[]` / `<any>` / `eval(`, reusing the existing
  virtual-capability merge + tree-shake; a driver with NO explicit dynrt import merges it purely from
  `: any` usage. New dynrt export **`dynStrBytes`** (raw byte ptr, for any→string unboxing). Proven:
  box/unbox round-trip (`dynNumber`→`dynNumberValue`), `eval` of a string → `any`, `any` string +
  introspection, `any` params/returns (= i32 handle) through a function. Driver
  `tests/wasi/wasm_wasi_bundle/dynrt_any_bundle/main_wasic.ts`. (`dynMember`/`dynIndexValue` are NOT yet in
  the injected import set — they become dynrt exports in 3.3.)
  **3.1-sugar ✅ SHIPPED 2026-06-22** (extends `18q`): **implicit boxing of LITERAL initialisers** —
  a transpile source pre-pass rewrites `const x: any = <number|string|template|bool literal>;` →
  `dynrt_dynNumber/dynString/dynBool(...)` (conservative: only a bare literal terminated by `;`, so
  `42+3` / vars / `eval(...)` / already-`any` are untouched). **`as`-unboxing** — new `anyVars`
  side-set (per-function + module, populated by scanning body/start lines for `: any` declarations);
  the `as` handler emits `dynrt_dynNumberValue`(+trunc for i32) / `dynrt_dynToBool` when the operand
  is an any var. **KEY WIRING LESSON:** the bundler rewrites explicit `dynX` imports → `dynrt_dynX`
  (merge prefix) BEFORE transpile, so names the compiler INTRODUCES (boxing pre-pass, as-handler) must
  be **pre-prefixed `dynrt_`** to resolve against the merged module. **Gaps (follow-ups):** any-PARAM
  unboxing (FuncParam doesn't retain the raw `any` annotation — needs an `isAny` flag from
  parseFunctions); `as string` unboxing (needs ptr+len in the string-assign path, not single-value
  emitExpr); ~~inline `(x as f64) === lit` mis-infers the comparison as i32~~ FIXED 2026-10-13
  (ld36); non-literal typed RHS boxing (`const x: any = someI32`). **Since D3 (2026-10-13) `x as i32`
  on an `any` is refused**: unbox with `x as f64`, then `f64.toI32(…)` / `toI32Sat` / `toI32Wrap`.
- **3.2 — operators on `any`. ✅ SHIPPED 2026-06-22** (extends `18q`). In `emitExpr`'s binary-op loop,
  right after `lhs`/`rhs` are split, a guarded block fires **only when an operand is a simple `any`
  var** (`anyVars.has`) — otherwise the existing typed paths run **untouched** (the safety invariant
  for the hottest path). New helper `boxAnyOperand` yields a handle for each operand (any var passes
  through; literal/typed var boxed via merged `dynrt_dynNumber/dynString/dynBool`). Emission:
  arithmetic `+ - * / %` → `dynrt_dynAdd/Sub/Mul/Div/Mod` (result is an **`any` handle**); `=== ==` →
  `dynrt_dynStrictEq` (**raw i32 0/1**), `!== !=` → `(i32.eqz …)`; `< > <= >=` →
  `dynrt_dynToBool(dynrt_dynLt/Gt/Le/Ge …)` (**raw i32**, so they work in conditions, matching wasic's
  comparison convention); `&& ||` → truthiness short-circuit over `dynrt_dynToBool(operand)` (**v1
  returns the boolean, not the JS operand** — documented). String concat on `any` works (`dynAdd`
  dispatches). Full suite stayed green (the guard means zero impact on non-`any` code). **Gaps
  (follow-ups):** inline unbox of an op RESULT (`(a+b) as i32`) — assign to an `: any` var first then
  `as` (same shape as 3.1's inline-cast gap); `typeof x`(any) still resolves at compile time (should
  be runtime `dynTypeof`); unary `-x`/`!x` on `any`; bitwise/shift on `any`; bare `if (anyVar)` needs
  `if (anyVar as bool)`; chained any-arith where an operand is a sub-expression (not a simple var).
- **3.3 — member/index/call on `any` + bare `eval` — ✅ SHIPPED 2026-06-22** (extends `18q`). A guarded
  any-dispatch block near the top of `emitExpr` (fires ONLY when the receiver is a simple `any` var,
  else typed handlers run untouched): `x.foo` → `dynrt_dynMember(x, "foo")`; `x[i]` →
  `dynrt_dynIndexValue(x, boxedIndex)`; `x(args)` → `dynrt_dynCall0/1/2/3(x, …boxed args)`. Library:
  **`dynMember` + `dynIndexValue` are now EXPORTED**, plus new fixed-arity **`dynCall0/1/2/3`** helpers
  (build the args array + `dynApply` as a single expression — wasic can't build an array inline; arity
  > 3 is a gap); all added to the auto-injected import set; caps bytes regenerated (12406). Bare
  **`eval(...)`** → a transpile source pre-pass rewrites `eval(` → `dynrt_dynEval(` (the bundler
  already injected the import + merged on the `eval(` it saw). All results are `any` handles. Proven:
  `obj.x`, `arr[0]`/`arr[ix]` (computed index), `env.sqrt`→`sqrtFn(16)`=4 / `maxFn(3,8)`=8,
  `eval("2 + 3 * 4")`=14. **Gaps (follow-ups):** chained `x.a.b` / `x.a()` (single-level only — use an
  intermediate `: any` var); call arity > 3; member-ASSIGNMENT (`x.foo = …` / `x[i] = …`).
- **3.4 — hybrid `--auto` migration + host fallback — ✅ SHIPPED 2026-06-22 (COMPLETES increment 3 +
  the whole #14 track).** Refined design (avoids a host↔core marshalling gap): `any`-**signature**
  functions stay in the host (marshalling a boxed handle across bindgen is a follow-up), but functions
  with a **typed signature and a DYNAMIC body** (`any`/`eval` internally — which lower to the merged
  dynrt runtime via 3.1–3.3) now compile to the WASM core; their typed signature marshals normally.
  **Try-compile / fall-back-to-host ladder** in `runHybrid` (`src/hybrid.ts`): compile the full core;
  on failure, re-route the dynamic-bodied functions (`parseHybridFile` new `excludeDynamicBody` option
  → keeps `any`/`eval` functions in the host) and recompile the static remainder; if nothing routable
  remains, the runner is host-only. **modc returns (does NOT throw) on a compile abort**, so failure
  is detected by whether the core `.wit` was (re)produced (stale removed first). **Also fixed a real
  bug:** `compileLibTs` (modc) didn't handle EMBEDDED virtual-capability `entry.bytes`/`entry.witText`
  the way `compileWasiTs` does — so the auto-merged `wasmtk:dynrt` failed in the modc core compile
  ("Cannot read imported WASM wasmtk:dynrt"); fixed to mirror `compileWasiTs`. Verified end-to-end:
  fixture `tests/hybrid/hybrid_fixtures/dynamic_hybrid.ts` (`evalScaled(n: f64): f64` with an `eval`+`any`
  body) routes to WASM → runner prints `evalScaled(8)=50`; `dynamic_fallback_hybrid.ts` (uncompilable
  dynamic body) falls back to host (warning) while the static fn still routes → `plus1(41)=42`; the
  existing `math_hybrid` is unchanged. This realizes the §6 intent — `hybrid --auto`'s dynamic target
  is now the own runtime (wasic+dynrt), not `javyc`. **Follow-ups since shipped (both ✅):**
  any-SIGNATURE host↔core marshalling (the section above) and the fallback refinement (the section
  below — only the FAILING dynamic functions move to host now, not all of them).

**Cross-cutting:** the `any` codegen calls the MERGED dynrt exports (prefixed names from the
`wasmtk:dynrt` merge) — the compiler must emit the right merged symbol. **Heap/no-GC caveat applies**
(§ retirement note below): `any`-heavy / eval-heavy programs inherit the bump-allocator limit. Each
of 3.1–3.4 ships its own regression test (`18q…`/compiler tests) and must keep the full suite green
(output-diff). **Honest risk:** 3.2 (operator routing) + 3.4 (hybrid try/fallback) are the two
highest-risk pieces; 3.1 is foundational and lower-risk.

## #14 follow-up — any-signature host↔core marshalling (SHIPPED 2026-06-22)

Closes the 3.4 gap: a function with an **`any` param or return** can now be called from the host with
**real JS values** (number/string/boolean), not raw handles. Four components:

1. **Track `any` signatures (`src/wasic.ts`):** `FuncParam.isAny` (set in `parseParams` when the
   annotation is `any`) + `FuncDef.isAnyResult` (set in `parseFunctions` from `rawResult === "any"`).
   Also: `emitFunction` now adds **any-PARAMS** to `anyVars` (the 3.1 gap — params lacked `isAny`
   before), so `x as f64` / operators / member-access on an any param work inside the body.
2. **WIT marker:** `generateWit` emits `x: any` / `-> any` (a **wasmtk-extension** WIT type) for any
   params/results instead of `s32`.
3. **Export the marshalling helpers:** `injectDynrtMarshalExports` (module-level helper, called
   post-merge in BOTH `compileWasiTs` and `compileLibTs`) appends `(export "dynNumber" (func
   $dynrt_dynNumber))` … for `dynNumber/dynNumberValue/dynString/dynStrBytes/dynStrLen/dynBool/
   dynToBool/dynTypeof` (+ `cabi_realloc` if not already exported, for boxing an `any` string) when
   `hasAnyExportSignature()` is true. Exporting keeps Binaryen from stripping them.
4. **bindgen marshalling (`src/bindgen.ts`):** `WitType` gains `"any"`; `genLoadModule` emits `_box`
   (JS number→`dynNumber`, boolean→`dynBool`, string→`_writeStr`+`dynString`) and `_unbox` (switch on
   `dynTypeof`: 3→`dynNumberValue`, 4→read `dynStrBytes`+`dynStrLen`+`TextDecoder`, 2→`dynToBool`,
   0→`undefined`, else→opaque handle). `any` params → `_box(arg)`; `any` returns → `_unbox(call)`.

**Verified end-to-end** (`tests/wasi/wasm_wasi_bundle/anysig_bundle/`: `anysig_lib.ts` modc lib +
`host.ts`): `identity(42|'hi'|true)` round-trips all three types; `addOne(41)=42` (any-param unbox +
result box); `typeName(42|'x'|true)` → `"number"|"string"|"boolean"` (runtime tag dispatch + string
return); `exclaim('wow')='wow!'` (string concat on an any).

**Objects/arrays — structural marshalling (SHIPPED 2026-06-22, extends this):** objects and arrays as
`any` now cross the boundary as **real, recursively-converted JS objects/arrays** (not opaque
handles). Added dynrt object-enumeration exports `dynObjKeyPtr`/`dynObjKeyLen`/`dynObjValAt` (key data
ptr / key len / value handle by index); `dynrtMarshalExportNames()` now also exports the structural
helpers (`dynTag`/`dynNull`/`dynUndefined`/`dynArray`/`dynArrLen`/`dynArrGet`/`dynPush`/`dynObject`/
`dynObjLen`/`dynObjKeyPtr`/`dynObjKeyLen`/`dynObjValAt`/`dynSet`); the tsbundler auto-import list gained
the container accessors so lib bodies can call them. bindgen's `_box` recurses (Array→`dynArray`+
`dynPush`, object→`dynObject`+`dynSet`, null→`dynNull`, undefined→`dynUndefined`) and `_unbox`
switches on the **RAW `dynTag`** (5=array→build JS array, 6=object→build JS object by enumerating keys,
1=null, plus the primitives). Verified (`anysig_bundle`): `makePoint(3,4)`→`{x:3,y:4}`,
`triple(1,2,3)`→`[1,2,3]`, `sumArr([10,20,30])`→60 (JS array boxed IN), `getX({x:42,y:7})`→42 (JS
object boxed in + member access). **Remaining gaps:** FUNCTIONS as `any` still cross as opaque
handles; boxing a typed VAR into `any` in-body still needs an explicit `dynNumber(...)` (the
non-literal-RHS boxing gap from 3.1); `s64`/`bigint` any not handled; cyclic objects would infinite-loop.

## #14 follow-up — hybrid fallback refinement (per-function) (SHIPPED 2026-06-22)

Refines the 3.4 all-or-nothing fallback (which moved EVERY dynamic-bodied function to the host when
the core failed) to move only the FAILING ones (`src/hybrid.ts` `runHybrid`):

- `parseHybridFile` gains `excludeFns?: Set<string>` (keep specifically-named functions in the host).
- On full-core failure: partition routed functions into **static** (no `any`/`eval`) and **dynamic**;
  **probe each dynamic function** with the static context (`probeCompiles` — compiles `[…statics, d]`
  to a SEPARATE `${base}_probe.*` module that's cleaned up, so it never clobbers the real core);
  collect the ones that fail into `bad`. Re-route only `bad` to the host (`excludeFns: bad`), keeping
  the compilable dynamic functions in the WASM core. The warning names the moved functions.
- **Safety ladders preserved:** if no single culprit is found (e.g. dynamic-calls-dynamic, where each
  fails its static-only probe) → coarsen to all-dynamics-to-host; if the survivors still don't compile
  (a static fn depends on a moved dynamic) → coarsen again; if nothing routable remains → host-only
  runner. So it's strictly ≥ the 3.4 behavior.

**Verified** (`tests/hybrid/hybrid_fixtures/dynamic_partial_hybrid.ts`: one GOOD dynamic `goodDynamic`
[`eval`+`any`, compiles] + one BAD `badDynamic` [undefined call] + a static `plus1`): only
`badDynamic` is moved to host (warning: "1 dynamic function(s) … : badDynamic"); `goodDynamic` +
`plus1` stay in the WASM core; runner prints `goodDynamic(8)=50` / `plus1(41)=42`. The single-bad
(`dynamic_fallback_hybrid`), all-good (`dynamic_hybrid`), and static (`math_hybrid`) fixtures are
unaffected. **Cost:** one probe-compile per dynamic function (dynamic functions are typically few).
**Gap:** a dynamic function that calls ANOTHER dynamic function is over-rejected to host (its
static-only probe fails) — safe (host runs it), documented.

