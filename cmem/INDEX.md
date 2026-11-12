# cmem — Portable Project Memory for wasmtk

The **authoritative, portable** project memory for `wasmtk`. It lives inside the project tree, so it
travels with the repo and the USB — unlike the root `CLAUDE.md`, which is `.gitignore`d and
machine-local.

**Format:** one focused topic file per domain. **This index stays one line per file** — it is read
at the start of every session, so keep it cheap; put the detail in the topic file, not here.
(2026-07-30: the pointers had grown into paragraphs and this file had reached 121 KB, which made
every session start expensive. Trimmed back; earlier revisions are in git.)

## How to work here

1. Read this index. 2. Open only the topic files the task needs. 3. Record what you learn in the
matching topic file, then refresh its one-line pointer below.

**Method lessons go in [best-practices.md](best-practices.md), not in the topic file.** When a pass
produces a lesson that would apply to a completely different subsystem, add it there **and** leave
the detail in its home file.

**Doing a stress-test batch or a release? Read [workflow.md](workflow.md) first** — it holds the
established loop (branch → test → bisect → fix → full gate → memory → commit → merge → bump →
publish) and the traps that have already cost time.

## Policy (durable — set by the project owner 2026-05-31)

- **`cmem/` is the single home for ALL project memory.** Update the matching topic file, then
  refresh its pointer in the table. Convert relative dates to absolute; update existing entries
  rather than duplicating.
- **`README.md` is NOT project memory.** It is the public, user-facing doc shipped to GitHub/JSR
  (install, per-tool usage, capability surface, examples). Keep internal decision logs and bug
  post-mortems out of it.
- The root **`CLAUDE.md` is a small pointer file**, auto-loaded every session. Never put
  authoritative knowledge there — it is gitignored and would not survive a clone. Its pre-2026-07-30
  contents are archived verbatim in [legacy-claude-archive.md](legacy-claude-archive.md).

### 🔒 No secrets or personal information in anything public (owner, 2026-10-22; letters H18, H19, H22)

Everything committed is public, `cmem/` included (the workspace's `working-rules.md` § Records is
the full rule). Never in a committed file, commit message, issue, the JSR package or a test
snapshot: tokens or keys, email addresses, machine names, or **machine-specific paths**.
**The path test is "is it machine-specific?", not "is it absolute?"** (owner, 2026-10-23; H22).
*Not public:* any path that records the owner's machine layout — a user profile
(`C:\Users\<name>\…`), the project tree (`D:\Programs\…`), other drives (`J:\…`), scoop / AppData
installs, a scratchpad or session id. *Fine:* repo- or sibling-relative paths (`../binaryang/…`),
environment variables, placeholders (`<repo-root>`, `<repo>`, `<scratchpad>`), and a CONVENTION
path that names nothing about one machine and works on any comparable host. Real paths and machine
facts go in the gitignored `cmem/local/`; tool settings (`.claude/`) are never tracked (removed
from every commit by the 2026-10-23 purge). **The one email exception** (owner, 2026-10-23;
widened twice 2026-10-26, the second time by letter H28): the maintainer contact email, in a
registry's manifest field, as the git commit author/committer address, and in ONE committed `cmem/`
note that names the maintainer contact — nowhere else, never repeated. wasmtk uses none of the
three: JSR reads no author field, wasmtk's commits carry the GitHub noreply address (since the
2026-10-23 purge), which the rule permits it to keep, and no `cmem/` note names a contact (checked
2026-10-27: no email in any tracked file but noreply addresses and test strings). **Before
committing, scan the diff**:
`git grep -I -n -i -E '[A-Za-z]:[\\/]+(Programs|Users|scoop|tools)[\\/]|/[a-z]/(Programs|Users)/'`
plus an email pattern. A hit is a CANDIDATE, judged by the path test: `upstream/` (gitignored) and
the third-party `node_modules/.deno/@jsr+std__path` test strings in OLD commits are not ours; the
`legacy-claude-archive.md` placeholders (`<home>`) are already scrubbed. Binaries count too (a
committed `.wasm` can carry debug paths; binaryang found five, 2026-10-26): scan with `-a`, not
`-I`, before committing a binary. A golden or test snapshot must not freeze an absolute path (the
golden harness writes `<repo>`, 2026-10-26).

### Trigger — "update the project memory" (binding on every agent)

