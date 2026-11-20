# archive: roadmap.md — the per-release logs up to v3.0.0 (release.md indexes them)

Moved VERBATIM from `cmem/roadmap.md` on 2026-11-20 (letter H38, step 4): closed or
superseded, read by nobody unless the owner asks. Item IDs are kept, so a search for one finds it.

## Release status (2026-10-24) — v3.0.0: JavaScript's numbers, whole-object printing, binaryang 2.2.0

PUBLISHED 2026-10-24 (tag `v3.0.0`, CI run green, provenance recorded on JSR; the first release
from `synapticforge1/wasmtk`). The items
below were the unreleased block (2026-09-28 → 2026-10-15); after it, through 2026-10-24: the H12
loud rows and audit round 2 (compiler-bugs.md), owner rules 1–4 (sw95, sw87, ld88, sw119), ld45
(console.log of whole objects), binaryang 1.12.1 → 2.2.0, the API-surface gate with Rule 4 (H6),
and the wasi suite's per-step timeout. CHANGELOG.md § 3.0.0 is the user-facing summary.

### The unreleased block (on `main`, 2026-09-28 → 2026-10-15, after v2.0.3)

1. **The engine is named when it is the reason** (owner request). `src/engine.ts`: V8's terse
   refusals (custom page sizes: `invalid memory limits flags 0x8`; a memory64 above V8's 16 GiB cap;
   a flag-gated proposal) become one sentence naming the feature and the V8/Deno version, printed by
   `wasmtk run` / `mod` under the error and listed in the `wasmtk wast` summary. Not a breaking
   change: output only.
2. **wast: 24 false passes removed** (the same refusals had counted as `assert_invalid` verdicts);
   gate 64,434 / 0 / 105. `tests/engine_tests.ts` (11).
