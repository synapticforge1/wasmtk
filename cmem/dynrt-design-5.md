# dynrt-design — part 5 of 6

Continues [dynrt-design.md](dynrt-design.md) (split by size on 2026-11-20, letter H38). Sections:

- javyc retirement — scoped task breakdown (2026-06-24)

## javyc retirement — scoped task breakdown (2026-06-24)

**Ground truth (verified 2026-06-24):**
- `src/javyc.ts` (178 lines) is a **thin wrapper around the external `Javy` CLI** (which embeds
  QuickJS) — `ensureJavy`/`getJavyInstallPath`/`detectJavyProvider`/`compileJavy`. It is NOT a
  hand-written engine; it shells out to a downloaded binary.
- **Only wiring left:** the standalone **`wasmtk javyc <file>`** command (`main.ts case "javyc"`, help
  text, `deno.json` `./javyc` export) + its own runner `tests/wasi_javy_tests.ts`. **`hybrid --auto`
  does NOT use `javyc`** — its dynamic route is `dynrt`, fallback is the HOST (keep-as-TS), not Javy.
  So `javyc` is an *alternative full-JS→WASM compiler command*, not an internal fallback.
- **dynrt interpreter coverage today** (`dynrt_lib_modc.ts`): full expression grammar
  (`parsePrimary`→`parsePostfix`(member/index/call)→`parseUnary`→Mul/Add/Rel/Eq/And/Or→ternary);
  statements `let`/`const`/`var`, `if`/`else`, `while`, `function` decls, `return`, assignment,
  expression statements. **That is the whole grammar it parses.**

**Two routes to retire `javyc` — ROUTE A DECIDED (owner, 2026-06-24):**
- **✅ Route A — coverage (CHOSEN):** grow `dynrt` (the 2e/2f increments below) until a "compile the
  whole program as dynamic" mode covers what `wasmtk javyc` users need, then remove `javyc`. Large,
  multi-increment — keeps full-JS capability with NO external binary dependency.
- ~~Route B — policy drop~~ (not chosen): would have declared arbitrary-full-JS→WASM out of scope and
  dropped `wasmtk javyc` + the Javy dependency in one small PR. Rejected — the owner wants to keep the
  full-JS capability, just without the external Javy/QuickJS binary.

