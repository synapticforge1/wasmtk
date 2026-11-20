# design-decisions — part 7 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Tooling

## Tooling

- 🔒 **Experimental V8 flags are for the wast GATE only (owner decision 2026-09-28).**
  `tests/wast_tests.ts` holds them in `GATE_V8_FLAGS` (currently
  `--experimental-wasm-wide-arithmetic`) and re-runs itself with them when the feature is absent.
  The `wasmtk wast` CLI and everything wasmtk ships run on the STABLE engine. Adding a flag moves
  gate numbers, so it is a baseline re-record like any other: say so in the commit. When V8 ships a
  feature unflagged, drop its flag; the gate should not move.
- `tsbundle` outputs **`.ts`** (`.bundled.ts`), an import inliner — NOT `deno bundle`/JavaScript.
- `.wasm` import detection matches **single-line** `import { … } from "./x.wasm"` only.
- **`host.Command.output()` (`rt.Command` before 2026-11-20) always reads `result.stdout`/`stderr`, which THROWS unless they are
  `"piped"`.** Never pass `stdout`/`stderr` `"null"` or `"inherit"` to a `.output()` call (it surfaces
  as a misleading `catch` — e.g. a tool wrongly reported "not found"). Always `"piped"` and decode the
  captured bytes. (Bit the Go producer; see `src/gowasic.ts` `decodeOut`.) Also: `rt.remove` is
  single-arg (unlink-based under Bun) — use `Deno.remove(dir, {recursive:true})` for a directory.
  Build subprocess env as `{ ...host.env.toObject(), …overrides }` so PATH is preserved. `host.Command`
  now also accepts `cwd` (added 2026-06-06 for the Go producer's `go mod init` / package builds).
- Bump the version with **`deno task bump patch|minor|major`** (`scripts/bump.ts`): raises
  `deno.json`'s version, then propagates it to `package.json` + `src/utils.ts VERSION` via
  `sync-version.ts`. `deno task update-version` only *propagates* an already-edited version.
  `bump` is intentionally NOT wired into `deno task release` (bumping stays a deliberate step:
  the owner gives the level, workspace release-process.md § 2 step 7; `deno task publish` until
  2026-11-10).
  Don't add `dependencies` to `package.json`; don't use `nodeModulesDir: "auto"` (Windows
  junction failures).
- 🔒 **VERSIONS ARE PLAIN SEMANTIC VERSIONING 2.0.0 (owner, 2026-09-20; workspace letter H6,
  `../workspace/cmem/layout-and-packaging.md` § Versioning). Implemented 2026-09-30.**

  | release contains | bump | resets |
  | --- | --- | --- |
  | bug fixes only, nothing added, nothing broken | `patch` | — |
  | new capability, backward compatible | `minor` | patch → 0 |
  | anything backward-incompatible (BREAKING) | `major` | minor, patch → 0 |

  - **Components are unbounded integers; nothing ever carries.** `1.9.9` is followed by `1.9.10`
    or `1.10.0`, never by `2.0.0` unless something broke.
  - **The kind is REQUIRED** (no default) and is a compatibility statement; anything else is refused.
  - **Breaking** means: a public API surface, a CLI contract, a removed export, or "accepting less"
    even when correct. **The major IS the break signal**: consumers' carets flow through minors and
    patches and stop only at a real break. The README `### ⚠️ Breaking Changes` table stays, as
    the migration guide.
  - **"Backward compatible" is a gate result, not a judgment** (the compatibility gate, H6.3): the
    surface diff against the last release sets the minimum kind, and `bump` refuses a bump below
    it.
- 🔒 **THE COMPATIBILITY GATE (H6.3, 2026-09-30; workspace `layout-and-packaging.md` Rules 1, 2,
  5).** `scripts/api-surface.ts` + `scripts/bump.ts`:
  - **Rule 1, the snapshot:** `api-surface.json` (committed) = every entry of deno.json's
    `exports` map (16) × every symbol and signature `deno doc --json` reports, normalized (source
    locations and doc comments dropped, keys sorted), one symbol per line. Interfaces, classes and
    enums are stored MEMBER by member; functions, type aliases and variables whole. 104 symbols at
    introduction. Generated, never hand-edited.
  - **Rule 2, the floor:** removed or changed anything → `major`; only added → `minor`; nothing →
    `patch`. `bump` prints the floor WITH the symbols that set it and refuses a kind below it; a kind
    above it is allowed. A changed function signature counts as `major` even when it is compatible,
    because text cannot prove compatibility. **Stated judgment:** a new REQUIRED interface property
    is `minor` with a printed warning (additive for readers, breaking for constructors).
  - 🔒 **REVIEWED EXCEPTIONS (owner decision 2026-09-30).** A CHANGED member a person has judged
    compatible is recorded in the committed `api-surface.review.json` by
    `deno task api-surface --review <entrypoint> <symbol> <member> <kind> <reason>`, which stores the
    SHA-256 of the member's exact text before (at the last tag) and after. The floor then uses the
    review's kind for THAT change, printed as `CHANGED — REVIEWED <date> as <kind>: <reason>`.
    Three limits, each tested: it applies only while both hashes match (edit the symbol again and it
    is judged afresh, and the unused review is reported); it cannot excuse a REMOVED or ADDED
    member (`--review` refuses); nobody types a hash. Commit a review with its reason, like a
    re-baseline. **First use:** `./wast` `runWast` and `runWastPath`, whose options parameter went
    from the inline `{ verbose?, maxFailures? }` to `WastOptions` (the same fields plus an optional
    `lowerCustomPageSizes`): reviewed `minor`, so the floor since v2.0.3 is MINOR, not MAJOR.
  - **The floor is measured against the LAST `v*` RELEASE TAG's snapshot, not the working one**:
    Rule 5 re-baselines before the bump, so a working-snapshot diff would always read `patch`. A tag
    without a snapshot (v2.0.3 and earlier) is measured from a temporary detached worktree of the
    tag, always removed afterwards; from the next release on, tags carry the file.
  - **Rule 5, re-baseline in its own commit:** `bump` refuses outright if `api-surface.json` does not
    match the code, before computing any floor. `deno task api-surface` re-records; `--check`
    verifies; `--floor` prints the floor without bumping.
  - **Proven to fail on purpose:** `scripts/check_compat_gate.ts` (15 cases: 10, + 3 for reviews, + 2 for the CLI; in a throwaway clone of
    the current branch; never touches the real version or tags). Re-run it whenever either script
    changes. Its first version passed two cases VACUOUSLY: its edit to un-export `isList` matched
    nothing, so the test now asserts that its own edits happened.
  - **The CLI surface (H6.4, 2026-09-30)** is the pseudo-entrypoint `(cli)` in the same snapshot,
    read from the CODE where the code is the contract: `command:<name>` = every `case` of main.ts's
    dispatcher (the commands it ACCEPTS, 22), with its `wasmtk <name> …` usage line(s) from `--help`
    as members; `flag:--<name>` = every flag in the `parseArgs` config, boolean or string, with its
    aliases (14); `(exit)` = every literal `Deno.exit` / `rt.exit` / `host.exit` code in main.ts and `src/`, and
    each FILE that exits with a computed code (`src/utils.ts` is `wasmtk run` passing the program's
    status through), keyed by file so moving code is not a change. 37 CLI symbols; unchanged since
    v2.0.3. The Rust-only verbs (`add` `remove` `list` `fmt` `clean`) are dispatched but appear in
    `--help` only in prose, so they carry no usage line; `--record` prints that as a note.
  - 🔒 **EVERY FAILED COMMAND EXITS NON-ZERO; a library entry point reports failure by its RETURN
    VALUE (2026-09-30).** `compileModule` returned `void` and `showInfo` caught and returned, so
    `wasmtk modc`, `info` and `mod <file>` exited 0 on failure, and `wasic`'s input-error path
    returned before its `rt.exit(1)`: a script, CI step or test could not tell a failure from a
    success, which hid a broken `modc` build for five weeks. The check is a SWEEP, not a reading:
    every command with a missing input must exit non-zero (all 17 cases do). A new command, or a
    new failure path in an old one, keeps that true; a new exported build function returns its
    success (as `compileModule`'s `boolean`), never `void`.
  - **Not yet (H6.5):** Rule 3's behaviour checks (the previous tag's `tests/` against new `src/`;
    the loaders' fixture suites as consumers), Rule 4 (deprecate before remove), and a CI repeat on
    the tagged commit. Output text a script may parse is not snapshotted beyond usage shapes.
  - **Retired by this (history, do not reinstate):** the 2026-07-30 rules that versions were "a
    sequential counter with no compatibility meaning", that `patch`/`minor`/`major` named only a
    position, and the ODOMETER (minor and patch capped at 9, carrying left, `bump` refusing to run
    from a multi-digit version). The owner retired them because a carry into a new major tells every
    caret consumer "this broke" when it did not. The published history (`1.11.12`, then `2.0.0` as
    a deliberate breaking release) is valid SemVer and needs no reinterpretation.
  - `scripts/bump.ts` boundary cases (2026-09-30, all pass; 5 of them fail on the old odometer
    script): `2.0.3` patch/minor/major → `2.0.4`/`2.1.0`/`3.0.0`; `1.9.9` patch → `1.9.10`;
    `1.9.9` minor → `1.10.0`; `1.11.12` patch → `1.11.13`; `0.9.9` patch → `0.9.10`; `9.9.9`
    major → `10.0.0`; no kind, or an unknown one → refused, nothing written.
- ✅ **`main.ts` + `src/` ARE fmt-clean again as of 2026-07-30, and the fix is now STABLE.** It had
  drifted to 8 of 21 files failing. The reason the claim kept going stale is the important part:
  - **`deno fmt` emits LF; this machine's git runs `core.autocrlf=true` and hands out CRLF on every
    checkout.** They fight permanently. Formatting the tree fixes `deno fmt --check` only until the
    next checkout re-converts to CRLF, at which point files fail with *"Text differed by line
    endings"* and **no content diff at all**. Measured, not assumed: after formatting, deleting
    `src/zigwasic.ts` and `git checkout`-ing it brought CRLF straight back and re-broke the check.
  - **Settled with a `.gitattributes` carrying `*.ts text eol=lf`.** The blobs were ALREADY stored
    as LF (verified: `git show HEAD:src/utils.ts` had 0 CRLF, the worktree copy had 523), so this
    rewrites no history — it only stops the checkout filter converting them back. A fresh checkout
    now yields LF and passes. **Do not remove this file**, and do not "fix" CRLF failures by
    reformatting; reformatting treats the symptom and lasts until the next checkout.
  - The 130 worktree `.ts` files that were still CRLF were converted in place; `git diff --numstat`
    was **empty** afterwards, confirming zero content change (git had been normalising them all
    along).
  - **`.wast` IS pinned: `*.wast text eol=lf`** (with `*.wat`, under a wildcard-first
    `* text=auto eol=lf` default; commits `be89ce15316` and `d285086fe49`). It was flagged as a live
    trap on 2026-08-20: under `core.autocrlf=true` a CRLF checkout of the vendored corpus
    (`tests/module/wasm_wast/testsuite-main/`) would silently break the byte-for-byte diff against
    upstream that makes a corpus sync verifiable (see [testing.md](testing.md) § "Vendored spec
    testsuite"). **Do not remove the pin**, and never fix line endings by rewriting the vendored
    files — they are upstream's bytes and must stay that way.
  - 🔀 **BOTH BACKENDS ARE NOW ONE PACKAGE — `@jrmarcum/binaryang` (merged 2026-08-27).** `wabt-ts`
    and `binaryen-ts` no longer exist as separate dependencies. `deno.json` keeps **three specifiers
    pointing at one dependency at one version** (the third added 2026-09-29):

    ```jsonc
    "binaryen-backend":   "jsr:@jrmarcum/binaryang@1.8.1/compat/binaryen",
    "binaryang-validate": "jsr:@jrmarcum/binaryang@1.8.1/wasm-validate",
    "wabt":               "jsr:@jrmarcum/binaryang@1.8.1/compat/wabt"
    ```

    - **`binaryang-validate` is the wast runner's second `assert_invalid` oracle** (`src/wast.ts`
      `binaryangInvalid`, 2026-09-29): `wasmValidate(bytes, { features: allFeatures() })` decides
      where V8 cannot (it accepts, or refuses only for a limit of its own). Two conditions keep it
      sound, and neither may be dropped: (1) a rejection counts only if `readWasm` DECODES the same
      bytes, because `wasmValidate` pools decode and validation errors; (2) every module the spec
      asserts VALID is validated too, and the gate FAILS if binaryang rejects one
      (`validatorRejectedValid`). Take `allFeatures` from binaryang, never a hand-written list (H10).
      The verdict is `r.result`, not `r.errors`. **Through 1.12.1 the two could disagree**
      (binaryang's letter, 2026-10-15): `result` was `Ok` with an error in `errors` for a block type
      naming a non-function type. For us that could only turn a pass into a SKIP; it could not
      manufacture one, and the guard was not affected. Fixed in binaryang's release after 1.12.1
      (`result` is `Error` whenever an error-level diagnostic exists). On that bump, expect
      `assert_invalid` passes up and skips down, and explain each moved file. **That release is
      1.13.0 (pinned 2026-10-20): nothing moved** (the fixed shapes are not reached through the
      second oracle in our corpus; the guard reads 0).
    - **The MIRROR guard, `validatorAcceptedInvalid` (2026-10-23).** binaryang may only be asked
      "is this VALID?" (e.g. for a definition V8 refuses for a size cap) while it accepts no module
      the spec calls INVALID. Measured on every decodable `assert_invalid` module, under the
      FILE's features, never `allFeatures()` everywhere: `customDescriptors` relaxes `br_on_cast`,
      so it is on only under `proposals/custom-descriptors/`; a module valid only with multi-memory
      on is a feature-set difference (`proposals/threads/` predates it). What remains is a binaryang
      defect, pinned per file with its cause in `tests/wast_tests.ts` (`KNOWN_ACCEPTED_INVALID`;
      1.15.0: one, a legacy `delegate`'s unchecked label depth). Not a verdict change: V8 rejects
      those modules, so they pass as before; the guard only decides whether binaryang's VALID
      verdict may be used (next-work.md, the size-capped definitions).
    - **Custom-page-sizes LOWERING in the wast runner (2026-09-30)**, `binaryenLowerCustomPageSizes`
      in `src/binaryen.ts`, driven by `WastOptions.lowerCustomPageSizes` in `src/wast.ts`. Four
      rules, each tested in `tests/wast_runner_tests.ts` and inversion-checked: (1) **gate-only**,
      like the experimental V8 flags: `wast_tests.ts` turns it on, the `wasmtk wast` CLI and
      `engine_tests` do not; (2) **a retry, not a pre-pass**: a module is lowered only when V8
      REFUSES it and `explainEngineRejection` names "custom page sizes", so no other module is
      touched and no module is compiled twice; (3) **never for `assert_invalid` /
      `assert_malformed`**, whose question is validity (lowering can make an invalid module
      valid): only `module`, `module definition`, `assert_trap` on a module and
      `assert_unlinkable`; (4) **reported apart and guarded**: `WastResult.lowered` counts the
      modules and the passes that depended on one (the gate prints them on their own line), and
      every lowered module goes through `binaryangInvalid`, a rejection failing the gate. It was
      verified on five engines against a native-wasmtime reference before it was wired in (the
      method and the matrix: `scripts/binaryang-report.md`, the SENT 2026-09-29 and 2026-09-30
      sections).

    ⚠️ **The alias is `binaryen-backend`, not `binaryen`** — see the invariant below. This block is
    the live shape; keep it in step with `deno.json` or it becomes the thing people copy.

    - **Keep the compat specifiers separate.** They are not redundant: `src/binaryen.ts` is a facade that also
      supports `npm:binaryen`, and the bare `"wabt"` specifier is imported by five modules. Two
      names over one package preserves the ability to swap either half independently.
    - 🔒 **The Binaryen alias is `binaryen-backend`, NOT the bare `binaryen` (2026-08-31). Do not
      "simplify" it back.** `binaryen` is also a real published package that this facade can be
      pointed at, so the bare name resolved to **two different packages depending on configuration**
      — a defect independent of what it is called, because `import ... from "binaryen"` gave a reader
      no way to tell which they were getting. Raised by the binaryang team. The general rule:
      **an import alias must not collide with the name of a package the project could actually
      resolve.** `"wabt"` does not collide with anything we can point it at, so it stays bare.
    - **They must move together.** Version skew between the assembler and the optimiser used to be
      unavoidable; it is now self-inflicted. Bump all three lines or none.
    - **There is no `./ir` and the root export is empty**, deliberately — 56 type names collide
      across the two retained IRs (`Type`, `ValueType`, `WasmModule`, `Token`, ~52 expression
      nodes). Always import a **compat subpath** (or a tool subpath such as `./wasm-validate`, which
      exports no IR); never the bare package.
  - 🔒 **THE RULE: `@jrmarcum/binaryang` is EXACT-pinned (no caret), every subpath at the same
    version, and it moves only with a full gate** (currently `1.8.1`, 2026-09-30). Both
    halves are code generators whose *output text* we parse, so the pin is a CORRECTNESS pin, not a
    compatibility range. Never reintroduce a caret.
    - History, for the reasoning only: `^1.3.5` let wabt-ts 1.4.0 (a stricter validator rejecting
      three malformations we emitted) in through a reload — the `wast` gate went 156 files
      off-baseline while `deno.json` still said 1.3.5 — so it was EXACT-pinned at 1.3.5
      (`9ad2738abac`, 2026-08-25), then 1.4.1 once those were fixed (`cd272e46bd5`); binaryen-ts went
      `^1.4.3` → exact 1.5.0 by the same lesson (a caret is how 1.4.0 got in and regressed us). Both
      merged into binaryang on 2026-08-27 (`8b881a9f56d`).
    - **The `try_table` emitter needs a backend that can encode it** (wabt-ts 1.3.5 could not: every
      handler form was an ENCODE-FAIL). Reverting the backend below that line means reverting the
      emitter too, or the compiler emits WAT its own assembler rejects.
  - **`minimumDependencyAge: "PT1M"` STAYS — owner directive 2026-08-25. Do not "clean it up".**
    Deno's default 24-hour guard exists to stop a freshly-published malicious version from being
    pulled in unnoticed. That threat model does not describe this repo: **both backends are
    first-party (now the single `@jrmarcum/binaryang`), EXACT-pinned, and bumped deliberately
    in lockstep with a full regression gate.** The versions we install are ones we asked for, in
    response to bugs we reported. The guard's only effect here is to block a same-day backend fix for
    a day — which is exactly what it did to 1.4.1 and 1.5.0.
    - Use the ISO-8601 form. `"1h"` is **rejected**; `"PT1H"` / `"PT1M"` are accepted.
    - The safety that actually protects this repo is the **exact pin plus the gate**, not the age
      guard. Loosen either of those and this entry becomes wrong.
  - **A backend bump never lifts a safety skip by itself** (the reader of a `try_table` handler's
    multi-value block arrived in binaryen-ts 1.5.0; the optimiser fix came later):
    - ✅ **The `try_table` `-Oz` skip is REMOVED (2026-08-27, binaryang 1.5.2).** Kept here because
      the *rule* outlived the branch: **do not remove a safety skip on a version bump alone.** It was
      removed only after our own gate said so — `check_try_table_oz.ts` exit 0, then `15_Exceptions`
      + `15_LexicalShadowing_Stress` matching through real `-Oz`, then the full gate. Upstream asked
      for exactly that re-verification rather than taking their release note. Payoff: 10 throwing
      modules now ship optimised output (`15_Exceptions` 4534 → 1345 bytes) and **10 modules newly
      LOAD on wasmer** (match 353 → 363). If it ever needs reinstating, the deciding test is
      `check_try_table_oz.ts`, never `eh_try_table_fixture.wat`. Superseded detail:
      🔒 **the old rule was — do not remove that branch on a version bump
      alone.** 1.5.0 fixed the reader and then silently miscompiled the same modules: `-Oz` drops a
      local's initialisation when the local is reassigned inside the `try_table` body (the pre-try
      store is dead only if the try COMPLETES). Reproduced in 161 bytes by
      `scripts/check_try_table_oz.ts`; the offending pass is unidentified — an earlier note here
      blamed CoalesceLocals and that was a guess, now retracted. Reading the module is not the same capability as optimising it,
      and the version that gained the first did not gain the second. Full post-mortem in
      [compiler-bugs.md](compiler-bugs.md); **the gate for lifting it is `15_Exceptions` +
      `15_LexicalShadowing_Stress`, never the acceptance fixture alone.**
  - 🚫 **MARKDOWN IS OUT OF SCOPE FOR `deno fmt` — owner decision 2026-09-20.**
    `deno.json` carries `fmt.exclude: ["src/wasm/", "**/*.md"]`. **Do not "finish the job" by
    removing that glob.** It was measured, not assumed:

