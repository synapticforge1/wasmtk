# dynrt-design-5b — continues [dynrt-design-5.md](dynrt-design-5.md)

(Split by size on 2026-11-20, letter H38.)

     Map/Set keys are arbitrary BOXED values) — implemented directly in the value model: a Map/Set is a
     dynrt OBJECT (tag 6) carrying internal arrays (`__mapk`+`__mapv` / `__setk`); lookup is a linear
     `dynStrictEq` scan (O(n), fine for v1). `new Map`/`new Set` are special-cased in the `new` operator;
     methods dispatch in `parsePostfix` for object receivers whose member isn't a tag-7 function AND which
     have `__mapk`/`__setk` (so normal class-method calls — `vvn[0]===7` — skip the check entirely, no
     overhead); `.size` is handled in `dynMember`; `set`/`add` return the collection (chainable); the Map
     constructor updates-in-place on a duplicate key, the Set constructor de-dups its array arg. `delete`
     shifts the internal array(s) down + truncates the values list. **Purely interpreter-side.** Suite
     355/355 (+`18zu`), bindgen 131/131, jstyper 73/73. **Gaps:** `entries()`/iterator protocol, `Map`
     constructor from an entries array, `WeakMap`/`WeakSet`.
   - **2f.7 RegExp** — **SHIPPED 2026-06-26** (test `18zv`; **completes the f-series stdlib**): `new
     RegExp(pat)` + a compact recursive backtracking matcher (`reMatchHere`/`reMatchStar`/`reMatchPlus`/
     `reMatchQuestion` + `reMatchAtom`/`reMatchClass`/`reAtomLen`) supporting literals, `.`, quantifiers
     `*`/`+`/`?` (greedy), anchors `^`/`$`, character classes `[…]`/`[^…]` with ranges, and the escapes
     `\d \w \s \D \W \S \n \t`. A RegExp is a dynrt object holding `__regex`=the pattern string; `re.test`
     → bool, `re.exec`/`str.match(re)` → first matched substring or null. `new RegExp` special-cased in the
     `new` operator; `re.test`/`exec` dispatch in `parsePostfix` (object receiver with `__regex`);
     `str.match` added to `dynStringMethod`. **Purely interpreter-side.** Suite 356/356 (+`18zv`), bindgen
     131/131, jstyper 73/73. **Gaps:** alternation `|`, groups/captures, backreferences, regex flags (`g`/
     `i`/`m`), `str.replace` with regex, `/…/` LITERAL syntax (use `new RegExp` — the `/…/` tokenizer-vs-
     division ambiguity is deferred); deep recursion uses the WAT call stack.
   - **f-series stdlib COMPLETE** (2f.2 Array, 2f.3 String, 2f.4 Object/Math, 2f.5 JSON, 2f.6 Map/Set,
     2f.7 RegExp). The remaining 2f items (e.g. Number/Promise/Date statics) fold into later increments.
7. **2e.9 generators** — **SHIPPED 2026-06-26** (test `18zw`): `function*` / `yield` via **EAGER
   COLLECTION** (the re-parse interpreter can't suspend a call stack). A `function*` is marked id=-3 on its
   function cell (`runFuncDecl` detects the `*`); calling it runs the body to completion in `dynApplyThis`
   (the `id===-1||id===-3` branch) with a fresh `genYields` array installed (gcPushRoot-ed across the run —
   nested generators stack their own collections), `yield x` (handled in `parsePrimary`) pushes x onto
   `genYields`, and the call returns a generator OBJECT holding `__genv` (collected values) + `__geni`
   (cursor). `g.next()` (`dynGenMethod`, dispatched in parsePostfix for an object with `__genv`) returns a
   fresh `{ value, done }` and advances the cursor; `for…of` over a generator extracts `__genv` (in
   `runForOf`). Verified: next-sequence/done, empty gen, for-of, while-loops, params, computed + conditional
   yields, and NESTED generators (90). **Purely interpreter-side.** Suite 357/357 (+`18zw`), bindgen
   131/131, jstyper 73/73. **Known v1 limits (documented):** FINITE generators only — an infinite generator
   (`while(true) yield…`) collects forever / hangs; `yield` evaluates to `undefined` (no value passed back
   via `next(v)`); lazy/incremental side effects differ from JS (the whole body runs at call time). True
   coroutine suspension would need a CPS transform or a separate VM — out of scope for the re-parse model.
7b. **2e.10 async/await + Promise** — **SHIPPED 2026-06-26** (test `18zx`): a **SYNCHRONOUS** model (the
   re-parse interpreter has no event loop — nothing async to defer). A Promise is a SETTLED value wrapper: a
   dynrt object with `__promv` (value/reason) + `__promrej` (1=rejected). An `async function` is id=-4
   (`runFuncDecl(s,isAsync)`; `async` detected in the runStatement dispatch before `function`); the
   `id===-1||-3||-4` branch in `dynApplyThis` runs the body to completion and, for -4, wraps the result in
   `dynPromiseResolve` (or `dynPromiseReject` + clears `evalThrew` if it threw). `await` (a `parseUnary`
   operator → `dynAwait`) unwraps a settled promise — returns `__promv`, or sets `evalThrew`=the reason on a
   rejected one (so a rejected await integrates with 2e.6 try/catch). `.then`/`.catch`/`.finally`
   (`dynPromiseMethod`, dispatched in parsePostfix for an object with `__promv`) run callbacks IMMEDIATELY +
   re-wrap; `Promise.resolve`/`reject`/`all` is a `Promise.…` namespace static. Verified: async-return+await,
   await-of-nonpromise, await-inside-async, chaining, multi-await, rejection via try/catch (Promise.reject +
   async-throw), then/catch/finally, Promise.all (promises + plain values). **Purely interpreter-side.**
   Suite 358/358 (+`18zx`), bindgen 131/131, jstyper 73/73. **Known v1 limits:** no deferred microtask
   ORDERING (everything settles synchronously); `async` arrows parse as plain arrows (await still works — a
   standalone operator; only the return isn't promise-wrapped, which await tolerates); no real async I/O.
7c. **2e.11 remaining ES6 surface** — **SHIPPED 2026-06-30** (test `18zy`): the last of the common ES6
   syntax in eval source — `instanceof`, object/call spread, destructuring, class expressions. **Purely
   interpreter-side.** Details: (a) **`instanceof`** — `dynInstanceof(obj,cls)` walks obj's `__proto__`
   chain (slot 2) looking for `cls`'s `__proto`; wired into `parseRel` as a `c===105` ('i') operator branch
   (readIdent + save/restore fall-through so a leading-`i` identifier isn't mis-eaten). (b) **object spread
   `{ ...src }`** — in the object-literal parser, a `...` prefix copies src's own keys (`dynObjKeyVal` +
   `dynObjValAt`) into the literal via `dynSet`; later keys win (dynSet updates in place). (c) **call spread
   `f(...args)`** — in the parsePostfix call-arg loop, a `...` prefix expands a tag-5 array's elements
   (`dynArrGet`) as individual args. (d) **destructuring `const`/`let`/`var`** — `runDecl` branches on a
   leading `[` (array: comma-separated names incl. holes `[a, , c]` → bound to `arr[i]`, missing →
   undefined) or `{` (object: `key` and `key: alias` → bound to `dynMember(obj,key)`). (e) **class
   expressions `const C = class {…}`** — `runClassDecl` refactored into a shared `buildClass(s)` helper
   (parses optional name + `extends`, returns the class object, stashing any name under `__name`);
   `runClassDecl` binds `__name`, and a new `parsePrimary` `class` handler returns the object directly
   (anonymous + `extends` both work). Driver `main_es6misc.ts` (18 checkRun cases). Suite 359/359 (+`18zy`),
   bindgen 131/131, jstyper 73/73.
8. **2h removal** — **SHIPPED 2026-06-30** (test `18zz` + gate `tests/dync_conformance_tests.ts`):
   the cutover that **retires `javyc`**. Four parts: (a) **interpreter console I/O** —
   `console.log`/`error`/`warn`/`info` in eval source now print to stdout via a new
   `env.__host_print(ptr, len)` import (the `declare const __host` was extended; values format via
   `dynDisplay`/`dynConsoleLine` — top-level strings raw, else JSON-ish). `runWasi` (utils.ts) decodes
   the bytes from the instance memory → `rt.stdout`; the bindgen loader installs a real
   `_hostPrintImpl` (forward-referenced like `_hostCallImpl`) so dynamic code run through a bindgen
   host prints too. **This also surfaced + fixed an interpreter HANG**: `evalSkipWs` had NO comment
   handling (comments "worked" by accident via a downstream path that LOOPED on a multi-byte UTF-8 char
   in a comment — e.g. an em-dash); `evalSkipWs` now skips `//` and `/* */` (the interpreter has no
   regex LITERALS — RegExp is `new RegExp("…")` — so `//`/`/*` are unambiguously comments). (b) **the
   `wasmtk dync <file>` command** (`src/dync.ts`) — the javyc replacement: generates a tiny wasic
   driver that imports `wasmtk:dynrt` and calls a new `dynRunB64(b64, env)` export, which base64-decodes
   the WHOLE program source and runs it. The source is **base64-embedded** because wasic's line-based
   source scanner is string-blind to `{` (a raw string literal containing a brace makes wasic's
   statement collector mis-count depth and split on inner `;` — see compiler-bugs.md); base64's alphabet
   has no `{}`/`;`/`"`/newline, so the payload is opaque to the scanner. (c) **the conformance gate** —
   `tests/dync_conformance_tests.ts` output-diffs `wasmtk dync`→wasm against a `deno run` JS baseline
   over `tests/wasi/wasm_wasi_dync/demo1..3` (closures/class/array-methods/loops; JSON/Map/Set/string/Math/
   try-catch; recursion/generators/destructuring/spread/templates) — **3/3 byte-exact**. Also fixed a
   real interpreter bug the gate caught: `Math.min`/`max` were 2-arg only (`dynMathMethod` now variadic).
   (d) **deletion** — removed `src/javyc.ts`, the `case "javyc"`, `deno.json` `./javyc`,
   `tests/wasi_javy_tests.ts` + `tests/wasi/wasm_wasi_javy/`, and all the Javy download/detect/convert code in
   `utils.ts` (`ensureJavy`/`detectJavyProvider`/`findSourceAlongside` + the convert-path QuickJS
   handling). **No external Javy/QuickJS dependency remains.** Suite 360/360 (+`18zz`), bindgen 131/131,
   jstyper 73/73. **Out of scope (documented):** interactive `prompt` (no host stdin in the interpreter)
   and ESM `import`/`export` of OTHER modules — a single self-contained dynamic file is the `dync` surface.

