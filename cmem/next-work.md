# Next-work — the ONE list of what is open

Only open items, each pointing at its record (workspace `memory-conventions.md`: working memory,
not an archive; git is the archive). Completed work appears below only as dated summaries with
commits. **The full text this file held before 2026-09-30 (1,240 lines: every census, bump log,
branch audit and superseded plan):** `git show ab5d1273644:cmem/next-work.md`.

## Open now

> **2026-10-09, state.** binaryang shipped 1.9.0 (`./definitions`) and 1.10.0 (`wasm-bundle`,
> `(@reloc data)`); the owner ordered the open compiler bugs FIRST, then those items (§ "binaryang
> caught up" below). Five H12 batches merged locally today, each through the full gate:
> `a364547` (string conversions, sw06–sw09, sw19, sw28, sw50, ld24, ld25), `4f4e145` (`&&` / `||`
> operands, boxed parameters: sw48, sw49), `7e0fe0b` (closure result types: sw52, ld21), `a4f2171`
> (boxed f64 captures: sw53), `cd61fb9` (nullable fields carry a flag word, owner's option A:
> sw51, sw54–sw56, ld26). Suite 449/449. Nothing is pushed; nothing is half-done; `main` is
> clean. Then the wasm number types were scoped (wasm-number-types.md); its `Math` scan found
> sw57–sw61 and ld27–ld29 (and sw62, a console bug). Open silent-wrong: sw36, sw37 (the owner's
> division decision), the five `Math` rows and sw62.

- ⏳ **H6 (workspace letter, owner chose it 2026-09-30).** Done: H6.1 SemVer `2465ad0`, H6.2 the ★
  block `159e0df`, H6.3 the compatibility gate `4d7d8da` + reviewed exceptions `17e2054`, H6.4 the
  CLI surface `ab5d127` (rules: design-decisions.md § Semantic Versioning and § The compatibility
  gate). **Open:**
  - ✅ **H6.5a DONE 2026-09-30:** Rule 3, the previous release's `tests/` against the new `src/`,
    `scripts/check_prev_tests.ts` (fresh clone, v2.0.3's `tests/`, `--only` to re-run, red rows
    keep their failure lines). First run: **19 of 21 green**. Red, classified: `wast_tests` =
    IMPROVEMENT (5 files, all passes UP: `align` +4, `branch_hint` +1, `memory` +6, `memory_max`
    +1, `table` +3; binaryang 1.7.1/1.8.1 and the oracle); `bindgen_tests` = a PRE-EXISTING DEFECT
    the real repo hid behind a stale artifact (below). Neither raises the floor.
  - **H6.5b** consumers: the ten loaders' fixture suites and LeptonPad against the unpublished
    build, run in temp copies (write-never). Not started; needs the owner's go-ahead (other repos,
    several toolchains).
  - **H6.6** memory layout per `../cmem/memory-conventions.md`, with H4: in progress 2026-09-30
    (INDEX 21.4 → 9.4 KB, one line per file; this file 97.8 → 5.6 KB; the bump checklist moved to workflow.md; 14 references retargeted; the ★ stamp wording; H4 verified item by item, T7's one live count fixed).
    Bootstrap (INDEX + CLAUDE.md) is 14.5 KB against a ~10 KB guideline; the rest is the INDEX's
    policy section, which is the owner's to trim.
  - Rule 4 (deprecate before remove) and a CI repeat of the gate on the tagged commit: not built.
- ⏳ **Wasm types in TypeScript** (wasm-math-plan.md). The owner ruled (2026-09-30): the declared
  type decides; `i32 / i32` truncates; an explicit `f64` destination or a `Math` argument divides
  as floats. **Phase 1 DONE 2026-10-06** (sw38–sw40, ld15, ld04). Phase 2 (sw36, sw37), Phase 3
  (the `Math` additions) and Phase 4 (the user page) wait on the owner's decisions D1–D6. The
  owner, 2026-10-09: "the division question deserves more thought first". Offered, not started:
  measure each D1 option's effect on the corpus on a scratch branch before the decision.
  - **Scoped 2026-10-09: wasm-number-types.md.** The owner: `Math` cannot be made to follow the
    wasm types, so `Math` stays JavaScript's (Track M: every member exact against Deno; of 39
    functions, 23 identical today, 14 wrong: sw57–sw61, ld27–ld29, bugs, no decision; 2 unsupported:
    `f16round`, `sumPrecise`)
    and the wasm types are a TypeScript library with exact bodies (Track T: decisions T1–T6).
  - **Owner, 2026-10-09: build it as a COMPLETE library, f64 included**: namespaces `f64`, `f32`,
    `i32`, `i64` (+ `u32` / `u64` views), each function a TypeScript body exact to wasm plus a
    lowering; `Math.*` and `f64.*` share the V8-exact helpers. Order L1 (bodies + batteries) → L2
    (wasic lowering) → L3 (f64 parity, the Math bugs) → L4 (operator bugs). T1 decided: a wasmtk
    module `wasMath`; T6: traps are throws. **L1 DONE 2026-10-09** (`src/wasmath.ts`, export
    `./wasMath`, 151 functions exact to the real instructions, `tests/wasmath_tests.ts`).
    **NEXT: L2**, wasic lowering the calls.
