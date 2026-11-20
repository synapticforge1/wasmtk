# dynrt-design — part 6 of 6

Continues [dynrt-design.md](dynrt-design.md) (split by size on 2026-11-20, letter H38). Sections:

- javyc retirement — scoped task breakdown (2026-06-24) (continued)
- wasic ↔ dync: keep both engines; abort GUIDES to dync-or-fix (no silen
- Dynamic modules → run on ANY WASI runtime (wasmtime / wasmer / WAMR / 

## javyc retirement — scoped task breakdown (2026-06-24) (continued, 2)

### Language consumption profile — ES6 base; older ES auto-repaired ONLY when provably safe (DECIDED 2026-06-26)

**Owner decision:** **ES6 (ES2015) is the BASE PREFERRED state of consumed source** — `let`/`const` block
scoping, per-iteration `let`, the ES2015+ form. Older ES versions (ES5 and earlier) are **not rejected
outright**: where a construct can be transformed to its ES6 equivalent **provably safely**, the compiler
**auto-repairs** it; where it **cannot** be proven safe, the compiler **HARD-ERRORS with a precise
diagnostic** (it never silently "repairs" an unsafe case — silent-wrong is the exact failure mode we are
eliminating). "Preferred ES6, auto-upgrade the safe older stuff, reject the rest with a clear message."

**First instance — `var` → `let` — SHIPPED 2026-06-26 as 2e.7b (`src/varscope.ts`):**
- **Provably safe** (no leak past its block, no redeclaration, no use-before-declaration, no loop-closure
  capture — i.e. it passes a `block-scoped-var`/`no-redeclare`-equivalent check) → rewritten to `let`
  (code-only via the module's own `maskCode`).
- **Unsafe** (relies on any `var`-specific behavior) → compile error naming the construct + `line:col`.
- **Soundness:** implemented as a dedicated scope-analysis pass (`gateVarToLet`), NOT a blind regex —
  brace-stack scopes + function-body heuristic + whole-word reference scan (excluding `.prop`); conservative
  (ambiguous → hard error). 12/12 unit tests in `tests/varscope_tests.ts`.
- **Wiring:** runs FIRST in `WasicTranspiler.transpile()`, so it covers BOTH wasic and modc. The whole
  codebase being `let`/`const` already (0 real `var`) made it a zero-risk landing (no-op except deliberate
  tests). wasic still lowers all decls to function-scoped WAT locals, so for wasic the rewrite is
  behaviorally transparent and the gate's value there is enforcing the uniform ES6 contract; for the dynrt
  interpreter the `let`/`var` distinction is real (2e.7a).
- **Not yet wired:** scanning RESOLVED IMPORTS (tsbundler) — the gate currently runs on the entry module's
  source; extending it to each inlined import is a small follow-up (npm dist is the case that needs it).

**Where it's confirmed / enforced (module ingestion):** the gate lives at the **wasic/tsbundler static
front-end**, scanning the user's source AND each resolved import. **JSR deps** ship authored **source**
(TS/ESM) → very likely ES6-clean, but JSR does NOT enforce scoping style, so still scan. **npm deps** often
ship transpiled-to-ES5 / minified **dist** (var-heavy even when the author's source was clean) → must scan,
and prefer the least-transpiled entry (ESM `exports`/`src`) over `dist`. Metadata (`"type":"module"`,
tsconfig `target`) is a hint, never proof — verify by scanning. A blind (non-scope-aware) `var`→`let`
rewrite is rejected: it's unsound (breaks redeclare/leak/hoist/loop-closure cases) AND a behavioral no-op
for both current backends.

The **2g GC** prerequisite is **already DONE**. Route A then = **2e (language) + 2f (stdlib) + 2h
(removal)**:

### 2e — interpreter language completeness (extend `dynRun`/`parseExpr` in the dynrt lib)
Each increment mirrors the existing `runWhile`/`runIf`/`parsePrimary` pattern, ships a `18*` test, keeps
the suite green (output-diff):
- **2e.1 control flow:** `for` (C-style), `for-of`, `for-in`, `do-while`, `switch`, `break`/`continue`
  (+ labels).
- **2e.2 literals in source:** object literals `{k:v}`, array literals `[…]`, template literals.
- **2e.3 function forms:** arrow functions, function *expressions*, default/rest params.
- **2e.4 assignment forms:** compound (`+=`…), `++`/`--`, member/index assignment (`x.p=v`/`x[i]=v`),
  destructuring assignment.
- **2e.5 operators:** `typeof`/`instanceof`/`in`, `?.`, `??`, spread/rest, comma (ternary already done).
- **2e.6 error handling:** `try`/`catch`/`finally`, `throw`.
- **2e.7 scoping:** real lexical block scope for `let`/`const`, `var` hoisting.
- **2e.8 classes:** class decl/expr, methods, fields, `this`, `extends`/`super` (needs the 2f.1 object
  model).
- **2e.9 generators + iterators** (`function*`/`yield`, `Symbol.iterator`).
- **2e.10 async/await in dynamic source** (needs a microtask loop — heaviest; ties to #13 async).

### 2f — dynamic stdlib + object semantics
- **2f.1 prototype chain + `this` binding** — the object-model upgrade (method dispatch via prototype);
  gates 2e.8.
- **2f.2–2f.4** built-ins as dynamic objects with methods: `Array` (push/map/filter/reduce/…), `String`,
  `Object` (keys/values/entries/assign), `Number`, `Math`.
- **2f.5 `JSON.parse`/`stringify`** — can BRIDGE the existing JSON capability lib.
- **2f.6 `Map`/`Set`/`WeakMap`/`WeakSet`** — can BRIDGE the existing Set/Map capability libs.
- **2f.7 `RegExp`** dynamic objects — can BRIDGE the existing RegExp capability lib.
- **2f.8 `Date`/`Symbol`/`BigInt`/`Promise`** (dynamic), **2f.9 globals** (`parseInt`/`parseFloat`/…).

### 2h — removal (the actual retirement; the GATE)
- **2h.1** add a "full dynamic compile" entry — a wasmtk mode that routes an ENTIRE TS/JS file through
  `dynrt` (the `javyc` replacement). Decide surface: repoint `wasmtk javyc` to the dynrt backend, or a
  new flag.
- **2h.2 conformance corpus = the gate:** run `tests/wasi_javy_tests.ts`'s programs (+ a broader JS
  corpus) through the dynrt path and require **output parity** before removal.
- **2h.3** flip/deprecate `wasmtk javyc`; **drop the external Javy binary dependency**
  (`ensureJavy`/download/install).
- **2h.4** delete `src/javyc.ts`, the `case "javyc"`, `deno.json` `./javyc`, the Javy asset code; retire
  `tests/wasi_javy_tests.ts`; update CLAUDE.md / README / cmem.

**Effort:** 2e is ~10 interpreter increments, 2f is ~9 (several BRIDGE existing capability libs, cheaper),
2h is the cutover. Comparable in size to the #13 async track or the whole #14 interpreter arc. **2f
async (`2e.10`) + generators (`2e.9`) are the hardest**; everything else is incremental parser/stdlib
growth on the proven dynrt scaffolding. **Recommendation:** get the Route A/B decision first — if the
owner is willing to scope full-JS compile out, Route B retires `javyc` in a single small PR
(`2h.3`/`2h.4` only) without any 2e/2f work.


## wasic ↔ dync: keep both engines; abort GUIDES to dync-or-fix (no silent fallback) — ✅ SHIPPED (2026-07-27)

**Decision (owner, 2026-07-27):** "Do we need both wasic and dync? Can wasic detect the need for dync
and use it instead?" → **Keep both engines** (they are different targets, not redundancy: `wasic` =
static → native WASM for the typed subset = the whole DLL vision; `dync` = the whole program through
the `wasmtk:dynrt` boxed-value interpreter = the `javyc` replacement, the structural escape hatch for
what wasic can't express). You can't fold dync's engine into wasic, and you never want wasic output to
become interpreter-sized. **No silent auto-fallback** — one dynamic line silently swapping a small
native module for a ~48 KB interpreted one is a 10–100× size/speed cliff that also MASKS real wasic
gaps (utility types, the ~14 known-open bugs) behind the interpreter. Rejected.

**Shipped instead — actionable abort (Tier 1, refined by owner):** wasic keeps detecting
incompatibility as before, and on abort **classifies the cause and prints the right next step**:

- `compileWasiTs` now surfaces the abort reason in `WasicResult` (`aborted: true` +
  `diagnostics: string[]`) — additive, harmless to every other caller.
- The `wasic` **CLI wrapper `compileWasi`** (and ONLY it — the dync-internal driver compile calls
  `compileWasiTs` directly, so it can never recommend dync to itself; `modc`/`compileLibTs` doesn't
  call it either, correct since dync makes an executable, not a library) calls
  `suggestNextStepOnAbort(path, diagnostics)`, which splits the diagnostics:
  - **`Unknown function '…' — not declared`** → an undefined name: "fix it first — the dynamic runtime
    would fail on it too (ReferenceError)." (Flagged as *verify*, not asserted broken — it can also be
    legit dynamic dispatch wasic can't resolve statically.)
  - **everything else** (Unsupported statement/expression/string-expression, destructuring gaps) →
    wasic-static-subset limits → "if this is dynamic, compile with the dynamic runtime:
    `wasmtk dync <path>`." A mixed program prints BOTH sections (fix first, then dync for the rest).
- Guidance is informational stderr (no `⚠️`), printed alongside the existing abort; a SUCCESSFUL
  compile is untouched (no guidance, exit 0). Verified: dynamic-only → dync; undefined-name → fix;
  mixed → both; success → clean. wasi suite **375/375** (incl. `@expect-fail` abort tests), no regression.

**Deferred (not built):** the fuller unified front-end (`wasmtk compile` router that classifies up
front and routes typed→wasic / dynamic→dync / mixed→hybrid, reusing `hybrid.ts analyzeSignature`).
Owner chose the actionable-abort scope; the router remains a future option (note: `wasmtk build` is
already taken by the Rust polyglot delegation, so a router would be `wasmtk compile`).

## Dynamic modules → run on ANY WASI runtime (wasmtime / wasmer / WAMR / wazero) — ✅ SHIPPED (2026-07-27)

> **DONE.** `wasmtk dync` now emits pure-WASI modules (imports ONLY `wasi_snapshot_preview1.*`) that
> run unchanged on wasmtime / wasmer / wazero (WAMR untested locally — standard WASI-P1). Implemented
> NOT via the originally-planned `__wasi_write` intrinsic + `dynrt_lib_modc.ts` edits, but via a
> **post-merge WAT transform** — see "### ✅ IMPLEMENTED" at the end of this section for the final
> design and why it's better. The PLANNED / PROVEN notes below are kept for history.

**Gap (proven).** A `wasmtk dync <file>` artifact (and the merged dynrt-driver `.wasm` the `18*`
dynamic @test-pipelines produce) currently runs ONLY under wasmtk. `wasm-opt --print` on a `dync`
output shows exactly three imports:

```
(import "wasi_snapshot_preview1" "proc_exit" …)   ← standard WASI ✓
(import "env" "__host_call"  (func (param i32 i32) (result i32)))   ← wasmtk-only ✗
(import "env" "__host_print" (func (param i32 i32)))               ← wasmtk-only ✗
```

`wasmtime run` rejects it: `unknown import: env::__host_call has not been defined`. Note there is
**no `fd_write`** — the dynrt does *all* console output through `env.__host_print`, which only the
wasmtk runner (`src/utils.ts` `__host_print`) and the bindgen loader (`src/bindgen.ts`) supply. Those
two `env.*` imports are the entire portability blocker. (`dync.ts` already *claims* "self-contained
WASI `.wasm`" — this makes the claim true.)

**Fix — make the dynrt library emit pure WASI (both in `dynrt_lib_modc.ts`):**

1. **`env.__host_print` → WASI `fd_write`.** The static path (`console_log.ts`) already emits the
   canonical sequence: reserve an iovec `[ptr,len]` in scratch, call
   `fd_write(1, iovPtr, 1, nwrittenPtr)`. dynrt's `print(ptr,len)` must do the same instead of
   `__host.print`. Wrinkle: dynrt is authored in the wasic subset and holds *raw* `(ptr,len)` bytes,
   so it can't reuse wasic's string-literal `console.log` emission. **Assist:** add a tiny wasic
   **intrinsic** `__wasi_write(ptr,len)` (inlines the same iovec+`fd_write` `console_log.ts` produces)
   and have dynrt call it. (The interpreter already appends the trailing newline, so it's a raw write
   — no extra formatting.)
2. **`env.__host_call` → internal trap for the standalone build.** `__host_call` is reached ONLY when
   a HOST passes a JS function into the core as `any` (the bindgen scenario, `dynMakeHostFn`). A
   standalone WASI command has no such host, so the import is present-but-never-called — yet runtimes
   require every import defined at instantiate. Replace it (standalone/dync path) with an internal
   wasm function that `unreachable`-traps; KEEP the real `env.__host_call` import on the host/bindgen
   path (which is host-driven, not standalone). Net: **zero non-WASI imports**.

After both, the module imports only `wasi_snapshot_preview1.*` → runs unchanged on **wasmtime**,
**wasmer**, **WAMR (`iwasm`)**, **wazero** (Go host). (Math.random uses the self-contained xorshift
PRNG from the Phase-38 mathlib, not `random_get`, so no host dep is added there.)

**Verification + bonus regression suite.** Extend the runner to cross-run each dynamic module under
every installed runtime (skip-if-absent, like the TinyGo gates) and assert byte-identical stdout vs
wasmtk. Turns "portable dynamic runtime" into a standing guarantee and catches any re-introduction of
a host import.

**Scope / sequencing.** Self-contained: a `dynrt_lib_modc.ts` change + one small wasic intrinsic; does
NOT touch the 19.7K `wasic.ts` monolith's structure. It's exactly the kind of wasmtk-only host
coupling the modularization Phase-0 audit targets, and it's on-vision (the dynamic runtime becomes a
genuine *universal* WASI module). Slot as a small high-value item folded into Phase 0 or a mini-track
right after. **Next action when picked up:** prototype `__wasi_write` + the trap-stub, then prove the
four-runtime run end-to-end on a `dync` demo.

### ✅ PROVEN end-to-end via hand-patch (2026-07-09)

Before implementing, the fix was validated by hand-patching a real `dync` artifact
(`tests/wasi/wasm_wasi_dync/demo1.wat`, the closures/classes/JSON/reduce/map program):
removed the two `env` imports; added `(import "wasi_snapshot_preview1" "fd_write" …)`; replaced
`$dynrt___host_call` with `(func … unreachable)` and `$dynrt___host_print(ptr,len)` with
`(i32.store (i32.const 0) ptr) (i32.store (i32.const 4) len) (drop (call $fd_write (i32.const 1)
(i32.const 0) (i32.const 1) (i32.const 128)))` — reusing the reserved low scratch region (data starts
at 260, so `[0,260)` is free for the iov@0 / nwritten@128 layout). Reassembled with `wasm-opt
--all-features`. Resulting imports: **`wasi_snapshot_preview1.proc_exit` + `.fd_write` only**.

Ran **byte-identical** output (`counter: 11 12 13 / dist: 5 / sorted / sum: 28 / upper / fib`) under
**wasmtime ✓, wasmer ✓, wazero ✓** (WAMR `iwasm` not installed locally — standard WASI-P1, no reason
to differ). So the plan is de-risked: the two `env.*` imports are the ONLY blocker, `fd_write` via the
reserved scratch works, and the `__host_call` trap-stub is safe (never reached standalone).

**Remaining = productionize** (so `wasmtk dync` emits pure-WASI directly, no hand-patch): add the
`__wasi_write(ptr,len)` intrinsic to wasic (emit the iovec+fd_write inline, as `console_log.ts` does)
and switch `dynrt_lib_modc.ts`'s `print`/`__host_call` to it + the trap; keep the `env.*` path only
for the host/bindgen build. Then wire the cross-runtime regression suite. (Scratch caveat to carry
into the real impl: the hand-patch reused iov@0/nwritten@128 — fine because dynrt's print is
transient — but the intrinsic should use wasic's actual `iovBase`/`NWRITTEN_OFFSET`/`scratchBase`
constants, not hardcoded 0/128, to stay correct after any merge relocation.)

### ✅ dync no longer generates the (empty) `.wit` (2026-07-28)

A `dync` module is a whole-program WASI command with **no exports**, so its WIT is an empty world
(`world name {}`) — writing it was a wasted step. `compileWasiTs` gained an `opts?: { emitWit?:
boolean }` param; when `emitWit === false` it skips the `generateWit` + `.wit` write (and the
`WIT:` log line). `compileDyn` passes `{ emitWit: false }`. All other callers (the `wasic`/`modc`
CLI paths) default to emitting `.wit` as before. (Also this session: `wasmtk wasic` merge notices
were reclassified `⚠️`→`ℹ️` — informational, not warnings; and on an unsupported-feature abort the
`wasic` CLI wrapper now classifies the cause and prints "recompile with `wasmtk dync`" for a dynamic
feature, or "fix this first" for a genuine undefined-name error — `suggestNextStepOnAbort`, gated to
the `compileWasi` wrapper so it never fires on the dync-internal driver compile. `WasicResult` gained
`aborted` + `diagnostics`.)

### ✅ IMPLEMENTED — post-merge WAT transform, not an intrinsic (2026-07-27)

Shipped as **`internalizeDynrtHostImports(wat)`** in `src/wasic.ts`, called in `compileWasiTs` right
after `injectDynrtMarshalExports` and before `watToOptimisedWasm` (the final merged-WAT stage). It is
a no-op unless the reserved dynrt-internal imports are present; when they are it:

- removes `(import "env" "__host_print" (func $NAME (param i32 i32)))` and defines `$NAME(ptr,len)` as
  `(i32.store (i32.const IOV_BASE) ptr) (i32.store (i32.const IOV_BASE+4) len) (drop (call $fd_write
  (i32.const 1) (i32.const IOV_BASE) (i32.const 1) (i32.const NWRITTEN_OFFSET)))` — using the imported
  `IOV_BASE`(0) / `NWRITTEN_OFFSET`(128) constants (the main driver never prints, so its low scratch
  `[0,260)` is free; data starts at DATA_BASE=260);
- adds `(import "wasi_snapshot_preview1" "fd_write" …)` after `proc_exit` if absent;
- removes `(import "env" "__host_call" …)` and defines `$NAME2(i32 i32)->i32` as `unreachable`.

Regexes capture the merged func name (`$dynrt___host_print` / `$dynrt___host_call`) so the transform
is prefix-agnostic; `wat2wasm` + binaryen `-Oz` downstream renumber indices and dead-strip.

**Why the transform beats the planned intrinsic + library edit:**

1. **The dynrt library is shared, and bindgen NEEDS the `env.*` imports.** `wasmtk:dynrt` is merged
   into BOTH `dync` (standalone, this path) AND bindgen `any`-signature libraries (`compileLibTs`,
   whose host loader supplies `env.__host_print`/`env.__host_call`). Editing `dynrt_lib_modc.ts` to
   drop those imports would have broken the bindgen host-callback path (or forced a bindgen WASI-shim
   change + re-embedding the dynrt bytes). Keying the fix to `compileWasiTs` ONLY (WASI-executable =
   always hostless) leaves bindgen's `compileLibTs` path — and the embedded dynrt bytes — completely
   untouched. Verified: `bindgen_tests.ts` 142/142 unchanged.
2. **No re-embedding, no intrinsic surface.** The embedded `caps_bytes.ts` dynrt bytes stay as-is; no
   new wasic call-recognition path (which would itself have needed the bindgen-vs-standalone split).
3. **Keyed on reserved names** (`__host_print`/`__host_call`, never user-authored), so ordinary
   Phase-40 `declare const` host imports are untouched.

**Verification (2026-07-27).** `wasmtk dync` on demo1/2/3 → each imports only `wasi_snapshot_preview1`
(`proc_exit` + `fd_write`); byte-identical stdout to `deno run` under **wasmtime ✓ wasmer ✓ wazero ✓**
(9/9). fd is 1 (stdout) for log/error/warn/info — matches the prior `env.__host_print` (runner wrote
all console output to stdout via `rt.stdout.writeSync`; dynrt collapses the four methods to one
`print`), so **no behavior change**. Suites green: wasi **375/375**, dync_conformance **3/3**, bindgen
**142/142**. New standing gate: **`tests/dync_cross_runtime_tests.ts`** — always asserts pure-WASI
imports (runtime-free CI safe) and byte-diffs under any of wasmtime/wasmer/wazero present
(skip-if-absent).

