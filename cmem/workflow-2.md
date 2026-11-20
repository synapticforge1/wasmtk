# workflow — part 2 of 2

Continues [workflow.md](workflow.md) (split by size on 2026-11-20, letter H38). Sections:

- The release flow
- Commit conventions
- Traps that have actually bitten

## The release flow

**THE process is the workspace's `../workspace/cmem/release-process.md` § 5 (U1–U12), in 🔒 the owner's
order** (2026-11-10, decision D1): **"the CI to check first, then push the tag, and then create the
release page from the tag, then publish the package to the registry"**. This section is that
process with wasmtk's names filled in; where they differ, the workspace file governs. The record
of every release is [release.md](release.md) § "Release History" (U11, decision D3). § 1's
standing rules hold throughout: nothing published, pushed or tagged without the owner's word;
merge first, bump in its own commit; **never publish and never tag from a workstation**
(`scripts/release.ts` has neither `deno publish` nor `git tag`); provenance read back, not
assumed. **The version tag IS the release** (owner): CI makes it after its checks; no
`release/<tag>` branch on GitHub. Owner commands "commit" / "push" / "release": INDEX.md § "Owner
commands".

1. **U1 Owner: the go and the level** — "release", with patch / minor / major (asked for if not
   given; no tool defaults it). 🔒 **Not ready until "review" is complete** (owner, 2026-11-17,
   letter H37): the five classes ([review-process.md](review-process.md)) on everything since the
   last release, to an empty re-review and a passing full suite on every supported platform; the
   main agent then sets `Review complete: <commit>` in the gitignored `cmem/review-issues.md` —
   `deno task release` refuses otherwise, and when code changed since (guard 0g, its FIRST step).