- ⏳ **H12 compiler bugs** (compiler-bugs.md, the round-1 table): **6 open silent-wrong, 22 open
  loud** (2026-10-09: sw06–sw09, sw19, sw28, sw48, sw49, sw51–sw53 fixed; sw50, sw54–sw56, ld21,
  ld24–ld26 fixed with them; the Math scan found sw57–sw60, ld27–ld29).
  - Open silent: sw36, sw37 wait on the owner (division); sw57–sw61 and sw63 are `Math` bugs
    (Track M, no decision needed); sw62 is a console buffer bug (a long f64 line corrupts a later
    line); sw64 a bigint print (`-a` without `n`).
  - NEXT: the 19 loud rows, then Phase 0b audit round 2. The owner's order (2026-10-09): these
    compiler bugs BEFORE the binaryang 1.10.0 items below.
  - Nullable gaps left by sw51's option A (no corpus use; design-decisions.md § "Nullable FIELDS
    carry a flag word"): class-embedded tuple destructuring, union-variant / `Record` fields,
    nullable PARAMETERS (no flag), `p.x ??= v`.
- ⏳ **wast: 7 `(module definition …)`s V8 refuses for its own size caps** (`memory64` 1, `table`
  1, `table64` 1, `memory_max_i64` 4). A definition asserts only validity, so binaryang's
  `wasmValidate` ACCEPTING it can be the verdict; its soundness condition is the mirror of the
  existing guard: evidence that binaryang accepts no INVALID module (e.g. over every corpus
  `assert_invalid` module that decodes). The plain `memory64.wast` module
  `(module (memory i64 0 0x1_0000_0000_0000))` must instantiate: it stays an engine skip.
- ⏳ **The five `36_*` modules are not in `tests/engine_baseline.json`** (15 pairs, all `match`),
  since the Phase 36 restore (2026-09-28). A deliberate `--update-baseline`.
- ⏳ **`wasmbundle` does not route `importWat`** (compiler-bugs.md, the 2026-06-24 wasmmerge entry,
  re-verified open 2026-09-30): a non-WASI import in a bundled module is dropped. No test covers it.

## Planned

- **`wasic` modularization, Phases 1–3** (wasic-modularization-plan.md; letter H12): output-
  preserving, gated by golden-WAT and `wasic_seam_tests`.
- **Offload #1: our regex-over-WAT merging gives way to binaryang's parser** (offload-inventory.md;
  I2 / H11). Trigger: binaryang RELEASES its one-front-end stage 5 (not in 1.8.x).
- **The next release** (roadmap.md, the unreleased block since v2.0.3): the compatibility gate's
  floor since v2.0.3 is now **MAJOR** (re-measured 2026-10-09, `deno task api-surface --floor`),
  set by ONE symbol: `./console_log` `LogSegment`, whose four variants gained an OPTIONAL property
  (`console?` sw41, `strConv?` sw50). Every v2.0.3 value is still valid. **DECIDED (owner,
  2026-10-09): the next release is MAJOR** (3.0.0; no reviewed exception for `LogSegment`). The
  notes still name every behaviour change below. Everything else since v2.0.3 is minor (incl. the
  new `./wasMath` entrypoint); the Deno floor is
  written then (workflow.md, release step 2b). **The notes must name the BEHAVIOUR changes since
  v2.0.3** (the package surface is unchanged, but programs can print differently):
  - `e instanceof Error` is false for a thrown string or number, and `String(e)` follows what
    was thrown (sw44);
  - top-level code beside a `main` function now runs (sw46);
  - operators group as in JavaScript, and an `i32` mixed with a known float computes as a float
    (sw10–sw17);
  - `console.log(-0)` prints `-0` (sw41);
  - `Math.round` / `sign` / `hypot` match JavaScript exactly (wasm-math Phase 1);
  - an array in a template, concat or `String(...)` is its join; a bigint there drops its `n`;
    `Math.min` / `max` take every argument; `x ?? d` on a plain number is `x` (2026-10-09);
  - `a && b` / `a || b` give an operand, not a boolean (`x || 7` is 7), and a closure keeps its
    changes to a captured parameter (sw48, sw49);
  - a closure in a returned object returns its real type: a boolean prints `true`, an f64 keeps
    its fraction (sw52), and a closure keeps its changes to a captured f64 (sw53);
  - a `number | null` field or tuple element holding 0 is no longer null, a null one prints
    `null`, and nullable records are 4 bytes larger per such field (sw51, sw54–sw56).

  Whether any of these makes the release MAJOR is the owner's call.