3. Two binaryang items found and handed over (next-work.md census (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`)): limits above u32 fail in the
   encoder; a branch hint on a non-branch is accepted. ✅ Closed 2026-09-29 by item 5.
4. **H12 sw01 + sw33 (2026-09-29):** `throw new TypeError(…)` / `throw 42` exited 0 with no catch
   run; now catchable, an uncaught one exits 1, and throwing an object is a compile error.
   `String(<bool>)` gave `"1"`. Tests `15_Throw*` (3). Open silent-wrong in the compiler 31 → 30.
5. **Backend → binaryang 1.7.1, and a second `assert_invalid` oracle (2026-09-29).** 1.7.1 encodes
   limits as u64 and rejects the invalid ones (our item 1). The wast runner now asks binaryang's
   `wasmValidate` where V8 cannot judge (it accepts, or refuses only for its own limit), counting a
   validation verdict only, and fails the gate if binaryang rejects any module the spec calls valid
   (0 of all). Gate **64,473 / 0 / 66** (was 64,434 / 105): all 11 reported skips pass, plus 28
   assertions V8 had left open.
6. **H12 sw02 (2026-09-29): string ternaries in `console.log`.** Template and concat branches lost
   their values, method-call and string-returning-call branches printed `0` or built an invalid
   module, nested ternaries grouped wrongly, and `select` ran both branches. Now `if`, first-`?`
   split, whole-branch build. `console_log.ts` gained its first error path
   (`setConsoleDiagnosticSink`). Found with it: sw34 (open). Test `7b_ConsoleStringTernary`.
7. **H12 sw03 + sw34 (2026-09-29).** A console ternary is decided before any operator split
   (`ok ? "pass" : "fail: " + msg` printed `passboom`), and `x instanceof Y` inside a console
   expression is resolved instead of stubbed to 0. Tests `7b_ConsoleTernaryBeforeOperators`,
   `15_ConsoleInstanceofCondition`. Open silent-wrong in the compiler 30 → 28.
8. **wast: `assert_trap` checks the trap kind (2026-09-30).** It passed on ANY trap; a trap of
   another kind now fails, naming both, and an unmapped message skips. The spec-to-V8 table was
   measured on the corpus (5,263 trap passes, all right, so the gate is unchanged at 64,473 / 0 /
   66). Found by the binaryang 1.8.0 lowering check. Test `tests/wast_runner_tests.ts`.
9. **Backend → binaryang 1.8.1 (2026-09-30).** No change in behaviour on our side: wasi 432/432,
   engine 1149 on baseline, wast 64,473 / 0 / 66. The printed WAT of modules read from binary is
   laid out one expression per line with `;; label` comments (binaryang 1.7.2); our merge paths
   read it unchanged. Brings `LowerCustomPageSizes` (used from item 10).
10. **The wast GATE runs custom-page-size modules on V8 (2026-09-30)** through binaryang's
    `LowerCustomPageSizes`, gate-only, when V8 refuses a module for that reason; never for validity
    assertions. wast 64,506 / 0 / 16 (skips 66 → 16); the 33 lowered passes are reported apart.
    The `wasmtk wast` CLI is unchanged (V8's own verdict).
11. **H12: the console fallback no longer prints a silent `0` (2026-09-30).** It delegates to
    wasic's `emitExpr`, else aborts naming the expression. sw04 and sw27 fixed; 7 rows turned
    loud. Open silent-wrong in the compiler 28 → 19. Test `7b_ConsoleExprFallback`.
12. **CLI failures exit non-zero; `modc` of dynrt-merged libraries works again (2026-09-30).**
    `wasmtk modc`, `info`, `mod <file>` and `wasic <non-.ts>` exited 0 on failure; `modc` of a
    library using `any` + `Function(…)` failed to assemble (the merged imports kept dynrt's own
    `(type N)`), hidden by that exit code and by `bindgen_tests` reading stale fixtures. Found by
    the Rule 3 check (H6.5a). `compileModule` now returns `boolean`.
13. **H12 sw05 + sw35 + sw21: calls inside `console.log` (2026-09-30).** A string argument
    that was not a plain variable or literal (`count(names[1])`) was passed as `""`; `f(a) + f(b)`
    was read as one call; `(a+1)*(a+2)` lost its outer parens. All three print the right value
    now, and a string argument nothing can build is a compile error. Open silent-wrong 19 → 18
    (sw35 was found and fixed in the same change). Test `7b_ConsoleStringCallArg`.
14. **H12 sw18 + sw22 + sw23: operators inside `console.log` (2026-09-30).** `n << 2`, `a ** 2`
    and `n * -2` were split at the wrong character (compile errors since that morning, wrong
    numbers before). Also fixed: `-n + m` was negated whole, and integer results where a float
    was expected built invalid modules. Open loud 20 → 17. Found: sw36, `i32 / i32` truncates;
    ruled by design the same day (the declared type decides), narrowed to the declared-`f64` case.
    Test `7b_ConsoleOperatorSplit`.
15. **wasm-math Phase 1: exact `Math` results (2026-10-06).** `Math.sign(NaN)` was 1;
    `Math.hypot` overflowed at 1e200 and read two arguments; `Math.round` was wrong at
    0.49999999999999994 and lost −0; `const x: i32 = Math.floor(y)` built an invalid module. All
    fixed (hypot bit-identical to V8), plus a console helper that was never emitted (ld04). Test
    `38_MathExactSemantics`. Phases 2–4 wait on the owner (wasm-math-plan.md).
16. **Console number printing (2026-10-06).** `console.log(-0)` prints `-0` (templates and
    `String(-0)` still `0`, as in JavaScript); `String(x)` works inside `console.log`;
    `String(s)` of a string no longer prints a pointer; an `f32` value prints. Test
    `7b_ConsoleNumberFormatting`. Found: f32 arrays and struct fields are broken (sw43, ld18), and
    `String(e)` of a caught value depends on an untracked thrown kind (sw44).
17. **f32 in arrays and structs; for-of over array parameters (2026-10-06).** An `f32[]` literal
    overran the next constant in memory and read back bit patterns; an `f32` struct field was read
    as an integer; no `f32` value was converted where an `f64` was expected. All fixed (sw43,
    ld18). Found and fixed with them: `for (const e of v)` over ANY array parameter read the
    array's header as elements (sw45: `[1, 2, 3]` summed to 7). Test `9_F32Containers`.
18. **A caught value knows what was thrown (2026-10-06, owner-approved design change).**
    `String(e)`, `${e}` and `"x" + e` give `TypeError: msg` for a thrown `TypeError` and the
    string itself for a thrown string; `e instanceof Error` is a run-time test, now FALSE for a
    thrown string (as in JavaScript; it used to be always true). Re-throws and awaited rejections
    keep the kind (sw44). Tests `15_ThrownKind`, `15_ThrownKindAsync`. Found: sw46.
19. **Top-level code beside a `main` function runs (2026-10-06).** Defining any function named
    `main` made the program run ONLY `main`: every other top-level statement was dropped, arrays
    declared at top level stayed uninitialised, and `main` ran even if never called (sw46). Also
    fixed: a function's `console.log` of a top-level array printed `0` (sw47). Test
    `56_TopLevelBesideMain`.
20. **Console `%`, escapes and boolean ternaries; closures that count (2026-10-06).** `-7 % 4`
    printed `1`; a float `%` would not build; `"C:\\tmp"` printed a tab; `n > 0 ? true : false`
    printed `1`; and a closure mutating its captured counter returned the same value on every
    call (sw20, ld02, sw24, sw25, sw32). Test `7b_ConsoleOperatorsAndClosures`. Found: sw48
    (a mutated captured PARAMETER still copies), ld20–ld22 (closure forms refused).
21. **Operator precedence, grouping and typing (2026-10-06).** `-x + 5`, `!a && b`, chained
    ternaries, `2 ** 3 + 1`, `a >> 2 << 1` and every other same-precedence chain now group as
    JavaScript does; `"h=" + (n >> 1)` prints `h=4`; `i + f` with a float operand is a float;
    `if (0.5)` is true and `if (NaN)` false. In wasic and inside `console.log` (sw10–sw17). Test
    `4_OperatorSemantics`. Found: sw49 (`&&` / `||` give a boolean, not an operand), ld23.
22. **Values converted to strings (2026-10-09).** An array in a template, concat or `String(...)`
    printed its address (`v=260`); now its join (`v=1,2,3`). A bigint there kept its `n`;
    `` `len=${s.length}` + "!" `` dropped the length; `s.includes(…)` printed `1`;
    `s.indexOf(String(n))` searched for `""`; `Math.max(a, b, c)` ignored `c`; `x ?? 5` on an
    i32 `0` gave `5`; a top-level array named bare in a function would not compile (sw06–sw09,
    sw19, sw28, sw50, ld24, ld25). Test `11_StringConversions`. Found: sw51 (a `T | null` tuple
    element's real `0` reads as null; needs a null flag in the tuple layout).
23. **`&&` / `||` give an operand; closures keep a mutated parameter (2026-10-09).** `x || 7`
    printed `true` (or, with a float, would not build); `!a && b` printed `true` where
    JavaScript prints `0`; conditions are unchanged, byte for byte. A closure mutating a captured
    parameter lost the change after each call (`101 102` for `101 103`). (sw48, sw49.) Tests
    `4_LogicalOperands`, `5h_CapturedParamMutation`. Found: sw52 (an object-literal arrow with a
    block body is typed i32: a boolean prints `1`, an f64 truncates).
24. **Closures in a returned object return their real type (2026-10-09).** A closure with no
    return annotation was typed as an integer, so `() => { on = !on; return on; }` printed
    `1 0` and an f64 result lost its fraction; and an object whose last value was an
    expression-bodied closure (`{ …, get: () => v }`) would not compile (sw52, ld21). Test
    `5h_ClosureResultTypes`. Split off, open: sw53 (a closure changing a captured f64 changes a
    copy).
25. **A closure keeps its changes to a captured f64 (2026-10-09).** `let s: f64 = 0.5` changed by
    `add: (x) => { s += x; return s; }` gave `1.75 1.75` for `1.75 3`; the same for an f64
    parameter, and two closures sharing one f64 would not build (sw53). Test
    `5h_CapturedFloatMutation`.
26. **Nullable fields carry a null flag (2026-10-09, owner's option A).** A `number | null` /
    `boolean | null` tuple element or interface / class field stored null as 0, so a real `0` read
    as null and a null read as `0`; it now has a flag word, like a nullable local. With it: a
    nullable local prints `null` in every position (it did only as console.log's single
    argument), `console.log(v === null)` reads the flag, and `f() ?? d` on a `T | null` function
    takes `d` (sw51, sw54–sw56, ld26). Test `24_NullableFields`.
27. ⚠️ **BREAKING: a plain integer `/` is a compile error (2026-10-09, owner).** Use wasMath's
    `i32.div` / `f64.div` (sw36, sw37 closed). README Breaking Changes row.
28. **wasMath L3 and L4 (2026-10-09, 2026-10-13).** `Math` correctly rounded in both runtimes
    ("CR, in both"; Payne–Hanek trig), JavaScript's edge cases (sw57–sw61, sw63); the bigint
    operators and the u64 printer (ld29–ld31, sw64). wasm-number-types.md.
29. ⚠️ **BREAKING: D3, a float stored into an integer is refused; D6, the located compile-error
    report (2026-10-13, owner).** `error[code]: …`, `--> file:line:col`, the source line and a
    `help:`. README Breaking Changes row (D3).
30. **Console output (2026-10-13).** A line over 128 bytes no longer corrupts memory (sw62);
    arrays print as Deno prints them, variables included, in its multi-line layout, typed arrays
    at their element width (sw66, sw67); a `console.log` whose argument prints no longer loses
    its line (sw68). ⚠️ `./console_log`'s `LogSegment` changed (README Breaking Changes row).
    Tests `7c_ConsoleLongLines`, `7d_ConsoleArrays`, `7e_ConsoleNestedLog`.
31. **Literal values and shadowed arrays (2026-10-13).** Array and struct literals hold their
    values (`NaN`, `Math.PI`, `0x10`, names, expressions were 0; sw69); a function's array named
    like a module array no longer replaces it (sw70). Tests `9_LiteralElementValues`,
    `9_LocalArrayShadowsModule`. No silent-wrong compiler row is open after it.
32. **Backend → binaryang 1.12.0 (2026-10-13; 1.11.0 skipped).** Its optimizer broke two merge
    assumptions, fixed (block types by index; `$__malloc` inlined — a wasic library now EXPORTS
    `__heap_ptr`, additive). **Then 1.12.1 (2026-10-15)**: TinyGo 0.43's nested goroutines run
    (binaryang's Asyncify fix); `go_asyncify` 12 / 12 (polyglot-producers.md).
33. **Additive API:** `./console_log` exports `arrInspectKind`, `consoleTempLocals`;
    `./tsbundler`'s `BundleResult.files` (D6).
34. **H12 loud rows, batch 1 (2026-10-15).** Programs that were refused now compile: string
    indexing, parenthesised operands, string comparisons and boolean equalities in console.log;
    `s + n + 1`, `x.toString()`; 2D arrays from a name, call or parameter; closures stored in a
    returned object by name; returned block arrows; tuples from a ternary; function-typed variables
    from a ternary. Two silent fixes: sw72 (a function-typed declaration emitted nothing), sw73 (a
    local array shadowing a top-level one zeroed it). No API change. README rows under 5e, 5f, 5h,
    6d, 7b, 11, 23. Tests `7f`, `7g`, `11c`, `6d_Array2DAliases`, `9_ArrayLiteralArgsAndTuples`,
    `5h_ClosureFieldsAndReturns`. **Batch 2:** whole string / boolean / bigint arrays print in
    console.log; top-level `Array<{ … }>` arrays work; a whole struct array, which printed its
    element addresses (sw74), is refused. `./console_log`'s `ArrayLookup` gained an optional
    `structTypeName` (additive). Tests `7h_ConsoleWholeArrays`, `9b_InlineStructArrays`.
35. **⚠️ BEHAVIOUR: a float string index is a compile error; out of range is `undefined`**
    (owner, 2026-10-15). A program that indexed a string with a `number` (often a
    `for (let i: number …)` counter) no longer compiles; README Breaking Changes row. sw71.

## Release status (2026-09-28) — v2.0.3: typed declarations, exit-code parity, binaryang 1.7.0

**Released from `main` 2026-09-28** (owner: "bump and publish", once binaryang 1.7.0 was gated).
**Verified on JSR:** `latest` = 2.0.3 (created 2026-09-29T02:34Z), provenance attested (rekor log
2992087896), package score **100** (every check true). Release commit `9fae954972b`, tag `v2.0.3`.
Version **2.0.3**, the ordinary counter step: the owner chose it over a round-number jump, since the
README's Breaking Changes table is where breakage is announced. **Two BREAKING changes** (items 6
and 11), both in that table under `2.0.3`. User-facing summary: `CHANGELOG.md`.

11. ⚠️ **BREAKING: every variable declaration states its type** (owner ruling; design-decisions.md).
    `src/decltypes.ts` shared by wasic and `hybrid --auto`; counting-`for` counters are integers;
    `tests/typed_decl_tests.ts`. Landing it fixed an i32-call-in-f64-context invalid module and an
    annotated 2D array that read as empty, and filed sw30–32 / ld09–14 (compiler-bugs.md).
12. **Phase 36 conditional types restored** from the never-merged `1.4.1` branch (branch audit,
    next-work.md (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`)), hardened so string literals are not rewritten.
13. **Backend → binaryang 1.7.0** (after 1.6.0, item 1). All five items of our report fixed; the
    wast gate scopes the custom-descriptors V8 flag to its proposal → 64,458 / 0 / 81.
