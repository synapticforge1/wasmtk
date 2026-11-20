# stdlib-bundling-brief — part 2 of 2

Continues [stdlib-bundling-brief.md](stdlib-bundling-brief.md) (split by size on 2026-11-20, letter H38). Sections:

- 7. Work items

## 7. Work items

1. ✅ **Confirm** `wasmmerge` `$__malloc`/`$__heap_ptr` handling (read source). *(blocker
   for sizing)* — done 2026-05-30: pre-unification handling did not unify; see §3.
2. ✅ **Implement** the allocator-unification pass in the merge (dedupe malloc, single
   heap ptr, heap past combined data) — done 2026-05-30; regression test
   `18b_SharedHeapTwoLibraries` in place; full suite **262/271 PASS (96.7%)** under
   `wabt-ts/compat 1.2.9` + `binaryen-ts/compat 1.3.1` with the unification pass active.
3. **Author** Tier-1 capability libraries as `modc` modules: JSON, Date (UTC/offset
   first), Map, Set; plus a RegExp leaf module.
   - ✅ **`Set<i32>` shipped 2026-05-30** — `tests/wasi/wasm_wasi_bundle/set_bundle/set_lib_modc.ts`
     (open-addressing hash table; handle = i32 ptr to a 4-slot `Int32Array` header
     `[count, cap, keysPtr, usedPtr]` + two `Int32Array(cap)` bucket arrays; linear probing
     on `key & (cap-1)`; ×2 grow + rehash at load factor 0.5; exports
     `setNew`/`setAdd`/`setHas`/`setSize`). Shared-heap driver `main_wasic.ts` +
     `@test-pipeline` `tests/wasi/wasm_wasi/18c_SetCapabilityLibrary.ts` (PASS). Required two
     wasic-side fixes: TypedArray-view-over-pointer **writes** (`const v: Int32Array = ptr
     as unknown as Int32Array; v[i] = x`) and imported-function signature resolution from
     inline `(param …)` headers in `wasmmerge`. A pre-existing modc bug (string-returning
     library functions imported an unused `fd_write`) was fixed alongside (bindgen
     99/103 → 103/103).
   - ✅ **`Map<i32,i32>` shipped 2026-05-30** —
     `tests/wasi/wasm_wasi_bundle/map_bundle/map_lib_modc.ts`. Reuses the Set hash core (same
     linear probing + ×2 grow/rehash) and adds a parallel values array; handle = i32 ptr to
     a 5-slot `Int32Array` header `[count, cap, keysPtr, valsPtr, usedPtr]` + three
     `Int32Array(cap)` bucket arrays. Exports `mapNew`/`mapSet`/`mapGet`/`mapHas`/`mapSize`;
     `mapSet` updates in place on an existing key (count stable), `mapGet` takes a caller
     `fallback` for absent keys. Shared-heap driver `main_wasic.ts` + `@test-pipeline`
     `tests/wasi/wasm_wasi/18d_MapCapabilityLibrary.ts` (PASS). Required no new compiler fixes —
     built entirely on the wasic features the Set capability established (TypedArray view
     over pointer, type-erasure casts, inline-param import signature resolution).
   - ✅ **`Date` shipped 2026-05-30** (first *leaf* capability) —
     `tests/wasi/wasm_wasi_bundle/date_bundle/date_lib_modc.ts`. Pure UTC integer calendar math,
     no heap allocation and no mutable state (allocator unification is a no-op here), so the
     merge is a straight function splice — the "leaf capability merged when used" path from
     §5. Uses Howard Hinnant's exact-integer civil↔days algorithms (valid across the whole
     proleptic Gregorian calendar, incl. pre-epoch / negative day counts). Exports
     `isLeapYear`, `daysInMonth`, `daysFromCivil`, `weekdayFromDays`, `yearFromDays`,
     `monthFromDays`, `dayFromDays`. Self-checking driver `main_wasic.ts` + `@test-pipeline`
     `tests/wasi/wasm_wasi/18e_DateCapabilityLibrary.ts` (PASS). Surfaced + fixed two merge-path
     compiler bugs — see §7b.
   - ✅ **`JSON` shipped 2026-05-31** (parse + navigate; first capability with *string* input
     across the merge) — `tests/wasi/wasm_wasi_bundle/json_bundle/json_lib_modc.ts`. Shared-heap:
     a wasic program (no native JSON) gains `JSON.parse` + navigation by merging this lib; the
     value tree lives on the driver's heap. Each handle = base ptr of a 4-slot `Int32Array`
     node `[tag, a, b, c]` (tag 0=null 1=bool 2=number(int) 3=string 4=array 5=object);
     containers reuse wasic's native dynamic `i32[]` (stored/reconstructed by ptr), string
     values are decoded into `Uint8Array` buffers. Recursive-descent parser with a module-level
     cursor. Exports `jsonParse`/`jsonType`/`jsonInt`/`jsonBool`/`jsonArrayLen`/`jsonArrayGet`/
     `jsonObjectLen`/`jsonStrLen`/`jsonStrCharAt`/`jsonStrEq`/`jsonGet`/`jsonHas`. Self-checking
     driver `main_wasic.ts` + `@test-pipeline` `tests/wasi/wasm_wasi/18f_JsonCapabilityLibrary.ts`
     (PASS). v1 scope: null/bool/integer-number/string/array/object + basic escapes; floats and
     `\uXXXX` are the v2 gap. **Surfaced + fixed four compiler bugs — see §7c.**
   - ✅ **`RegExp` shipped 2026-05-31** (fifth/final Tier-1; leaf) —
     `tests/wasi/wasm_wasi_bundle/regex_bundle/regex_lib_modc.ts`. A classic Kernighan/Pike recursive
     backtracking matcher, index-based over two `(string, index)` pairs threaded through the
     recursion (no heap; straight function splice). Exports `reTest(p,t)` / `reSearch(p,t)` (start
     index, sets `reEnd()`) / `reEnd()`. v1: literals, `.`, classes `[...]` (ranges, negation,
     `\d \w \s`), escapes `\d \w \s \D \W \S \n \t \r`, quantifiers `* + ?` (greedy + backtrack),
     anchors `^ $`; v2 gap: `|`, groups/captures, `{n,m}`, lazy, backreferences. Self-checking
     driver + `@test-pipeline` `tests/wasi/wasm_wasi/18g_RegexCapabilityLibrary.ts` (PASS). **Surfaced a
     merge bug, now FIXED (2026-06-02)** (OOB `charCodeAt` in a non-short-circuit `&&` loop condition
     mis-encoded by the splice; correct standalone, traps merged) — fixed by making wasic
     short-circuit `&&`/`||`; the library workaround was removed and 18g still passes merged. See §7d.
   - **All Tier-1 capabilities complete.**
