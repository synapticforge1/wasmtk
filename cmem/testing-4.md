# testing — part 4 of 5

Continues [testing.md](testing.md) (split by size on 2026-11-20, letter H38). Sections:

- The multi-engine gate — `engine_cross_check_tests.ts` (added 2026-08-2
- Vendored spec testsuite — provenance and re-sync (2026-08-20)
- The `-Oz` safety check for `try_table` — `scripts/check_try_table_oz.t
- CI / pre-publish gate
- Runner does OUTPUT comparison (hardened 2026-06-07)
- Test populations in `tests/wasi/wasm_wasi/`

## The multi-engine gate — `engine_cross_check_tests.ts` (added 2026-08-24)

**Why it exists.** Every oracle this project owned was V8: `wasi_tests.ts` executes on V8 and
`wasmtk wast` validates through host V8. One engine wearing two hats is one data point, not two, so a
defect only a DIFFERENT engine could see was structurally unreachable. That is not hypothetical — it
is how legacy EH stayed invisible at 417/417 for months, and the gate found a second, unrelated bug
(`fd_write` short writes) on its first full run. See [best-practices.md](best-practices.md) §3.

```bash
deno run --allow-read --allow-run --allow-env --allow-write tests/engine_cross_check_tests.ts
deno run … tests/engine_cross_check_tests.ts --filter "^15_"          # scope to a subset
deno run … tests/engine_cross_check_tests.ts --update-baseline        # re-record deliberately
```

Runs every built `.wasm` on V8 (`wasmtk run`) and on each engine present, comparing stdout
byte-for-byte. Per-module, per-engine expectations live in **`tests/engine_baseline.json`**; a module
that regresses fails, and one that IMPROVES fails too until re-recorded — same discipline as
`wast_tests`.

**Baseline as recorded 2026-08-24** (376 modules):

| engine | match | reject | differ |
| --- | --- | --- | --- |
| wasmtime 47.0.3 | **354** | 22 | **0** |
| wasmer 7.2.1 | 353 | 23 | 0 |
| wazero | 346 | 30 | 0 |

- **First recorded with 37 wasmtime-only `differ`** — all one bug, `fd_write` short writes, found by
  this gate's first run and **fixed the same day** ([compiler-bugs.md](compiler-bugs.md)). They
  matched on wasmer and wazero, which is what pinned the cause to a short-write path only wasmtime
  exercises. The fix produced `0 regressed, 37 improved`, the gate failed as designed until the
  baseline was re-recorded, and wasmtime `match` went 317 → 354.
- The **rejects** are dominated by legacy EH (wasmtime) and by wasmer/wazero having no EH at all.
- 🔁 **SUPERSEDED 2026-08-25 by the `try_table` migration — the baseline MUST be re-recorded.** Every
  module that threw now emits the standard exception proposal, so wasmtime loads modules it used to
  refuse and the gate reports them as `IMPROVED: reject → match — re-record` (observed on
  `15_TestCase1-NestedEscalation`, `15_recover`, `64_ReportModuleTryCatch`, `64_ReportThrowTemplate`,
  …). **This is the gate working, not breaking** — it is the "design the gate so an IMPROVEMENT also
  fails" rule in [best-practices.md](best-practices.md) paying out exactly as predicted.
  **RE-RECORDED TWICE.** 2026-08-25 (the `try_table` migration): wasmtime `match` **354 → 364**,
  `reject` **22 → 12**. Then **2026-08-27**, after the `-Oz` skip was lifted: **wasmer** `match`
  **353 → 363**, `reject` **23 → 13** — 10 modules that wasmer REJECTED as raw wabt output now load
  once binaryen has optimised them (the `15_*` family, `18_Multi-Scope…`, `56_AsyncReject`,
  `60_AsyncAll`, the `64_Report*` pair). wasmtime and wazero unchanged. **Shipping optimised output
  is a portability win, not only a size one** — worth remembering next time a skip looks free.
  Both re-records: `0 regressed`. Earlier detail: wasmtime `match` **354 → 364**, `reject`
  **22 → 12** — **10** modules flipped `reject → match` (the `15_*` EH family, `60_AsyncAll`, the
  `64_Report*` pair). The remaining 12 rejects are not EH-related. wasmer (353/23) and wazero
  (346/30) are unchanged, as expected: neither implements EH at all, so an EH change cannot move
  them.
  - ⚠️ **It is 10, not the 8 first reported — and the discrepancy is the lesson.** The first run
    executed BEFORE `wasi_tests` regenerated the corpus, so it graded artifacts built by the
    *previous* compiler and undercounted by two. **Order is load-bearing:
    `wasi_tests` → `engine_cross_check_tests` → `wast_tests`.** A cross-check gate reads a generated
    corpus; running it early produces a real-looking number that answers the wrong question.
- **Absent engines are skipped, never failed.** With no engine on PATH the gate exits 0 with a notice.

⚠️ **Invoke engines as `<engine> run <file>`.** Not cosmetic: wazero answers a bare path with
`invalid command`, which the gate would otherwise record as a legitimate `reject` for every module in
the corpus. This bit during development and is the repo-wide convention (see
`dync_cross_runtime_tests.ts`).

⚠️ **Regenerate the corpus before trusting a run** — the standing rule below. A stale `.wasm` makes
this gate compare against a compiler that no longer exists.

## Vendored spec testsuite — provenance and re-sync (2026-08-20)

`tests/module/wasm_wast/testsuite-main/` is a **verbatim vendored copy** of
[WebAssembly/testsuite](https://github.com/WebAssembly/testsuite) (the amalgamated mirror of
`WebAssembly/spec/test/core` plus the per-proposal repos). It is a tracked INPUT fixture — only the
`wast` runner reads it, so a corpus refresh reaches `wast_tests` and nothing else.

- **Synced 2026-08-20 to upstream `main` @ `65a43d2e9464b6967c98b23c8493765c4d124f4e`.** The tree is
  byte-identical to that commit **except the owner-directed `;; ⚠️ VENDORED PATCH` blocks** listed
  under `proposals/threads/` below; verify with a recursive diff against a fresh tarball before
  assuming drift. **The rule: never hand-edit anything under `testsuite-main/`** (the next sync
  silently reverts it) — **the only exception is an owner-directed patch carrying that header**,
  which is expected to be overwritten by the next sync and re-checked then.
- **Re-sync:** download `https://codeload.github.com/WebAssembly/testsuite/tar.gz/refs/heads/main`,
  `cp -r` over the directory, then **measure per file** — a refresh legitimately adds AND retires
  assertions, so a bare total is not enough to tell a corpus change from a regression.
- **Line endings:** every `.wast` is LF in both the blob and the working tree, and `.gitattributes`
  **pins `*.wast text eol=lf`** (commit `be89ce15316`), so this machine's `core.autocrlf=true` can no
  longer hand out a CRLF corpus and break the byte-for-byte upstream diff above. Do not remove the
  pin (see design-decisions.md).

### `proposals/threads/` — frozen upstream, and now PARTLY PATCHED locally (2026-09-19)

Recurring false alarm: `proposals/threads/{imports,memory}.wast` still assert `"multiple memories"`
and `"multiple tables"` are invalid, which contradicts the core files in the same checkout. **That
is upstream's own content, not local drift.** Upstream has not touched `proposals/threads/` since
**2020-04-11** (generated from `threads@980c1bca` against `spec@484180ba`), and the live
`WebAssembly/threads` repo — still active — _itself_ keeps the `"multiple memories"` assertions in
`test/core/{imports,memory}.wast`. Refreshing changes nothing. The only genuinely retired ones are
the 3 `"multiple tables"` assertions, fixed in the proposal repo but never propagated into the
testsuite mirror.

#### Two vendored patches now in place (owner-directed; the earlier "do not fix locally" is SUPERSEDED)

Both carry a `;; ⚠️ VENDORED PATCH` header naming the date and rationale, and both are **designed to
be overwritten by the next corpus sync** — re-check them then rather than re-applying blindly.

(Table as a list — file · removed · why:)

- `proposals/threads/imports.wast` — removed: 3 × `assert_invalid … "multiple tables"` — why:
  reference-types made multiple tables VALID; core carries zero such assertions
- `proposals/threads/memory.wast` — removed: 3 × `assert_malformed … "i32 constant out of range"` —
  why: Wasm 3.0 encodes limits as u64, so these modules are well-formed and **invalid**; core
  `memory.wast` asserts exactly that

⚠️ **The `"multiple memories"` assertions were ALSO removed and have been RESTORED** (2026-09-19,
option 2). Five of them — 3 in `imports.wast`, 2 in `memory.wast`. They are **not** stale in the
same way: the live `WebAssembly/threads` repo still carries them, so deleting them would diverge us
from upstream's actual content rather than correct a propagation gap. **Leave them alone.**

#### What the patches actually bought, measured

- `imports.wast`: **105 pass / 6 skip → 105 pass / 3 skip.** No passes gained. The 3 removed
  assertions were being counted as *toolchain-lenient skips* — our wabt+V8 pipeline correctly
  accepts multiple tables, so an `assert_invalid` it fails to reject scores as a SKIP, not a
  failure. The value is that those 3 skips no longer masquerade as a gap in our validator.
- `memory.wast`: **68 pass / 2 skip → 65 pass / 2 skip.** This one COSTS 3 passes, and the reason
  is worth keeping: those assertions were passing because our toolchain and the stale snapshot were
  **wrong in the same direction** — both treat `(memory 0x1_0000_0000)` as malformed text, where
  wasm-tools 1.259 and wasmtime 48 treat it as well-formed and invalid. They were green for the
  wrong reason. Trading 3 such passes for an honest gap is the same call this project makes
  everywhere else.

Corpus effect: **37,370 → 37,367 passing assertions**, baseline re-recorded 2026-09-19.

### Known wabt-ts gaps exposed by the 2026-08-20 sync

Not wasmtk bugs — the runner skips any module wabt cannot assemble, and its dependent actions with
it. Each cost passes without costing a single failure:

(Table as a list — File · Pass Δ · Cause:)

- File — Pass Δ: Pass Δ — Cause: Cause — Status on wabt-ts 1.4.1
- --- — Pass Δ: --- — Cause: --- — ---
- `return_call.wast` — Pass Δ: 44 → 12 — Cause: `ref.null $t` (concrete type index) at `:95` — ✅
  **FIXED — now 45 pass / 0 fail**, one better than before the sync
- `proposals/custom-page-sizes/memory_max*.wast` — Pass Δ: 4 → 2 each — Cause: `(module definition
  …)` — ✅ **FIXED** — folded into the +9264 re-record
- `ref_null.wast` (pre-existing, not from this sync) — Pass Δ: 0 / 34 skip — Cause: `ref.null`
  cannot encode for **any** heap type — ✅ **FIXED 2026-08-31 — now 25 pass / 0 fail / 7 skip.** The
  7 are V8 refusing to marshal `exnref`/`anyref`/user-defined heap types, classified as skips by
  `isJsBoundaryRefusal`. Earlier: ⚠️ **RE-ATTRIBUTED — the blocker was OURS.** Still 0 pass / 32
  skip on binaryang 1.5.2, but **`unbuilt modules = 0`**: the modules assemble fine. `constType()`
  in `src/wast.ts` returns `null` for `ref.null` / `ref.func` / `ref.extern`, so our RUNNER skips
  every such assertion regardless of what the assembler can do. Upstream fixed their half (they
  report `ref.null` with a user-defined heap type was two defects stacked); our number did not move
  because we cannot marshal a reference VALUE.

⚠️ **The original verdict on this table was wrong, and the way it was wrong is worth keeping.** It
read: *"Only the third is a wabt-ts bug; the first two match upstream wabt's own parser, so a wabt-ts
bump will not move them."* **1.4.1 moved both.** The reasoning — "upstream wabt behaves the same, so
this is parity, not a defect" — quietly assumed a downstream port cannot get ahead of its upstream.
It can, and this one did. **Confirming that a behaviour matches upstream tells you where the
behaviour came from, not whether anyone will fix it.** Re-measure such claims on every bump instead
of carrying them forward as settled. Full analysis in [compiler-bugs.md](compiler-bugs.md) §
"wabt-ts `ref.null` + parser gaps"; the report for the wabt-ts team is
`scripts/wabt-ts-bug-report.md`.

## The `-Oz` safety check for `try_table` — `scripts/check_try_table_oz.ts` (added 2026-08-27)

```bash
deno run -A scripts/check_try_table_oz.ts
```

Decides whether the binaryen skip for throwing modules in `src/wasic.ts` may be lifted. Assembles
`scripts/eh_try_table_live_local_fixture.wat` **once** and runs the result both sides of `-Oz` — one
variable, one comparison.

| exit | meaning |
| --- | --- |
| 0 | both sides 42 — the skip MAY be removed, then run the full gate |
| 1 | post-`-Oz` wrong — the skip stays |
| 2 | pre-`-Oz` wrong — the fixture or assembler broke; says NOTHING about `-Oz` |

**binaryang 1.5.1: pre-Oz 42, post-Oz 1 — broken.**
**binaryang 1.5.2: pre-Oz 42, post-Oz 42 — FIXED, and the skip was removed 2026-08-27** after this
checker AND `15_Exceptions` + `15_LexicalShadowing_Stress` AND the full gate all passed, in that
order. The checker stays as the deciding test if it ever needs reinstating.

⚠️ **Passing here is necessary, not sufficient.** The real acceptance gate is `15_Exceptions` +
`15_LexicalShadowing_Stress` in `wasi_tests`. That ordering is not pedantry: the FIRST version of
this fixture passed `-Oz` cleanly while both of those tests were failing, because it kept a local
live across the catch edge without ever **assigning it inside the try**. Only the assignment creates
the dead-store reasoning the optimiser gets wrong. A fixture built to catch a bug can still be built
to miss it.

## CI / pre-publish gate

The only GitHub workflow is `.github/workflows/publish.yml`. **Since 2026-11-10 it follows the
workspace's release-process.md § 5 in the owner's order** (D1; workflow.md § The release flow): it
runs on every push to `main`; `checks` (`is-release` ONLY since 2026-11-20), and for a new version
only: `tag` (CI's annotated tag), `release` (the GitHub Release page from the tag, REST API), `jsr`
(OIDC: `deno publish` with provenance — JSR's own package validation and slow-types check — the
Rekor id read back, fatal). 🔒 **CI gates nothing else** (owner, 2026-11-17, letter H37 (e)): the
surface floor, `deno check`, the dry run, the release tooling's self-tests and the suites run
LOCALLY in `deno task release` (guards 0g, 0i, 0e) and the full gate before it. Until 2026-11-20
`checks` also ran the type check, the dry run, the surface floor and `--verify-commit`. `deno fmt`
/ `deno lint` / `deno doc --lint` are not gated anywhere — but `deno doc --lint` must be kept
clean to hold the JSR doc-coverage score (see design-decisions.md), and provenance requires the OIDC
token to actually reach the runner (was environmentally gated through v1.6.5; v1.7.0 published
2026-06-15 with `hasProvenance: true`, JSR score 100).

🔴 **Provenance regressed AGAIN and is absent from v1.11.3 onward (found 2026-07-30).** Bisected via
`api.jsr.io/scopes/jrmarcum/packages/wasmtk/versions/<v>` → `rekorLogId`: **v1.11.2 is the last
version with one**, v1.11.3 the first without. **A green publish run is NOT evidence of provenance**
— the OIDC diagnostic step passed on all 10 affected releases (the v1.11.12 run emitted no
`::warning::` at all; its only annotation is an unrelated Node 20 notice, checked via the check-runs
annotations API). Only JSR's `rekorLogId` is evidence. A **"Verify provenance was recorded on JSR"**
step now runs LAST in `publish.yml` and fails the job when that field is null — **it fired correctly
on v2.0.0**, which is the first release to report its own missing provenance instead of passing
silently. **The Deno version was tested and RULED OUT:** v2.0.0 was published with `deno-version`
pinned to `v2.9.1` (the last version that ever produced provenance) and came out unattested anyway,
so the clean-looking 2.9.1/2.9.2 split was coincidental. The pin has been reverted to `v2.x`.
Remaining suspects are JSR-side and GitHub-side changes in the 2026-07-03 → 07-09 window; full
elimination list in design-decisions.md. Confirming from CI logs needs an authenticated `gh` (not
installed here — the Actions logs endpoint 403s unauthenticated).

**⚠️ `deno doc --lint` is NOT a doc-coverage check (measured 2026-07-30).** It passed clean on all
16 entrypoints while JSR reported `percentageDocumentedSymbols: 0.98039216`. It catches
`private-type-ref` / `missing-explicit-type` / missing JSDoc on a *declaration*, but it is blind to
two things that DO cost coverage — a re-exported symbol (`export { x } from …`, counted by JSR,
documented by `deno doc` only once per declaration) and a module whose `@module` tag is followed by
bare prose with no `@description` (renders an EMPTY module description). **To measure coverage for
real, parse the JSON**, which is what the checklist line below does:

```bash
# true documented-symbol coverage + any entrypoint missing a module description
deno doc --json <all 16 exports> | deno eval '
const d=JSON.parse(await new Response(Deno.stdin.readable).text()); let tot=0,un=0,nm=0;
for (const [f,v] of Object.entries(d.nodes)) { if(!(v.module_doc?.doc??"").trim()) nm++;
  for (const s of (v.symbols??[])) for (const dec of (s.declarations??[]))
    if(dec.declarationKind==="export"){tot++; if(!((dec.jsDoc?.doc??"").trim()))un++;} }
console.log("no module description:",nm," documented:",(tot-un)+"/"+tot);'
# expect: no module description: 0   documented: 100/100
```

ℹ️ **`deno-version` in `publish.yml` floats at `v2.x`, so CI publishes on whatever Deno is newest
that day.** It was briefly pinned to `v2.9.1` for the v2.0.0 release to test the provenance
hypothesis; that was **ruled out** and the pin reverted (see design-decisions.md). **If it is ever
pinned again, add a second dry-run under the pinned version to the checklist below** — otherwise
development happens forward on a newer Deno while CI publishes backward, and source using a newer
API would type-check locally then fail `deno publish` **in CI after the tag is already pushed**.
The one-time fetch is
`curl -L -o deno.zip https://github.com/denoland/deno/releases/download/vX.Y.Z/deno-x86_64-pc-windows-msvc.zip`.
Measured 2026-07-30 while the pin was in place: 2.9.1 and 2.9.4 both give `Success` on the dry-run
and **agree** on `deno fmt --check` (19 files), so formatting is not version-sensitive between them.

⚠️ **`deno.json` declares NO Deno floor**, so nothing in this project validates a minimum supported
version. A release can silently start requiring a newer Deno than a consumer has, and the first
signal would be a user report. **Owner policy (2026-09-28):** while fixes are in flight the floor is
the installed Deno (2.9.7), moving up with each install; once we are out of fixes, a TESTED
minimum is written as `"deno": ">=X.Y.Z"`. Until then, note the Deno version beside every full-gate
result. See design-decisions.md § Tooling.

The full green pre-publish checklist (run before each release):

```bash
deno publish --dry-run --allow-dirty   # THE gate: type-check + slow-types + package — must pass
deno doc --lint <all 16 exports>       # clean — necessary but NOT sufficient, see the note above
deno doc --json <all 16 exports> | …   # the REAL coverage check — expect 100/100, 0 missing modules
deno lint main.ts src/                 # clean (21 files)
deno fmt  --check main.ts src/         # clean as of 2026-07-30 — kept stable by .gitattributes
                                       # (*.ts text eol=lf); src/wasm/ and **/*.md are fmt-excluded.
                                       # NEVER run bare `deno fmt`. See design-decisions.md.
deno run -A tests/wasi_tests.ts        # 433/433 as of 2026-09-30. HARDENED 2026-06-07: diffs run-ts vs run-wasm OUTPUT, not just exit codes; tests that legitimately diverge carry `// @allow-output-diff`. A test FAILS on `output-mismatch` unless it opts out.
deno run -A tests/bindgen_tests.ts     # 142/142
deno run -A tests/jstyper_tests.ts     # 73/73
```

Publish flow: **`deno task bump patch|minor|major`** (`scripts/bump.ts`; SemVer since 2026-09-30, the kind is required)
raises the `deno.json` version and propagates it to `package.json` + `src/utils.ts` — JSR rejects
re-publishing the same version (`1.6.2` was the last published; `bump` took it to `1.6.3`). Then
`deno task release` → `scripts/release.ts` (since 2026-11-10; before it `deno task publish`) runs
its guards (clean tree incl. untracked, on `main` = `origin/main`, the tag absent locally and on
origin, JSR without the version, cold check and dry run, the CLI's `--version` / `--help`), commits
`bump to vX.Y.Z` and pushes `main` only — CI then checks, tags, makes the page and publishes. Full
steps: workflow.md § The release flow; the record: release.md.

## Runner does OUTPUT comparison (hardened 2026-06-07)

`wasi_tests.ts` runs each standard test as: compile → run-ts (native TS via `wasmtk run x.ts`) →
run-wasm (`wasmtk run x.wasm`) → **compare the two outputs**. It captures both stdouts and fails the
test with `output-mismatch` if they differ. BEFORE this, the runner only checked per-step **exit
codes**, so a test that compiled and ran (exit 0) "passed" even when the WASM output was wrong —
this masked dozens of real codegen bugs (see compiler-bugs.md "Runner-hardening audit"). **Lesson:**
a green suite no longer requires manual output-verification, but historically it did — don't trust
an old "NNN/NNN PASS" claim to mean correct output.

Opt-out marker `// @allow-output-diff[: reason]` (in the first 10 lines) skips the output comparison
for tests whose wasic semantics _legitimately_ differ from native TS — currently float-formatting
precision (`45_random-numbers`, `7a_MathIntrinsics`, `7a_constants`) and zero-sentinel destructuring
defaults (`48_ObjectDestructDefault`, `48_Phase48Combined`). `@test-pipeline` and `@modc-prereq`
tests skip the comparison (they self-check via traps / can't run-ts). Use the marker SPARINGLY —
only for a genuine, documented semantic divergence, never to paper over a bug.

## Test populations in `tests/wasi/wasm_wasi/`

| Population                                                         | Runner                               |
| ------------------------------------------------------------------ | ------------------------------------ |
| wasic phase tests (Phase 1–50 + sub-phases) + 103 bindgen fixtures | `wasi_tests.ts` / `bindgen_tests.ts` |
| Go-by-Example tests (imported)                                     | `wasi_tests.ts`                      |
| jstyper unit tests                                                 | `jstyper_tests.ts`                   |

**Not auto-run:** `tests/go_fixtures/hello.go` — the Go producer (`run` / `modc --lang=go`) fixture.
Excluded from the suites because building it needs the TinyGo/Go toolchain (not assumed on every
machine/CI). The **Zig and Rust producers** (`--lang=zig` / `--lang=rust`) are likewise not
auto-tested — they need the `zig` toolchain / `rsxtk` + `wasm32-wasip1`. Both were verified manually
end-to-end (2026-06-07): Zig `init`→`run`(PASS)/`modc`→`mod add 2 3`→5; Rust `init`→`run`("Hello
from rsxtk!")/`build`→`.wasm`/`add`/`list`/`clean`. Manual verify command is in the file header.

