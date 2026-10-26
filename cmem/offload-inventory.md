# Offload inventory — what wasmtk does that a sibling could own (H11, 2026-09-28)

Answer to workspace letter **H11** (`../../cmem/handoffs.md`) and divergence row **I10**: the owner's
direction is "anything wasmtk can offload in the main program will ultimately be a benefit" and
"nothing moves before its trigger". **This is an inventory. Nothing has moved.**

Sources, all read 2026-09-28: a full survey of `main.ts` + `src/`, and the siblings' own memory
(binaryang `open-work.md` / `binaryen-ts.md`, wasmrt/wazmrt READMEs + `interop.md`, the
universalWasmLoader SPEC 3.0.0) plus workspace rows I2 / I10 / I11 / C1 / S4. Line counts are
`wc -l` on 2026-09-28. Sibling facts carry the date their source gave. Re-derive before acting.

## Where each sibling stands (the facts the triggers depend on)

- **2026-10-26: binaryang 2.2.0 is pinned**; stage 5 (one front end) is long released, so #1's
  trigger is met on our pin; `./ir` is public, but its binary reader / writer are not (see the
  2026-10-26 note below). The 2026-09-28 facts follow.
- **binaryang 1.6.0** (pinned here): assembler, disassembler, validator, objdump, strip, `wasm-opt`,
  and a pass runner, each on a published subpath. **One front end, stage 5: DONE on binaryang `main`
  2026-09-28, UNRELEASED**: one text front end, one reader, one writer. That is I2's trigger, and
  it counts for us only once it is in a version we can pin. **No module merge/link**: binaryen-ts's
  DESIGN row (`binaryen-ts.md` l.507) scopes `wasm-merge` → wasmtk, and I10 says it "may re-open".
  `allFeatures` is not exported (requested 2026-09-28). `./wasm-runtime` is a kernel cache, NOT a
  WASI host. `./wasm2ts` is a stub. `./ts2wasm` is reserved (I11).
- **wasmrt / wazmrt**: WASI preview 1 host, exception handling, `run`/`wasi`/`wast`/`wat` verbs, C
  ABIs (wazmrt ships a `deno_ffi.mjs` example). Exit contract: `proc_exit(n)` → `n & 0xff`; host
  failure and trap → 1. Both run the spec corpus with 0 skips (wasmrt 64,603 on 2026-09-19; wazmrt
  64,092 on 2026-09-21). **Neither is in wasmtk: V8 is.** Workspace goals decision 4: rsxtk and
  wasmtk get the runtime slot first; the winner is "smallest and fastest binary". Lockstep at 1.0.0.
- **universalWasmLoader SPEC 3.0.0** (`-js` is the reference): load `.wasm` plus an auto-detected
  `.wit`, and a canonical-ABI SUBSET (s32/s64/f32/f64/bool/string) "as produced by wasmtk". The WASI
  shim is optional in 3.0.0. Its fixtures are `wasmtk modc` outputs.

> **2026-10-06, binaryang letter: the owner DECIDED part of #1.** `wasmbundle` moves to binaryang
> as `wasm-bundle` (imported back via `./wasm-bundle`). It keeps one shared memory: multi-memory is
> ruled out because wazero fails it. Relocation is EXACT, from the tool-conventions `linking` /
> `reloc.*` sections. A module without them is refused, or range-relocated with a printed warning.
> Conflict policy, WASI dedup and `_start` move with it; `witgen` and the prompt stay ours. Our
> producer measurements are drafted in `scripts/binaryang-report.md` (see next-work.md).