4. ✅ **Wire** capability selection (2026-06-02): the 5 Tier-1 caps are embedded as byte
   modules (`src/wasm/cap_*_bytes.ts`) and resolved via a virtual `wasmtk:<cap>` import
   specifier (`wasmtk:set` / `:map` / `:date` / `:json` / `:regex`). Only capabilities a
   program actually imports get merged → feature-level tree-shake. No fixture `.wasm` on
   disk needed. See cmem/capabilities.md "Virtual capability imports".
5. **(Separate track — DESIGNED 2026-06-15, see [async-design.md](async-design.md); impl not
   started.)** Promise/async: microtask runtime + async/await lowering; lift the `hybrid` async
   exclusion. **Note for THIS brief:** unlike the 5 Tier-1 capabilities, the Promise runtime is
   **NOT a bundled/merged capability** — it is **callback-bearing** (`.then`/drain invoke reactions
   via `call_indirect`), and `wasmmerge`'s `call_indirect` guard forbids a merged module containing
   `call_indirect`. So the runtime ships as **inline WAT helpers** in the main module (gated by
   `needsPromiseRuntime`), sharing one table/type-section with the compiler-emitted per-`T`
   trampolines. v1 = Approach A (microtask-drain), standalone WASI; settled value laid out as
   Canonical ABI `result<T,E>` for forward-compat. 5 sub-phases (13.1–13.5).