**Recommended build order (land + full-suite-verify each before the next, one increment per session like
the #13/#14 cadence; each ships a `18*` test, output-diff green):**
1. **2e.1 control flow** — **COMPLETE 2026-06-24** (test `18zc`). 2e.1a: C-style `for`, `for…of`,
   `do…while`, `break`/`continue`, `++`/`--`/`+=`/`-=`/`*=`/`/=` (new `evalBroke`/`evalContinued` signals
   that loops clear; built on the `runWhile` cursor-reset model). 2e.1b leftovers: **`for-in`** (binds
   the key string via a new `dynObjKeyVal` that copies the raw key bytes into a tag-4 string box) and
   **`switch`** (two-pass: DEAD scan the labels to find the matching `case`'s body-start — or `default`'s
   — then execute LIVE with FALL-THROUGH until `break`/`return`/`}`; `break` exits the switch only).
   **Lessons:** (a) the wasic/modc subset rejects a brace-LESS `if (c) stmt; else …` (orphans the `else`)
   — fully brace every chain; (b) a driver's `.wasm` import AND every `checkRun(...)` call must be
   SINGLE-LINE (wasic's import + statement detectors are line-based — add `// deno-fmt-ignore-file` so
   fmt doesn't wrap long lines); (c) **`dynStrictEq`/`dynLt`/… return a RAW i32 (1/0), NOT a value box**
   — use the result directly in an `=== 1` test; do NOT wrap in `dynToBool` (that treats `1` as a cell
   pointer → OOB). The interpreter's own `parseEq` wraps with `dynBool(...)` only to make an `any` value.
2. **2e.2 literals** — **SHIPPED 2026-06-24** (test `18zd`): array `[…]`, object `{…}` (with "quoted"
   and shorthand `{x}` keys), and template `` `…${expr}…` `` literals, all in `parsePrimary`. Templates
   coerce `${expr}` via `dynAdd` (JS `+` → string when either side is a string; uses `stringForm`). Also
   unlocks **`for…of` over an inline array literal** (the 2e.1 deferred case). v1 gaps: template TEXT is
   sliced raw (no `\n`/escape processing yet); object-literal `{` is an object only at EXPRESSION
   position (statement-level `{` stays a block, JS-consistent). Member ASSIGNMENT (`o.x = v`) is still
   2e.4.
3. **2e.4 assignment forms** — **member/index assignment SHIPPED 2026-06-24** (test `18zf`): `o.x = v`,
   `o[k] = v`, `arr[i] = v` (plain + `+=`/`-=`/`*=`/`/=` compound), nested targets (`o.p.v`, `m[i][j]`),
   computed keys, in-loop mutation. `runStatement` walks the member/index path (navigating all but the
   last segment via `dynMember`/`dynIndexValue`), then sets via new `dynArrSet`/`dynIndexSet` (or rewinds
   to an expression statement if no assignment operator follows — distinguishes `o.x = v` from
   `o.foo()`). `dynArrSet` appends when `i === length`. (Variable `++`/`--`/`+=` were done in 2e.1;
   **destructuring assignment `[a,b] = …` still remains** — pairs with destructuring in 2e.x.)
4. **2e.3 functions** — **SHIPPED 2026-06-24** (test `18ze`): anonymous `function (p) { … }` expressions
   and arrow functions `(p) => …` / `p => …` / `() => …` (block or expression body) in `parsePrimary`,
   building user-function VALUES that close over the current env — higher-order fns + closures + nested
   arrows all work. Extracted `parseParams`/`parseBlockBody` helpers (shared with `runFuncDecl`); arrow
   bodies: a block → its inner source, an expression → the expr SOURCE captured by dead-parsing to find
   its extent (dynRun returns the last expression value, so no `return` needed); `isArrowAhead` lookahead
   disambiguates `(…)=>` from a parenthesized expr. **Fixed 3 bugs:** (a) wasic `parseArrowFunctions`
   matched `const NAME = (` inside STRING LITERALS (a driver's eval-source string `"const f=(a,b)=>…"`
   was mis-detected as a real arrow → mangled source) — added string-state tracking to the pre-match
   scan; (b) wasic `substituteOneArrow` used `line.indexOf("=>")` (string-blind) — added
   `firstCodeArrowIdx`; (c) dynrt `runStatement` treated `x => …` as the assignment `x = …` (its `=`
   check didn't exclude `=>`) — added `peek2 !== '>'`. **2e.5 operators**, **2e.6 try/catch**, **2e.7
   scoping** remain.
5. **2e.5 operators** — **SHIPPED 2026-06-24** (test `18zg`): `typeof` (parseUnary → type string via
   `dynTypeofStr`; `typeof null === "object"`), nullish coalescing `??` (parseOr — 0/false are NOT
   nullish, unlike `||`), optional chaining `?.` (parsePostfix — `?.name`/`?.[k]`, both inline; `optDead`
   flag short-circuits the rest of the chain when a receiver is null/undefined, propagating through a
   following `()` call), and array spread `[...a, ...b]` (parsePrimary). **Fixed a general wasic bug:**
   the Phase-49 `?.`→`.` strip (`transpile()`) ran over the RAW source, so a `?.` inside a STRING LITERAL
   (a dynrt driver's eval source `"o?.x"`) was mangled to `.` — `?.name` then "worked" by accident
   (`o?.x?.y`→`o.x.y`) but `?.[k]` broke (`.[` is invalid). Now routed through
   `rewriteOutsideStringsAndComments` (code-only), same as the earlier `=>`/`eval(`/`Function(` fixes.
   **wasic-subset lessons:** inline `(v as Int32Array)[0]` is unsupported — bind the view to a local
   first; a multi-line `if (...)` CONDITION is unsupported — keep it on one line or use nested ifs.
   **Deferred:** `instanceof` (needs classes — 2e.8), object spread `{...o}`, call spread `f(...args)`,
   direct optional call `o?.()`. **2e.6 try/catch**, **2e.7 scoping** remain.
6. **2e.6 try/catch/throw** — **SHIPPED 2026-06-26** (test `18zh`): `throw expr`, `try { } catch (e) { }`,
   binding-less `catch { }`, `finally { }`, and `try/finally` (no catch). New control globals `evalThrew`
   /`evalThrowVal` mirror `evalReturned`: a throw stops statement sequencing (`runStatements`), all five
   loops, and `switch` — and unlike a return it is NOT consumed at a function-call boundary (`dynApply`
   doesn't save/restore `evalThrew`), so it unwinds through callers until `runTry` catches it. `runTry`
   runs the try block, then (if `evalThrew && live`) clears the throw + binds `e` via `dynSet` + runs the
   catch; `finally` runs last with all in-flight control (throw/return/break/continue) saved-cleared-
   restored so it always executes but a control-flow statement INSIDE finally wins (JS semantics). `dynRun`
   resets `evalThrew=0` at start (fresh run / clears a leftover uncaught top-level throw). **Purely
   interpreter-side — no wasic compiler change.** **Known v1 gap:** a throw mid-expression (`f()+g()` where
   `f` throws) still evaluates `g()` — propagation is enforced at statement/loop/call boundaries, not
   inside one expression; and the catch binding lives in the current env (no fresh catch scope — lands with
   2e.7). **2e.7 scoping** next.
7. **2e.7 block scoping** — **SHIPPED 2026-06-26** (test `18zi`): lexical scopes. The scope chain already
   existed (an env is an object whose slot-2 is the parent link — `envLookup`/`dynApply` use it); 2e.7 makes
   each `{ }` block, `for` loop, and `catch` run in a fresh `childEnv(parent)` so `let`/`const` inside don't
   leak, and routes bare assignment / `++` / `--` / `+=` through new `envAssign(env,name,val)` which walks
   the chain and updates the DECLARING scope in place (inner-block `x = v` mutates the outer `x`, not a
   shadow; undeclared → topmost/global). Declarations still `dynSet(evalEnv,…)` (bind in the current scope).
   Loop vars are scoped by wrapping `runFor` in a loop env; the fresh `catch` scope (deferred from 2e.6) now
   binds `e` in a `childEnv`. Block/loop/catch envs are `gcPushRoot`-ed for their duration (survive a
   collection across nested calls). **Purely interpreter-side — no wasic compiler change. Known v1 gaps
   (remediation DECIDED 2026-06-26, see "Language consumption profile" below):** (1) no per-iteration fresh
   `let` binding for closures capturing a loop var → **2e.7a (SHIPPED 2026-06-26, test `18zj`)**; (2) `var`
   is treated block-scoped like `let` (not function-hoisted) → **handled by 2e.7b (SHIPPED 2026-06-26,
   `src/varscope.ts`): auto-repair provably-safe `var`→`let`, HARD-ERROR unsafe ones.** **2e.8 classes**
   (needs 2f.1) next.
7a. **2e.7a per-iteration `let`** — **SHIPPED 2026-06-26** (test `18zj`): `for (let i…)` / `for (const x
   of…)` / `for (const k in…)` give each iteration a FRESH binding of the loop variable, so a closure made
   in the body captures THAT iteration's value (`0,1,2`), not the shared/final value (`3,3,3`). New
   `cloneEnvFlat(src,parent)` shallow-copies an env's own bindings into a fresh child scope. `runFor`
   computes `perIter` (1 for `let`/`const`, **0 for `var`** — `var` deliberately keeps the single shared
   binding, the distinction 2e.7b will police). for-of/for-in: each iteration binds the loop var in a fresh
   `childEnv` instead of the shared loop env. Classic-for: cond+body run against `curEnv` (a clone of the
   loop vars), then the update runs against a fresh clone `nextEnv` — so the body's captured env retains its
   value while the next iteration's `i++` mutates a separate copy (mirrors the JS spec's
   CreatePerIterationEnvironment). Captured per-iteration envs survive via the closures that reference them
   (reachable from a rooted scope); uncaptured ones are GC'd — no extra rooting needed (the `evalEnv`
   invariant + no-GC-mid-clone cover it). Cost: one env clone per iteration for let/const loops (var/no-decl
   loops unaffected, `perIter=0`); GC keeps it bounded (suite 344/344, no regression incl. `18x`). **Purely
   interpreter-side.**
   - **Process bug found + fixed here (latent, shipped in v1.10.6 source — binary was fine):** the dynrt
     lib's end-of-increment `deno fmt` had WRAPPED three deeply-indented ternaries (16-space indent, >100
     cols) into multi-line form, which **modc's body-line joiner cannot parse** — so the committed lib
     SOURCE no longer round-tripped through `modc` (`caps_bytes` shipped fine because it was compiled from
     the PRE-fmt source; the suite passed because it ran BEFORE the fmt). Fixed by converting those ternaries
     to single-line `if/else` (fmt-stable, modc-parseable). **Lesson:** after `deno fmt`-ing the dynrt lib,
     ALWAYS re-run `modc` on the post-fmt source before committing — `deno fmt` and the modc subset are not
     fully compatible for deeply-indented ternaries. See `cmem/compiler-bugs.md`.
7b. **2e.7b `var`→`let` consumption gate** — **SHIPPED 2026-06-26** (tests `18zk`/`18zl`/`18zm` +
   `tests/varscope_tests.ts`). **The FIRST wasic-COMPILER change in the 2e.x series** (2e.1–2e.7a were all
   interpreter-side). New `src/varscope.ts` `gateVarToLet(src)` runs FIRST in `transpile()` (so both wasic
   and modc go through it): a provably-safe `var` is auto-repaired to `let`; an UNSAFE `var` hard-errors
   with `line:col` + reason. CODE-ONLY via `maskCode` (string/comment chars → spaces, length-preserving), so
   a `var` inside a string literal — e.g. a dynrt driver's eval source — is invisible to the gate. Unsafe =
   (1) block-escape (referenced after its block closes), (2) use-before-declaration, (3) redeclaration in
   one function, (4) `for (var i…)` whose body has a closure (`=>`/`function`). Reference resolution: a
   brace-stack scope model with a function-body heuristic (`{` after `=>` or after `)` of a non-control
   signature) → enclosing function/block ranges → whole-word ref scan excluding `.prop` access. CONSERVATIVE
   + SOUND: ambiguous → hard error, never a silent rewrite. **Zero-risk landing: the entire wasic/dynrt
   codebase is already `let`/`const` (0 real `var`), so the gate no-ops everywhere except deliberate tests.**
   Suite 347/347 (+3), bindgen 131/131, jstyper 73/73; `varscope_tests.ts` 12/12 (each safe pattern rewrites,
   each unsafe pattern errors, maskCode hides in-string var). **Closes Gap 1.** Known heuristic limits
   (documented in the module): the function-body detector is heuristic; genuinely ambiguous constructs err
   toward a (sound) hard error.
5. **2f.1 prototype + `this`** — **SHIPPED 2026-06-26** (test `18zn`): the object-model foundation for
   **2e.8 classes**. (a) `this` binding: new internal `dynApplyThis(callee,args,thisVal)` (the exported
   2-arg `dynApply` now delegates with thisVal=-1=undefined-this); `parsePostfix` tracks `recv` (the most
   recent member-access object) and a method call `obj.m(args)` passes it → `dynApplyThis` binds `this` as a
   variable in the call scope, so `this` / `this.field` resolve + assign via the normal scope-chain paths;
   a plain call has `this === undefined`. (b) object-literal method shorthand `{ m(params){…} }` →
   `makeUserFunc` closing over the env (the `m: function(){}` / `m: () => …` forms already worked via
   parseExpr). (c) prototype: a data object's slot-2 doubles as `__proto__` (mutually exclusive with the
   env-parent use — env objects are never `.`-accessed); `dynMember`'s object branch walks the chain (own
   props shadow inherited); `Object.create(proto)` builds an object with that proto. **Purely
   interpreter-side.** Suite 348/348 (+`18zn`), bindgen 131/131 (the proto-walk is a no-op for the
   slot-2=0 plain objects the `any`-marshalling path uses). One modc-subset gotcha hit + fixed: a
   brace-less `} else v = …;` is unsupported — brace the else.