- **Review WasmEdge's AOT shared-library output** (owner, 2026-09-30):
  https://github.com/WasmEdge/WasmEdge. How a wasm module becomes a native library through
  `wasmedge compile app.wasm app_aot.so` (`.so` / `.dylib` / `.dll` by extension), run as
  `wasmedge app_aot.so`. Its own docs say the output "is only for WasmEdge use and cannot be used
  by other WebAssembly runtimes", so the question is whether it yields a C library a host can link
  (exported symbols, ABI, whether the WasmEdge runtime must be linked beside it) or only a WasmEdge
  artifact, and what that means for wasmtk's "TypeScript as a DLL" goal (vision.md). Scoping
  only: not started.

## binaryang caught up (letter 2026-10-09)

> **Owner, 2026-10-09: the open COMPILER BUGS FIRST, then these items**, so the two do not get
> conflated (a pin bump moves every optimised binary; a bug fix must be judged on the old pin).

- **binaryang 1.9.0** published `./definitions` (H9: D1 instruction table, 582 entries; D2
  features; D3 trap vocabulary; each with `dataVersion` + `sha256`). **Our H10 is unblocked.**
  1.9.0 also rewrote the optimizer (output moves at every level, within 2% of upstream `-Oz`).
- **binaryang 1.10.0** published `wasm-bundle` (CLI + `…/tools/wasm-bundle`: `bundle()`,
  `wasmBundle()`) and the WAT annotation `(@reloc data)`.
  - The annotation goes before an `i32.const` (in a function or a global initializer), or before
    a data string, where it means every 4-byte word is an address. A mark elsewhere is a PARSE
    ERROR.
  - The bundler gives one memory, each input's whole image at its own base, and VERIFIES the
    relocations. An unmarked module with memory is refused, or range-relocated with
    `--unmarked=guess`.
  - It writes the `.wit` beside the output by default.
  - Caveats: each module keeps its own table, so a function pointer crossing modules is
    unsupported. A TinyGo-style heap that ends at `memory.size` must come LAST.
  - **Their ask:** once wasic marks its addresses, bundle `18_bundle`, `sharedheap_bundle` and
    `relocfix_bundle` through `wasm-bundle` and report what runs.
  - **Ours to do:**
    1. Bump the pin 1.8.1 → 1.10.0 (the optimizer changed, so the full gate).
    2. wasic emits `(@reloc data)` on every data address: strings, arrays, structs,
       string-array pointer words, `$__heap_ptr`'s initial value.
    3. Bundle the three projects UNOPTIMISED and report.
    4. Then retire `wasmbundle.ts` and its range relocation.
  - Our `witgen` check should accept binaryang's header line (`// Generated by binaryang from
    core wasm signatures`), or the log "not generated from core signatures" is false.

## Waiting on others

- **`wasm-bundle` (binaryang letter, 2026-10-06):** the owner decided `wasmbundle` moves to
  binaryang as `wasm-bundle`, which we import back (`./wasm-bundle`), with relocation done
  EXACTLY from the tool-conventions `linking` / `reloc.*` sections. They asked whether each
  producer can emit them. Measured 2026-10-06, reply SENT 2026-10-06 (`scripts/binaryang-report.md`):
  - Rust: yes, correct.
  - Zig: yes, via `build-obj` + `zig wasm-ld`.
  - TinyGo: its post-link `wasm-opt` leaves the relocations STALE; the `.o` + `wasm-ld` route
    works.
  - wasic: no; it needs a relocatable assembler from binaryang, and bundling before `-Oz`.

  The measurement scripts (`check_relocs.ts` and its friends) were scratch; their method is in
  the draft.
  - **binaryang reviewed the draft (2026-10-06): accurate, fine to send as is.** Their positions:
    - Bundle before optimising and verify first; this applies to binaryang too, whose reader and
      writer re-encode the 5-byte padded LEBs at relocation sites. So `wasm-bundle` ties each
      relocation to its instruction AS IT READS, and refuses stale relocations like missing
      ones. Our check is their starting test.
    - DWARF: their default is to DROP debug sections in a bundle, with a printed note; they will
      put it to the owner when building.
    - `linking` with no `reloc.CODE` means nothing to relocate: agreed.

    SENT 2026-10-06; binaryang's response is above. Nothing of ours is open on it; they build next.

- **H10** (generated opcode / feature tables) waits on **H9**: binaryang 1.8.1 exports no
  `./definitions`. Our exact request (D2 + D3 first, then D1; field lists; a pinned subpath) was
  SENT 2026-09-30, and is in `scripts/binaryang-report.md`.
- **H4 and H11** are answered here (H4 re-verified item by item 2026-09-30); the workspace closes
  them in `../cmem/handoffs.md`.
- **binaryang: nothing of ours is open.** Every report and reply is marked SENT in
  `scripts/binaryang-report.md` (last: 2026-09-30, the 1.8.1 skip count).

## Deferred (no consumer)

- **B6**, asyncify list-options ↔ binary-parse name retention (now binaryang's domain).
- **The P2 component container**: waits on browser-native WASI P2 / the Component Model.

## Completed — dated summaries (details in the files named)

- **2026-10-06 — operator precedence, grouping and typing** (compiler-bugs.md sw10–sw17), in wasic
  and the console path.
- **2026-10-06 — console `%`, escapes, boolean ternaries; closure state** (compiler-bugs.md sw20,
  sw24, sw25, sw32, ld02).
- **2026-10-06 — top-level code beside `main`** (compiler-bugs.md sw46, sw47): the top level runs
  as written; a function's `console.log` reads top-level arrays correctly.
- **2026-10-06 — the thrown kind** (compiler-bugs.md sw44; owner approved): `String(e)`, `${e}`,
  `instanceof` of a caught value follow what was thrown.
- **2026-10-06 — f32 in containers** (compiler-bugs.md sw43, ld18, sw45): f32 arrays and struct
  fields store, load and convert as f32; a for-of over an array parameter skips the header.
- **2026-10-06 — the Phase 1 finds** (compiler-bugs.md): `console.log(-0)` prints `-0` (sw41);
  console `String(x)` (ld16) and `String(<string>)` (sw42); `console.log` of an f32 (ld17).
- **2026-10-06 — wasm-math Phase 1** (wasm-math-plan.md; compiler-bugs.md): exact `Math.sign`,
  `Math.round`, n-ary `Math.hypot` (V8's algorithm, bit-identical) as shared helpers; every Math
  result at the declared type (ld15); console helper requests (ld04). Silent-wrong 23 → 21.
- **2026-09-30 — the wasm-types ruling and the Math scope** (`7142f68`): design-decisions.md,
  wasm-math-plan.md; sw36 narrowed, sw37–sw40 and ld15 found.
- **2026-09-30 — the `modc` / exit-code defect** found by H6.5a (compiler-bugs.md, FIXED):
  `modc` of a dynrt-merged library assembles again (`wasmmerge` resolves a copied import's
  `(type N)`); `modc`, `info`, `mod <file>` and `wasic x.js` exit 1 on failure (an exit sweep of
  every command); `bindgen_tests` can no longer grade a stale fixture (two had been, for five
  weeks). `compileModule` returns `boolean` (re-baselined, reviewed `minor`).

- **2026-09-30 — H6.1–H6.4** (above). The SemVer bump, the ★ block, the compatibility gate with
  reviewed exceptions (the floor since v2.0.3 is MINOR), the CLI surface. Self-test
  `scripts/check_compat_gate.ts` 15/15.
- **2026-09-30 — the binaryang 1.8.1 round ("THE ORDER")**: the five-engine check of
  `LowerCustomPageSizes` held on 1.8.1 (`8e73327`); `assert_trap` checks the trap KIND
  (`a31f929`, from 5,263 logged passes); pin 1.8.1 (`89cf8b0`; compat `toText` re-laid-out,
  tokens identical, 60 golden entries layout-only); the lowering wired into the wast gate, skips
  66 → 16 (`709a596`); reply SENT (`2e7db63`). design-decisions.md and testing.md hold the rules.
- **2026-09-29/30 — H12 fixes**: sw01 + sw33 (`a58a426`), sw02 (`d8f8e7b`), sw03 + sw34
  (`673d7e3`), the console fallback delegates or aborts: sw04 + sw27 fixed, 7 rows loud
  (`b4cebd6`); sw05 + sw35 found with it, sw21 (`cec1606`); sw18 + sw22 + sw23, loud rows (2026-09-30,
  `fix/h12-sw18-sw22-sw23`). Open silent-wrong 31 → 18, then 19 with sw36 found.
- **2026-09-29 — binaryang 1.7.1 and the validator oracle** (`230f45a`): wast 64,434 / 105 →
  64,473 / 66, the guard at 0 valid modules rejected.
- **2026-09-30 — stale-item sweep** (`02dcb7c`): every open marker re-checked against code or a
  test; three closed, one sharpened.
- Everything earlier (the binaryang 1.5.3 → 1.7.0 bumps, the false-pass audit, the wast census
  history, the EH migration, the runner fixes, the branch audit): `git show
  ab5d1273644:cmem/next-work.md`.
