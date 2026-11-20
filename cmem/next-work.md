# Next-work — the ONE list of what is open

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 3.** The sections continue in:

- [next-work-2.md](next-work-2.md): from "Open now"
- [next-work-2b.md](next-work-2b.md): continued
- [next-work-3.md](next-work-3.md): from "Open now (continued)"

Only open items, each pointing at its record (workspace `memory-conventions.md`: working memory,
not an archive; git is the archive). Completed work appears below only as dated summaries with
commits. **The full text this file held before 2026-09-30 (1,240 lines: every census, bump log,
branch audit and superseded plan):** `git show 2d151714025:cmem/next-work.md`.

> Closed sections (13) moved verbatim to [archive/next-work-to-2026-11-20.md](archive/next-work-to-2026-11-20.md) on 2026-11-20 (H38).

## 2026-11-20 — H38, H43, H37 (owner: "commit. then work on H38, H43 and H37")

On branch `refactor/host-ts-2026-11-20`, committed after `a3aee940` (local, not pushed).
- **H38 (memory guide), all seven steps:** `STATE.md`; INDEX.md a 2 KB router (the old one verbatim
  in `archive/INDEX-to-2026-11-20.md`), its rules in the new `working-rules.md`; root `CLAUDE.md`
  names the two only; closed sections to `archive/` (compiler-bugs 68 sections, next-work 13,
  roadmap 16, testing's 52 older count notes, the legacy archive and the two purge records);
  15 files split under 25 KB; 33 wide tables to lists; `scripts/check-cmem.ts` (the workspace's,
  identical), `deno task check-cmem`: all limits hold (was 746 problems). Checked by script: every
  word of the old notes is still in `cmem/` (270,510; 20 rewritten-rule words aside, recorded in
  design-decisions.md), all 212 links resolve. ★ copy → `best-practices-shared.md`, unchanged.
  **Not done:** open and closed still share some files (the audit-round tables, next-work's
  "Open now"): a finer pass, file by file.
- **H43 (scratch):** rule 15, the end-of-session step and the sub-agent rule in `working-rules.md`;
  measured: no wasmtk folder left in any temp root, the assistant memory folder empty, the suites
  clean up their `wasmtk_*` folders; this session's scratchpad emptied at each commit.
- **H37 (review standard):** (a) `review-process.md` rewritten (old one in `archive/`); (b)
  `cmem/review-issues.md` gitignored, `scripts/check-privacy.ts` (from binaryang's) refuses it
  tracked — clean on 1,925 files, self-test `scripts/check_privacy_gate.ts`; (c) round 6's open
  findings moved there; (d) guard 0g = `scripts/review-gate.ts`, the release's first step (28
  self-test cases, 4 mutants caught, rehearsed in a scratch repo), the record parser and
  `--verify-commit` deleted; (e) `publish.yml` `checks` = `is-release` only (YAML parsed, outputs
  consistent; UNMEASURED on GitHub until the next push); (f) the seven review words; (g)
  `platforms.md` (H39) and six settings tagged `[win-x64, win-arm64]`.
- **For the owner:** round 6's findings are ALREADY on GitHub (`origin/main` `8e627039` carries
  them in `cmem/compiler-bugs.md`): leave, or purge history? Gaps named in review-process.md: no
  licence inventory gate, no vulnerability check; `LICENSE-APACHE` shipped beside an `MIT`
  manifest (the first licensing review's question).
- **Answers written at "commit"** in the workspace letters H37, H38, H43.

## ⏸ PAUSED 2026-11-12 (end of day) — review round 6 FOUND, NOT FIXED (owner: pause)

Round 6's three reviewers ran on `bd69c99f` (local, unpushed; `origin/main` = `eae9f1c9`). Their
findings are NOT fixed; since 2026-11-20 they are in the gitignored `cmem/review-issues.md` (H37 (c)).
**Resume:** re-measure R6-L1 yourself, ask the owner which groups to fix (A–D) — H37 (d) / (e)
replace part of what they concern — fix with a test + mutant each, rehearse, commit. The reviewers'
temp folders were gone when checked on 2026-11-20 (H43).

## 2026-11-12 — workspace items for wasmtk (owner: same words as 2026-11-10)

- **H35 (one review process, every project) — DONE:** the three words ("review", "security
  review", "hardening review") in INDEX.md § Owner commands; wasmtk's slots in the new
  [review-process.md](review-process.md) (private data, the worst silent case = a valid module
  printing something JavaScript would not, reference results with dates, CI, five review classes,
  the seven security surfaces, the environment matrix, compiler-bugs.md as the findings ledger);
  `deno task release` refuses unless the version's release.md entry records BOTH reviews, each
  ended by an empty round (guard 0g; `scripts/check_release.ts` 7 cases, 3 mutants; rehearsed
  against a scratch bare origin, 3 cases). **OPEN, the first security review's first question:**
  the producer verbs' and the CLI's subprocess time limits are not measured (review-process.md
  § 2, surface 4). **No review has been RUN yet** — the next release needs both, to an empty round.
- **C45 CLOSED** (wasmtk's row): loader-js and loader-jvm make the page on the tag with no branch,
  re-derived on each `origin/main`.
- **C46** (S3D → workspace) is H35's source, not addressed to wasmtk. H6 (H6.5b), H10, H12 as
  before; H19, H27, H28, H30–H34, C30, C34, C43, C44 answered, waiting on their creators.
- **Pushed** `a44ed8a0` (CI run 43279478676 green, `checks` only). **Seen in the workspace the same
  day (`projects.md`), re-read here:** binaryang 3.0.3 / 3.0.4 released 2026-11-11 in the owner's
  order — the bot-made tag published to JSR with provenance, which answers wasmtk's U6 caveat
  (publish.yml / workflow.md updated); 3.0.3 and 3.0.4 are the same package as 3.0.2, so the next
  binaryang bump targets **3.0.4** with C43's list unchanged (workflow.md § Bumping). The workspace's
  card for wasmtk in `release-process.md` § 7 still shows the pre-convergence state (measured before
  `ff9cff07`) — the H33 answer has the per-slot status; the card is the workspace's to refresh.

## 2026-11-10 — workspace items for wasmtk (owner: "review workspace for items needing this project's attention and make the requested fixes")

Every open ledger row naming wasmtk, read; answers in each row's cell.
- **H30 (no `gh`, in CI too) — DONE.** `publish.yml:69` `gh release create` → `scripts/publish-workflow.ts
  release` (REST API, `GITHUB_TOKEN`); the "next diagnostic needs `gh`" notes in
  design-decisions.md re-worded. `gh` in tracked files outside comments and history: 0.
- **H32 (CI makes every new tag's page) — DONE with H30**, in its order: a `release` job after the
  upload, `contents: write` only, sparse checkout of the script; JSR 200 → tag peels to the commit
  → the page ON the tag, or done → read back; per-call time limits. `scripts/check_publish_workflow.ts`
  11 / 11 on a mock API, 4 mutants caught (no peel check → E; existing page not done → B; JSR
  not consulted → F; jsr-has reading a 500 as absent → K); read-only on the real API for `v3.0.0`
  (page there → 0 writes; wrong commit → refused before a write; absent tag → refused).
  Annotated-tag peel: mock only (wasmtk's tags are lightweight). **UNMEASURED on GitHub until the
  next tag** — its first page's `author.login` goes into the H32 row then.
- **C30, C34 (S3D, record-only) — read; both APPLIED:** the one job held `id-token: write` AND
  `contents: write`; now OIDC and repo-write are in different jobs, checkouts don't persist the
  token, every action is pinned to a commit hash (each read from its release tag with
  `git ls-remote`). A failure after `deno publish`'s upload skipped the page; now `release` and
  the provenance check run on `uploaded`. C34 (2)–(4) n/a (no npm, no version handed between
  jobs, no YAML-reading test).
- **The official release process (workspace `release-process.md`; ledger C44, letter H33) —
  ADOPTED in 🔒 the owner's order D1** ("the CI to check first, then push the tag, and then create
  the release page from the tag, then publish the package to the registry"; also "We should be
  releasing on version tag and creating a release page at that time"): the version tag IS the
  release, no `release/<tag>` branch. `deno task release` (`scripts/release.ts`, U4) pushes `main`
  only; publish.yml runs on every push to `main`: `checks` (U5, `is-release`, `--verify-release`)
  → `tag` (U6, CI's annotated tag) → `release` (U7, the page from the tag) → `jsr` (U8, last,
  `jsr-has` skip, Rekor fatal). Every action pinned to a commit hash. Record: **new
  `release.md` § "Release History"** (U11 / D3). Rehearsed: the jsr tree (37 files = a full
  clone's); `release.ts` + CI's `checks` decisions, 11 cases against a scratch bare origin; the
  CI steps 16 cases on a mock API, 6 mutants each caught by its own case. **Pushed 2026-11-10
  (`origin/main` `35301d47`); the NON-release path MEASURED on GitHub:** run 42846020431 (event
  push) — `checks` green (is-release, type check, the dry run on the jsr tree), the release-candidate
  gate skipped, `tag` / `release` / `jsr` skipped, as for a version already tagged (3.0.0).
  UNMEASURED until wasmtk's first release in this order: its own tag → page → publish half. **The
  U6 question is answered elsewhere (2026-11-12):** binaryang released 3.0.3 / 3.0.4 in this order
  on 2026-11-11 — annotated tags by `github-actions[bot]`, JSR provenance 3814264552 / 3815373888
  (re-read by wasmtk), so a bot-made tag in the same run does publish to JSR. **Not converged, recorded:** U3 `bump` does not refuse a dirty
  tree itself (`release.ts` does, before anything is committed) and does not run the previous
  tag's tests (`check_prev_tests.ts`, ~25 min, stays a manual step 5 — a patch / minor needs it);
  U5 no tests in CI (wasmtk's gate is local; Deno-exit P7); U9 Bun and Deno come through their
  setup actions by version, no sha256 (as binaryang); U11 the per-release logs before 2026-11-10
  stay in roadmap.md § Release status, indexed from release.md, not moved; H6.5b consumer suites
  (🗓️ OWNER). Today's earlier steps (`ce8af1ef`, `c6ae6b27`) built the superseded order — tag
  pushed locally, page after the publish; this replaces them.
- **OPEN, found 2026-11-10: the compatibility gate's own self-test is stale.**
  `bun scripts/check_compat_gate.ts` (run because `api-surface.ts` changed): 15 / 19, red A1, A2
  (a level "below the MAJOR floor" — but the floor against the real last tag `v3.0.0` is PATCH
  now), D1 (the 2026-09-30 reviews match no change since v3.0.0) and F4 (`--verify-tag v3.1.0` "below
  the floor" — a minor is allowed at a PATCH floor). The SAME four are red at `c6ae6b27`, before
  this change (measured in a scratch clone), so they are expectations written against v2.0.3
  that went stale when 3.0.0 shipped, not a regression. Re-anchor A1 / A2 / D1 / F4 on a scratch
  tag with a KNOWN surface (as C already does), then invert. Must be green before the next bump
  relies on it. **Seen while confirming (read-only, on each `origin/main`):** binaryang and 8
  loaders make the page on the tag with no branch; **loader-js (`scripts/github-release.ts:165`)
  and loader-jvm (`scripts/github-release.main.kts:143`, `:168`) still create `release/<tag>`**
  (jvm also targets the page at it) — reported in the ledger, theirs to change.
- **H31 (Bun notation = latest installed) — conforms:** the two pins are 1.4.4 = installed; dated
  measurement lines stay. Rule recorded in INDEX § tooling (rule 4).
- **C43 (binaryang 3.0.2) — recorded for the bump:** workflow.md § "Bumping the binaryang backend"
  carries their read of our tree and the checks; the bump itself is NOT done (a MAJOR with a full
  gate; owner's call when).
- **No new action from wasmtk:** H6 (H6.5b waits on the owner), H10 and H12 (work items, as
  answered 2026-10-26), H19 / H27 / H28 (wasmtk's parts verified by the workspace).

## 2026-10-26 — H11, H12 round 3, and the owner's number-type direction

Owner, 2026-10-26: "fix H11 and H12 then explain what the consumer suites are waiting on"; scope
chosen by the owner: H11 = the `wasm-bundle` switch, H12 = audit round 3 (not a gate waiver);
then, after round 3's size: "record + worst few", and "land" the switch.

- ✅ **H11: `wasmbundle` runs on binaryang's `bundle()`** (offload-inventory.md, 2026-10-26 note).
  Found measuring it and fixed: sw139 (shared heap at 0), sw140 (a negative CLI argument read as
  a flag), witgen accepting binaryang's `.wit` header, sw178–sw181 on the bundle path. Draft reply
  in `scripts/binaryang-report.md` (SENT 2026-10-26 via the workspace ledger, row C12, with the
  2026-10-23 pin report; one question: is `Module._inner` a
  stable contract). **Answered 2026-10-28, C12 CLOSED 2026-11-05:** yes — `Module._inner` and
  `bundle()` are public surface under binaryang's gate (MAJOR to change), wasmtk recorded as a known
  consumer; the address-0 hazard is in their `bundle.md` § Known gaps; the `delegate` fix below. Open from H11: wasic's relocatable output (exact relocation), offload #1 for
  the wasic MERGE path (sw178 / sw180 still there).
- ⏳ **H12: audit round 3 NOT converged** (compiler-bugs.md § "audit round 3"): 52 silent + ~105
  loud; fixed today sw141, sw142, sw149–sw152, sw160, sw174, sw179, sw181 (+ sw178 / sw180 for the
  bundle). **Open: silent 23 compiler + 20 tool**, then the loud groups ld115–ld118. Phase 1 of
  the modularization stays gated.
- ✅ **MEASURED 2026-10-26 (owner: "proceed with item 1 which should also address items 7 and
  8"; then "I agree" to scoping the Bun transition with it):**
  [number-model-and-runtime-plan.md](number-model-and-runtime-plan.md) — the P0 harness built
  (`scripts/migr/`), the typed baseline, the plain-number measurement, sw146 folded into sw145
  (item 7: no ruling needed), the refreshed Deno-exit order (item 8: P0 done; M2 / M4 reopened).
  **M2 / M4 DECIDED 2026-10-26** (the oracle rule; Bun stays the reference). **Waiting on the
  owner: decisions N1, N3, N4** (N2 decided 2026-10-26: integers by inference only — no legal
  integer hint exists in TypeScript's types).
- 🔒 **Owner's direction, 2026-10-26 (design-decisions.md, top of the number-model section):** no
  type hints, no wasMath; `number` = f64, `bigint` = i64, integers only where the compiler proves
  them (loop counters, indices). Decided in principle, NOT built. **Next, before more i32-typing
  fixes:** measure it (the corpus with every `number` f64 and integer inference for counters /
  indices only: size, speed, which silent rows vanish), then a plan for the owner (`./wasMath` is
  published: Rule 4 deprecation first; corpus and examples migrate).
- **H6.5b, the consumer suites — what they wait on** (asked 2026-10-26): (1) the OWNER's go-ahead,
  recorded since 2026-09-30 and in the workspace's owner-actions list: the step runs the ten
  loaders' fixture suites and LeptonPad against the unpublished wasmtk, in temp copies (never
  writing into those repos), on nine toolchains (Dart, .NET, Go, Rust, Python, JVM, V, Zig, C);
  (2) the fixtures themselves: they are stamped from a wasmtk commit (H7 / drift X8); loader-js
  re-stamps from the pushed post-purge `4a5c3cf668d` first, then the ports copy, so until that
  the suites test against old fixtures; (3) two loaders have NO suite to run (-v, -zig; H7);
  (4) the workspace rule (layout-and-packaging Rule 3) makes a red consumer suite a release
  BLOCKER for a patch or minor, so it will gate wasmtk's next 3.x release once it exists (3.0.0
  was a major and went out without it).
- **Environment: RESOLVED 2026-10-26** (ledger C9, closed): the owner added a wildcard
  `safe.directory` for the workspace folder to the system config. Verified here the same day: git
  runs with no override, and `go_bindgen` is 7 / 7 without `GOFLAGS=-buildvcs=false`. The overrides
  are no longer used.

## For the workspace review — 2026-10-26 (W6–W12; ledger row C10, answers in the ledger's cells; W6, W7, W12 done the same day)

**C26 (from binaryang, its second history rewrite) ANSWERED 2026-11-05:** `upstream/binaryang`
re-cloned (old clone clean, `main` only, no stash, no local-only commit; moved aside, verified,
then removed): HEAD `62b546e2a` = binaryang `origin/main`, one pack, `maintenance.strategy gc`; the
old HEAD `dad09b225` is absent from it and its new id `4fa777a5c` carries the same subject. The one
stale quoted id translated (`next-work.md`, `v1.15.0` `bc97aa573 (was ae9e871)`); a scan of all
244 tracked text files with an id-like string against binaryang's 398-pair old → new map found no
other. Pins name versions, so nothing else moved. binaryang closes the row.
**Found on the way, FIXED the same day (owner: "yes proceed with the fixes"): `deno task
upstream:link` had been broken since 2026-10-13** — binaryang dropped `deno.json` (B7; `jsr.json`
now) and moved the compat entry points to `src/compat/`, so `scripts/upstream-link.ts` refused
("not checked out", exit 1) on any clone. Now it resolves every `jsr:@jrmarcum/binaryang@…/<sub>`
import through the checkout's `jsr.json` exports: all FOUR specifiers map (bundle and validate
too, so an exploration build no longer mixes the checkout with JSR 2.2.0). **A second defect found
proving it:** a run through `deno.upstream.json` pruned the pinned binaryang entry + integrity hash
from the shared `deno.lock`; the generated config now sets `"lock": false` (re-run: `deno.lock`
untouched). Evidence: `legacy/try_delegate.wast` `validatorAcceptedInvalid` 1 on the pin, 0
through the upstream config (the checkout carries binaryang's `delegate` fix); refusals inverted
(no checkout → exit 1; an export renamed in the checkout's `jsr.json` → exit 1 naming it; restored,
clone clean). workflow.md § "Co-developing" records the guard and the check.

**C10 CLOSED 2026-11-05 by wasmtk** (the creator), after verifying the workspace's fold-in: H11
closed in the ledger, H22's wasmtk ✅ in `handoffs.md`, W10 / W11 in `open-work.md`, the
`projects.md` row at 3.0.0. W8–W11 below stay as written; their outcomes are the workspace's.

- **W6. H22: DONE 2026-10-26** (owner: "fix the not done items"). It had NOT been recorded (the
  2026-10-26 review's "H22 recorded: … wasmtk" and H25's "fully compliant" did not hold); now in
  INDEX.md § Policy "No secrets or personal information" — the path test, the not-public / fine
  lists, the email exception (wasmtk fills neither field), the scan, binaries scanned with `-a`,
  snapshots free of absolute paths.
- **W7. H24 + H27: DONE 2026-10-26; C8 still open.** The ★ block re-copied from the canonical
  file (best-practices.md, stamp `Copied from synapticforge1/cmem/best-practices.md on
  2026-10-26`); compared by TEXT: 1 difference before (5.2), 0 after, the inversion caught a
  one-word change. 6.1 kept VERBATIM with binaryang's pre-purge `b8fafaa3f` (rsxtk's precedent):
  when the workspace fixes the canonical 6.1 (C8), re-copy once more the same way.
- **W12. H18 REOPENED for wasmtk by a binary (found 2026-10-26 making W6's scan include binaries):**
  the committed fixture `tests/module/wasm_mod/fib-zig_mod.wasm` carried Zig DWARF with the
  owner's profile, scoop and AppData paths and the OLD project path; every earlier scan used `-I`
  (binaries skipped), as binaryang's own finding the same day. **Fixed at HEAD 2026-10-26:** its
  seven `.debug_*` custom sections removed byte-exactly (every other section unchanged; 6,225 →
  336 bytes; `mod_tests` 55 / 55); the 68 tracked binaries now scan clean with `-a`. **History
  PURGED and force-pushed 2026-10-26** (owner: "lets get the second history fixed"): every blob of
  every GitHub ref scanned (one leaking blob, older than the v1.2.x tags), 745 commits rewritten,
  148 refs force-pushed with leases, GitHub = the verified mirror; this checkout realigned and
  gc'd. **Every hash from v1.2.x to `main` changed again** — record and map in
  [history-purge-2026-10-26.md](archive/history-purge-2026-10-26.md); the H7 stamp is now `4a5c3cf668d`.
  🗓️ OWNER: JSR (its provenance for 3.0.0 and earlier names the pre-purge commits) — the owner is
  handling it (2026-10-26: "I will fix the jsr").
- **W8. Stale workspace cells (verified 2026-10-26):** H16 wasmtk done (gc strategy set, 1 pack);
  H17 / H19 force-push done 2026-10-23; H20 done (3.0.0 published from `synapticforge1` with
  provenance); H21 wasmtk's map is pushed (`history-purge-2026-10-23.md`); H7 / X8 stamp
  `4a5c3cf668d` is on `origin/main`.
- **W9. H11 and H12 status for the table:** H11 — `wasmbundle` switched (this session's commits);
  H12 — round 3 not converged, Phase 1 gated.
- **W10. The owner's number-type direction (2026-10-26)** touches the workspace's I11 / H12 bar
  for `ts2wasm` (wasic's subset changes) and any loader fixture built from typed wasic sources.
- **W11. A cross-repo method note:** golden snapshots must not freeze a checkout's absolute path
  (wasmtk's did; the workspace move made 9 entries "diverge"); worth a line in best-practices if
  another repo keeps snapshots of error text.