14. **H12 Phase 0a/0b:** golden-WAT harness (483 entries) and audit round 1 (compiler-bugs.md).
    Open silent-wrong compiler bugs at release: **31** — the audit found them; the release fixes
    none of them yet (item 8's "0" was the count before the audit).

Items 1–10 below were the earlier unreleased block, carried into this release:

1. **Backend → binaryang 1.6.0.** One regression, ours: 1.6.0 honours `readDebugNames: true`, and
   four merge-path call sites asked for it. They now pass `false` (go_merge_tests 7/7).
2. **`.wast` runner: three defects behind all 100 pinned failures** (`ref.extern`/`ref.host` values,
   a BOM-eating decoder, `assert_trap` modules never instantiated) → **0 failures**.
3. **`.wast` runner: SIMD / NaN-payload trampoline** → skips 26,944 → 886. It exposed and fixed a
   subnormal hex-float underflow.
4. **`.wast` runner: `skipReasons`** labels every skip; the 886 left were SCOPED, and every runner-owned
   group was then fixed (script grammar, `either`, `assert_exception`, GC results, trap trampoline) →
   726, none of them ours; then `exnref` via the trampoline and the gate's experimental V8 flag → 618;
   then a false-pass audit demoted 186 passes that rested on the wrong failure → 63,800 / 804.
   See [next-work.md](next-work.md) (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`).
5. **Workspace letter H4** (memory drift T1–T11) closed in `cmem/`.
6. ⚠️ **BREAKING: `wasmtk run` exit status at parity with wasmtime.** An uncaught exception → 1,
   `proc_exit(N)` → N, and `run x.ts` propagates the program's exit code. It also closed the README's
   planned `os.Exit` row. The harness gained `@expect-exit`; the engine gate became exit-code aware,
   with a VANISHED check.
7. **Producer suites** `zig_tests` / `rust_tests`, and three silent `-Oz` failures made loud
   (Zig, Go leaf, `wasmbundle`; the 2026-08-24 "fix" had been dead code).
8. **Compiler:** numbers/booleans in string values no longer dropped; escaped-quote literals in
   call args and string enums; the core's in-class `rt.exit` removed. **Open silent-wrong compiler
   entries: 0** (H12 bar c).
9. **H11** offload inventory and **H12** seams (four layers, the seam gate, every bug classified).
   Phase 0 has not started.
10. **`.wit` auto-emission** for every optimised or WAT→WASM artifact (Go, Zig, `wasmbundle`,
    `convert`/`wasic` on `.wat`).

Gate on the release tip (Deno 2.9.7, binaryang 1.7.0): **wasi 426/426 · engine 1134 pairs on
baseline, 0 regressed · wast 288 files / 64,458 passed / 0 failed / 81 skipped (ALL CLEAN) ·
golden-WAT 483 / 0 diverged** · typed_decl 18/18 · hybrid 13 + guard 2 · seam 10/10 · witgen 23/23 ·
zig 20/20 · rust 10/10 · every other suite 0 failed. (Before items 11–14: wasi 421/421, wast
63,800 / 804.) Post-mortems in [compiler-bugs.md](compiler-bugs.md).

## Release status (2026-08-31) — v2.0.2: backend on binaryang 1.5.3, wider `.wast` coverage

**v2.0.2 is PUBLISHED to JSR and ATTESTED** — `rekorLogId 2666522017`, `createdAt 17:56:16.616` →
`updatedAt 17:56:21.068` (4.45s, the attested signature). Patch bump from v2.0.1, no breaking
changes, no API change. Tagged `v2.0.2` at `276028af1ed`.

What it carries:

1. **Backend `@jrmarcum/binaryang@1.5.3`**, both compat subpaths at one exact version. Fully gated —
   and **nothing moved from 1.5.2**, which is recorded plainly rather than implying a fix anyone was
   waiting on. No release note for 1.5.3 ever reached us, so this is measurement, not confirmation.
2. **`wasmtk wast` marshals `ref.null`** — **+123 assertions across 16 files, zero regressions**
   (`ref_null` 0 → 25, `table_fill64` 9 → 41, `table_fill` 9 → 25, `table_set` 11 → 21,
   `table_set64` 4 → 14, …). Corpus **37,247 → 37,370**. `ref.func` / `ref.extern N` still
   unsupported (host references have identity); heap types V8 cannot marshal are **skips, not
   failures**.
3. **Windows `os error 32` write race fixed** in `rt.writeFile` — five retries over ~1.2s for a
   sharing violation ONLY, everything else propagating on the first attempt. Affects every producer.
4. Internal: the `binaryen` import alias became **`binaryen-backend`**, `.gitattributes` rebuilt
   **wildcard-first**, and an `upstream/binaryang` co-development checkout with a structural guard
   (its build installs as `wasmtk-upstream` and can never be picked up by a gate).

Gate at release: **wasi 417/417 · engine 1128 ALL ON BASELINE · wast ON BASELINE, 288 files /
37,370**.

### ✅✅ PROVENANCE: TWO IN A ROW — it is holding

| version | `rekorLogId` | attested |
| --- | --- | --- |
| v1.11.2 | `2053916008` | yes |
| v1.11.3 → v2.0.0 | null | **no — twelve releases** |
| v2.0.1 | `2620232142` | yes |
| **v2.0.2** | **`2666522017`** | **yes** |

v2.0.1 was a data point; **v2.0.2 makes it a trend.** The cause is still UNKNOWN and must not be
credited to our cache-bust, which only changed how the answer is READ — the earlier absences were
themselves re-verified with cache-busted reads. Leading candidate remains that v2.0.1 was the first
release built on the merged `binaryang` rather than `wabt-ts` + `binaryen-ts`. Watch v2.0.3, but the
open question is now "why did it come back", not "is it broken".

## Release status (2026-08-27) — v2.0.1: standard EH, merged backend, a memory-corruption fix

**v2.0.1 is PUBLISHED to JSR.** Patch bump from v2.0.0, no breaking changes. Tagged `v2.0.1` and
pushed from `main` at `ac668811b55`; 30 commits shipped in one release.

**Backend: `@jrmarcum/binaryang@1.5.1` → `1.5.2`** — wabt-ts and binaryen-ts MERGED into one package
on 2026-08-27 (two compat subpaths, one exact version). See design-decisions.md.

What it carries, in the order a user would notice:

1. **Standard exception handling.** `try`/`catch`/`finally` now compiles to `try_table` /
   `catch_all_ref` / `throw_ref` instead of legacy opcodes Wasmtime and Wasmer refuse to load.
   Modules that throw were **V8-only** before. V8 and Wasmtime are now byte-identical, and **10
   modules that Wasmer rejected outright now load** (engine gate: wasmer match 353 → 363).
2. **Throwing modules are optimised again and smaller** — `15_Exceptions` **4534 → 1345 bytes** —
   after the upstream `-Oz` defect was fixed in binaryang 1.5.2 and re-verified by OUR gate.
3. **FIX: merged modules could corrupt their own memory and HANG.** Six regexes required wabt's
   folded `(i32.const N)`; 1.4.1 switched to unfolded, they silently matched nothing, static-data
   relocation was disabled wholesale and `$__heap_ptr` was seated INSIDE static data. Symptom was an
   infinite loop, not a crash. Affects `wasmbundle` and `.wasm` imports.
4. **Spec-runner coverage: 27,983 → 37,247 passing assertions**, mostly modules that previously could
   not be assembled at all. A full 288-file corpus directory run now completes in one process.

Gate at release: **wasi 417/417 · wast ON BASELINE (288 files / 37,247) · engine ALL ON BASELINE**
after a deliberate re-record (`0 regressed, 10 improved`).

✅ **PROVENANCE IS BACK — v2.0.1 is ATTESTED (`rekorLogId 2620232142`), verified 2026-08-27.**
`updatedAt` 4.6s after `createdAt`; JSR package score **100**. This ends **twelve releases** without
provenance (v1.11.3 → v2.0.0). **Cause unknown — do not credit the cache-bust**, which only changed
how the answer is read; the leading candidate is that v2.0.1 is the first release built on the merged
`binaryang`. Watch v2.0.2 before calling it fixed. See design-decisions.md.

## Release status (2026-07-30) — v2.0.0: Phase 34 inline predicate targets + `./utils` slimmed

**v2.0.0 is PUBLISHED to JSR** (`@jrmarcum/wasmtk@2.0.0` is `latest`) — merged to `main` from
`fix/phase34-inline-predicate-target-2026-07-30` (commits `1bafc6f` → `6f701bf`, six commits) via
`--ff-only`; branch deleted local + remote. Backend unchanged (wabt-ts 1.3.5 + binaryen-ts 1.4.3).
The two sections below are the batches this release carries; they were working-tree entries and are
promoted here on release. JSR now reports `percentageDocumentedSymbols: 1` (**100%**, up from
0.98039216) and `allEntrypointsDocs: true`.

**FIRST BREAKING RELEASE.** `./utils` no longer re-exports `compileWasi` / `compileModule` — see the
Phase 34 section below and the README's `### ⚠️ Breaking Changes` table. Version chosen as `2.0.0`
deliberately, to make the break legible; versions remain a sequential counter with no semver meaning.

Full regression gate, run twice (once for the compiler fix, once after the fmt reflow touched
`wasic.ts` + `console_log.ts`): wasi **417/417**, wast 41 files / 12444 assertions / 0 failed, and
every other suite 0 failures. `deno doc --lint` clean across 16 entrypoints, documented symbols
**100/100**, `deno publish --dry-run` Success on BOTH the local Deno (2.9.4) and the pinned CI Deno
(2.9.1).

**Provenance — the experiment RAN and came back negative.** v2.0.0 was published with
`deno-version` pinned to `v2.9.1` (the last Deno that ever produced an attested release) to test the
Deno-version hypothesis. **It published unattested anyway** (`rekorLogId` null), so the clean
2.9.1/2.9.2 correlation was coincidental and **Deno is ruled out**. The pin was reverted to floating
`v2.x` in `dc1cea2` right after. Elimination list and remaining suspects in
[design-decisions.md](design-decisions.md).

**The verification step earned its place:** the v2.0.0 run shows `Publish to JSR → success` and
`Verify provenance was recorded on JSR → failure`. This is the **first release that reports its own
missing provenance** instead of passing silently — so **expect the v2.0.0 Actions run to be red**;
that is the gate working, not a publish failure. The package published fine.

## Repo hygiene shipped in v2.0.0 — fmt-clean + LF pinned

`main.ts` + `src/` are `deno fmt --check` clean again (was 8 of 21 files failing), and **the fix is
stable across checkouts** — the previous attempts kept going stale because `deno fmt` emits LF while
`core.autocrlf=true` hands out CRLF on every checkout. A `.gitattributes` with `*.ts text eol=lf`
settles it; the blobs were already LF, so no history changed. `src/wasm/` (two `AUTO-GENERATED` byte
arrays) is now excluded via `deno.json` → `fmt.exclude`. Real content drift was fixed in
`bindgen.ts` (40 lines), `hybrid.ts` (16), `wasic.ts` (6), `console_log.ts` (5), `wast.ts` (4). 130
worktree `.ts` files were converted CRLF→LF with **zero** content change. Full gate re-run, since
`wasic.ts`/`console_log.ts` are the compiler. Detail in
[design-decisions.md](design-decisions.md).

## Phase 34 batch shipped in v2.0.0 — type predicates, inline object-type targets

Branch `fix/phase34-inline-predicate-target-2026-07-30`, cut from `main` **after** test 3 failed,
per the branch-only-for-a-fix rule. Merged `--ff-only` and released as v2.0.0.

3 owner Phase 34 type-predicate stress tests. **Tests 1 and 2 passed as written** —
`34_TypePredicateBasicNarrowing` (a `s is Circle` guard used both as a boolean value and as an
if-condition over a base-typed reference) and `34_TypePredicateElseIfChains` (two sibling predicates
in an if/else-if chain inside a helper, each narrowing the same parameter to a different derived
interface). **Test 3 failed to compile**: `34_DiscUnionPredicateInlineTarget` writes the target as
an INLINE object type (`g is { type: "sphere"; r: f64 }`), which the function-header
return-annotation regex did not admit, so the predicate function was never parsed and the call died
with the misleading `Unknown function 'isSphere' — not declared in this module`.

Fixing the regex exposed a **second bug underneath it**: an inline target matches no registered type
name, so narrowing was silently skipped. Harmless for a DU (the Phase 32 flat super-struct already
holds every variant field), but over an interface hierarchy `s.radius` compiled clean and printed
`0` where native TS printed `5`. `resolveInlineStructTarget` now matches the inline shape to a
declared type structurally, and an unresolvable target whose fields the variable's own type lacks
aborts the compile instead of reading garbage. Post-mortem in
[compiler-bugs.md](compiler-bugs.md) § "Phase 34 inline predicate target".

+2 regressions (`34_InlinePredicateTargetNarrowing`, `34_InlinePredicateUnresolvable`
`@expect-fail: compile`). Suite **412 → 417**; phase filter `"^34_"` 9/9. Full gate run, since
`src/wasic.ts` changed.

### ⚠️ BREAKING (unreleased, same branch): `./utils` no longer re-exports the two compilers

`src/utils.ts` had re-exported `compileWasi` (from `wasic.ts`) and `compileModule` (from `modc.ts`)
since before the `src/` restructure, so `main.ts` could import every command from one site. Because
`deno.json` publishes **every** module as a JSR entrypoint, that internal barrel republished the two
declarations as public API — and `deno doc` documents a declaration only ONCE per run, so the second
copy rendered undocumented on jsr.io (`percentageDocumentedSymbols` 100/102).

Removed rather than worked around: `main.ts` now imports them from `./src/wasic.ts` / `./src/modc.ts`
directly (the pattern it already used for `compileDyn`). Documented symbols **100/100** — note the
denominator fell 102 → 100, i.e. the duplicate is gone, not papered over. Full rationale and the
rejected wrapper approach are in
[design-decisions.md](design-decisions.md) § JSR doc coverage.

**Blast radius:** the two functions are otherwise untouched (same names, same `(path, outPath?)`
signatures, same behaviour) and still exported from `./wasic` / `./modc`, which is where the README's
Programmatic API table has always documented them. `wasmtk/utils` appears **0 times** in the README,
and JSR reports **0 dependents**. `./utils` remains a published entrypoint and keeps `VERSION`,
`runWasi`, `callExport`, `showInfo`, `wasm2js`, `convertFile`, `bundleTs`.

**Version DECIDED by the owner 2026-07-30: `2.0.0`** (up from 1.11.12). Versions are a sequential
counter, **not** a semver compatibility signal — but this number was **deliberately advanced to a
round value to mark the breaking change**, so a user seeing `2.0.0` has an obvious prompt to go read
why. The owner may do the same for future breaking changes; it is a discretionary choice, not an
automatic rule (full statement in design-decisions.md § versions carry no compatibility meaning; SUPERSEDED 2026-09-30 by plain SemVer, H6: see design-decisions.md § Semantic Versioning).

Because a round number can ALSO arise from an ordinary carry, the number cannot distinguish the two
cases on its own — which is exactly why the README's `### ⚠️ Breaking Changes` table was created:
**it tells users what just happened and why.** Every deliberate jump like this one must carry a row
there. `deno.json`, `package.json` and `src/utils.ts VERSION` are at 2.0.0 and the table names it.
The CHANGELOG entry still needs writing at release time and should lead with the migration line.

## Release status (2026-07-30) — v1.11.12: intersection base-typed parameters

**v1.11.12 — merged to `main` from `fix/phase33-intersection-base-prefix-2026-07-30` (commits
`9aa9abb` + `de17d6d`) and published to JSR.** Backend unchanged (wabt-ts 1.3.5 + binaryen-ts
1.4.3). Pre-publish gate: `deno publish --dry-run` clean, `deno doc --lint` clean across all 16 JSR
entrypoints. Full regression gate: wasi **412/412**, wast 41 files / 12444 assertions / 0 failed,
every other suite 0 failures.

3 owner Phase 33 intersection stress tests, **all three passing as written** (every printed value
matched the owner's inline `// Expected:` annotations): `33_IntersectionMixedTypeMerge` (flat merge
of an f64-first and an i32-second interface, read back through an exported function),
`33_ChainedIntersectionIntDivide` (three-way `A & B & C` chain as a function parameter + integer
divide over two merged fields), `33_IntersectionBasePointerParam` (an intersection value passed to a
function typed with one of its CONSTITUENT interfaces). Suite **407 → 410**; phase filter `"^33_"`
7/7. Committed straight to `main` — no `src/` change, so no full-suite run.

**A follow-up probe on test 3's mechanic then found a real bug**: base-pointer passing is only sound
when the base interface is the intersection's FIRST constituent. Reversing the declaration to
`type Sprite = Renderable & Transform` made `getScaleArea(hero)` print `1.6` instead of `6` — silent
wrong output, no error. Post-mortem + fix in [compiler-bugs.md](compiler-bugs.md) § "Phase 33
intersection base-prefix"; the invariant it protects is in
[design-decisions.md](design-decisions.md) § "A struct parameter's layout must be a PREFIX of the
argument's".

The fix (branch `fix/phase33-intersection-base-prefix-2026-07-30`, cut from `main` after the tests
landed, per the branch-only-for-a-fix rule): `checkStructArgLayouts` rejects a layout-incompatible
struct argument at all three call-emission sites — the two in `wasic.ts` plus `console_log.ts` via
the injected `setStructArgLayoutChecker`, since a call nested in a `console.log` argument never
reaches `wasic.ts`'s emitters. +2 regressions (`33_IntersectionBasePrefixGuard`
`@expect-fail: compile`, `33_IntersectionPrefixOk`). Suite **410 → 412**. Full gate run, since
`src/wasic.ts` + `src/console_log.ts` changed.

## Release status (2026-07-30) — v1.11.11: discriminated-union shared variant fields

**v1.11.11 — merged to `main` from `test/phase19-union-stress-2026-07-30` (commits `c6f0aa9` +
`917d274`) and published to JSR.** Backend unchanged (wabt-ts 1.3.5 + binaryen-ts 1.4.3).
Pre-publish gate: `deno publish --dry-run` clean, `deno doc --lint` clean across all 16 JSR
entrypoints. Full regression gate: wasi **407/407**, wast 41 files / 12444 assertions / 0 failed,
every other suite 0 failures.

This release carries TWO batches: the Phase 19 union fix below, and the Phase 31 TypedArray tests
(clean, no `src/` change) whose branch was deleted — see the section after it.

3 owner Phase 19 discriminated-union stress tests: `19_DiscUnionSuperStructLayout` (super-struct
layout + `if` narrowing across three variants), `19_SwitchCaseVariantDispatch` (`switch` on the
discriminant, including a payload-free variant), `19_ElseIfNarrowingFieldCast` (chained `else if`
narrowing + `as f64` on a narrowed field). Tests 1 and 2 passed as written.

**FIXED — a field name shared by two variants took the FIRST variant's type.** The super-struct
builder skipped any field name it had already seen, so
`{type:"intVal"; val: i32} | {type:"floatVal"; val: f64}` laid `val` out as a 4-byte i32: `25.5`
was written into the data segment as the i32 `25`, and the narrowed `floatVal` read emitted
`i32.load` inside an `(result f64)` function — invalid WASM, rejected at instantiate. Shared fields
are now resolved and numerically widened (i32/f32 → f64, i32 → i64), which is what the source
language already means, since `i32`/`f64` are both `number` aliases. A non-widenable collision
(`string` vs `f64`) now throws from the parser naming the union, the field and both types, instead
of surfacing as `Offset is outside the bounds of the DataView`. The two duplicated layout loops were
collapsed onto one helper, which also gave inline-block unions the `structType` propagation only the
named-variant loop had. Regression `19_UnionSharedFieldWidening` pins the fix plus three guards
(same-type sharing, a field after the widened slot, reversed declaration order).

Suite **403 → 407**; phase filter `"^19_"` 7/7. Full gate run (a `src/wasic.ts` file changed): wasi
**407/407**, wast 41 files / 12444 / 0 failed, every other suite 0 failures.

Also corrected in memory: `hybrid_tests.ts` and `wasmmerge_guard_tests.ts` are `Deno.test`-based, so
the documented `deno run` invocation executed nothing and exited 0; and the Go suites race each
other, not just the wasi suite.

### Shipped in v1.11.11 too — Phase 31 TypedArray tests (branch deleted)

3 owner Phase 31 TypedArray stress tests, **all passing as written — the first batch of the series
to surface no bug**: `31_TypedArraySubWordAccess` (Uint8/Int16 widths, `.length` vs `.byteLength`,
negative-Int16 sign extension), `31_TypedArrayLiteralInitializer` (`new Float64Array([...])`,
`byteLength === 24`), `31_TypedArrayFillAndSet` (`.fill(v, start, end)` exclusive end, `.set(src,
offset)`). Suite **400 → 403**; phase filter `"^31_"` 7/7.

No `src/` change, so **no full-suite run** — that corollary to the regression gate was set by owner
directive during this batch and is now recorded in INDEX.md, testing.md, workflow.md and CLAUDE.md.
**No README row**: nothing user-facing changed (a passing stress test documents no new capability).

**Branch deleted 2026-07-30.** `test/phase31-typedarray-stress-2026-07-30` was never pushed and
never needed to exist — a batch with no `src/` fix has nothing to isolate. Its commit `67048f3bafa`
is an ancestor of the Phase 19 branch, so the three tests reached `main` with that merge and shipped
in v1.11.11. The rule this produced is at the top of [workflow.md](workflow.md): **branch only when
a test fails and needs a fix.**

## Release status (2026-07-30) — v1.11.10: namespace members

**v1.11.10 — merged to `main` from `test/phase30-stress-2026-07-29` (commits `bd58beb` + `43f20a4`)
and published to JSR.** Backend unchanged (wabt-ts 1.3.5 + binaryen-ts 1.4.3). Pre-publish gate:
`deno publish --dry-run` clean, `deno doc --lint` clean across all 16 JSR entrypoints. Full
regression gate: wasi **400/400**, wast 41 files / 12444 assertions / 0 failed, every other suite
0 failures.

3 owner Phase 30 stress tests (namespaces / interface inheritance / shorthand properties) + 2
regression tests. Tests 2 and 3 passed as-written.

**FIXED — namespace member references weren't rewritten inside the body.** `expandNamespaces`
renamed the DECLARATIONS (`export const GRAVITY` → `PhysicsEngine_GRAVITY`) but left the body's
bare `GRAVITY` pointing at a name that no longer existed, so `return mass * GRAVITY` aborted. It
survived this long because every existing Phase 30 test qualifies its namespace constants from
OUTSIDE (`MathUtils.PI`) — none read one from inside a namespace function. Regression
`30_NamespaceInternalRefs` also pins the three guards (string literals, `obj.NAME` property access,
already-prefixed tokens).

**ALSO FIXED — string members in a namespace.** Pre-existing (verified on a clean tree with the
first fix stashed): `export const NAME: string` read as `0` and a string-returning namespace
function failed to instantiate, because each QUALIFIED use was resolved ad hoc (a numeric-constant
branch, a dot-call branch) and neither knew the string ptr/len ABI. Rather than add a third special
case, `expandNamespaces` now also rewrites `Ns.member` → `Ns_member`, so a namespace member is an
ORDINARY top-level symbol and every existing path handles it. Regression
`30_NamespaceStringMembers`.

Suite **395 → 400/400**; wast 12444/0; every other suite 0 failures.

## Release status (2026-07-29) — v1.11.9: operator-precedence fix

**v1.11.9 — merged to `main` from `test/phase29-stress-2026-07-29` (commit `688eb97`) and published
to JSR.** Backend unchanged (wabt-ts 1.3.5 + binaryen-ts 1.4.3). Pre-publish gate: `deno publish
--dry-run` clean, `deno doc --lint` clean across all 16 JSR entrypoints. Full regression gate: wasi
**395/395**, wast 41 files / 12444 assertions / 0 failed, every other suite 0 failures.

**This release is worth upgrading to promptly** — the headline fix changes the VALUE of ordinary
arithmetic that previously compiled and ran without any diagnostic.

3 owner Phase 29 stress tests (static fields / getters+setters / string enums) + 1 regression test.
Test 1 passed; the other two each exposed genuine bugs — **including the most consequential one of
the whole stress-test series**:

- **`*`, `/`, `%` were parsed RIGHT-associatively.** `a * b / c` became `a * (b / c)`, so
  `180 * 5 / 9` gave **0** instead of 100 and `180 * 5 % 9` gave **900** instead of 0. It surfaced
  only because a Fahrenheit→Celsius setter used `(f - 32) * 5 / 9`; nothing about classes was
  involved. Fixed in BOTH binary-op loops (`emitExpr` + `exprToWat`) — fixing one alone left
  `console.log` emitting mixed `i32.mul`/`f64.rem`.
- **Pure string enums had no usable value form** — only heterogeneous enums got synthetic tags, so
  `const a: LogLevel = LogLevel.Error` and `a === LogLevel.Error` aborted. Now tagged, plus a
  runtime `$__enum_str_<Enum>` ladder so printing a string-enum VARIABLE shows its text, not the tag.
- **Literal-led / paren-led arithmetic in `console.log`** (`1 + n`, `(n + 0) * 5`) emitted f64 ops
  over i32 operands and failed to instantiate — PRE-EXISTING, found while writing the regression
  test. Fixed in both the segment-kind and operand-type decisions.

Suite **391 → 395/395**; wast 12444/0; every other suite 0 failures. Post-mortems in
[compiler-bugs.md](compiler-bugs.md); three new invariant sections in
[design-decisions.md](design-decisions.md).

## Release status (2026-07-28) — v1.11.8: stress-test bug-fix release

**v1.11.8 — 10 compiler fixes, 16 new tests, published from the
`fix/stress-test-batch-2026-07-28` work.** The whole release came out of owner-supplied stress
tests across Phases 22/24/25/26/27/28: 14 stress programs + 2 regression tests, of which **8 stress
programs exposed genuine compiler bugs**. Backend unchanged (wabt-ts 1.3.5 + binaryen-ts 1.4.3).

Pre-publish gate: `deno publish --dry-run` clean; **`deno doc --lint` clean across all 16 JSR
entrypoints** — this required documenting `scaffoldZigProject` (`src/zigwasic.ts`), a PRE-EXISTING
missing-JSDoc that would have dropped the score below 100, the same failure mode that made v1.11.4
score 94. Full regression gate: wasi **391/391**, wast 41 files / 12444 assertions / 0 failed, and
bindgen, bundle 4/4, merge, go_merge, both dync, mod, varscope, wasmmerge_guard, hybrid, jstyper,
go_bindgen, go_asyncify all 0 failures.

Commits: `dfae6f1` (stress batch, 6 fixes) → `4feeabb` (StructImport) → `e53acfc` (Phase 27 string
parity) → `e80702d` (regression-gate policy) → `a3f5bd1` (memory consolidation) → `0a539ab`
(Phase 28 join + bracket-concat) → v1.11.8 bump.

**The 10 fixes:** `as`-cast source type for `**`/`Math.*`; `T | null` tuple/struct returns;
`$__nullable_ret_flag` declaration; `??` in console.log args; nullable MODULE globals (new
capability); nested `for…of` cursor aliasing; PascalCase struct-type gate (fixed `bundle_tests`
StructImport, the last standing red suite); Phase 27 `emitStringPtrLen` method parity;
`arr.join()` as a string value; console.log concat broken by `]`/`)` inside a literal.

14 owner-supplied stress tests across Phases 22/24/25/26/27/28 plus 2 regression tests. **10 genuine
compiler bugs found and fixed** in `src/wasic.ts` + `src/console_log.ts`. Suite **375 → 391/391**,
zero regressions — and **every other suite in the repo is green too**, including `bundle_tests`
(4/4) for the first time and `wast_tests` (12444 assertions, 0 failed). Full roster in
[testing.md](testing.md).

New capability: **nullable module-level globals** (`let g: T | null` at module scope, with `g ??= v`
from inside a function) — previously a hard *unsupported statement* abort. Fixes: `expr as T` no
longer mis-types `**`/`Math.*` sources (this also repaired the common `Math.floor(x) as i32`
idiom); nested `for…of` no longer shares one cursor (a 3×2 matrix summed to 3 instead of 21); `??`
now works inside `console.log` args; `T | null` functions can return tuple/struct literals;
`$__nullable_ret_flag` is declared whenever it is referenced. Full post-mortems (including a
self-inflicted mid-fix regression and its root cause) in
[compiler-bugs.md](compiler-bugs.md) § "Stress-test batch (2026-07-28)"; the new
must-not-revert invariants are in [design-decisions.md](design-decisions.md) § "Nullable (`T |
null`) + cast invariants".

**`bundle_tests.ts` `StructImport` — the one long-standing red suite — is now FIXED (2026-07-28).**
It was pre-existing (verified on a clean tree), then researched and fixed in this same working
tree: struct-type annotations were gated on PascalCase spelling, so every `tsbundler`-mangled
imported type (`Vec2` in `vec.ts` → `vec_Vec2`) was rejected and multi-file struct imports could
not compile. Now gated on the `structDefs`/`classDefs` registry. Regression
`12_LowercaseStructTypeName`.

**Phase 27 string-method parity gap FIXED (2026-07-28).** Three more owner stress tests (string
`split` + `for…of`, trim/pad/replace, charCode/startsWith/endsWith) — two passed as-written; the
third exposed that `emitStringPtrLen` implemented only a SUBSET of the Phase 27 methods that
`emitStringAssign` had. `trim`/`charAt`/`repeat`/`replace`/`replaceAll` worked when assigned to a
variable and **silently emitted `0`** used inline (`console.log(s.repeat(3))` → `0`); string-literal
receivers failed the same way for `slice`/`.at`/case. Fixed by one generic handler that resolves the
receiver recursively (the existing `padStart` pattern) plus a `stringReceiverParts()` helper for the
cases needing ptr/len separately. No new WAT runtime — every helper already returned multi-value.
Post-mortem in [compiler-bugs.md](compiler-bugs.md); the parity invariant is now recorded in
[design-decisions.md](design-decisions.md) § "String methods: `emitStringPtrLen` must stay at PARITY
with `emitStringAssign`".

**Phase 28 `join` + console.log bracket-concat FIXED (2026-07-28).** Three Phase 28 array-method
stress tests; two passed as-written. `28_ArrayJoin` showed `join` had **no string value** — it lived
only in `console_log.ts` as a scratch-buffer `joinarr` segment, so `const s: string = arr.join("-")`
aborted. Fixed with `$__dynarr_join_str_i32`/`_f64` wrappers over the existing scratch writer plus a
handler in `emitStringPtrLen` (which `emitStringAssign` falls back through, so assignment, concat
and comparison were all fixed at one site). Testing that surfaced a **second, unrelated** bug:
`console_log.ts`'s `findTopLevelOp` counted `()`/`[]` without skipping string literals, so a closing
`]`/`)` inside a literal hid the top-level `+` and `console.log(w + "]")` silently printed `0` — the
same bug class already fixed on the wasic side but never mirrored into console_log. Regression
`27_ConsoleLogBracketConcat`; post-mortems in [compiler-bugs.md](compiler-bugs.md).

**Process decision — regression-gate policy (owner, 2026-07-28).** When a bug is found/fixed, run
the ENTIRE suite set **including `wast_tests`**; skip a suite only when the change is provably
outside its reach, justified from the impact map in [testing.md](testing.md) § "Which suites to run
for a given change". Grepping each runner corrected two intuitive-but-wrong assumptions:
`go_merge_tests` is **not** a Go-only outlier (it compiles a TypeScript driver with `wasic`), and
both `dync_*` suites are wasic-dependent (`src/dync.ts` imports `compileWasiTs`). Genuine outliers
for a pure-wasic change are `hybrid_tests`, `jstyper_tests`, `wast_tests`, `varscope_tests`,
`wasmmerge_guard_tests`, `mod_tests`, `go_bindgen_tests`, `go_asyncify_tests` — each with its own
separate trigger, so "outlier" is relative to which FILE changed, never absolute.

## Release status (2026-07-28) — v1.11.7 (JSR score 100)

> Latest: **v1.11.7** (producer/dync/README pass — see "### v1.11.7 (2026-07-28)" below). The
> v1.11.5 detail that follows is retained as history.

**v1.11.5 released to JSR** (score 100). On backend **wabt-ts 1.3.5 + binaryen-ts 1.4.3**.
Regression gate green: wasi **375/375**, `go_merge` 7/7, `go_bindgen` 7/7, **`go_asyncify` 12/12**
(now incl. `nested`), `hybrid` 10/10. The "B-items" backlog from `next-work.md` (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`) (B3/B4/B5) is done;
B6 stays deferred (no consumer). (v1.11.4 shipped the same code but scored 94 — `src/wast.ts` lacked
an `@module` tag so JSR's `allEntrypointsDocs` was false; v1.11.5 added it, restoring 100. JSR
provenance is absent since ≥v1.11.3 — a GitHub org OIDC-policy infra issue, not a code fix; see
next-work.md (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`) "Published state".)

### v1.11.7 (2026-07-28) — producer/dync/README pass

**v1.11.6** shipped dync pure-WASI portability + `wasmtk wasic`→dync abort guidance (see
[dynrt-design.md](dynrt-design.md)). **v1.11.7 PUBLISHED to JSR** — a large producer/dync/README pass
(files: `main.ts`, `src/gowasic.ts`, `src/zigwasic.ts`, `src/wasic.ts`, `src/dync.ts`, `README.md`,
`CHANGELOG.md`, `cmem/*`):

- **Producer verbs unified across go/zig/rust** (Rust model): `init`=WASI program, `initmod`=wasm
  library, `build`=program→`.wasm`, `modc`=library→`.wasm`, `run`=build+run. **`--lang` is now
  optional for run/build/modc** (auto-detected from `.go`/`.zig`/`.rs` or `go.mod`/`Cargo.toml`);
  **add/remove/list/fmt/clean no longer need `--lang=rust`**. **Go browser scaffold REMOVED**
  (`--go-target=wasm` errors → universal wasm loader; `--go-target=wasm-unknown` leaf kept). `run
  <dir>` with no project → clear error. Full detail: [polyglot-producers.md](polyglot-producers.md)
  § "UPDATED 2026-07-28".
- **dync no longer writes the empty `.wit`**; merge notices `⚠️`→`ℹ️`. **Correction recorded:**
  Go/Zig/Rust do NOT auto-emit `.wit` (only TypeScript does; Go bindgen uses a hand-written one).
  *(Superseded 2026-09-28: Go and Zig auto-emit for optimised artifacts; see polyglot-producers.md.)*
- **README restructured**: Compiler Options → Choosing → Programmatic API → Producers & Backends →
  **Utility Options** (new: mod/info/wasm2js/convert alongside wasmbundle/jstyper/bindgen/wast/run) →
  Roadmap. Added wasic/modc/dync/hybrid **Limitations** notes. **Roadmap collapsed into ONE unified
  `Complete | Phase | Feature | Highlights` table** (`✅`/`⏳`; **all `⏳` rows always last** — see the
  README-table convention note at the top of this file); detail sections removed (examples live in
  each command section, internals in `cmem/`). New gate `tests/dync_cross_runtime_tests.ts`.
- Suites green throughout: wasi 375/375, go_merge 7/7, go_bindgen 7/7, go_asyncify 12/12,
  dync_conformance 3/3, dync_cross_runtime 3/3, bindgen 142, jstyper 73. **Published as v1.11.7.**

1. **Nested goroutines now run in-house — the headline.** A goroutine that suspends *inside* another
   suspending goroutine (`inner.Wait()`) used to trap `memory access out of bounds`. Root cause was
   **NOT asyncify** — it was a **binaryen-ts binary-DECODER reorder bug (WT-2k, fixed in 1.4.3)**:
   TinyGo's goroutine trampoline keeps the caller's `$__stack_pointer` (`global.get`) on the operand
   stack across `global.set $sp; call…` then restores it; the decoder reordered that `global.get`
   past the `global.set` → a `global.set(global.get)` self-assign that corrupted the shadow stack.
   The decoder now spills such reordered values to a temp local. Found by bisecting the merged module
   to `tinygo_launch` + a pure `readBinary→emitBinary` repro. **The earlier "memory-grow ordering"
   theory was a red herring** (a runtime trace proved our asyncify matched `wasm-opt` byte-for-byte).
   `nested/` re-enabled in the forced in-house list. binaryen-ts 1.4.2 also added **liveness-minimized
   asyncify saving** (frames smaller than `wasm-opt`). See [polyglot-producers.md](polyglot-producers.md)
   § "NESTED SUSPENSION — found then FIXED" + binaryen-ts `cmem/correctness.md` § "WT-2k".
2. **B3 — broadened goroutine coverage.** `go_asyncify_tests.ts` is table-driven over the full
   surface: worker-pool (`sum: 30`), `select`, `time.Sleep`, `WaitGroup`+`Mutex`, 3-stage pipeline,
   nested — 12/12.
3. **Standard-Go merge guard.** `wasmmerge` now rejects a `memory.grow`-carrying module (std-Go's
   full runtime) at MODULE level, before the per-function `call_indirect` guard, with a clear
   "STANDARD Go … build a MERGEABLE leaf with TinyGo `--go-target=wasm-unknown`" message; `gowasic`
   rejects `--go-runtime=std --go-target=wasm-unknown`. Go-free regression `wasmmerge_guard_tests.ts`.
4. **B5 — hybrid nested-backtick.** `skipLiteral` descends into `${…}` so a nested backtick template
   no longer truncates a `@wasm` body or defeats call-rewriting.
5. **Backend bumped** binaryen-ts 1.4.1 → 1.4.3; `deno.json` pins `^1.4.3`.

## Release status (2026-07-08) — v1.11.3

**v1.11.3 released to JSR.** First publish since v1.11.2 (2026-07-03); on backend **wabt-ts 1.3.5 +
binaryen-ts 1.4.1**. Suite **375/375**, bindgen **142**, go_bindgen 7/7, go_asyncify 3/3, jstyper
73/73. Landed since v1.11.2:

1. **Goroutine Go with NO external binaryen** — the headline. binaryen-ts 1.4.1 added the **in-wasm
   `asyncify.*`-import mode** to its Asyncify pass (TinyGo's scheduler imports
   `asyncify.start_unwind`/… and drives its own unwind/rewind; the pass removes those imports and
   wires the calls to the synthesized control functions). wasmtk's `--lang=go` no-wasm-opt branch
   now builds `-scheduler=asyncify` + a passthrough shim, then `binaryenAsyncify` (binaryen-ts
   Asyncify + `-Oz`) → **goroutines run with zero external binaryen**.
   `WASMTK_GO_BINARYEN_ASYNCIFY=1` forces this path. Validated e2e (`tests/go_asyncify_tests.ts`,
   TinyGo-gated): a channel worker-pool → `sum: 30`. See
   [polyglot-producers.md](polyglot-producers.md) + binaryen-ts `cmem/passes.md` § "In-wasm
   asyncify-import mode".
2. **Go string/aggregate bindgen — SHIPPED** (canonical vs wasmtime; the only fix was SPEC §10 in
   the bindgen loader — a minimal WASI-P1 shim + `_initialize`). `bindgen` 131→135→142, `go_bindgen`
   7/7.
3. **Three-pass code-audit sweep** (see [compiler-bugs.md](compiler-bugs.md) § "Code-audit sweep"):
   fixed a binaryen-ts `call_indirect` eval-order miscompile + a dropped-`unreachable` in Flatten;
   the lossy WIT kebab↔camel round-trip breaking capital-heavy exports (`parseHTML`) in the merge
   overlay + bindgen; the `hybrid` scanners are now regex/template-aware; + fail-loud/robustness
   conversions (asyncify memory-ensure / import-globals / multi-memory / lists; WIT unknown-type
   throws; gowasic runtime-agnostic shim). New `tests/hybrid_tests.ts` (8) + `kebabcase_50` bindgen
   fixture.
4. **Backend bumped** binaryen-ts 1.3.9 → 1.4.0 → 1.4.1 (audit fixes in 1.4.0; the asyncify import
   mode in 1.4.1); wabt-ts stays 1.3.5.

## Release status (2026-07-02) — v1.11.2

**v1.11.2 released to JSR.** Four landed changes since v1.11.1, on a bumped backend (**wabt-ts
1.3.5** + binaryen-ts 1.3.5). Suite **375/375**, bindgen 131/131, jstyper 73/73, wast gate 41
files/12444/0 fail:

1. **mathlib correctly-rounded sweep — COMPLETE.** Every `mathlib` elementary function is now
   IEEE-754 correctly-rounded via double-double: `sin/cos/tan`, `exp`, `log/log2/log10`, `cbrt`,
   `atan`, `asin/acos/atan2`, `sinh/cosh/tanh/expm1`, `asinh/acosh/atanh/log1p`, and **`pow`**
   (moved into mathlib as a full `exp(y·log|x|)` CR impl, routed from `Math.pow`/`**`). Each
   validated bit-for-bit vs an independent BigInt oracle through the full pipeline. See
   [math-cr-sweep.md](math-cr-sweep.md). (`pow` surfaced the constraint that a **mergeable
   capability lib must not use a mathlib-routed `Math.*`** — dynrt's `Math.pow` was made
   self-contained; see [compiler-bugs.md](compiler-bugs.md).)
2. **`.wast` spec-script runner + `wasmtk wast`** (`src/wast.ts`, gate `tests/wast_tests.ts`). Runs
   the official WASM spec conformance testsuite (in-repo at
   `tests/module/wasm_wast/testsuite-main/`); 12178 curated core assertions pass clean. Surfaced **3
   real wabt-ts backend bugs — ALL FIXED across wabt-ts 1.3.4 + 1.3.5 (2026-07-02):** br_if/br_table
   with a branch value (1.3.4), over-precise hex-float truncation (1.3.4), decimal→f32
   double-rounding (Bug C, 1.3.5). The gate grew 31→40→41 files (now incl.
   br/br_if/br_table/labels/block/nop/local_get/conversions/func/float_exprs/**const**), **12444
   assertions, 0 fail**; suite 375/375 on 1.3.5. Also made 2 runner correctness fixes while
   re-validating (void export → `[]`; NaN-payload arg skipped — can't cross the JS boundary). Report
   (resolved): `scripts/wabt-ts-bug-report.md`. See [architecture.md](architecture.md) `wast` row +
   [testing.md](testing.md).
3. **Test folders reorganized into 3 by runtime-consumption model** (2026-07-02): `tests/wasi/`
   (runnable WASI programs: `wasm_wasi`, `wasm_wasi_dync`, `wasm_wasi_bundle`), `tests/module/`
   (invokeable modules: `wasm_mod`, `bindgen_fixtures`, `wasm_wast`), `tests/hybrid/`
   (`hybrid_fixtures`). `jstyper_fixtures`/ `go_fixtures` stay as producer inputs. All 8 runners +
   `gen_caps_bytes` + `.gitignore` + docs rewired; original dir names kept as siblings so the `18*`
   `../wasm_wasi_bundle/…` @step paths still resolve.
4. **Generated build outputs untracked** (`.gitignore` extended to `tests/wasi/wasm_wasi_bundle/**`,
   `tests/module/bindgen_fixtures/*`, `tests/wasi/wasm_wasi_dync/*` — same policy as
   `tests/wasi/wasm_wasi/`). Verified by a clean regeneration (deleted all outputs → suites rebuilt
   them → 375/375). These outputs + `src/wasm/mathlib.wasm` double as **cross-runtime validation
   fixtures**: always regenerate with a green suite before validating another wasm runtime so you
   compare against current-compiler output. See [testing.md](testing.md).

## Release status (2026-06-30)

**Version 1.11.1 is PUBLISHED to JSR** (`@jrmarcum/wasmtk@1.11.1` is `latest`). **1.11.1 COMPLETES
the Route A javyc-retirement track — `javyc` is now DELETED.** This is **2h, the cutover**: (a) the
dynrt interpreter gained **console I/O** — `console.log`/`error`/`warn` in eval source print to
stdout via a new `env.__host_print` import (`runWasi` + the bindgen loader implement it); this also
surfaced + fixed an interpreter HANG (`evalSkipWs` had no comment handling and looped on a
multi-byte UTF-8 char in a comment — now skips `//` + `/* */`). (b) A new **`wasmtk dync <file>`**
command — the `javyc` replacement — compiles an ENTIRE dynamic TS/JS file to a self-contained WASI
module by base64-embedding its source and running it through the embedded `wasmtk:dynrt`
(`dynRunB64`), **no external Javy/QuickJS**. (c) A **conformance gate**
(`tests/dync_conformance_tests.ts`) output-diffs `dync` vs a `deno run` JS baseline (demo1/2/3,
**3/3**; caught + fixed a `Math.min`/`max` variadic bug). (d) **Deletion** of `src/javyc.ts`, the
`javyc` command + `./javyc` export, `tests/wasi_javy_tests.ts`, and all Javy download/detect/convert
code in `utils.ts`. Suite **360/360** (+`18zz`), bindgen 131/131, jstyper 73/73. **Out of scope
(documented):** interactive `prompt` and ESM import/export of other modules. With 2h done, **the
dynrt own-runtime track is functionally complete** — `wasic` (`any`/`eval`) and `dync` (whole-file
dynamic) both route to wasmtk's own runtime; the interim `javyc` fallback is gone.

**2026-07-27 — `dync` is now PURE-WASI portable + `wasic` guides to `dync`-or-fix (no silent
fallback).** (1) **Portability:** `wasmtk dync` output previously imported the wasmtk-only
`env.__host_print` + `env.__host_call`, so it ran only under wasmtk. `internalizeDynrtHostImports`
(in `compileWasiTs`, before final assembly) now rewrites those into internal definitions —
`__host_print`→inline WASI `fd_write(1,…)`, `__host_call`→`unreachable` trap — so the module imports
ONLY `wasi_snapshot_preview1` and runs unchanged on wasmtime/wasmer/wazero (byte-identical stdout,
9/9). Keyed on the reserved dynrt import names and scoped to the WASI-executable path only, so bindgen
libraries (`compileLibTs`) keep their `env.*` imports for the host loader. New standing gate
`tests/dync_cross_runtime_tests.ts` (3/3). (2) **wasic↔dync UX:** on a `wasmtk wasic` abort, the CLI
now classifies the diagnostics and prints the right next step — `wasmtk dync <file>` for a dynamic
feature, or "fix this first" for a genuine undefined-name error (dync would fail on it too). Decision:
KEEP both engines, NO silent auto-fallback (avoids the interpreter-size cliff + masking wasic gaps).
(3) Merge notices reclassified `⚠️`→`ℹ️` (informational, not warnings; `⚠️` reserved for real
warnings). Suites green: wasi 375/375, dync_conformance 3/3, bindgen 142/142. Full write-up in
[dynrt-design.md](dynrt-design.md).

**Version 1.11.0** (2026-06-30) was the async + remaining-ES6 batch (two increments): **2e.10**
async/await + Promise in eval source — a **SYNCHRONOUS** model (the re-parse interpreter has no
event loop): an `async
function` (id=-4) runs to completion and wraps its result in a settled
Promise (rejected if it throws), `await` unwraps a settled promise (throws on rejected → integrates
with 2e.6 try/catch), `.then`/`.catch`/ `.finally` run callbacks immediately,
`Promise.resolve`/`reject`/`all` (`18zx`); and **2e.11** the remaining common ES6 surface —
`instanceof` (walks the instance `__proto__` chain for the class prototype), object spread
`{ ...o }` + call spread `f(...args)`, array/object destructuring (`const
[a, , c] = …` incl.
holes/missing, `const { x, y: z } = …` incl. rename), and class expressions (`const C
= class {…}`,
anonymous + `extends`; `runClassDecl` refactored into a shared `buildClass` helper) (`18zy`). Both
increments are purely interpreter-side (no wasic compiler change). At the 1.11.0 tag:
`tests/wasi/wasm_wasi` suite **359/359**, bindgen 131/131, jstyper 73/73. With 2e.11 the dynrt
interpreter's ES6 syntactic surface was essentially complete (2h — the removal — followed in
1.11.1).

**Version 1.10.9** (2026-06-26) was the STDLIB + generators batch — the dynrt interpreter gained the
JS standard-library surface plus generators: **2f.2** Array methods (push/pop/shift/unshift/indexOf/
lastIndexOf/includes/at/join/slice/concat/reverse/sort +
map/filter/forEach/reduce/find/findIndex/some/ every — `18zq`); **2f.3** String methods
(charAt/charCodeAt/case/trim/slice/indexOf/includes/startsWith/ endsWith/repeat/pad/concat/split —
`18zr`); **2f.4** Object + Math statics (`18zs`); **2f.5** JSON parse+stringify (`18zt` — JSON ⊂ the
interpreter's literal grammar, so parse re-enters `parseExpr`); **2f.6** Map + Set (`18zu`);
**2f.7** RegExp (`new RegExp` + a backtracking matcher — `18zv`); and **2e.9** generators
(`function*`/`yield` via eager collection; `.next()`/`for…of`; finite generators — `18zw`). The
stdlib bridges (Array/String/Object/Math/JSON/Map/Set/RegExp) are all implemented natively in the
value model — NOT the i32-handle capability libs (those are i32-keyed; dynrt collections hold
arbitrary boxed values). At the 1.10.9 tag: `tests/wasi/wasm_wasi` suite **357/357**, bindgen
131/131, jstyper 73/73. JSR score 100% (provenance `true`, docs clean — keep `deno doc --lint` clean
to hold it).

**Version 1.10.8** (2026-06-26) was a big OOP batch (five increments): **2e.7a** per-iteration
`let`, **2e.7b** the `var`→`let` consumption gate (establishes ES6 as the base preferred consumption
format), **2f.1** `this`+prototype, **2e.8** classes (+ a string-blind `parseClasses` fix),
**2e.8a** class completion (extends/super/static/fields/getters/setters). **Earlier in the 1.10.x
line:** 1.10.1–1.10.5 (control flow / literals / function-exprs+arrows / member-index assignment /
operators), 1.10.6 (exception handling), 1.10.7 (lexical block scoping), 1.10.0 (bidirectional
functions-as-`any`).

**Version 1.9.0** (2026-06-24) shipped the **COMPLETE #14 own dynamic runtime** — value model → JS
interpreter (`eval`/`new Function`) → wasic `any` integration → host↔core marshalling
(numbers/strings/ bools/objects/arrays **and functions**) → bounded-memory **mark-sweep GC** →
**hybrid recycling allocator** → **functions-as-`any`** (the `Function(params, body)` producer + a
callable, pinned host proxy), verified end-to-end (`getDoubler()(21)=42`).

**Version 1.8.0** (2026-06-22) shipped the **full v1 `async`/Promise surface** for the `wasic`
compiler (#13 track, sub-phases 13.1a–13.5; design + log in [async-design.md](async-design.md),
user-facing notes in `CHANGELOG.md`): `async`/`await`, `Promise.resolve`/`reject`,
`.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`, plus the `hybrid` async lift — all
standalone, no embedded JS runtime. At the 1.8.0 tag the suite is **317/317** (8 async tests
`54_*`–`61_*`), bindgen 104/104, jstyper 73/73. (The async track was committed post-1.7.0 and is now
released as 1.8.0; what was previously "NOT yet published" is shipped.)

The **JSR package score is 100%** (`total: 18`), carried forward from v1.7.0. The two gaps that had
dropped it to 94 were fixed at 1.7.0 and remain fixed:

- **`hasProvenance: true`** — provenance now works. It had been silently `false` across
  v1.6.2–v1.6.5 even though every Action run succeeded; the committed `publish.yml` was always
  provenance-correct (`id-token: write` + clean `deno publish` + `v*` tag trigger, byte-identical at
  the tags), so the cause was environmental (org/enterprise Actions OIDC policy gating the
  id-token), not the YAML. A diagnostic step ("Check OIDC availability") was added before
  `deno publish` to surface a missing OIDC token in the run log; the 1.7.0 run published with
  provenance.
- **Docs: `percentageDocumentedSymbols` 0.79 → 0.97** (≥0.80 threshold cleared). Commit `a8e9605`
  added JSDoc to the 57 `missing-jsdoc` symbols across 9 files, exported the 3 producer result types
  (`GoResult`/`ZigResult`/`RustResult`) to clear 5 `private-type-ref` errors, and gave `DATA_BASE`
  an explicit type. `deno doc --lint` is now clean across all 15 entrypoints — keep it clean on
  future edits to hold the score.

Prior release **v1.7.0** (2026-06-15, suite 309/309) shipped `Number.parseInt`/`parseFloat`,
declaration-order-independent multi-level interface inheritance, and the Canonical ABI return-side
forward-alignment (callee-allocated string returns + `cabi_post_<name>`). Release mechanism
unchanged: `deno task publish` (sync-version → commit → tag `vX.Y.Z` → push → `publish.yml` Action
runs `deno publish` with provenance).