When the owner says **"update the project memory"** (or a clear synonym), do BOTH:

1. **Revise all relevant `cmem/` files** — fold in the latest decisions, found bugs, design changes
   and current state; refresh the one-line pointer below; absolute dates; update, don't duplicate.
2. **Sync `README.md` only where the change is user-relevant** — capability surface, install/usage,
   examples, status. **A new README roadmap row goes immediately beneath the phase row it belongs
   to — grouped by PHASE, not appended by date** — with the date in the **Phase** column
   (`NN bug fix (YYYY-MM-DD)` / `NN enhancement (YYYY-MM-DD)`), and ending with the test that covers
   it. Appending dated rows to the end of the `✅` block makes them invisible. `⏳` rows always come
   last. Full placement/labelling directive: top of [roadmap.md](roadmap.md).

### Trigger — "look for code issues" (binding on every agent)

Comprehensive audit across **both tested AND untested** paths for: (1) workarounds/temporary hacks;
(2) dead code (verify each with a grep); (3) bugs — silently-wrong codegen, inverted logic,
type-inference gaps, scanner off-by-ones; (4) **fall-throughs** — the worst failure mode: unhandled
input emitting a comment-stub + bare `0`/`""` instead of erroring. Prefer converting silent-wrong to
a hard `diagnostics` abort, guarding speculative probes with `quietEmit`. Fan out parallel read-only
investigators per category when the surface is large. Report `file:line` + severity, fix the safe
ones, and keep every suite green (**output-diff, not just exit codes**).

### 🔒 Two HARD RULES for tooling (owner directive 2026-09-19, binding on every agent)

1. **Scripting is TypeScript ONLY, run with Bun** (owner, 2026-10-21: "deno is going away";
   before that, Deno, 2026-09-19). Ad-hoc probes, migrations and repairs are written as `.ts` in
   the scratchpad, on `node:` builtins (`node:fs`, `node:child_process`, `process`; not `Bun.*`, not
   `Deno.*`), and run with `bun <file>`. The repo's `scripts/` are the same (Deno-exit plan P5,
   done 2026-10-21). **Until the product moves (P2), a probe that imports `src/` through deno.json's
   import map** (binaryang, `@std/path`: the compiler, `src/binaryen.ts`) **runs with
   `deno run -A --config deno.json <file>`**; Bun does not read that map. **No `python3`**, no inline
   `python3 -c`, no `node -e`, no `bun -e`. A TS probe can import the real modules instead of
   reimplementing them, and python brought a second encoding regime (cp1252 stdout) and a second
   escape pass into a UTF-8 repo.
2. **No heredocs. Ever, in any language.** Not `<<'EOF'`, not `@'…'@`, and **not for commit
   messages** — write the message with `Write` and use `git commit -F <file>`, never `-F-`.
   Five content corruptions trace to heredoc transport, including a literal NUL byte written into
   `.gitattributes` and another into the rule warning about it. **The corruption is invisible in
   the source that produces it**, so attention does not help; use `Write`/`Edit` for content and
   let the shell only RUN things.

Full rationale and the incident list: [best-practices.md](best-practices.md) §4b.

**Two workspace tooling rules, binding here too** (workspace `working-rules.md` § Tooling 9, 10):