6. ✅ **Evolve** `hybrid` to TS-type-driven routing (2026-06-02): `wasmtk hybrid --auto`
   routes every module-level named function whose params + return are all wasic-typed to the
   WASM core, and leaves async / `any`-shaped / untyped functions in the TS host. `// @wasm`
   still force-includes; `// @js` force-excludes. Default (no `--auto`) is the legacy
   annotation mode.
7. ✅ **DECIDED** (2026-06-02): route (b) — **build wasmtk's own dynamic runtime** (see §6
   above). Major new track, not yet implemented; `javyc` stays the interim fallback.

### 7a. Wasic codegen bug uncovered during §3 development — ✅ FIXED 2026-05-30

`return expr as unknown as i32` (the standard TypeScript double-cast idiom for
forcing through `any`) was mis-emitted by wasic: the return path ended with a stray
`f64.convert_i32_s` on what should be an i32 result, producing a `(result i32)`
declaration with an f64 value on the stack. Manifested as
`Compiling function #N failed: type error in return[0] (expected i32, got f64)` at
runtime.

**Root cause:** the `as` handler in `emitExpr` (`src/wasic.ts`) scans right-to-left,
so `buf as unknown as i32` recursed into the intermediate `buf as unknown`. The
intermediate target `unknown` reached `mapType("unknown")`, which falls through to
`f64`, so the i32 pointer was cast i32→f64 before the outer `as i32` saw it.

**Fix:** strip pure type-erasure casts (`as unknown` / `as any`) up front in
`emitExpr`, reducing `expr as unknown as T` → `expr as T` and `expr as unknown` →
`expr`. The now-simple inner operand lets the normal single-cast path infer the
correct source type. Regression test: `tests/wasi/wasm_wasi/22_DoubleCastErasure.ts`
(i32 + f64 double-cast, `as any` variant, bare `as unknown`; zero TS↔WASM delta).
The Tier-1 stdlib libraries can now use pointer-typed `as unknown as i32` returns
directly.

### 7b. Two merge-path codegen bugs uncovered during Date development — ✅ FIXED 2026-05-31

The `Date` capability is the first merged library whose functions are dense
**integer arithmetic over large constants** (719468, 146097, 365, 153, …). That
shape exposed two latent bugs in the merge pipeline that the bitwise/small-constant
Set/Map libraries never tripped. Both are fixed; the Date pipeline
(`18e_DateCapabilityLibrary.ts`) passes and the full `tests/wasi/wasm_wasi` suite is
**268/275** with the same 7 pre-existing wasic-codegen failures and **no
regressions** (historical snapshot — those 7 were all fixed 2026-06-02; suite is now 309/309).

1. **`wasmmerge` relocated arithmetic constants as if they were data pointers.**
   `relocateDataPtrs` (`src/wasmmerge.ts`) blindly shifted **every** `i32.const >=
   260` by the data-relocation delta — a documented conservative heuristic. Date's
   `isLeapYear` divides by `400`; after the merge that became `400 + dataOffset`
   (e.g. `668`), so `year % 668` made `isLeapYear(2000)` return 0. **Fix:** compute
   the merged module's own static-data extent `[dataLo, dataHi)` from its `(data …)`
   segments (new `dataStringByteLength` helper counts `\XX`/`\c` escapes) and
   relocate only constants that fall inside it. Genuine static-data pointers live in
   that range by construction; arithmetic literals do not. A pure leaf with no data
   segments (Date, Set, Map) has an empty range → nothing relocated. This is a strict
   improvement over the blanket threshold (the residual heuristic risk — an
   arithmetic constant that *coincidentally* lands inside a string-bearing library's
   data range — is far narrower and could later be made exact with context-sensitive
   load/store-address relocation).