5e. **2e.8 classes** — **SHIPPED 2026-06-26** (test `18zo`): `class Name { constructor(p){…} method(p){…} }`.
   `runClassDecl` builds a class value = a small object carrying the prototype (an object holding the
   methods, built with `makeUserFunc`) under key `"__proto"` and the constructor under `"__ctor"`; binds
   `Name` in the env. `new Class(args)` is a `new` operator in `parsePrimary` → `dynNew`: fresh
   `dynObject` instance whose slot-2 `__proto__` is the class prototype, run the constructor via
   `dynApplyThis(ctor, args, inst)` (so `this.field = …` populates the instance), return it. Method calls
   reuse the 2f.1 machinery (prototype-chain `dynMember` + `this`-binding dispatch). Verified: constructor
   fields, method args, mutating methods across calls, method-calls-sibling-via-`this`, INDEPENDENT
   instances, no-constructor class. **Purely interpreter-side EXCEPT one general wasic fix:** `parseClasses`
   was string-blind (its `class…{` regex ran over raw source) so a `class …{}` inside the driver's
   eval-source STRINGS was parsed as a real wasic class (11 bogus "Unsupported statement: this.x = x"
   errors). Fixed by detecting over a `maskCode` code-only mask (slicing bodies from the real source) —
   same string-blind class as the `=>`/`?.` fixes; `maskCode` (from `src/varscope.ts`) is now the shared
   code-only primitive. Suite 349/349 (real Phase 9/16/17/47 class tests unaffected).