> **2026-10-26, H11 measured: the `wasm-bundle` switch is BLOCKED on binaryang (one API ask) and
> on wasic (relocation marks).** binaryang 2.2.0's `wasmBundle` was run over the inputs of every
> wasmtk test that bundles (merge_layout's four, tool_rows' dual export, witgen's pair,
> `18_WasmImportMerge`): with `unmarked: 'guess'` every output is right; with its default `refuse`
> every input is refused (nothing we produce carries `linking` / `reloc.*`). It was right where
> ours was WRONG (sw139: two wasic libraries' arrays; fixed in ours). What stops the switch:
> (1) every pair of wasic modules clashes on `__heap_ptr`, `__exn_tag`, `__exn_kind`; prefixed,
> each keeps its own heap (a wasic heap grows upward from its pointer and grows memory only past
> `memory.size`, so in binaryang's per-image layout the first module's heap runs into the next
> image once it outgrows its pages) and its own tag (a library's throw no longer meets the
> program's catch, ld114). Sharing them is a wasmtk pass over binaryang's IR (as #2 below says),
> and the IR's read / write entry points (`readForPasses`, `writeWasm`) are not exported: the only
> routes today are `compat/binaryen`'s private `_inner` or regex over printed WAT, which is what
> this move retires. Asked in `scripts/binaryang-report.md` (DRAFT 2026-10-26, owner to send).
> (2) wasic needs a relocatable output: unoptimised, `(@reloc data)` on every data address (about
> 165 allocation sites in wasic + console_log), bundled first and `-Oz` after. Ours to build once
> (1) is answered. Probes: the session's scratch `h11_probe.ts` / `h11_heap_probe.ts` /
> `h11_trap.ts` (deleted; the method is in the report).

## Candidates

| # | wasmtk responsibility (size) | could move to | trigger | blocker / note |
| --- | --- | --- | --- | --- |
| **1** | **Regex-over-WAT merge**: `wasmmerge.ts` (957 lines, ~45 regex sites), wasic's post-merge fixups (~27 sites: import insertion, `_start` init call, memory raising, heap-ptr scrape/re-seat), `wasmbundle.ts`'s 2 | **binaryang's parser + IR**: parse once, rewrite the IR, write once. The merge LOGIC stays ours | 🔒 **I2, owner-set**: binaryang one-front-end stage 5 **in a published version we pin**. Met on their `main`; not yet released | Needs a stable public IR-edit API (today's `compat/wabt` is parse→encode only). This retires our "never require a bracketing you did not emit" invariant and the `readDebugNames:false` contract. Highest value: every backend text-format change has broken these regexes (wabt-ts 1.3.5→1.4.0→1.4.1, binaryang 1.6.0), and so has an OPTIMIZER change: binaryang 1.8.1→1.12.0 (2026-10-13) printed multi-value block types by index, `(block (type 17)`, which the merge left pointing at the program's type 17 (every dynrt bundle invalid), and inlined `$__malloc` away, so allocator unification (found by that function) silently failed. Fixed: block types spelled inline; the heap global found by a library's `__heap_ptr` export |
| **2** | **Module merging / static linking itself**: `mergeWasmWat` semantics (prefix mangling, WASI import dedupe, allocator unification, data relocation) + `runWasmBundle` (410 lines) | **binaryang `wasm-merge`** (Binaryen has one) | binaryang re-opens its DESIGN row (**owner decision**), AFTER #1 | wasmtk-specific semantics (unified `$__malloc`/`$__heap_ptr`, `memory.grow`/`call_indirect` guards) would stay a wasmtk pass over binaryang's IR even if generic merging moves |
| **3** | **WAT post-passes in wasic**: `internalizeDynrtHostImports`, `injectDynrtMarshalExports`, `fixTerminalFallthru` + a private WAT tokenizer/parser/serializer (`tokenizeWat`, `parseWatNodes`, `serializeWat`) | binaryang IR (as #1) | #1 | `fixTerminalFallthru` works around our own emitter. It belongs IN the emitter (H12 / `ts2wasm`), not in a text pass anyone owns. The private WAT parser is a 4th in-house WAT parser (I2 counts three) |
| **4** | **Validation before assembly** (none today), and the wast runner's validity oracle | binaryang `./wasm-validate` | `allFeatures` exported (requested 2026-09-28) | Unblocks 12 wast definitions V8 refuses for its limits. `compat/binaryen`'s `validate()` is a stub that returns 1: do not use it |
| **5** | **Assemble/optimise/inspect wrappers**: `watToOptimisedWasm` (`wasic.ts:202`), `binaryenOptimize`/`binaryenAsyncify` (`binaryen.ts`), `convertFile`, `getWasmBytes`, `showInfo` | already binaryang; could call its TOOL subpaths (`./wat2wasm`, `./tools/wasm-opt`, `./wasm2wat`, `./wasm-objdump`) instead of the `compat` shims | none: a thinning, not a move | Low value on its own. Worth doing WITH #1, when the `compat/*` pins are revisited anyway. `showInfo` ≈ `wasm-objdump -x` |
| **6** | **WASI preview-1 host + runner**: `wasiImports`, `runWasi`, `callExport` (`utils.ts`), exit-status handling | **wasmrt or wazmrt**: CLI `wasi` verb, or C ABI via Deno FFI | the owner's **runtime-slot** decision (goals 4), runtimes at 1.0.0 lockstep. 🔒 **NOT via our cross-engine gates (owner, 2026-09-28): wasmrt and wazmrt are NOT added to `engine_cross_check_tests` / `dync_cross_runtime_tests`. They run their own testing against our tests.** (That was the "cheapest foothold" from wazmrt's own vision; declined.) | wasmtk's `env` host imports (`console.log` UTF-16, `__host_print`, `__host_call`) need host-function registration, which means the FFI path, not the CLI. Exit codes are ALREADY aligned since 2026-09-28 (trap 1, `proc_exit(N)` → N), except that the runtimes mask `& 0xff` |
| **7** | **Loader generation**: `bindgen.ts` (652 lines), a static TS loader (WASI shim, `cabi_realloc` strings, `cabi_post`, `any` box/unbox via `dynrt_*`, per-runtime byte loading) | universalWasmLoader-js (runtime `.wit` loading) | **owner decision** (bindgen emits a thin wrapper over the loader, or stays generative), and SPEC growth to cover `any` boxing and `__host_call`/`__host_print` | Today the two duplicate the canonical-ABI marshalling in different forms. Workspace S4 wants loader fixtures regenerated from ONE `wasmtk modc` run: do that regardless |
| **8** | **The `.wast` runner** (`wast.ts`, 1,698 lines; SIMD/NaN/exnref trampoline, GC classifier, per-assertion verdict rules) + the vendored corpus (C2) | binaryang (the runner gates ITS assembler), or C1 convergence | **owner / C1** | It tests binaryang assembly + V8 execution; the runtimes run the corpus natively with 0 skips. 2026-09-28's work (100 runner-caused failures, 186 false passes) shows a runner is only as good as its verdict rules. Whoever owns it should inherit `compiler-bugs.md`'s two entries on it |

**Stays in wasmtk** (its role per workspace `projects.md`: orchestration, other-language
producers, the corpus, the loaders' fixtures):

- `rt.ts`, the Deno/Bun/Node host abstraction.
- The Go/Zig/Rust producers. Rust already delegates wholly to rsxtk.
- `.wit` GENERATION (wasmtk is the source of truth for its ABI).
- `main.ts` CLI plumbing.

**Moves with `wasic`, not to a sibling:** `tsbundler`, `jstyper`, `varscope`, `hybrid`, `dync`,
`modc`, and `console_log.ts`'s hand-written WAT stdlib. They follow I11 → `./ts2wasm`, under the H12
modularization. Their bar is owner-set (I11), and their scope is deliberately unwritten.

**Out of scope:** `wasm2js` (`npm:wasm2js`; binaryen-ts routes `wasm2js` → "the runtimes"). Only
the `wasm2js` verb uses it.

## Order, if the triggers land as expected

1. **#1** when binaryang ships stage 5. It is the only owner-set trigger that is nearly met, and
   the highest-value item. #3's text passes ride with it.
2. **#4** the moment `allFeatures` is exported (small).
3. ~~#6's foothold~~: **declined by the owner 2026-09-28.** The runtimes test against our tests on
   their side; wasmtk's gates do not add them. #6 waits only on the runtime-slot decision.
4. **#2, #6, #7, #8** wait on owner decisions. They are listed so each can become its own divergence
   row with a trigger (I10's instruction).

Found while taking this inventory, and fixed: `wasmbundle`'s optimise step swallowed failures
silently (`23cd614`), the same hole as the Go/Zig producers (`e97cbc4`).