3. 🔒 **No `gh`, in CI too** (owner, 2026-11-08, letter H30: not installed and will not be). Check
   the repo instead (`git ls-remote`, the repo's files, registry APIs); in a workflow, GitHub's REST
   API from a Bun step with `GITHUB_TOKEN`; a GitHub web-UI task is an owner item. wasmtk's one call
   (`publish.yml`'s `gh release create`) became `scripts/publish-workflow.ts release` 2026-11-10,
   and every tag's GitHub Release page is made BY CI that way (letter H32), only for new tags.
4. 🔒 **Every Bun-version notation is the latest installed Bun** (owner, 2026-11-09, letter H31):
   pins, setup lines and any minimum supported Bun move to it at the next session after a newer
   Bun is installed, gate run first; a dated "measured on Bun x.y.z" line stays until that test is
   re-run. Here: `publish.yml`'s two `bun-version` pins, 1.4.4 = installed (checked 2026-11-10).

### Trigger — regression gate (owner directive 2026-07-28, binding)

**When a bug is found/fixed, run the ENTIRE suite set — including `wast_tests`.** Skip a suite only
when the change is provably outside its reach, justified from the impact map in
[testing.md](testing.md). Two traps that map records: **`go_merge_tests` is NOT a Go-only outlier**
(it compiles a TypeScript driver with `wasic`), and **both `dync_*` suites are wasic-dependent**
(`src/dync.ts` imports `compileWasiTs`). "Outlier" is relative to which FILE changed, never absolute
— verify with the greps in testing.md rather than assuming.

**The gate is triggered by a CHANGE, not by a batch (owner directive 2026-07-30).** If a stress-test
batch surfaces **no bug** and leaves `src/` untouched — the new tests pass as written — **do NOT run
the full suite.** Adding `.ts` files to `tests/wasi/wasm_wasi/` cannot regress the other 400; the
phase filter IS the whole gate. Full-suite runs cost >10 minutes and buy nothing here.

### 🔒 The workspace correspondence ledger (owner, 2026-10-26)

`../cmem/workspace-correspondence.md` is the ONE index of items between the projects. **Read it at
session start and before each new work item** (rows to wasmtk, and rows touching the work); a row
that would be overtaken by the new work is handled first, or the conflict is written into the row.
wasmtk ANSWERS a row addressed to it in the row's "full text" cell (the commit, or "declined: why")
and never sets its status; the creator verifies and closes. An item wasmtk sends adds a `C` row
(next number, re-read the table first) in the same session. The full text stays where it was
written (`../cmem/handoffs.md`, this repo's `next-work.md`).

## Files

| File | What it holds |
| --- | --- |
| [best-practices.md](best-practices.md) | METHOD, not findings: rules that stop a defect class recurring, each with its incident and origin tag (2026-11-05 added: prove which dependency ran with a discriminating input; read a producer's layout from its manifest; move every caller incl. CI when a script changes runtime; a side config must not share the gate's lockfile); ends with the workspace's 28 ★ convergent rules (a stamped copy, never edited here; re-copied 2026-10-27 after the source fixed 6.1's id, ledger C8; checked by text, 0 differences). Read before an audit, a conformance pass or a bump. |
| [workflow.md](workflow.md) | The working loop (branch only for a fix → gate → memory → commit → merge), the release flow (since 2026-11-10 the workspace's release-process.md § 5 in the owner's order D1 — CI checks, then CI tags, then the page from the tag, then the publish: `deno task bump` behind the compatibility gate, `deno task release` pushes `main` only, publish.yml `checks` → `tag` → `release` → `jsr`, no release branch; one run per commit, only the bump commit's own run releases, the stuck-release way out (round 3); self-tests `check_release.ts` / `check_publish_workflow.ts`, run in CI), the binaryang bump checklist (four pinned specifiers since 2026-10-26; the 3.0.x checks from binaryang's C43), `upstream/` co-development (2026-11-05: `upstream:link` maps from the checkout's `jsr.json`, the upstream config uses no lockfile, the `try_delegate` check that a run used the checkout), context boundaries, traps (2026-10-26: PowerShell's `stash@{0}`, `reflog expire` emptying the stash list, pushing from a `--mirror` clone, `deno fmt` drift, `-I` scans skipping binaries). |
| [review-process.md](review-process.md) | wasmtk's slots in the workspace's review standard (owner, 2026-11-12, H35): "review" / "security review" / "hardening review"; private data, the worst silent case, reference results, CI, review classes, the seven security surfaces, the environment matrix, where findings go; the release gate (both reviews, each to an empty round, recorded in release.md before the bump — `deno task release` guard 0g). |
| [release.md](release.md) | 🔒 THE one record of every release (owner D3, 2026-11-10): § "Release History", newest first — a summary of what changed, the CI run, the read-backs (JSR Rekor id, the page), what was checked as a user. 3.0.0 back to 1.7.0 summarized; the older per-release logs stay in roadmap.md § Release status, indexed from here. The process itself: workflow.md § The release flow. |
| [overview.md](overview.md) | What wasmtk is; repo layout; the key source files. |
| [architecture.md](architecture.md) | wasic / modc / bindgen / hybrid; the pluggable binaryang backend; the build and merge pipeline; the `wast` spec runner. |
| [testing.md](testing.md) | How to run every suite; which suites a change reaches (impact map); current counts, dated (2026-10-26, H11 + round 3's worst rows: wasi 509/509, golden 568 (44 class entries re-recorded), cross-check 1368 + 6 new pairs, merge_layout 17, all green (that gate's Go suites ran with `GOFLAGS=-buildvcs=false`, no longer needed since C9 closed); 2026-10-24, binaryang **2.2.0** pinned, nothing moved: wasi 507/507, golden 566 identical, wast 64,506 / 0 / 16, cross-check 1368; sw119: wasi 507/507, golden 566 re-recorded (234 codegen), cross-check 1368, all green; ld45: wasi 503/503, golden 560 with 1 pipeline entry moved, all green; 2026-10-23, binaryang **1.16.1** pinned, nothing moved from 1.15.0; 1.15.0 pinned earlier that day: wasi 497/497, wast 64,506 / 0 / 16, guard 0, go_asyncify 12 / 12, golden 554 with 43 pipeline entries moved, only merged-library functions; 2026-10-21, the embedded capability libraries re-embedded, 6–17 % smaller: wasi 482/482, golden 539 (3 vcap / dynrt pipeline entries moved), all green; 2026-10-20, the loud rows' invalid-module group: wasi 482/482, golden 539, all green; earlier that day binaryang **1.13.0** pinned: wast 64,506 / 0 / 16, guard 0, go_asyncify 12 / 12, 43 pipeline goldens moved by the optimizer; before that 2026-10-19, sw87 on binaryang 1.12.1: wasi 480/480, golden 537 (10 fail on purpose), outpath 12, merge_layout 7, tool_rows 16, wast 64,506 / 0 / 16, `go_asyncify` 12 / 12, nothing known-failing); the wast per-file baseline and its oracles; the engine cross-check; the vendored spec corpus. |
| [compiler-bugs.md](compiler-bugs.md) | The live defect log: root cause, fix, regression test, class (silent-wrong / loud) and tally, incl. the H12 round-1 table of open compiler bugs. **2026-11-12: review rounds 1–4 of the release tooling — sw194–sw212 + ld119–ld131 found by running and FIXED (round 4: a bump over an unreleased version refused; a re-run re-verifies; release.md plain Markdown and the record names its version; the bump run's real state instead of a grace window; `--no-follow-tags`; cold checks on `git archive`) (round 1: the review gate fooled by a negated record; ride-along edits; a stranded release reported green; JSR-without-tag; git's stderr parsed; round 2: the record made a strict form; a hand-pushed bump released unguarded → CI repeats the gate; hidden Markdown; the ref parse; verify / JSR-outage misfires; round 3: F — a cancelled bump run → one run per commit, only the bump commit's own run releases; deno.json-only / no-op bumps passed the commit gate; hidden-text scanner rewritten; the local commit re-verified; no `worktree prune`; self-tests in CI), token hardening, worktree cold checks; next round 5.** **2026-10-26: audit round 3 NOT converged (52 silent sw141–sw192, ~105 loud ld115–ld118; repros scripts/phase0/round3/); fixed the same day sw141/sw142 (`new` shared one object), sw149–sw152 (switch), sw160 (i32 literal range, refused), sw174, sw179, sw181, sw178/sw180 for the bundle; H11 found sw139, sw140; sw193 found; open: silent 23 compiler + 20 tool.** **2026-10-24: sw119 FIXED (the i32 check, on by default; a program without try traps, owner); sw137, sw138, ld114 found and fixed in the merge; open: silent 0, loud 0.** **2026-10-24: ld45 FIXED (the object writer); ld113, sw134–sw136 found and fixed.** **Open 2026-10-21: 2 silent compiler rows (sw119 owner-ruled on a branch; sw123 `T | undefined` prints null; sw122 parseFloat rounding FIXED 2026-10-21), 4 loud compiler (ld94–ld96, ld100–ld102 fixed 2026-10-22, sw128 found and fixed, ld103–ld105 found; 2026-10-22: group 1 fixed, ld38 toFixed, ld43, ld66–ld70; group 2, ld71–ld73 and part of ld78; group 3, ld76, ld77, ld80; group 4, ld41, ld42, ld94 found; group 5, ld78, ld91–ld93, ld97–ld99 found and fixed, ld95, ld96 found; group 6, ld74, ld79, sw126 found and fixed, ld100 found; sw127 refused; before that 22); 0 loud tool (all closed 2026-10-22: ld81–ld85, ld87, ld89, ld90); 1 silent compiler (sw119; sw123 fixed 2026-10-22) (the invalid-module group closed: ld46, ld48–ld50, ld52–ld57, ld59–ld64, ld75; ld91–ld93 found), 9 loud tool.** Before that, open 2026-10-15, after audit round 2 (four auditors, repros in scripts/phase0/round2/): **1 silent-wrong** in the compiler (open: the owner-ruled sw119, measured on a branch; everything else of sw75–sw121 fixed 2026-10-19) and **0 silent tool defects** (all ten, sw109–sw118, fixed 2026-10-19: `outpath`, `merge_layout`, `tool_rows` suites); 40 loud compiler rows, 10 tool rows (ld86 fixed). Read before debugging anything. |
| [design-decisions.md](design-decisions.md) | Invariants that must not be reverted silently: the owner's 2026-10-26 number-type DIRECTION (plain `number` = f64, `bigint` = i64, no type hints, no wasMath; decided in principle, not built), every `new` a fresh heap instance through `$__new_<C>` (sw141, 2026-10-26), i32 `+ - *` give JavaScript's result, a store that does not fit fails (a trap without try, owner 2026-10-24), and the merge's one-exception and relocation rules (sw119, 2026-10-24), console.log's object writer printing exactly what Deno prints or refusing with the reason (ld45, 2026-10-24), typed declarations, the declared type deciding wasm-typed arithmetic (owner ruling), integer `/` refused at compile time in favour of wasMath (owner, 2026-10-09), a float stored into an integer refused (D3) and the located compile-error report (D6) (owner, 2026-10-13), operator grouping per JavaScript's precedence table in both emitters, f32 conversion at every boundary, the thrown kind, nullable fields' flag word (owner ruling), "CR, in both" for `Math` / wasMath (owner ruling), a literal laid out only when it is an exact literal of its type (sw69), console.log evaluating its arguments before building the line (sw68), the merge's block-type and `__heap_ptr` rules (binaryang 1.12.0), console formatting vs string conversion, the binaryang pin and wast oracles, SemVer and the compatibility gate, the console error path, WAT-text rules. Read before changing codegen, a backend or the release scripts. |
| [roadmap.md](roadmap.md) | Releases and phases; the unreleased block after v3.0.0 (2026-10-26: wasmbundle on binaryang, fresh `new`, switch, i32 literal refusal — BREAKING; item 8, 2026-10-27 / 11-05: release and dev tooling on Bun, `upstream:link` fixed); earlier, the unreleased block since the last tag (items 1–35 by 2026-10-15; three BREAKING, so the next release is 3.0.0, on the owner's word); README roadmap-row and Breaking Changes conventions. |
| [next-work.md](next-work.md) | The ONE list of what is open, each item pointing at its record; completed work only as dated summaries with commits. **2026-11-12, later: review rounds 1–4 of the release tooling — all fixed (sw194–sw212, ld119–ld131; round 4: previous version must be released, re-runs re-verify, plain-Markdown release.md with versioned records, the bump run's real state; next round 5): a strict review record, CI repeats the commit gate, cold checks in a worktree, JSR outages tolerated on non-release pushes; F (round 3): one run per commit, the bump commit's own run releases, a lost release fails later pushes by name.** **2026-11-12: H35 done (the review standard: review-process.md, the three words, `deno task release` requires both pre-release reviews); C45 closed; no review run yet — the next release needs a security and a hardening review.** **2026-11-10: workspace items — H30 / H32 done, C30 / C34 applied, and the workspace's release-process.md ADOPTED in the owner's order D1 (H33): `deno task release` pushes `main`, CI checks → tags → page → publishes; release.md created (D3); not converged: U3 dirty-tree / previous-tag tests in `bump`, tests in CI, setup-action sha256; H31 conforms; C43 recorded for the binaryang 3.0.x bump (not done); loader-js / -jvm still make a release branch (ledger).** **2026-11-05: C26 answered (`upstream/binaryang` re-cloned after binaryang's second rewrite, one quoted id translated); `deno task upstream:link`, broken since 2026-10-13 (binaryang's layout moved), FIXED: paths from the checkout's `jsr.json`, all four specifiers, and no lockfile (it had pruned `deno.lock`). wasmtk's ledger rows C10–C12 verified and CLOSED; binaryang fixed the `delegate` depth (tag v2.2.2) → next: pin it, `try_delegate` pin → 0.** **2026-10-27: workspace-rules compliance review (`publish.yml` on Bun, ★ re-copy, H28, C20 / C21 recorded), pushed.** **2026-10-26: H11 done (`wasmbundle` on binaryang's `bundle()`); H12 round 3 not converged (record + worst few fixed); the owner's number-type direction (no hints, no wasMath; measure first) is the next project-level item; H6.5b's four waits explained; workspace notes W6–W12 (H22 path rule recorded, ★ block re-copied for H24 / H27, a binary's debug paths found and the history PURGED a second time); JSR provenance after the purge is the owner's (in hand); C9 resolved (no git / Go overrides needed).** **2026-10-24: ld45 FIXED (with ld113, sw134–sw136); sw119 FIXED (with sw137, sw138, ld114); the wasi suite's per-test timeout added; binaryang 2.2.0 PINNED, nothing moved; **3.0.0 PUBLISHED on JSR with provenance** (tag `v3.0.0`, CI green; H20 done).** **"For the workspace review" (W1–W5): all taken up 2026-10-23 (H15 closed W1–W3).** **2026-10-23, binaryang letter: 1.14.0 / 1.15.0 out, **1.15.0 PINNED the same day, then 1.16.1** (owner: bump first; gate green, 1.16.1 moved nothing; reply drafted), their history purged too (`upstream/binaryang` re-cloned), the JSR provenance outage was scope-wide (design-decisions.md).** **2026-10-23: workspace letters H15–H20 done as L1–L8: links moved to `synapticforge1`, drive paths gone (the bindgen host-runner generator fixed), history PURGED and force-pushed (every hash changed, see history-purge-2026-10-23.md), `.git` gc'd to 1 pack; W4–W5 taken up by the workspace. Open: H20's JSR publishing check before 3.0.0.** **2026-10-21: scripts on Bun (P5); caps libraries re-embedded; sw122 fixed (correctly rounded number parsing); next the 22 loud compiler rows.** **2026-10-20: the loud rows, group 1 (invalid modules and traps) DONE; next the 22 remaining loud compiler rows (refusals), then the 9 tool rows.** **2026-10-20: binaryang 1.13.0 pinned, gate green, reply SENT (`scripts/binaryang-report.md`).** **PAUSED 2026-10-19 at `6068e6d7b48`** (wasi 480/480, golden 537, all green): every silent row but sw119 done; resume with the loud rows (36 compiler + 9 tool), then items 3–5, then scope the number-type reversion. Before that, PAUSED 2026-10-15 at `6a833d4`; the owner decided all 4 questions 2026-10-19 (array out-of-range → undefined; follow the function's origin; `wast` exit codes; i32 overflow throws at the store, sw119); 2026-10-19: fix-order steps 1–2b done (every silent TOOL row closed); step 3's index group (sw80–sw85, sw91, sw92, ld47), spread (sw77–sw79) string-array paths (sw76, sw107) finally (sw106), block scoping (sw104, sw105) and console printing (sw75, sw96, sw98, sw102, sw103) method edges (sw86, sw88–sw90, sw93, sw94) and the last ungrouped rows (sw97, sw99–sw101, sw108, sw121) done; the owner-ruled sw95, sw87, ld88 built; sw119 measured on branch `feat/i32-overflow-check` (owner's decision pending); sw120 fixed 2026-10-19; next the loud rows, then items 3–5; THEN scope the number-type reversion (owner's order). **Owner's direction 2026-10-19 (not built):** untyped = JavaScript's `number` (measure first), jstyper inside the bundle with inference, npm via esbuild for CommonJS (design-decisions.md § "Direction of 2026-10-19"). 2026-10-15: binaryang 1.12.1 pinned, gate green, reply SENT; `wasmValidate` letter answered (re-run wast on their next release); loud batches 1–2 done, all 21 rows closed; audit round 2 done (owner: items 1–5): 43 silent rows found, fix order proposed, 4 owner questions; then binaryang 1.10.0 items, H10, nullable gaps. |
| [capabilities.md](capabilities.md) | Tier-1 stdlib capability libraries (Set, Map, Date, JSON, RegExp) and virtual `wasmtk:<cap>` imports. |
| [polyglot-producers.md](polyglot-producers.md) | Go / Zig / Rust producers: CLI verbs, build invariants, mergeability rules, asyncify. 2026-10-13: TinyGo 0.43 met two binaryang Asyncify bugs; both fixed by 1.12.1, pinned 2026-10-15 (`go_asyncify` 12 / 12). |
| [dynrt-design.md](dynrt-design.md) | The dynamic runtime (`dync`): value model, interpreter, `any` integration, GC. |
| [async-design.md](async-design.md) | Promise / async design and its invariants. |
| [math-cr-sweep.md](math-cr-sweep.md) | The correctly-rounded `mathlib` sweep: dd framework, recipe, gotchas, oracle harness; 2026-10-09 L3 (JavaScript's edge cases, Payne–Hanek trig, an exact oracle reduction). |
| [stdlib-bundling-brief.md](stdlib-bundling-brief.md) | On-demand stdlib bundling design brief (§1–§7d). |
| [offload-inventory.md](offload-inventory.md) | What wasmtk does that binaryang, a runtime or a loader could own (letter H11), each with its trigger. 2026-10-06: the owner decided `wasmbundle` → binaryang's `wasm-bundle`; **MOVED 2026-10-26** (a wasmtk pass around `bundle()`; relocation guessed until wasic marks addresses; the merge path still regex). 2026-10-13: binaryang 1.12.0's optimizer broke the regex merge twice (block types by index, `$__malloc` inlined), more evidence for offload #1. |
| [vision.md](vision.md) | Polyglot ecosystem vision; "TypeScript as a DLL"; loader strategy; repo map. |
| [wasm-number-types.md](wasm-number-types.md) | SCOPE 2026-10-09 (owner: `Math` cannot follow the wasm types): Track M, every `Math` member exact against Deno (measured, appendix table: 39 functions + 8 constants; 23 identical, 14 wrong = sw57–sw61, ld27–ld29, 2 unsupported); Track T, the wasm types as a TypeScript library with exact bodies. Owner 2026-10-09: a COMPLETE library, namespaces `f64` `f32` `i32` `i64` (+ `u32` / `u64`), function lists per type, work order L1–L4, decisions T1–T6 (T1: module `wasMath`; T6: traps are throws). L1, L2, L3 DONE 2026-10-09 (L3 under the owner's "CR, in both": wasMath's Math-style members run the mathlib in Deno too; 199 / 199 exact from compiled programs); L4 DONE 2026-10-13 (the operator bugs; u64 printed unsigned). Re-measure with `scripts/math/`. |
| [deno-exit-plan.md](deno-exit-plan.md) | **P5 (scripts) DONE 2026-10-21, ahead of P0–P4 (owner): 14 scripts and 5 tasks run with `bun` on `node:` builtins, each A/B'd identical with its Deno run; 2 stay Deno (check_try_table_oz: the import map; check_inspect_array_ref: `Deno.inspect` is its oracle); 2026-10-27 `publish.yml`'s script steps on Bun too (`scripts/publish-workflow.ts`; Deno for `deno publish` only).** S3D's measured traps for P1 / P2 / P4 / P8 (ledger C20, C21: `--config jsr.json` rewrites the upload's dependencies), to re-check here. SCOPE 2026-10-13: leaving Deno for Bun + Node (owner, 2026-10-12), JSR stays. Re-measured facts (shipped `Deno.*` in 4 files; wasic's output identical on Deno / Bun / Node 22–26, 410 / 410; the TypeScript reference on Bun 447 / 453, Node 432), the five roles Deno plays, owner decisions M1–M7 (decided 2026-10-13: M1 Bun + Deno + Node LTS + web, M3 keep Deno/Node console layout, M4 Math comparisons move to wasMath, M5 JSR's install instructions, M6 browser-loadable exports, M7 keep the Windows console fix, M2 Bun is the TypeScript reference; all settled; run-time `.wasm` loading goes through universal-wasm-loader), phases P0–P8. Source: binaryang's `cmem/jsr-deno-exit-guide.md`. |
| [wasm-math-plan.md](wasm-math-plan.md) | The declared-type rule for `/` (owner ruling 2026-09-30) and the `Math` work: Phase 1 (exact `sign` / `round` / `hypot`, Math results at the declared type) DONE 2026-10-06; Phase 2 RESOLVED 2026-10-09 by the owner: a plain `/` between integers is a compile error naming wasMath's `i32.div` / `f64.div` (sw36, sw37 closed); D1–D6 all settled and built (D3, D6 on 2026-10-13; design-decisions.md). |
| [number-model-and-runtime-plan.md](number-model-and-runtime-plan.md) | **2026-10-26, MEASURED, not built:** the owner's plain-numbers direction (no hints, no wasMath) and the Bun transition, scoped together. The P0 harness (`scripts/migr/`), the typed baseline (449 / 449 identical on Deno / Bun / Node; 437 match Deno, 12 explained), the corpus as plain numbers on today's compiler (371 match; 27 INVALID modules reported as success, 4 silent, size +16 %, speed unmeasurable on the corpus), round 3 rows it fixes (sw160, sw162, sw163, …), sw146 folded into sw145, the work list, the refreshed Deno-exit order, decisions N1, N3, N4 (open; N2 decided: integers by inference only), and the parity rule (M2 / M4, DECIDED 2026-10-26: Bun stays the reference; transcendental `Math` judged by a correctly rounded oracle, never an engine). |
| [wasic-modularization-plan.md](wasic-modularization-plan.md) | Plan of record for splitting `src/wasic.ts` (letter H12): the layers, the seam rules and gate, the phases. 2026-10-26: audit round 3 not converged, so Phase 1 stays gated. |
| [component-model-discussion.md](component-model-discussion.md) | OPEN design discussion, not implemented: a polyglot component model. |
| [history-purge-2026-10-26.md](history-purge-2026-10-26.md) | **The SECOND rewrite, 2026-10-26: every hash from the v1.2.x tags to `main` changed again** (one committed binary, `fib-zig_mod.wasm`, carried Zig debug paths; the first purge scanned text only). Scan of every blob, method, verification, the push, this checkout's realignment, and the tag-by-tag map (`main` `951fd35a` → `4084d37c8b2`; H7 stamp → `4a5c3cf668d`). Translate a 2026-10-23..26 hash here, an older one through the 2026-10-23 file first. |
| [history-purge-2026-10-23.md](history-purge-2026-10-23.md) | **Every commit hash changed 2026-10-23** (letter H19: personal address → noreply, drive paths and `.claude/` removed from every commit; 152 refs force-pushed). What was rewritten, how it was verified, the branch decisions, and the tag-by-tag old→new map. Read before quoting or translating any hash from before that date. |
| [legacy-claude-archive.md](legacy-claude-archive.md) | The pre-2026-07-30 `CLAUDE.md` (228 KB), verbatim: history, not policy. |

## Related files outside cmem

- `README.md` — the public, user-facing doc (install, usage, capability surface, examples).
- `CLAUDE.md` — small auto-loaded pointer file; machine-local, gitignored.

## Owner commands: "commit", "push", "release" (owner, 2026-11-10)

🔒 Written into every project by the workspace session on the owner's direction (2026-11-10:
"please write that into each project"; workspace `cmem/working-rules.md` Tooling rule 12, letter
H34). When the owner says:

- **"commit"** — first run "update the project memory files" (re-derive this repo's `cmem/` from
  its current state), then commit to the branch being worked on. Nothing is pushed.
- **"push"** — perform "commit", then merge the branch into `main`, then push `main` (and the
  working branch) to GitHub (`origin`) and read it back with `git ls-remote`.
- **"release"** — perform "push", then the release process: the workspace's
  `cmem/release-process.md` §§ 5–8 — CI checks first, then CI pushes the tag, then the GitHub
  Release page from the tag, then the publish to the registry — recorded in `cmem/release.md`
  § "Release History" (newest first, a summary of what changed). The level (patch / minor /
  major) is the owner's: ask if it was not given.

Each command includes the one before it, and none goes further than its own word (a "commit"
never pushes, a "push" never releases). This repo's own gate and merge rules apply at each step.

**Three more words (owner, 2026-11-12; workspace `cmem/review-process.md`, Tooling rule 13, letter
H35)** — the review standard, the same in every project; wasmtk's slots are in
[review-process.md](review-process.md):

- **"review"** — a targeted agent code review (workspace file § 2), in rounds.
- **"security review"** — the seven security surfaces (§ 3), in rounds.
- **"hardening review"** — the seven hardening axes (§ 4), in rounds.

Each stops when a round's fresh reviewers find nothing; none commits, pushes or releases. 🔒 **A
security review and a hardening review are REQUIRED before every release**, recorded in the
release's entry in `cmem/release.md` before the bump — `deno task release` refuses otherwise.