5f. **2e.8a class COMPLETION** — **SHIPPED 2026-06-26** (test `18zp`): `extends` + `super` + `static` +
   instance fields + getters/setters — the class feature is now complete (only class EXPRESSIONS
   `const C = class {…}` remain statement-only). `runClassDecl` rewritten: (a) `extends Base` links
   `Derived.__proto.slot2 = Base.__proto` (inherited methods resolve via the existing `dynMember` walk) and
   records the base on a per-class `classEnv` (`childEnv` binding `__superclass` + `__superproto`) that is
   the defEnv of every method/constructor → so `super` resolves lexically to the home class's base; (b) a
   `super` operator in `parsePrimary`: `super(args)` calls `__superclass.__ctor` with this=current instance,
   `super.method(args)` looks the method up on `__superproto` and calls it with this=instance; (c) `static`
   members go on the class OBJECT itself (`ClassName.m()` → `dynMember(classObj,…)`, static field evaluated
   at decl time); (d) instance fields `x = expr;` are lowered to a CONSTRUCTOR PREAMBLE (`this.x = expr; `
   prepended to the ctor body source — runs with this=instance in `dynNew`); (e) getters/setters stored as
   `__get_<name>` / `__set_<name>` markers on the prototype — `dynMember` falls back to a `__get_` accessor
   when the direct lookup misses, and a new `dynSetMember` (used only by the interpreter's member-assign
   path) invokes a `__set_` accessor before a plain set. Verified: inherited method, super-ctor (incl.
   3-level chain), super.method override, static method+field, instance fields (+ field then ctor reassign),
   getter, setter round-trip. **Purely interpreter-side.** Suite 350/350 (+`18zp`), bindgen 131/131 (the
   `dynMember` getter fallback is a no-op for the no-`__get_` objects the `any` path uses). modc-subset
   gotcha: `dynString(strVarA + strVarB)` unsupported — bind the concat to a local first.
