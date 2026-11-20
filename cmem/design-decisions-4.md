# design-decisions — part 4 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Merge (wasmmerge) invariants
- Runner / ABI invariants
- `hybrid` call-rewriting / body-extraction MUST be context-aware (2026-
- Producer shims must be runtime-agnostic (`rt.*`, not `Deno.*`) (2026-0
- WIT type handling fails loud, not silent (2026-07-08)
- Parallel-path discipline

## Merge (wasmmerge) invariants

- **One exception per merged module (sw119 / ld114, 2026-10-24).** A wasic library exports its
  `__exn_tag` and `__exn_kind`; the merge maps every `throw N` / `catch N` / `(catch N L)` of that
  tag to the program's `$__exn_tag`, every use of the kind global to the program's `$__exn_kind`,
  declares both when the program had neither (`usesExnTag`; wasmbundle likewise), and REFUSES any
  other tag. A library's exception is then one the program catches, of its kind.
- **`relocateDataPtrs` is a heuristic: an in-range `i32.const` is a pointer unless its consumer
  proves otherwise.** Proven arithmetic: the operand of `* / % & | ^ << >> rotl rotr`, the
  operand of an int-to-float conversion (sw138), and the RIGHT operand of `i32.sub` (sw137: the
  number printer's `e - 1075`). Everything else (add, compare, store, call argument) relocates, so
  an arithmetic constant inside the library's data range in such a position is still corrupted:
  **never add data to a library that had none for a runtime purpose** (sw138: the checked store's
  message is built when thrown in library mode, `i32FitThrowWat`). The exact cure, a base global
  for every data reference, is not built.
- **`detectBumpAllocator`** identifies `$__malloc` semantically: `(param i32)(result i32)`, touches
  exactly one global with `global.get`/`global.set` each occurring **exactly once**, has
  `local.get 0` + `i32.add`, and NO calls/loads/stores. The once-each rule is what keeps a
  `global += param; return global` accumulator from being mis-dropped.
- **A wasic library EXPORTS its heap pointer (`__heap_ptr`), and the merge unifies the allocator
  by that export first** (2026-10-13, the binaryang 1.12.0 bump). The optimizer may inline
  `$__malloc` into its callers and remove it (binaryang's `Inlining`, 1.9.0+), and then
  `detectBumpAllocator` finds nothing: the library kept a PRIVATE heap and the "no unification"
  branch moved every mutable global to 131072, 0-sentinels included. With the export, every
  `global.get/set` of that index (inlined allocations included) becomes `$__heap_ptr`; a surviving
  `$__malloc` is still dropped; an export and a detected allocator naming DIFFERENT globals is
  refused. `droppedAllocator` means "the bodies reference `$__heap_ptr`", so wasmbundle defines it.
  Do not remove the export to tidy a library's exports.
- **A `(type N)` left in a copied body is a BLOCK signature and is spelled inline** from the source
  type section (2026-10-13). The library's type section is not copied, so an index would name the
  program's type N. Headers lose their `(type N)` and `call_indirect` is refused, so nothing else
  carries one; an index the source does not define is refused.
- **`relocateDataPtrs`** relocates only `i32.const` values inside the merged module's own `(data …)`
  address extent (`[dataLo, dataHi)`) — never blanket-shift every `>= 260`, or arithmetic constants
  get corrupted. **AND (2026-06-09) within that range it skips any in-range `i32.const` whose NEXT
  instruction token (the merged body is FLAT/stack form) is a pure arithmetic/bitwise/shift op
  (`ARITH_NEVER_PTR` = `i32.mul/div_s/div_u/rem_s/rem_u/and/or/xor/shl/shr_s/shr_u/rotl/rotr`).** A
  data pointer is never the rhs of those ops, so this never drops a real pointer; it fixes
  over-relocation of an arithmetic constant that coincidentally lands in the data range (e.g. `x %
  271` when the lib's data is `[260, 301)`). Do NOT switch to an "address-position only" rule —
  a genuine pointer can appear in VALUE position (`i32.const 0 / i32.const 260 / i32.store` stores a
  string pointer), so that would under-relocate. `add`/`sub`/comparison/store/load/`(data …)` offset
  all keep relocating (conservative). Regression: `18i_RelocArithmeticConstant`. Tradeoff rationale +
  full proof: compiler-bugs.md "Remaining-items pass" item 5.
- **Imported-function logical signatures** come from the sibling `.wit` (string params hide as
  `i32 i32` in the raw `.wasm`); `applyWitSig` overlays them so string args expand to ptr+len.
- **`.toText({ inlineExport: false })`** must be passed explicitly at every disassembly site in
  `wasic.ts`/`wasmbundle.ts` (wabt-ts default differs from npm:wabt).
- **`isModuleGlobalArr` also excludes `fnShadowedGlobals`** (sw70, 2026-10-13): the module globals
  the function being emitted declares itself (a local or a param of the same name). The name alone
  made a local array's init `global.set` the module's. Every global-vs-local choice asks "does
  THIS scope declare it", never "is there a global called that". **The same rule decides which
  top-level arrays BECOME module globals** (sw73, 2026-10-15): `detectModuleArrayGlobals` counts a
  function's mention of a name only when the function does not declare it (param, `const` / `let`
  / `var`). Counting the function's own `m` made a top-level `m` a global that _start initialised
  as a local.
- **`isModuleGlobalArr`** checks `arrayVars.get(name)?.ptr === -2` (the module-global sentinel),
  NOT `moduleArrayVars.has()` — so a rest-param shadowing a global array (`ptr === -1`) emits
  `local.get`, not `global.get`. Spread calls `fn(...arr)` likewise pick `global.get` vs
  `local.get` by `moduleGlobals.has(name)` at all three emission sites.

## Runner / ABI invariants

- All runtime I/O goes through `rt.*` (never `Deno.*`) — Bun compatibility.
- 🔒 **`wasmtk run` exit status is at PARITY WITH WASMTIME (owner decision 2026-09-28; it was
  "exits cleanly (code 0)" before).** An uncaught WASM throw from `_start` prints `error: Uncaught
  (in Wasm) Error: <msg>` (or `error: Uncaught (in Wasm) exception` for a foreign tag) to stderr and
  exits **1**. `proc_exit(N)` exits **N**, silently. `run file.ts|.js` propagates the child's code.
  Traps stay at 1 (wasmtime's trap code is platform-specific, 3 on Windows / 134 on Unix, and was
  not part of the decision). `throw` inside try/catch emits `(throw $__exn_tag ...)`, never
  `proc_exit`. Tests that crash on purpose declare `// @expect-exit: N`.
- The `env` import object in the runner is a `Proxy` returning a no-op `()=>0` stub for any unknown
  key (so Phase-40 `declare const` external modules instantiate without a real host).
- `cabi_realloc` is exported (not `__malloc`) when any export has a string param/return. String
  returns use a **callee-allocated pair-pointer** shim (`$fn__cabi`, `wasic.ts` ~19145): it
  `cabi_realloc(0,0,4,8)`s an 8-byte area, calls the internal `$fn` (which sets the `$__str_ret_*`
  globals), stores `[ptr,len]` into that area, and RETURNS the area pointer (i32). A paired no-op
  `cabi_post_<name>` export lets the host release it after reading. `bindgen.ts` reads the returned
  pointer (`getInt32(_r)` / `getInt32(_r+4)`) then calls `cabi_post_<name>` — it does NOT allocate a
  return area host-side. The `$__str_ret_*` globals are NOT exported.
  (Historical note: Stage 0 originally specified the *out-parameter* convention — caller allocates
  the 8-byte area and passes it as a trailing `$__ret_area` arg. The ABI later moved to this
  callee-allocated pair-pointer + `cabi_post` form; older references to an "out-param shim" are
  stale. This is the canonical form and matches the Go `strlib` fixture and `strlib.go`.)

## `hybrid` call-rewriting / body-extraction MUST be context-aware (2026-07-08)

`src/hybrid.ts`'s three scanners — `findCloseBrace` (extract a `@wasm` body), `isMethodDefinition`
(call vs `name(){` definition), and `rewriteWasmCalls` (`name(` → `lib.name(`) — process ARBITRARY
user TypeScript, so they must NOT be naive brace-counters or lookbehind regexes. They share a
`skipLiteral(src, i, prevSig, prevWord)` primitive that treats **strings, templates, `//`/block
comments, AND regex literals** as opaque, with `regexCanPrecede()` disambiguating a regex `/…/`
from division by the previous significant token (a value / keyword). Load-bearing rules:

- A regex literal containing a quote/brace/paren (`/["'{}]/`, `/}{/`) must NOT flip string/brace/
  paren state — else it silently disables all downstream rewrites (→ runtime `ReferenceError`) or
  truncates a body. Do not revert to a scanner that only tracks `"`/`'`/`` ` ``/comments.
- `rewriteWasmCalls` DESCENDS into template `${…}` interpolations (via `findInterpEnd` + recursion)
  so a routed call inside `` `${add(x)}` `` is still rewritten. A blind opaque-template approach
  regresses this (the pre-2026-07-08 naive regex rewrote it by accident).
- `isMethodDefinition` is the guard that keeps an object method shorthand (`{ add(x){…} }`) from
  being rewritten; it must skip strings/regex inside the arg list so a `)` there doesn't misparse.
- **Nested backtick inside a `${…}` interpolation — CLOSED (B5, 2026-07-09).** `skipLiteral`'s
  backtick branch now descends into each `${…}` interpolation via `findInterpEnd` (mutually
  recursive, so arbitrarily-nested templates are handled) instead of scanning greedily for the next
  backtick — which mistook a nested opening backtick for the outer template's close. The observable
  bug: a nested template whose TEXT holds a `}` leaked that brace into depth counting →
  `findCloseBrace` truncated a `@wasm` body early (proven: 68 vs 82 chars), and `findInterpEnd`
  mis-scanned a doubly-nested interpolation → a routed call in it was NOT rewritten. Both cases are
  regression-tested in `tests/hybrid_tests.ts` (the two "(B5)" tests — verified to fail without the
  fix). No known residual scanner edge remains.

## Producer shims must be runtime-agnostic (`rt.*`, not `Deno.*`) (2026-07-08)

`src/gowasic.ts`'s `SHIM_TS` (the passthrough wasm-opt shim TinyGo execs when no real `wasm-opt` is
on PATH) runs as a standalone script under whatever `rt.execPath()` returns, so it detects its own
runtime (`typeof Deno`/`typeof Bun`) and its launcher branches: Deno needs `run -A`, Bun execs the
file directly (`-A` is a hard Bun parse error). All file I/O in gowasic proper goes through `rt.*`
(added `rt.chmod` + recursive `rt.remove`), never `Deno.*` — same Bun-compat rule as the runner.

## WIT type handling fails loud, not silent (2026-07-08)

`witTypeToWat` (wasic overlay) and `parseWitType` (bindgen) cover all scalar int WIT types and
THROW on unknown/aggregate types (`list<>`, `tuple<>`, record) rather than silently mapping to
i32/s32; `parseWitFuncs` rejects multi-value/tuple returns. On the merge path, `readWitLogicalSigs`
swallows ONLY file-absence (numeric-only lib → empty overlay); a parse/type error propagates, and
the per-import merge `catch` RE-THROWS any `wasic:`-prefixed diagnostic instead of downgrading it to
a "skipping" warning (which buried it, then failed later with a confusing "unknown function"). Only
reachable via a hand-written `.wit` — wasic emits only the supported subset.

## Parallel-path discipline

`console_log.ts` duplicates much of `wasic.ts`'s expression/arg emission (`parseSingleArg`,
`exprToWat`, the `structLookupFn`/`dotCallLookupFn` closures). When you change an emission rule in
`wasic.ts`, check whether the same rule exists in `console_log.ts` (and in BOTH the console.log and
console.error closures) and update it too. Static-field, getter, TypedArray `.length`/`.byteLength`,
string-array element, and `Math.*`/`Number.*` handling all have such twins.