2. **U2 Merge first — release notes:** `CHANGELOG.md` § X.Y.Z (user-facing; lead with impact) and
   roadmap.md's unreleased block marked released, on a local branch `release/X.Y.Z`; the gate on
   the committed tree; `git merge --no-ff` into `main`; push `main` UNBUMPED (a normal push: CI's
   `checks` runs, nothing is released — the version's tag already exists).
3. **The fresh-clone gate:** clone the pushed commit from GitHub into an empty folder and run
   `deno check main.ts`, `deno publish --dry-run` and `deno doc --lint <the 16 deno.json
   entrypoints>` there (MUST be clean — see traps). wasmtk's full suite gate (§ The full gate)
   ran on the committed tree before step 2; it is not in CI yet (Deno-exit P7).
4. **The consumer check** (letter H6, rule 3 — wasmtk's H6.5b, 🗓️ OWNER until decided): each known
   consumer's suite against the UNPUBLISHED build, or the recorded reason it is skipped; a red
   consumer blocks a patch or a minor.
5. **U3 The bump:** `deno task bump patch|minor|major` (SemVer, H6): the KIND is a
   compatibility statement; major needs a README Breaking Changes row. It writes deno.json and
   syncs package.json + src/utils.ts. THE COMPATIBILITY GATE runs first (H6.3): it refuses if
   api-surface.json is stale (re-baseline in its own commit: `deno task api-surface`, stating
   why), prints the floor since the last `v*` tag with the symbols that set it, and refuses a kind
   below it (`deno task api-surface --floor` previews; a compatible CHANGED item can be reviewed:
   `deno task api-surface --review <entrypoint> <symbol> <member> <kind> <reason>`, committed).
   Rule 4: a removal needs a release that DEPRECATED it first. Before a PATCH or MINOR (Rule 3,
   H6.5a): `bun scripts/check_prev_tests.ts` (~25–30 min; the last tag's tests against today's
   src in a fresh clone; classify every red suite). If api-surface.ts or bump.ts changed:
   `bun scripts/check_compat_gate.ts` (19 cases, 2026-10-23). **Deno floor** (owner 2026-09-28,
   design-decisions.md § Tooling): while fixes are in flight it is the installed Deno, nothing
   written; once out of fixes, write the tested minimum (`deno --version` of the full gate's run).
6. **U4 `deno task release`** (`scripts/release.ts`, since 2026-11-10; replaced `deno task
   publish`). Guards: FIRST the review gate (0g, `scripts/review-gate.ts`, since 2026-11-20 —
   step 1); a clean tree but for the bump's three files, untracked files counted; on
   `main`, and either `main` = `origin/main` with the bump in the working tree, or `origin/main` +
   ONE `bump to vX.Y.Z` commit that passes the commit gate (a bump already committed — review round
   2); the three release files change NOTHING but their version line; the tag absent locally and
   on origin; JSR without the version; the version it bumps FROM released (its tag on origin and
   on JSR — round 4); the compatibility gate (`api-surface.ts --verify-release`: one SemVer
   step, the surface floor — guard 0i, LOCAL only since 2026-11-20); COLD `deno check main.ts`,
   `deno publish --dry-run`, `--version` (exactly the version) and `--help`, all on
   `git archive HEAD` + the bump in a temp folder with an empty `DENO_DIR` (an ignored file the
   commit lacks cannot pass — round 2; nothing registered in .git, Ctrl-C removes the temp folders
   — round 4). git's stderr is never parsed. The push is `--no-follow-tags`; the commit gate also
   refuses a file-mode change (round 5). Tests: `bun scripts/check_release.ts`, 28 cases since
   2026-11-20 (the record cases R1–R16 and X1 retired with the parser; G1–G10 added, 4 mutants of
   the review gate each caught); RUN LOCALLY, not in CI. Rehearsed 2026-11-20 in a scratch repo: no
   issues file → refused at 0g first; a `src/` change after the reviewed commit → refused by name;
   reviewed and unchanged → 0g passes; `--verify-commit` → refused (retired). Earlier rehearsals
   (2026-11-10 to -12, against a scratch bare origin) covered the rest of the guards. **Never push
   a `bump to` commit by hand** — CI releases only the bump commit's own run, pushed alone, and
   since 2026-11-20 re-checks nothing (working-rules.md). Then it commits `bump to vX.Y.Z` (unless already committed), re-runs
   the commit gate on that commit (round 3), pushes
   `main` as a user and reads it back with `git ls-remote` — **and makes no tag.** Rehearsed
   2026-11-10 in a scratch clone against a scratch bare origin (11 cases: each guard refused with
   nothing pushed; the real run pushed `main` = the `bump to` commit with its three files and NO
   tag anywhere; CI's `is-release` and `--verify-release` on that commit, with a too-big version
   jump and a wrong `GITHUB_SHA` refused).
7. **The push to `main` runs publish.yml, in the owner's order** — each action pinned to a commit
   hash, top-level `permissions: {}`, ONE RUN PER COMMIT, never cancelled (round 3, F: a per-ref
   group kept one pending run, and a third push cancelled the pending bump run); a push that is not
   a release runs `checks` only:

(Table as a list — slot · job · token · what it runs:)

- U5 — job: `checks` — token: `contents: read`, `actions: read` — what it runs: ONLY `is-release`
  since 2026-11-20 (🔒 H37 (e), owner: "We want the CI to verify the version, then tag, create the
  release page and publish, and skip any version already published"; the type check, the two
  self-tests, the dry run, the compatibility gate and `--verify-commit` left CI) — `is-release`
  (HEAD = `github.sha`; a release ONLY in the run of
  the bump commit — one parent, whose parent's version differs — pushed alone, `before` = its
  parent, over a RELEASED previous version (round 4), with origin's main still at this version
  (round 5: a re-run of an abandoned bump run never releases it late); there: the tag at another
  commit, JSR without the tag or JSR unreadable = refused; otherwise a release — fresh, resumed past
  an existing tag / page, or, tag here AND on JSR, re-verified so `verify` runs again (round 4); a
  version-line revert to a released version = done; `workflow_dispatch` never releases; any OTHER
  push meeting an unreleased version: brought in by a MERGE = FAILS at once (it can never release —
  round 5); else it reads the bump commit's own run through the Actions API: running = a warning,
  finished = FAILS "UNRELEASED VERSION on main", no run of its own (pushed under a later commit) =
  FAILS at once, unreadable = a warning)
- U6 — job: `tag` — token: `contents: write` — what it runs: CI creates the ANNOTATED tag on
  `github.sha` (REST API; already there at this commit = done, elsewhere = refused — a tag never
  moves), reads it back
- U7 — job: `release` — token: `contents: write` — what it runs: the page FROM the tag: it peels to
  the run's commit → an existing page = done → `POST` on the tag with the JSR link → read back;
  never `gh`
- U8 — job: `jsr` — token: `id-token` — what it runs: LAST: sparse checkout of `publish.include` +
  `deno.lock` + the workflow script; NOTHING but Deno beside the OIDC token (`jsr-has`, `oidc-check`
  under `deno run --no-config` with named permissions); `deno publish` DIRECTLY
- U8 — job: `verify` — token: `contents: read` — what it runs: the Rekor id read back, FATAL — named
  apart: no provenance / NOT ON JSR / JSR unreadable (the LAST read decides); runs only when `jsr`
  ran (succeeded or failed)

   Every `setup-bun` has `token: ""` (the action otherwise takes the job's token — review round 1).

   A bot-made tag in the same run DOES publish to JSR with provenance — measured on binaryang
   3.0.3 / 3.0.4 (2026-11-11; re-read by wasmtk 2026-11-12: annotated tags by
   `github-actions[bot]`, JSR Rekor 3814264552 / 3815373888); wasmtk's own tag → page → publish
   half is still unmeasured until its first release in this order. CI runs no test and no gate
   (H37 (e), 2026-11-20): all of them run locally first. If publish-workflow.ts changed:
   `bun scripts/check_publish_workflow.ts` (71 cases on a mock GitHub / JSR / git / Actions API,
   the is-release step itself included)
   and REHEARSE the changed job as the runner lays it out (best-practices 7.22): a release-job bug
   costs a version.
8. **U12 Failure: re-run the BUMP COMMIT's run** ("Re-run failed jobs", or "all jobs") — `is-release`
   resumes there (all jobs re-verify too), and the tag, the page and the upload each skip what is
   done; the provenance poll busts JSR's cache per attempt (round 4). Never a new tag for the same
   code, never a moved tag. **Stuck** (rounds 3–4): once the bump run has finished without
   releasing, every later push FAILS "UNRELEASED VERSION on main" by name, and the next bump is
   refused until the version before it is released — a lost release cannot stay silent or be
   buried. The way out: re-run the bump run; if its gate REFUSED the bump (or it has no run), revert
   the version line to the last RELEASED version in a normal commit, fix what the gate named, and
   release the NEXT version (`deno task bump`, `deno task release`); the unreleased number's tag /
   page, if any, stay — note them in release.md.
9. **U10 Read back as a user:** the Rekor id (`bun scripts/publish-workflow.ts provenance <tag>`);
   `deno run -A --minimum-dependency-age=0 jsr:@jrmarcum/wasmtk@X.Y.Z --version` in a scratch
   folder; the page (`GET https://api.github.com/repos/synapticforge1/wasmtk/releases/tags/<tag>`
   → 200, `author.login` `github-actions[bot]`); spot-check what the release changed.
10. **U11 Record it:** [release.md](release.md) § "Release History", newest first — a summary of
    what changed, the run id, the read-backs, what was checked as a user. next-work.md and
    roadmap.md's unreleased block updated. Delete the merged local `release/X.Y.Z` branch with
    `git branch -d`.

Only NEW tags get pages (owner, 2026-11-09): no backfill. **Releases go out from `main`** (owner).
The variants and their lessons are in release-process.md § 3; where § 3 says "push the tag", D1
replaces it with "push `main`; CI tags".

## Commit conventions

Conventional-commit subject (`fix(wasic):`, `docs(cmem):`, `chore:`, `release:`). The body is where
the value is: **state the root cause, the concrete wrong output, why it went untested, and what was
deliberately NOT done**. Several bodies this session recorded a rejected alternative — that is the
part a future reader needs. End every commit with **the attribution line the session supplies**
(a `Co-Authored-By:` trailer). The model name in it changes between sessions, so it is not written
down here (workspace `working-rules.md` § Git, which named this file for hard-coding one; fixed
2026-10-27).

## Traps that have actually bitten

- **PowerShell eats `stash@{0}`** (2026-10-26): unquoted, `{0}` is a script block, so
  `git checkout stash@{0} -- .` FAILED while the `git stash drop` chained after it ran — the work
  existed only as the dropped stash commit, recovered from the hash `stash drop` printed
  (`git checkout <hash> -- .`). Quote it (`'stash@{0}'`), and never chain a `drop` after the
  command that consumes the stash: check, then drop.
- **`git reflog expire --expire=now --all` empties the stash LIST** (the list IS `refs/stash`'s
  reflog; the ref survives). `git stash store <commit>` writes nothing when `refs/stash` already
  holds that commit: `git update-ref -d refs/stash` first, then `stash store` (2026-10-26, after
  the second purge).
- **A `--mirror` clone refuses explicit refspecs on `git push origin`** ("--mirror can't be
  combined with refspecs"): push to the URL instead, one `--force-with-lease=<ref>:<old>` per ref
  (2026-10-26). Do history rewrites in such a mirror on NTFS, never in the exFAT checkout (VS
  Code's auto-fetch moves remote-tracking refs mid-rewrite, 2026-10-23).
- **`deno fmt` drift lands in a fix commit** (2026-10-26: 12 files on `main` were not fmt-clean
  under Deno 2.9.8, so `deno fmt main.ts src/` turned a ~200-line fix into ~1,900 lines). Run
  `deno fmt --check main.ts src/` BEFORE starting; if `main` is dirty, format it in its own
  `style:` commit first, then the fix.
- **A privacy scan with `git grep -I` skips binaries** (2026-10-26): a committed `.wasm` carried
  Zig DWARF with machine paths through two scans and a history purge. Scan with `-a`, and scan
  every blob of every ref before a purge (INDEX.md § Policy).

- **A branch switch can fail half-way on this machine** (2026-10-22): `git checkout main` moved HEAD,
  deleted `cmem/workflow.md`, then could not write it back ("unable to create file …: File exists",
  most likely a Windows file lock held by an editor or indexer). The working tree was the BRANCH's
  files minus that one, under a `main` HEAD. Nothing was lost (the commit was already made); the
  repair was `git diff <commit> --stat` to prove the only difference was the missing file, then
  `git checkout -f <branch>`. **Fast-forward `main` without switching to it:**
  `git fetch . <branch>:main` (fast-forward only, never touches the working tree).

- **Untracking a file AFTER switching branches deletes it.** `git rm --cached` correctly keeps the
  file on disk, but a later `git checkout main` restores the still-tracked file and the
  fast-forward merge then applies the deletion to the working tree. Merge first, then untrack — or
  do it on `main`. (Cost a restore-from-git on 2026-07-30.)
- **`grep -c` exits 1 when the count is zero**, so `… ; grep -c "FAILED"` as a script's last command
  makes a perfectly green run report a non-zero exit. Trust the runner's own summary.
- **Do NOT run the Go suites concurrently with the wasi suite on Windows** — TinyGo's build races
  the OS file lock and yields spurious `os error 32` failures that look like real regressions.
  **Widened 2026-07-30: the Go suites race EACH OTHER too.** Chained back-to-back in one
  `for s in go_bindgen go_merge go_asyncify` loop, `go_asyncify` reported 10 passed / 2 failed; run
  alone immediately afterwards it was 12/12 with no source change. Run them one at a time, and
  re-run any Go failure alone before believing it. **Sharpened 2026-07-30: SEPARATE back-to-back
  invocations are still too close.** Run as three individual commands (not a loop), `go_asyncify`
  again gave 10/2 with `TinyGo build failed`, then 12/12 on an immediate re-run. It is the TinyGo
  build directory, not the shell loop — let the previous Go suite settle, and treat a first-run Go
  failure as unproven until it reproduces alone.
- **`deno doc --lint` must be clean across all 16 JSR entrypoints** or the JSR score drops below
  100. This has bitten twice: v1.11.4 scored 94 (missing `@module` tag), and v1.11.8 nearly shipped
  with an undocumented `scaffoldZigProject`. **Third time, v2.0.3 (2026-09-28):** two errors — a
  JSDoc stranded by an INSERTION (a class added between `parseSexprs` and its comment in
  `src/wast.ts`), and `getHelperWat` (`src/console_log.ts`), undocumented since March and shipped
  that way in v2.0.2, flagged now. When inserting a declaration, insert it ABOVE the preceding
  doc comment, never between a comment and what it documents.
- **Verify a "new" failure against a clean tree** (`git stash` + `deno task install` + re-run)
  before attributing it to your change. `bundle_tests`/`StructImport` and the string-namespace
  failures were both confirmed pre-existing this way.
- **Never run bare `deno fmt`.** Always scope it: `deno fmt main.ts src/` (plus `scripts/`). Bare
  `deno fmt` would reformat the hand-written `tests/` corpus, which is compiler INPUT. Markdown is
  excluded in `deno.json` (`fmt.exclude: "**/*.md"`, owner decision 2026-09-20) — **not** because
  fmt "mangles tables and fences" (that claim was RETRACTED 2026-09-20: a trial run changed zero
  table or fence counts), but because it PADS table cells into very long lines (744 lines over 120
  chars on the trial) so every later hand-edit of `cmem/` re-dirties the file. `main.ts` + `src/`
  ARE fmt-clean and `.gitattributes` keeps them LF across checkouts. See design-decisions.md §
  Tooling.
- **Fix `src/wasic.ts` and `src/console_log.ts` together.** They hold parallel binary-op loops and
  parallel string handling; three bugs this session were half-fixed by changing only one.