6. **2f.2–2f.9 stdlib** — do the BRIDGES first (2f.5 JSON, 2f.6 Map/Set, 2f.7 RegExp reuse the existing
   capability libs → cheap), then Array/String/Object/Math methods.
   - **2f.2 Array methods** — **SHIPPED 2026-06-26** (test `18zq`; the surface was completed in a second
     pass the same day): `push`/`pop`/`shift`/`unshift`/`indexOf`/`lastIndexOf`/`includes`/`at`/`join`/
     `slice`/`concat`/`reverse`/`sort` (numeric default + optional comparator, in-place insertion sort) +
     callback methods `map`/`filter`/`forEach`/`reduce`/`find`/`findIndex`/`some`/`every` (callback called
     via `dynApply` with element+index). Mutating methods (`pop`/`shift`/`unshift`/`sort`) operate on the
     `[len,cap,e0,…]` values list directly (truncate = write the len word; shift via listGet/listSet).
     New `dynArrayMethod(arr,name,args)` in the value model; dispatched from
     `parsePostfix` when the receiver is a tag-5 array AND the resolved member is NOT a tag-7 function — so
     `arr[i]()` (calling a stored function) and a user-set `arr.foo()` still win, while built-ins (which
     `dynMember` returns undefined for) take the new path. Methods chain (`filter().map()`). `parsePostfix`
     gained a `recvMethod` (member name) alongside `recv`. **Purely interpreter-side.** Suite 351/351
     (+`18zq`). Two modc-subset gotchas hit + fixed: (a) reusing a local NAME with two types in one function
     (`out` as both `string` and `i32`) — wasic hoists one `$out`, type-conflicts → use distinct names;
     (b) an i32 CALL result passed straight to an `(f64)` param skips the i32→f64 coerce (same class as the
     i32-global note) — bind to an i32 local first (`dynNumber(dynArrLen(arr))` → bind `nl` first);
     (c) inline `(arr as Int32Array)[1]` cast-then-index unsupported — bind the view to a local first.
     **Gaps:** `splice`/`flat`/`flatMap` and `["method"]()` bracket-form dispatch; `sort` default is numeric
     (JS default is string-lexicographic — a documented deviation).
   - **2f.3 String methods** — **SHIPPED 2026-06-26** (test `18zr`): `charAt`/`charCodeAt`/`toUpperCase`/
     `toLowerCase`/`trim`/`slice` (incl. negative)/`indexOf`/`includes`/`startsWith`/`endsWith`/`repeat`/
     `padStart`/`padEnd`/`concat`/`split`. New `dynStringMethod(str,name,args)`; dispatched from
     `parsePostfix` when the receiver is a tag-4 string and the member isn't a tag-7 function (same
     discriminator as arrays). **Implementation leverage:** the dynrt string is unboxed to a wasic `string`
     via `boxToStr`, then the wasic compiler's OWN string ops (Phase 11/27) do the work; results re-box via
     `dynString` (so methods chain — `"…".toLowerCase().split(" ")`) — `split` returns a dynrt array of
     strings. `.length` was already a dynMember property. **Purely interpreter-side.** Suite 352/352
     (+`18zr`), bindgen 131/131, jstyper 73/73. Subset note: every string-method CALL result is bound to a
     `string` local before re-boxing (the subset can't pass a string-returning call straight into another
     call). **Gaps:** `replace`/`replaceAll`/`substring`/`trimStart`/`trimEnd`/`at`/`split` with regex.
   - **2f.4 Object + Math statics** — **SHIPPED 2026-06-26** (test `18zs`): `Math.floor`/`ceil`/`round`/
     `trunc`/`abs`/`sqrt`/`sign`/`min`/`max`/`pow` + `Math.PI`/`Math.E`; `Object.keys`/`values`/`entries`/
     `assign` (`Object.create` was 2f.1). Both are NAMESPACE statics special-cased in `parsePrimary` (like
     the existing `Object.create`): when the identifier is exactly `Math`/`Object` and a `.method(` follows,
     parse the args and dispatch to `dynMathMethod`/`dynObjectStatic`; `Math.PI`/`Math.E` (no parens) return
     the constant; otherwise a save/restore fall-through to normal resolution. `Math` reuses the wasic
     compiler's f64 intrinsics (`Math.floor`/`pow`/… directly in the lib); `Object.keys`/`values`/`entries`
     iterate own entries via `dynObjLen`/`dynObjKeyVal`/`dynObjValAt`, `assign` copies each source's own keys
     into the target. **Purely interpreter-side.** Suite 353/353 (+`18zs`), bindgen 131/131, jstyper 73/73.
     **Gaps:** other `Math` fns (trig/exp/log — would bridge `mathlib`), `Math.random`, `Object.freeze`/
     `getPrototypeOf`/`fromEntries`, `Number`/`JSON` statics (JSON is the 2f.5 bridge).
   - **2f.5 JSON** — **SHIPPED 2026-06-26** (test `18zt`): `JSON.parse(str)` + `JSON.stringify(value)`,
     special-cased in `parsePrimary` (`JSON.method(args)`, same namespace pattern as Math/Object). **Elegant
     bridge — NOT the i32-handle JSON cap lib:** JSON is a SUBSET of the interpreter's own expression grammar
     (object/array/string/number/true/false/null), so `dynJsonParse` just re-enters `parseExpr` on the JSON
     string (save `evalPos` → `evalPos=0` → parse → restore) and gets NATIVE dynrt values for free — no
     separate parser, no model conversion. `dynJsonStringify` recursively serializes by tag (recursion is
     safe — each WAT call frame has its own locals); `jsonQuote` escapes `"`/`\`/`\n`/`\r`/`\t`. Verified
     incl. parse∘stringify ROUND-TRIPS (object/array/nested/object-with-array) — the strongest check.
     **Purely interpreter-side.** Suite 354/354 (+`18zt`), bindgen 131/131, jstyper 73/73. **Driver tip:**
     wrap JSON docs in SINGLE-quoted eval-source strings so the inner double-quoted JSON needs no extra
     escaping. **Gaps:** `JSON.stringify` indent/replacer args, `JSON.parse` reviver, `\uXXXX` (inherits the
     interpreter's literal-parser limits — exponent numbers / `\u` are the interpreter's gaps, not JSON's).
   - **2f.6 Map + Set** — **SHIPPED 2026-06-26** (test `18zu`): `new Map()` + `new Set(iterable)`; Map
     `set`/`get`/`has`/`delete`/`keys`/`values`/`forEach`/`size`, Set `add`/`has`/`delete`/`values`/
     `forEach`/`size`. **Like JSON, NOT a bridge to the i32-handle cap libs** (those are i32-keyed; dynrt

> Continues in [dynrt-design-5b.md](dynrt-design-5b.md).