2. **Binaryen miscompiled the doubly-merged module — ✅ fixed upstream in
   binaryen-ts/compat 1.3.2 (2026-05-31).** After wasmmerge splices the already-`-Oz`'d,
   stack-form library back into the driver, `compileWasiTs` re-optimizes the combined
   module with binaryen-ts/compat. Under 1.3.1, on Date's division-heavy
   `monthFromDays`/`dayFromDays`, `optimize()` produced a binary that **misbehaved at
   runtime** (garbage / out-of-bounds), even though the pre-binaryen merged WAT —
   assembled by wabt alone — ran correctly, and laundering binaryen's output back
   through wabt did **not** recover it (so the corruption was in binaryen's
   optimization, not its byte encoding). It was briefly worked around with a
   `skipBinaryenOpt` flag on `watToOptimisedWasm` (ship wabt's direct assembly of the
   merged WAT on the merge path). **1.3.2 fixed the optimizer bug** (deno.json bumped
   1.3.1 → 1.3.2), so the workaround was removed — the merge path again runs full
   Binaryen `-Oz`, and the Date pipeline + full suite pass with it re-enabled. (Fix 1
   above is independent of the binaryen version and stays.)

### 7c. Four compiler bugs uncovered during JSON development — ✅ FIXED 2026-05-31

JSON is the first capability to take **string input across the merge boundary** (Set/Map are
i32-only; Date is a pure-integer leaf) and the first to build a **dynamic tagged value tree**.
That exercised four code paths the earlier capabilities never hit. All four are fixed; the
JSON pipeline (`18f_JsonCapabilityLibrary.ts`) passes and the full `tests/wasi/wasm_wasi` suite is
**269/276** — same 7 pre-existing wasic-codegen failures, no regressions — plus `bindgen`
103/103 and `jstyper` 73/73 (historical snapshot — those 7 were all fixed 2026-06-02; suite is now
309/309 as of 2026-06-15, bindgen 104/104). (Detailed in cmem/capabilities.md (JSON).)

1. **String args to a merged import dropped to one stack value.** A modc `func(s: string)`
   compiles its string param to `(i32 i32)` (ptr+len), so `mergeWasmWat` registered the import
   with params `[i32, i32]` and the call site couldn't expand a string argument →
   `not enough arguments on the stack for call (need 2, got 1)`. **Fix:** the sibling `.wit`
   (Phase 41) preserves `s: string`, so `compileWasiTs`/`compileLibTs` now read it and overlay
   the **logical** signature onto each `ExternalFuncDef` before transpilation (new helpers
   `parseWitLogicalSigs`/`readWitLogicalSigs`/`applyWitSig`/`witTypeToWat`/`kebabToCamel`).
   Numeric-only libs (no `.wit` string params) are unaffected. This is what makes
   `jsonParse(s)`, `jsonGet(node, key)`, `jsonStrEq(node, t)` callable across the merge.

2. **Allocator-detector false-positive dropped a real function.** `detectBumpAllocator` matched
   any `(param i32)(result i32)` that touches one global with get+set + `i32.add` and no
   loads/stores/calls — which also describes a plain `global += param; return global`
   accumulator (a parser-cursor `advance`). The matched function was silently dropped during the
   merge → `undefined func`. **Fix:** a real `$__malloc` returns the *old* value (captured into
   a local before the `global.set`) so it reads the global **once**; the accumulator reads it
   **twice** (the second to return the new value). Require exactly one `global.get`/`global.set`
   occurrence — accepts every `-Oz` malloc shape, rejects the accumulator.

3. **Escaped-quote string literals matched as empty.** The literal regexes `"([^"]*)"` stop at
   the first `\"`, so a literal containing escaped quotes (an embedded JSON document) crossed as
   length 0 / hit "string assignment from complex expression not yet supported". **Fix:**
   escape-aware `"((?:[^"\]|\.)*)"` at the three statement/expression sites (`emitStringPtrLen`,
   `emitStringAssign`, module-const detection); `unescapeString` decodes the rest. (The
   `console.log`-argument emitter in `console_log.ts` still has the un-escaped form, so
   escaped-quote literals are passed via the main paths, which the driver does.)

4. **`findBinaryOp` missed operators whose RHS ends in a call.** The scan started at
   `expr.length - op.length`, never counting the last `op.length-1` chars for paren depth — a
   trailing `)` (e.g. `v[i] !== t.charCodeAt(i)`) drove depth negative so the operator was never
   found and the whole expression fell to the always-false comment-stub. (This silently broke
   the byte-comparison loops in `jsonStrEq`/`jsonGet`.) **Fix:** scan the full string from the
   end for depth (now also counting brackets `[]`, matching the sibling depth scanners) and only
   test op matches at valid start positions. High blast radius (all binary-op parsing) —
   re-validated with no regression.

### 7d. Merge bug uncovered during RegExp development — FIXED 2026-06-02

> **FIXED 2026-06-02.** Resolved by Proper-fix (a) below: wasic now emits **short-circuit**
> `&&`/`||`. The RegExp library's defensive workaround was **removed** (it now uses the natural
> `i < len && …charCodeAt…` form directly in `matchStar`'s loop `br_if`) and 18g still passes
> merged — proving the codegen fix carries the original trap construct. Full suite re-validated:
> `wasm_wasi` 278/278, `bindgen` 103/103, `jstyper` 73/73 (wabt-ts 1.3.2 + binaryen-ts 1.3.3).
> The post-mortem below is kept for the root-cause record.

RegExp is the second capability to take string input across the merge and the first whose hot
loop scans a string char-by-char with backtracking. That surfaced a **merge-only** bug (now fixed;
the matcher had been worked around in the library while it was open).

**Symptom.** A modc library that runs correctly **standalone** (verified by loading
`regex_lib_modc.wasm` directly in Deno) silently halts — WASM trap; the runner exits 0 with no
stderr — once `wasmbundle`/`wasmmerge` splices it into a host module.

**Isolated trigger.** A `while` loop whose condition is
`i < len && atomMatches(p, pi, s.charCodeAt(i)) === 1` — i.e. a function call wrapping
`charCodeAt`, nested in an `i32.and`, in the loop's `br_if`. wasic compiles `&&` to a
**non-short-circuit** `i32.and`, so `s.charCodeAt(i)` is evaluated even when `i == len` (an
out-of-bounds index). Bisected from the full matcher down to exactly this construct via a minimal
two-function probe.

**Ruled out.** Not an infinite loop (a `count < 1000` cap as the first `&&` operand did not stop
it → a trap, not a runaway). Not Binaryen (halts with Binaryen disabled on both `modc` and the
`wasic` merge step). Not the bounds check (the merged `$__str_char_code_at` WAT is fully intact:
`idx<0→-1`, `idx>=len→-1`, else load — so OOB returns -1 and does not load) and not a bad call
site (the merged call passes the correct `(t_ptr, t_len, idx)`). The corruption is introduced by
the **splice + wabt-ts reassembly** of the larger module (shifted function/type indices), in the
same family as the wabt-ts name/index-resolver bugs in the §7-era table — a `call` nested in an
`i32.and` inside a `loop` `br_if`. JSON did not trip it because its `&&`-with-`charCodeAt` lives
in `if`s with a single direct `charCodeAt`, not a nested call inside a `while` `br_if`.

**Former workaround (now removed).** While open, the RegExp matcher never called `charCodeAt` on an
unchecked index — every fetch was guarded by an enclosing `if (i < len)` (helper `atomAt`). With the
fix landed this was removed in favor of the natural short-circuit form; Set/Map/Date/JSON were
unaffected throughout.

**Fix taken — (a).** wasic now emits **short-circuit** `&&`/`||` (an `(if (result i32) …)` skipping
the RHS once the LHS decides), so a `charCodeAt`/array read guarded by `i < len &&` on its LHS never
runs out of bounds — removing the whole trap class. `src/wasic.ts` `emitExpr` binary-op loop (and
the `console_log.ts` mirror); the bitwise `i32.and`/`i32.or` table entries stay for operator
detection but no longer drive emission. See `cmem/compiler-bugs.md` § "short-circuit `&&`/`||`
removes the merge OOB-`charCodeAt` trap" and `cmem/design-decisions.md`.

