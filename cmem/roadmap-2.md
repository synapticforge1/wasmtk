# roadmap — part 2 of 5

Continues [roadmap.md](roadmap.md) (split by size on 2026-11-20, letter H38). Sections:

- Prioritized execution order (set 2026-06-03)

## Prioritized execution order (set 2026-06-03)

**Principle (project owner, 2026-06-03):** the never-scheduled language-completeness gaps take
**precedence over the big tracks**, because #5 async and the own dynamic runtime _lower onto_ the
existing codegen (struct layout, field access, type inference, narrowing, tag dispatch). Completing
the foundational gaps first — with cheap, standalone repros — hardens exactly those paths so a later
bug is debugged once, not while also debugging a state-machine/interpreter transform. Ordered
foundation-depth first, then by effort (quick wins first). Each item ships with its own regression
test. (The **ecosystem loader** track is the exception — it consumes the compiled
`.wasm`/`.wit`/ABI, not TS syntax, so it is orthogonal and ungated.)

### Phase 51 — Language hardening (GATES #5 async + own-runtime) — ✅ COMPLETE 2026-06-07

All four items done: 51.1 `instanceof`, 51.2 object spread, 51.3 destructuring (param + nested
object + nested tuple), 51.4 utility types. The async (#13) and own-runtime (#14) tracks are now
unblocked.

1. **`instanceof`** — ✅ **DONE 2026-06-05** (class tags). Runtime tag check when the module has
   inheritance (`tag(obj) ∈ {target + all subclasses}` via `findSubclasses`, read from offset 0);
   compile-time const from the var's tracked class when there is no inheritance (no tag header).
   `if (x instanceof Sub)` narrows x to Sub in the then-branch (reuses the Phase-34 narrow machinery
   in `emitBlock`); `console.log(x instanceof C)` works via a `setInstanceofResolver` bridge in
   `console_log.ts`. Tests
   `51_BasicInstanceof`/`51_InstanceofNarrowing`/`51_InstanceofNoInheritance`/ `51_Phase51Combined`
   (suite 279→283). DU-tag `instanceof` not added — TS DUs aren't classes, so `instanceof` doesn't
   apply; class hierarchies are the real use. Two PRE-EXISTING construction gaps were surfaced AND
   **fixed 2026-06-05** (tests `51_ModuleLevelClassInstance` + `51_ClassInstanceArrayLiteral`, suite
   283→285): (a) module-level class instances are now tracked in `classVars` (new `newClassPre` in
   the startBodyLines pre-scan) so field access / method dispatch / instanceof work at module scope;
   (b) `const a: C[] = [new C(…), …]` is desugared to `const a: C[] = []; a.push(new C(…));…` (new
   `expandClassInstanceArrayLiterals` source pre-pass) so each element is constructed with its
   ctor + class tag. See compiler-bugs.md / design-decisions.md. A third gap surfaced here —
   single-PHYSICAL-line class/constructor bodies, e.g.
   `class C { v: i32; constructor(x: i32) { this.v = x; } }` all on one line — was ALSO **fixed
   2026-06-05** (test `51_SingleLineClassBody`, suite 285→286): `parseClasses` now splits class
   members with a depth/string-aware `splitClassMemberLines` (so fields sharing a line with methods
   are parsed) and splits single-physical-line method bodies via `splitStmts`.
2. **Object spread** `{...base, k: v}` — ✅ **DONE 2026-06-07** (test `51_ObjectSpread`, suite
   287→288). `const r: T = { ...src, k: v }` builds the struct at runtime: copies every target field
   from `src` by name (using the base's own offset/type; string fields copy both ptr+len words),
   then applies the named/shorthand overrides; unset fields stay zero. New
   `parseStructLiteralWithSpread` helper + `resolveStructBase`/`emitSpreadStructLiteral` in
   `src/wasic.ts`; `emitRuntimeStructLiteral` delegates when a spread is present (non-spread path
   unchanged). Both struct-let pre-scans (function + module) flag the var in `structSpreadVars` and
   register it with **ptr=-1** ("pointer lives in the local," so every field-read site reads via
   `local.get`); a `structSpreadMatch` emit branch (before the static struct-let handler) owns the
   assignment. Works for literal/runtime-var overrides, pure copy, mixed i32/f64 fields,
   function-local + module-level, and chained spread (spread of a spread). Known limits:
   single-physical-line literals only; string-field _overrides_ still store ptr-only (pre-existing
   `emitRuntimeStructLiteral` limitation — copies are fine); spread in `return {...}` / call-arg
   position not wired (struct-let + array `push` contexts are).
3. **Destructuring in function params** `f({x, y}: Vec2)` — ✅ **DONE 2026-06-07** (test
   `51_ParamDestructuring`, suite 288→289). Source pre-pass `expandParamDestructuring()` rewrites a
   destructuring param `{ x, y }: Vec2` / `[a, b]: [i32,i32]` to a synthetic struct/tuple param
   `__pd_N: Type` and injects `const { x, y } = __pd_N;` / `const [a, b] = __pd_N;` at the top of
   the body — reusing the existing struct-param + `const {…}=obj` / `const […]=tup` machinery (no
   new emit path). Runs before `parseFunctions`. Also fixed `parseParams`' comma-split to be
   **bracket/brace-aware** (was paren-only, so a tuple-type param `[i32, i32]` split at the inner
   comma). Covers object params (incl. renamed `{a: lo}`), tuple params,
   destructured-alongside-normal params, struct-var args, and multiple destructured params. Known
   limits: named `function NAME(...)` declarations only (arrow/method params are a follow-up);
   inline tuple-literal _args_ (`f([1,2])`) remain a separate pre-existing gap (pass a tuple var;
   struct-literal args work). **Nested destructuring** `const { a: { b }, c } = obj` — ✅ **DONE
   2026-06-07** (test `51_NestedDestructuring`, suite 289→290). The object-destructure emit
   handler + pre-scan were rewritten from the `\{([^}]+)\}` regex to **balanced-brace detection +
   recursive helpers** (`emitDestructurePattern` / `collectDestructureLocals`): a binding whose
   value is itself a `{…}`/`[…]` pattern recurses into the nested struct/tuple field (pointer fields
   load the stored ptr; inline-tuple fields use the field address) — no temps, nested loads inline.
   Arbitrary depth + renames + Phase-48 zero-default fallback all work, incl. nested destructuring
   in a param (`f({a:{b}}: T)`, via the param pre-pass). **Nested tuple/array
   `const [[a, b], c] = t` — ✅ DONE 2026-06-07** (test `51_NestedTuple`, suite 290→291). Made the
   tuple infra bracket-aware end-to-end: `tupleTypeName`/`makeTupleStructDef` now split
   bracket-aware and **embed a nested tuple element inline** (`tupleTypeName` field,
   natural-aligned, size = nested totalSize); tuple-literal construction
   (`const t: [[i32,i32],i32] = [[1,2],3]`) recurses via `emitTupleLiteralStores` (stores
   sub-elements at `baseOffset+field.offset`); tuple destructuring routes through the same recursive
   `emitDestructurePattern` as objects (balanced-bracket detection). Works for mixed f64/i32, nested
   tuple **params** (`f([[a,b],c]: [[i32,i32],i32])`), and preserves positional gaps. **Phase 51.3
   COMPLETE.** **Process note:** the test runner judges by per-step **exit code, not output diff** —
   a broad codegen change can silently alter output while still "passing". Always output-verify
   (ts-run vs wasm-run) the tests your change touches; a gap-collapse bug here
   (`splitBraceAwareCommas` drops empty elements → `[a, , c]` read the wrong index) passed the suite
   but was caught by output-diffing `21_*`. Fixed with `splitBraceAwareCommasKeepEmpty`.
4. **Utility types** — ✅ **DONE 2026-06-07** (test `51_UtilityTypes`, suite 291→292). First batch
   shipped: **`Partial`/`Readonly`/`Required`/`NonNullable`** are pass-through (resolve to the inner
   type — all layout-identical in wasic's fixed-struct world; `NonNullable` also strips `| null`),
   done by `expandUtilityTypes()` (source text transform with balanced `<…>` extraction, BEFORE
   parseStructs, loops for nesting like `Partial<Readonly<T>>`). **`Pick`/`Omit`/`Record`**
   synthesize struct types via `expandStructUtilityTypes()` (AFTER parseStructs, needs the base
   def): `Pick`/`Omit` copy the base fields (subset / complement) PRESERVING offsets + totalSize so
   a base-typed value is layout-compatible; `Record<"a"|"b", V>` builds a fresh struct keyed by the
   literal-union (open-key `Record<string,V>` is a dynamic map → left unresolved). Both
   `type Alias = Pick<…>` (registered under the alias, decl stripped) and inline use sites (synth
   `Pick_T_K` name — MUST start uppercase so `[A-Z]\w*` struct-type detection fires) work.
   **Deferred (the "then" batch):** `Exclude`/`Extract`/`ReturnType`/`Parameters`
   (union/function-type ops, niche in wasic). **Bonus fix found via output-verification:**
   `console.log("x:", a.i + b.i)` on i32 **struct fields** (and 3-term `a+b+c` of i32 locals)
   emitted `f64.add` of i32 loads → compile error; fixed in `console_log.ts` by inferring the
   binary-op operand type from the LHS's **leading atom** (var / `var.field` via `structLookup` /
   `.length`), conservatively skipping `arr[i]`/`fn()`/`a.b.c` so f64 elements aren't mis-typed.
   Purely additive (no existing test could use the pattern — it didn't compile — so zero
   tracked-`.wat` changes). NOTE: a SEPARATE pre-existing bug remains —
   `console.log("x:", arr[i] + arr[j])` (array-element arithmetic) returns only the first element;
   out of scope here.

### Pre-Phase-52 correctness cleanup — 14 output-mismatch bugs (ALL FIXED 2026-06-08)

A pre-Phase-52 code audit + **test-runner hardening** (now diffs run-ts vs run-wasm OUTPUT, not just
exit codes — see testing.md / compiler-bugs.md "Runner-hardening audit") revealed **31** tests that
were green-but-wrong. **12 fixed** in that pass (two string-literal-masking scanner bugs), **5**
allowlisted as legitimate divergences, and the remaining **14 were ALL FIXED 2026-06-08** (clusters:
exceptions/error string payloads, string ops/formatting, struct-field mutation, for…of, class-array
literal — full root-cause list in compiler-bugs.md). A follow-up hazard audit (2026-06-08) fixed 4
more latent issues: brace-less single-line `for…of` (dropped body), `console.error`
bool-array-method formatting, the class-instance `ptr<0` sentinel, and extended the greedy-regex
`parenDepthNeverNegative` guards. Suite under the hardened runner: **299/299** (no open bugs),
bindgen 103/103, jstyper 73/73.

### Phase 52 — Leaf conveniences (NO downstream risk) — ✅ COMPLETE 2026-06-11

All five shipped (suite 299→305, all output-verified ts-run == wasm-run; bindgen 103/103, jstyper
73/73). Tests `52_VoidExpr` / `52_ChainedAssignment` / `52_InOperator` / `52_ArrayFromOf` /
`52_StringFromCodePoint` / `52_Phase52Combined`. All in `src/wasic.ts` unless noted.

5. **`void expr;`** → evaluate for side effects, discard. Statement handler at the top of
   `emitStatement`: a void/string-returning call is re-emitted as a plain call statement (the call
   still runs; a string result has no single droppable value); a numeric result is `(drop …)`; a
   non-call expr is `(drop (emitExpr …))`.
6. **Chained assignment `a = b = c = 0`** — `emitStatement` detects ≥2 top-level plain `=` (skipping
   `==`/`===`/`=>`/`!=`/`<=`/`>=`/compound), requires every target to be a bare identifier, then
   lowers to `c = 0; b = c; a = b` (rightmost first) reusing the normal assignment emitter (handles
   locals/globals/strings/types for free). Declaration-form chains (`let a = b = 0`) intentionally
   bail.
7. **`"field" in obj`** — closed-world compile-time `1`/`0` in `emitExpr` (via
   `findDepth0Keyword(" in ")`
   - new `structHasField` resolving struct/class fields from `structVars`/`classVars`). Returns null
     → falls through when the type/key is unknown. Print direct in `console.log` not wired (route
     via a `boolean` local or an `if` condition — both go through `emitExpr`).
8. **`Array.from([…])` / `Array.of(…)`** — source pre-pass `expandArrayFromOf` (string-aware
   balanced scan, runs right after the `Array.from({length})` 2D sentinel) rewrites them to plain
   array literals (`[…]`); recurses so nested forms expand. `Array.from` of anything other than a
   literal array is left untouched. **`Array.isArray(x)`** — `emitExpr` closed-world const: `1` iff
   x ∈ arrayVars/moduleArrayVars/typedArrayVars, else `0`.
9. **`String.fromCodePoint(...)`** — UTF-8 encodes code point(s). Constant args → static data string
   (`allocStringDecoded`, no unescape; via new `constCodePoint` validator covering decimal/hex in
   the valid Unicode range). Single runtime arg → new `$__str_from_codepoint` WAT helper (1–4 byte
   UTF-8, multi-value ptr,len). Wired into `emitStringAssign`, the concat path, `isStringExpr`, and
   the two `$__str_op` prologue temp-pair detectors. Bonus: console_log.ts `dotLenMatch` now handles
   string `.length` (UTF-8 byte length) for local strings / module string consts / string globals —
   a pre-existing gap that also affected `fromCharCode` strings. NOTE multi-byte: wasic `.length` is
   UTF-8 byte count, TS `.length` is UTF-16 units (the test only `.length`-checks ASCII).

### Phase 53 — Standalone built-ins — ✅ COMPLETE 2026-06-15

10. **`Number.parseInt(s, radix)` / `Number.parseFloat(s)` (+ bare `parseInt`/`parseFloat`)** — ✅
    DONE. Two self-contained WAT helpers (`$__parse_int` / `$__parse_float`) take a string
    `(ptr,len)` → f64 with JS semantics: skip leading whitespace + optional sign, stop at the first
    invalid char, `nan` on no leading digits. `parseInt` honors radix (default 10; `0x` prefix
    auto-detected when radix is 16 or omitted); `parseFloat` reads
    sign/integer/fraction/`e`-exponent. `emitExpr` handler after the Phase-48 `Number.*` block;
    `inferInitType` maps the call to f64. Direct `console.log(parseInt(...))` routes via a local
    (assign-then-log), matching the Phase-52 `in`-operator precedent. Test `53_NumberParse`.
11. **Multi-level interface inheritance (>2 deep)** — ✅ DONE. Root cause was NOT offset math but
    declaration ORDER: `parseStructs` built interfaces in a single source-order pass, so a forward
    `extends` reference (derived declared before its base) silently dropped inherited fields.
    Refactor: collect all interface/object-type decls first, then build in dependency order to a
    fixpoint (new `buildStructDef` helper); in-order chains of any depth already worked. Test
    `53_InterfaceInheritance`.

### Big tracks (the "last items")

12. **Ecosystem — `universalWasmLoader` (polyglot loaders)** — **substantially DONE; updated
    2026-06-22; full detail + publishing matrix in [vision.md](vision.md).** Repos live under
    the sibling folder `../universalWasmLoader/` (each its
    own git repo, on `main`, with its own portable `cmem/`). **`SPEC.md` is at 3.0.0** (canonical
    callee-allocated string returns + `cabi_post_<name>`). **ALL TEN ports are implemented on SPEC
    3.0.0 — NO stubs remain (updated 2026-06-22):** `-js` (reference — **PUBLISHED
    `@jrmarcum/universal-wasm-loader@1.0.8`, JSR score 100, provenance true**), `-v` (vlang —
    **PUBLISHED to VPM**), `-zig` (**PUBLISHED to zigistry**), `-py` (**PUBLISHED to PyPI**; string
    tests pass), `-rs` (`cargo test` 24/24), `-jvm` (`gradlew test` 24/24), `-dart` (web-first
    `dart:js_interop`; `dart test -p chrome` 7/7), `-c` (header + vcpkg `ports/` + tests), `-go`
    (wazero, 7/7; commit `c7d9bb0`), `-dotnet` (Wasmtime, 7/7; commit `98dcf2f`). **PUBLISHED so far
    = 4** (`-js`, `-v`, `-zig`, `-py`). **The remaining #12 gap is PUBLISHING the other 6:**
    `-rs`→crates.io (awaiting `CARGO_REGISTRY_TOKEN`), `-go`→pkg.go.dev (needs a `vX.Y.Z` tag),
    `-dart`→pub.dev, `-dotnet`→NuGet, `-jvm`→Maven Central (local tags `v0.1.0`–`v0.1.2` exist but
    it is NOT live yet — pending `io.github.jrmarcum` namespace verification + GPG/Sonatype
    secrets), `-c`→vcpkg port. Each of `-rs`/`-py`/`-jvm`/`-dart` already has **`run:`-only publish
    CI
    - a bump mechanism** (pending owner registry secrets — see vision.md matrix). **Runtime + WASI
      strategy decided 2026-06-15** (in vision.md → "Loader runtime + WASI strategy"): native ports
      use **wasmtime** (`-go` was decided as wasmtime-go but **shipped on wazero**; Zig/`-c` =
      wasmtime C API; `-dotnet` = Wasmtime NuGet) with built-in WASI; web ports (`-js`, `-dart`-web)
      host `WebAssembly` + hand-rolled shim; `-jvm` keeps Chicory + `chicory-wasi`; `-dart`
      dual-backend (web now / native `dart:ffi`→wasmtime later). **SPEC §10 loader capabilities
      (`_initialize` call + minimal WASI-P1 shim) IMPLEMENTED in `-js` 2026-06-15** (suite 24→26;
      lets I/O-using `modc` libraries load in a host with no native WASI). **NOW COMPLETE ACROSS ALL
      10 PORTS (2026-07-05).** The runtime-native ports already carried it: `-go` (wazero
      `wasi_snapshot_preview1.Instantiate`), `-dotnet` (`DefineWasi` + `SetWasiConfiguration`), and
      `-c`/`-zig`/`-v` (shared C header: `wasi_config_new` + `inherit_stdout/stderr` +
      `wasmtime_context_set_wasi`), all with a `_initialize` call. Propagated 2026-07-05 to the four
      that lacked it, each +2 §10 tests (all green): `-rs` (`cc8a5f7`) hand-rolls a `func_wrap`
      `wasi_snapshot_preview1` shim on `Linker<()>` (keeps `Store<()>`, no `wasmtime-wasi` dep) +
      `_initialize` via `get_typed_func::<(),()>`; `-jvm` (`1e1ecb8`) uses `chicory-wasi`
      `WasiPreview1` (`toHostFunctions()` merged with the env functions into one `ImportValues`) +
      `_initialize` via `instance.export("_initialize").apply()`; `-py` (`a51c8da`) uses
      wasmtime-py's built-in WASI (`linker.define_wasi()` + `WasiConfig().inherit_stdout/stderr` on
      the `Store`, WASI namespaces skipped in the no-op stub loop) + `_initialize`; `-dart`
      (`985039f`, the web port — can't use a runtime built-in) hand-rolls the shim in
      `lib/src/wasi.dart` from Dart closures via `.toJS` (web-safe i64 = two i32 words) +
      `_initialize` (`dart test -p chrome` 9/9). Orthogonal / ungated. **CI note:** these repos' org
      allows only `jrmarcum`-owned Actions → publish workflows MUST be `run:`-only (third-party
      `uses:` → `startup_failure`).
13. **#5 Promise/async — ✅ COMPLETE 2026-06-15 (13.1a–13.5; suite 317/317).** Eager microtask
    runtime
    - `hybrid` async lift; Approach B (state-machine) is a future option, not needed for v1.
      **Design doc + full implementation log → [async-design.md](async-design.md)** — Approach A
      (microtask-drain) for v1, expand to B later; settled value laid out as Canonical ABI
      `result<T,E>` (max forward-compat) + opaque handle; runtime = **inline WAT helpers**
      (`needsPromiseRuntime`), NOT a merged capability (the `wasmmerge` `call_indirect` guard
      forbids a callback-bearing merged module) — locked "never introspects callbacks" invariant
      keeps B drop-in; warn-on-unhandled-rejection; mode-scoped deadlock trap. v1 scope =
      async/await + resolve/reject + then/catch/finally + all/allSettled, standalone WASI; 5
      sub-phases (13.1–13.5). **Sub-phases 13.1a + 13.2 + 13.3a + 13.3b + 13.1b + 13.4 (all +
      allSettled) + 13.5 IMPLEMENTED 2026-06-15** (suite 309→**317**, output-verified, zero
      regressions; the entire #13 async track is COMPLETE): 13.1a = `async`/`await` +
      `Promise.resolve`, async-fn-returns-promise (i32/f64), inline runtime, canonical `result<T,E>`
      (test `54_AsyncBasic`); 13.2 = `.then(namedCb)` + microtask queue (FIFO linked list) + drain,
      per-call-site `call_indirect` trampolines, correct
      ordering/FIFO/chained/f64/`await`-of-`.then` (test `55_AsyncThen`); 13.3a = `Promise.reject` +
      rejection→exception (rejected `await` re-throws, caught by `try/catch`) + async-body-throw
      caught free via the eager model (test `56_AsyncReject`); 13.3b = `.catch`/`.finally` rejection
      reactions + `.then(onF,onR)` via a **dual-path** trampoline (`genReactionTrampoline` reads
      `src.disc`: fulfilled→passthrough/`onF`, rejected→`onR(reason:string)`/propagate; `.finally`
      runs on both paths) (test `57_AsyncCatch`); 13.1b = promise-holding-var inner-type tracking
      (`const p = f();
    await p`/`p.then`, i32+f64+aliasing — test `58_AsyncPromiseVar`) +
      **capturing-closure callbacks** for `.then`/`.finally` via an **env-bearing reaction record**
      (functype migrated to `(env,src,result)`; closure dispatched by `call_indirect` through the
      closure ptr — test `59_AsyncClosureCb`); 13.4 = **`Promise.all` + `Promise.allSettled`**
      (array-literal arg, i32/f64) via per-call-site combinators (`all` drains+builds
      `T[]`/first-rejection-wins — test `60_AsyncAll`; `allSettled` never rejects, builds a
      synth-`__settled_<T>` struct array of `{status,value,reason}` — test `61_AsyncAllSettled`);
      13.5 = **lift the `hybrid` async exclusion** (`src/hybrid.ts`) — route async fns into the
      wasic core via an internal `f__impl` + a sync unwrapping wrapper `f` (`return await f__impl`),
      validated by `tests/hybrid/hybrid_fixtures/async_hybrid.ts`. **#13 async track is now
      COMPLETE** (entire v1 Promise API surface + hybrid integration). Full detail in
      [async-design.md](async-design.md).
14. **Own dynamic runtime** (§7-#7) — boxed values + property map + interpreter for the irreducible
    kernel (`eval`/`new Function`, pervasive `any`, open-prototype mutation). Gated behind Phase 51
    (done) → unblocked. `javyc` (QuickJS) is the interim fallback until it lands. **Design + full
    log → [dynrt-design.md](dynrt-design.md).** Locked architecture (owner 2026-06-22): value+object
    model first; **tagged heap cell (i32 handle)**; authored in the **wasic TS subset now** (zero
    duplication — reuses wasic's allocator/strings/arrays/num-fmt), extract a shared `rtcore` + go
    hand-WAT only at the interpreter increment; **runtime-only first** (no wasic `any` yet).
    **Increment 1 — value + object model — SHIPPED 2026-06-22** as a shared-heap `modc` capability
    (`tests/wasi/wasm_wasi_bundle/dynrt_bundle/` + pipeline test `18j`): boxed value = 4-slot
    `Int32Array` node `[tag,a,b,c]` (undefined/null/bool/number-as-f64/string/array/object),
    self-managed `Int32Array` growable lists for containers, ~23 exports incl.
    `dynTypeof`/`dynStrictEq` (`===`)/`dynAdd` (`+`). Surfaced 3 wasic gaps (worked around in the
    lib, logged in compiler-bugs.md): str-concat-of-two-calls, Float64Array-elem comparison
    mis-infers i32, and **empty-`[]` is a shared static cap-0 array whose cap-0 grow is broken**
    (the latter hardens any future reconstruct-then-`push`). **Increment 1b — virtual `wasmtk:dynrt`
    import + tree-shake — SHIPPED 2026-06-22** (embedded in `src/wasm/caps_bytes.ts` as a 6th
    registry entry via `gen_caps_bytes.ts`; the `tsbundler` resolver is generic so no resolver
    change; no `modc` step; pipeline test `18k`). **Increment 2a — `eval` of a pure expression
    language — SHIPPED 2026-06-22** (test `18l`): a recursive-descent direct-eval parser authored in
    the subset (authoring decision resolved — continue in the subset, no `rtcore`/hand-WAT needed
    yet); full operator precedence + parens + unary + ternary + string concat → boxed value; added
    the dynamic operators `dynSub/Mul/Div/Mod/Neg/Not/Lt/Gt/Le/Ge`; `parseFloat` works in modc; NO
    new compiler gaps. **Increment 2b — variables + environment + member/index access — SHIPPED
    2026-06-22** (test `18m`): `dynEvalEnv(s, env)` resolves bare identifiers against an env object;
    postfix `.prop`/`["key"]`/ `[i]` (computed index) + `.length`; TOTAL/guarded member access
    (`undefined.x` → undefined, no trap); robust identifier tokenisation; no new compiler gaps.
    **Scope split (rationale recorded):** calls + REAL short-circuit moved to 2c — short-circuit is
    only observable/testable with side-effecting operands (calls), and guarded member access makes
    2b trap-safe without it. **Increment 2c — function values (tag 7) + calls + REAL short-circuit —
    SHIPPED 2026-06-22** (test `18n`): function values dispatch via a STATIC switch on a built-in id
    (NOT a function table — wasmmerge forbids `call_indirect` in a merged module), `dynStdEnv()`
    ships abs/sqrt/floor/ceil/ round/min/max/len + the side-effecting `inc`; `dynApply` dispatcher;

> Continues in [roadmap-2b.md](roadmap-2b.md).
