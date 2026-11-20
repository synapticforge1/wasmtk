# design-decisions — part 8 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Tooling (continued)

## Tooling (continued, 2)

    | | measured on a full trial run |
    | --- | --- |
    | churn | 21 files, **+5359 / −4869** |
    | lines over 120 chars afterwards | **744** (our `lineWidth` is 100) |
    | longest line | 3151 |
    | style change | `*em*` → `_em_` throughout |

    **The deciding factor is tables.** `deno fmt` does not wrap table rows — it PADS every cell to
    align the column, so a wide table becomes one very long line, and **every subsequent hand-edit
    re-dirties the file** until someone re-runs `fmt`. `cmem` is edited constantly and is mostly
    tables; that is permanent friction bought for cosmetic consistency.

    ⚠️ **The old note claiming `deno fmt` "mangles tables/code-fences" was WRONG and is retracted.**
    With one genuinely broken table repaired, a trial format changed **zero** table or fence counts
    and lost **zero** words. It reformats them unhelpfully; it does not corrupt them. The distinction
    matters because the wrong reason would have been falsified the moment anyone tested it, and then
    the right conclusion would have been discarded with it.

    What REMAINS enforced: **`src/`, `main.ts` and `scripts/` are `deno fmt`-clean** (verified
    2026-09-20). `tests/` is deliberately NOT — those 404 files are hand-written compiler INPUT, and
    reformatting the corpus under test is a change to the test, not to its formatting.

  - 🔒 **DENO FLOOR — REVISED by the owner 2026-09-28 (supersedes the 2026-09-20 "write it at the
    next bump" below):**

    1. **While fixes are in flight, the floor IS the Deno currently installed** (2.9.7 on
       2026-09-28), and it moves UP as newer versions are installed. Every gate run is therefore a
       run on the floor. Record the version with each full-gate result.
    2. **Once we are out of fixes, set a MINIMUM we have actually tested against**, and only then
       write it as `"deno": ">=X.Y.Z"` in `deno.json`. That is a tested number, not "whatever is
       installed at release time".
    3. Nothing is written to `deno.json` before step 2.

    The 2026-09-20 text follows for its reasoning (no LTS line, so hold and test before moving the
    floor, which step 2 honours). Its "write it at the next bump" timing is superseded.

  - 🗓️ **(superseded 2026-09-28) DENO FLOOR — decided 2026-09-20, to be WRITTEN AT THE NEXT BUMP.**
    `deno.json` declares no floor today. The owner's policy:

    1. **The floor becomes whatever Deno version is in use at the next bump-and-release.** It is
       captured from `deno --version` at that moment, not chosen in advance. (For reference, the
       machine is on **2.9.7** as of 2026-09-20 — if a release happened today, that is the number.)
    2. **Until then we keep cadence with Deno** — take upgrades as they come while the current bug
       work is in flight, because chasing a floor and chasing backend bugs at once is two moving
       parts.
    3. **After that release we HOLD.** Future Deno releases get tested for compatibility *before*
       the floor moves, rather than the floor drifting silently with whatever is installed.

    **Why the hold matters here specifically: Deno has no LTS line.** There is no "supported old
    version" to fall back to, so a floor that tracks the newest release is a floor that can strand
    consumers with no maintained alternative. Holding and testing is the only way to make the
    compatibility question answerable rather than assumed.

    ⚠️ **Mechanism, so this does not get missed:** the floor is a `"deno": ">=X.Y.Z"` field in
    `deno.json`. Nothing validates its absence today, so a release can silently start requiring a
    newer Deno and the first signal would be a user report — which is the whole reason this is
    being decided now rather than left implicit.

  - 🔒 **INVARIANT — never require a bracketing you did not emit.** wabt prints const-exprs folded
    (`(i32.const N)`) or unfolded (`i32.const N`) depending on version; 1.4.1 switched. Read them
    only through `constExprValue` / `replaceConstExpr` in `src/wasmmerge.ts`, which accept either and
    preserve what they found. This is enforced by grep, not by types:
    **`grep -rn -F '\(i32\.const' src/*.ts` must come back empty.** A hard-coded bracketing does not
    throw when the printer changes — it silently reports "no data segments", which collapses data
    relocation and seats the heap inside static data. It cost a hung suite to find; see
    compiler-bugs.md.
  - **The printer's LAYOUT moves too; read its tokens, not its lines (measured 2026-09-30).**
    binaryang 1.7.2 changed compat `readWasm(…).toText()` for EVERY module read from binary (124/124
    measured, both `readDebugNames` settings): one expression per line where siblings shared a line
    (`(global.get 2)) (local.set 2` became two lines), and `;; label = @N` after every unnamed
    `block` / `loop` / `if`. The token stream is identical once `;;` comments and whitespace are
    dropped. Our merge paths passed unchanged on 1.8.1, and golden-WAT's 60 merged entries changed
    in layout only (0 token changes). So: a regex over printed WAT must not depend on what shares a
    line or on a line ending after `(block`, and must tolerate a `;;` comment there. To check a
    future printer change, compare token streams (`scratchpad` recipe: strip `;;…$`, collapse
    whitespace), not text.
  - **`deno.json` MUST STAY STRICT JSON — no JSONC comments (learned 2026-08-25).** Deno itself
    accepts comments, but `scripts/sync-version.ts` reads the file with `JSON.parse`, and
    `deno task install` chains `update-version` → that script. Adding one `//` comment to document a
    setting broke `deno task install` outright. Document settings in `cmem/`, not inline.
  - **Real content drift existed too and is now fixed**: `src/bindgen.ts` (40 diff lines),
    `src/hybrid.ts` (16), `src/wasic.ts` (6), `src/console_log.ts` (5), `src/wast.ts` (4).
  - **`src/wasm/` is excluded from fmt via `deno.json` → `fmt.exclude`.** Both files there are
    `AUTO-GENERATED` byte arrays; `src/wasm/mathlib_bytes.ts` is 5 lines holding one enormous array
    that `deno fmt` wants to explode into ~9,000. The generators own those files' shape — never let
    fmt fight them. Note `exclude` applies to the DIRECTORY form (`deno fmt main.ts src/`); passing
    an excluded file explicitly still formats it.
  - **Scope stays `deno fmt main.ts src/`** (plus `scripts/`) — never bare `deno fmt`, which would
    reformat the hand-written `tests/` corpus (compiler INPUT; see the markdown bullet above).
    Markdown is now excluded in `deno.json`; the old "mangles tables" reason is retracted.
  - Reformatting touched `wasic.ts`/`console_log.ts`, i.e. the compiler, so the full gate was run
    after it (see testing.md). fmt is still not CI-gated and not a JSR score factor.
- **Keep the published TypeScript (`main.ts` + `src/`) `deno fmt`-clean.** As of 2026-06-02 it
  passed `deno fmt --check main.ts src/` (one-time reflow to the deno.json fmt config: lineWidth
  100, arrow parens, semicolons). Format with the **scoped** `deno fmt main.ts src/` — do **NOT**
  run bare `deno fmt`: it would reformat every test (markdown is excluded in deno.json since
  2026-09-20). `deno fmt` preserves
  template-literal contents, so reformatting `wasic.ts`/`console_log.ts` leaves emitted WAT
  byte-identical — but it IS the compiler, so reinstall (`deno task install`) and re-run
  the three suites after any reformat. fmt is not CI-gated (see testing.md), but staying clean keeps
  the pre-publish checklist green.
- **Keep `deno doc --lint` clean across all `deno.json` entrypoints** (the JSR doc-coverage
  score depends on it; published 2026-06-15 with v1.7.0). The score gates on
  `percentageDocumentedSymbols >= 0.80`; every exported symbol (incl. **each interface field**
  individually) needs a `/** … */` JSDoc, every public function must not return a private type
  (`private-type-ref`), and computed exported consts need an explicit type (`missing-explicit-type`).
  v1.7.0 brought this from 0.79 → 0.97 (commit `a8e9605`). As part of that, the producer result
  types **`GoResult` / `ZigResult` / `RustResult` are now `export`ed** (they're returned by the
  public `compileGoWasi` / `scaffoldGoProject` / `compileZig` / `scaffoldZigProject` / `runRust`
  functions) — do not re-privatize them. Run `deno doc --lint <all 15 exports>` before publishing;
  it is not CI-gated but a regression silently drops the JSR score.
- **`deno doc --lint` clean does NOT mean 100% documented symbols.** Measured 2026-07-30: the lint
  passed on all 16 entrypoints while JSR reported `percentageDocumentedSymbols: 0.98039216`. That
  number is exactly **100/102**, and the 2 it counted undocumented were the bare re-exports in
  `src/utils.ts` — `export { compileWasi } from "./wasic.ts"` and
  `export { compileModule } from "./modc.ts"`. **A JSDoc comment above an `export … from` cannot fix
  this.** Verified by probe: when the defining module and the re-exporting module are BOTH doc
  entrypoints, `deno doc` collapses the re-export to a `kind: "reference"` node carrying no jsDoc,
  no matter what is written above it. **`deno doc --lint` never flags it** — use
  `deno doc --json <entrypoints>` and count `declarations[].jsDoc.doc` per exported symbol.
- **The precise rule (probed 2026-07-30): `deno doc` documents each underlying DECLARATION exactly
  once per run, at whichever export it resolves FIRST; every other export of that same declaration
  becomes a bare `kind: "reference"` with no jsDoc.** It is keyed on declaration identity, NOT on
  module layout — swapping the argument order of two re-exporting entrypoints flips which one is
  credited. Consequences, all measured:
  - Moving the definition to the other module just relocates the `reference` (1/2 either way).
  - A shared non-entrypoint `common.ts` that two entrypoints both re-export is **also 1/2**; adding
    `common.ts` to the export map makes it 1/3. **No module reorganisation can fix this** — two
    public exports of ONE declaration can only ever be documented once.
  - A true CONSUMER (imports and uses, does **not** re-export) costs nothing and is not counted.
- **FIXED 2026-07-30 by REMOVING the duplicate export, not by working around it** (now **100/100**,
  and note the denominator fell 102 → 100 — the duplicate declaration is gone rather than papered
  over). `src/utils.ts` no longer re-exports `compileWasi`/`compileModule`; `main.ts` imports them
  from `./src/wasic.ts` and `./src/modc.ts` directly, the same pattern it already used for
  `compileDyn`.

  **Why this was the right fix rather than the wrapper that was tried first.** `src/utils.ts` is the
  CLI's helper barrel — it has re-exported these since before the `src/` restructure so `main.ts`
  could import every command from one place. But `deno.json` has published **every** module as a JSR
  entrypoint since the first commit, so an internal convenience barrel became public API by
  accident. The README's Programmatic API table documents `compileWasi` under **`./wasic`** and
  `compileModule` under **`./modc`**; `wasmtk/utils` appears **0 times** in the README; and the
  duplicate had exactly **one** consumer in the whole repo — `main.ts`. So the duplication bought
  nothing and was never intended as public surface.
- **Do NOT re-add the re-export to save an import in `main.ts`.** That is what created the problem.
  If a future module needs these, import from `./wasic.ts` / `./modc.ts`.
- **A pass-through wrapper (`export async function x(…) { return await _x(…) }`) also reaches 100%
  and was implemented, then reverted.** Recorded so it is not re-attempted as a first resort: it is
  credited and keeps `kind: "function"`, but it hand-duplicates the signature, so adding a new
  **optional** param to an impl does NOT fail `deno check` — it silently stops being forwarded. No
  type-level guard catches that (`const g: typeof impl = wrapper` passes, since fewer params are
  assignable). It is the right tool only when the duplicate export must genuinely stay public;
  removing the duplicate is strictly better when it need not. The `export const x: typeof _x = _x`
  form is drift-proof but renders as `variable`, losing the function signature.
- **None of this moved the JSR score, and it was never going to.** JSR's scoring doc states *"you do
  not need to complete all factors to get a 100% score"*; the package already reported **100** at
  98.04% documented. Justify this work as API hygiene and correct rendering on jsr.io — **not** with
  the score number.
- **A module JSDoc needs an explicit `@description` tag, or its description renders EMPTY.**
  `deno doc` treats everything after the first tag as that tag's value, so
  `/** @module foo` + bare prose yields a module with **no** description. 15 entrypoints used
  `@module x` + `@description …`; `src/wast.ts` used `@module wasmtk/wast` followed by bare prose
  and so had an empty module description on jsr.io (fixed 2026-07-30). Module names are also bare
  (`wast`, not `wasmtk/wast`). Check with
  `deno doc --json <entrypoints>` → `nodes[file].module_doc.doc`, not with `--lint`, which does not
  catch it.
- **JSR provenance is environmental, NOT a `publish.yml` problem.** Provenance was silently `false`
  across v1.6.2–v1.6.5 even though every Action run succeeded — `deno publish` skips attestation
  non-fatally when it can't mint/submit the GitHub OIDC token. The committed workflow was always
  correct (`id-token: write` + clean `deno publish` with no `--token`/`DENO_AUTH_TOKEN` + `v*` tag
  trigger, byte-identical at the tags); the cause was the OIDC token being gated at the
  org/enterprise Actions level. A **"Check OIDC availability" diagnostic step** was added to
  `.github/workflows/publish.yml` before `deno publish` (echoes whether `ACTIONS_ID_TOKEN_REQUEST_URL`
  /`_TOKEN` reached the runner, `::warning::` if not) so any recurrence is visible in the run log.
  v1.7.0 published with `hasProvenance: true` (JSR score 100). Do not "fix" provenance by editing the
  publish/permissions YAML — it is already correct; check OIDC policy instead.
- 🔴 **Provenance has been ABSENT since v1.11.3 (found 2026-07-30) — 10 releases. Cause traced to
  the Deno version; `deno-version` is now PINNED to `v2.9.1`.** Bisected against the JSR API
  (`api.jsr.io/scopes/jrmarcum/packages/wasmtk/versions/<v>` → `rekorLogId`): **v1.11.2 (2026-07-03)
  is the last version with a Rekor entry** (`2053916008`); **v1.11.3 (2026-07-09) is the first
  without**, and every release since — including v1.11.12 — is `null`.
  `.github/workflows/publish.yml` had not changed since 2026-06-15 (commit `a8e9605`), i.e. it was
  byte-identical to what produced provenance for v1.11.2, `git diff v1.11.2..v1.11.3` touches only
  `deno.json` deps, and the JSR↔GitHub repo link is intact — so nothing in the repo explained it.
  **The workflow floated `deno-version: v2.x`, so every release picked up whatever Deno was newest
  that day, and the history splits EXACTLY on a Deno release boundary:**

  | Deno used | wasmtk releases | Provenance |
  | --- | --- | --- |
  | ≤ 2.9.1 (2.9.1 shipped 2026-07-01) | v1.7.0, v1.11.1, v1.11.2 | ✅ present |
  | ≥ 2.9.2 (2.9.2 shipped 2026-07-08) | v1.11.3 … v1.11.12 (ten) | ❌ absent |

  ❌ **The Deno version was TESTED and RULED OUT — do not re-try it.** The split above looked
  causal, so **v2.0.0 was published with `deno-version: v2.9.1` pinned** (2026-07-30) — the exact
  version that produced attested releases a month earlier. **It published with no provenance
  anyway** (`rekorLogId` null; the tag genuinely carried the pin, verified with
  `git show v2.0.0:.github/workflows/publish.yml`). So the 2.9.1/2.9.2 correlation was coincidental.
  The pin was reverted to floating `v2.x` immediately afterwards — it bought nothing and only cost
  the 2.9.2–2.9.4 fixes. Corroborating: no Deno release note from 2.9.2 through 2.9.4 mentions
  provenance at all (2.9.4's only publish entry is `fix(publish): constrain generated source
  rewrites`, unrelated).

  **Remaining suspects: JSR-side or GitHub-side changes in the 2026-07-03 → 07-09 window.** What is
  already known-good and needs no re-checking: `publish.yml` (unchanged since 2026-06-15 and
  byte-identical to what produced attested releases), `id-token: write`, the OIDC prerequisite step
  (passes, no `::warning::`), the JSR↔GitHub repo link (intact), and the absence of
  `--no-provenance`. **The next diagnostic needed the run logs** (the Actions logs endpoint 403s
  unauthenticated) on the v1.11.2 vs v1.11.3 runs — never through `gh` (🔒 owner 2026-11-08, letter
  H30, workspace Tooling rule 9): the REST API with a token, or the owner reading them in the web UI.
  The "Verify provenance was recorded on JSR" step will detect a fix whenever one lands.
- **The OIDC diagnostic step is NOT sufficient evidence of provenance — it gave 10 releases of false
  assurance.** It checks only the PREREQUISITE (are the OIDC env vars present), and the v1.11.12 run
  emitted no `::warning::` at all (verified via the check-runs annotations API — its one annotation
  is an unrelated Node 20 deprecation notice), yet provenance was still absent. **A green publish run
  is not proof of provenance; only JSR's `rekorLogId` is.** A **"Verify provenance was recorded on
  JSR"** step was therefore added as the LAST step of the workflow: it polls the JSR version API and
  fails the job if `rekorLogId` is null. It runs last on purpose, so a failure surfaces the problem
  without blocking the publish or the GitHub release (JSR versions are immutable — by the time this
  runs, the version exists either way). Logic verified locally against both sides of the bisect:
  1.11.2 → PASS, 1.11.12 → FAIL.
- **Provenance is NOT what is holding the score.** JSR's scoring doc states *"you do not need to
  complete all factors to get a 100% score"*, and the package reports `score: 100` with
  `hasProvenance: false`. Provenance is worth fixing as a **supply-chain/trust** property (SLSA
  attestation linking the artifact to the building workflow), not to move the number — do not
  justify the work with the score, it will not change.
- **Reading CI logs needs auth.** The GitHub Actions logs endpoint returns 403 unauthenticated, so
  the Deno version each run used could not be read. The diagnostic step for provenance was the
  v1.11.2 vs v1.11.3 run logs (`30569718486` is v1.11.12), comparing the resolved `deno-version` —
  read through the REST API (`GET /repos/{owner}/{repo}/actions/runs/{id}/logs`, token) or by the
  owner in the web UI, **never `gh`** (🔒 owner 2026-11-08: not installed and will not be; letter
  H30). Moot since 2026-08-27 (resolved, below).

- ✅✅ **RESOLVED — v2.0.1 PUBLISHED WITH PROVENANCE (2026-08-27). Twelve releases of absence ended.**

  Measured, cache-busted, at the version endpoint:

  | version | `rekorLogId` | `updatedAt` > `createdAt` |
  | --- | --- | --- |
  | v1.11.2 | `2053916008` | yes — attested |
  | v1.11.12 | **null** | no — not attested |
  | v2.0.0 | **null** | no — not attested |
  | **v2.0.1** | **`2620232142`** | **yes — ATTESTED** |

  `createdAt 23:18:13.594` → `updatedAt 23:18:18.170`: **4.6 seconds**, exactly the attested-version
  signature. JSR package score **100**. The boundary is now v1.11.3 → v2.0.0 absent, v2.0.1 present.

  ⚠️ **WE DO NOT KNOW WHY IT CAME BACK, AND MUST NOT CLAIM WE FIXED IT.** The cache-bust we shipped
  changes only how the result is READ, never how it is produced — and the absence on v1.11.3 /
  v1.11.5 / v1.11.12 / v2.0.0 was itself re-verified with cache-busted reads, so it was real, not a
  reporting artefact. Candidate causes, none confirmed:

