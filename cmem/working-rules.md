# working-rules.md — wasmtk's standing rules

Last verified: 2026-11-20. The rules a session follows here, moved from INDEX.md when it became a router
(letter H38). The workspace's standards are the floor: `../workspace/cmem/working-rules.md` and
`tooling-rules.md`. How a rule changed is in `design-decisions.md`, not here.

## How to work here: the session routine (owner, 2026-11-17; letter H38, `../workspace/cmem/memory-guide.md`)

**At the start:** (1) read `cmem/STATE.md`; (2) read `cmem/INDEX.md`, a router; (3) read
`../workspace/cmem/workspace-correspondence.md` and the letters addressed to wasmtk (§ below);
(4) open only the topic files STATE's "Read next" lists or the task matches in the index.

**At the end:** (1) REWRITE `cmem/STATE.md` (never append; counts only, no issue content, no
machine facts); (2) move every item closed this session to `cmem/archive/` (IDs kept; a file
named for the release or date that closed it); (3) record new decisions in `design-decisions.md`
and new rules here; (4) run `bun scripts/check-cmem.ts` and fix what it reports; (5) empty this
session's scratchpad (rule 15 below).

**Limits** (held by `scripts/check-cmem.ts`, the workspace's copy): INDEX.md 3 KB; STATE.md 60
lines with its four headings; every other live note 25 KB; no line outside a code block over
200 characters; `archive/` and `local/` unlimited. A file that outgrows 25 KB splits by subject;
the split files of 2026-11-20 (`<file>-2.md`, `-2b.md` …) are listed at the top of their first
part. **Writing:** one subject per file with a summary and a last-verified date; one fact per
line; a stable ID on every tracked item; the rule, not its history (history in
`design-decisions.md`); open and closed never share a file; link, do not restate.

**Sub-agents:** a reviewer gets its class brief and `STATE.md` and does not browse `cmem/`; any
other sub-agent gets the task and the exact files the main agent chose from the index.

### Two things that bite in the first five minutes

- **Reinstall before testing:** the suites run the INSTALLED `wasmtk`, so after any edit to `src/`,
  `main.ts` or `deno.json` run `deno task install` (never a hand-written `deno install`:
  `--allow-ffi` is required), or the tests silently run the old binary.
- **Parallel code paths:** `src/wasic.ts` and `src/console_log.ts` each have their own
  binary-operator loop and string handling; a fix in one is usually needed in the other
  (`design-decisions.md`).

### 🔒 Scratch space (workspace Tooling rule 15, owner 2026-11-19; letter H43)

- Throwaway files go ONLY in this session's own scratchpad folder; no other temp location, no
  other session's folder; a scratch path is a machine fact, never in a tracked file.
- Delete each item when it is cleared: a one-time script after its run, a reproducer or clone
  when its finding is fixed and verified, a reviewer's folder when its round is triaged. Nothing
  lives only in scratch: what is worth keeping moves into `cmem/` (private facts `cmem/local/`)
  first. Budget 200 MB per session folder: announce anything larger before making it.
- **"commit" ends with an empty scratchpad.** Sub-agents work under the main session's
  scratchpad; the main session removes their folders (say so in every brief). Do not sweep other
  sessions' folders.
- Project data lives in the project folder only, never in the assistant's per-project memory
  folder (checked 2026-11-20: empty). The suites' temp folders are named `wasmtk_*` /
  `wasmtk-*` (and `wasmath_l2_`) and removed by the suite; measured 2026-11-20: none left behind.

**Method lessons go in [best-practices.md](best-practices.md), not in the topic file.** When a pass
produces a lesson that would apply to a completely different subsystem, add it there **and** leave
the detail in its home file.

**Doing a stress-test batch or a release? Read [workflow.md](workflow.md) first** — it holds the
established loop (branch → test → bisect → fix → full gate → memory → commit → merge → bump →
publish) and the traps that have already cost time.

## Policy (durable — set by the project owner 2026-05-31)

- **`cmem/` is the single home for ALL project memory.** Update the matching topic file, then
  rewrite `STATE.md` (since 2026-11-20 the INDEX is a router, H38). Convert relative dates to absolute; update existing entries
  rather than duplicating.
- **`README.md` is NOT project memory.** It is the public, user-facing doc shipped to GitHub/JSR
  (install, per-tool usage, capability surface, examples). Keep internal decision logs and bug
  post-mortems out of it.
- The root **`CLAUDE.md` is a small pointer file**, auto-loaded every session. Never put
  authoritative knowledge there — it is gitignored and would not survive a clone. Its pre-2026-07-30
  contents are archived verbatim in [legacy-claude-archive.md](archive/legacy-claude-archive.md).

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
   and current state; REWRITE `STATE.md`; add an INDEX line only for a NEW file (the INDEX says
   when to read a file, never its status); absolute dates; update, don't duplicate.
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

**Two workspace tooling rules, binding here too** (workspace `tooling-rules.md` rules 9, 10):

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

### 🔒 The workspace correspondence (owner, 2026-10-26; one file per item since 2026-11-19, H41, H42)

The workspace memory is the `workspace` repository beside this one: **`../workspace/cmem/`**
(public; it was `../cmem/` until 2026-11-19, letter H42). `../workspace/cmem/workspace-correspondence.md`
is the ONE index of open items between the projects, one line each. **Read it at session start and
before each new work item**, then open only the item files addressed to wasmtk, or touching the
work, in `../workspace/cmem/letters/<ID>.md`; an item that would be overtaken by the new work is
handled first, or the conflict is written into its answer. wasmtk ANSWERS by appending ONE bullet
under `## Answers` in the item's file — `- **wasmtk, <date>:** <what was done, the commit, the
check>`, lines under 200 characters, nothing a public repository could not carry — and never edits
the index line or the status; the creator verifies and closes. That bullet is the ONE write wasmtk
makes outside its own repo. An item wasmtk sends is a new `letters/C<n>.md` plus its index line
(next `C` number after re-reading the index and `archive/correspondence-closed.md`), in the same
session. Closed items and everything before 2026-11-19 (the old ledger and `handoffs.md`, verbatim)
are in `../workspace/cmem/archive/`, searched by item ID. The workspace's standards keep their names
there (`review-process.md`, `release-process.md`, `memory-guide.md`, `platforms.md`,
`tooling-rules.md` — the Tooling rules, same numbers — `working-rules.md`, `best-practices.md`).

## Related files outside cmem

- `README.md` — the public, user-facing doc (install, usage, capability surface, examples).
- `CLAUDE.md` — small auto-loaded pointer file; machine-local, gitignored.

## Owner commands: "commit", "push", "release" (owner, 2026-11-10)

🔒 Written into every project by the workspace session on the owner's direction (2026-11-10:
"please write that into each project"; workspace `tooling-rules.md` rule 12, letter
H34). When the owner says:

- **"commit"** — first run "update the project memory files" (re-derive this repo's `cmem/` from
  its current state), then commit to the branch being worked on. Nothing is pushed.
- **"push"** — perform "commit", then merge the branch into `main`, then push `main` (and the
  working branch) to GitHub (`origin`) and read it back with `git ls-remote`.
- **"release"** — perform "push", then the release process: the workspace's
  `../workspace/cmem/release-process.md` §§ 5–8 — the review set and every gate LOCALLY first
  (`deno task release`), then CI verifies the version, tags, makes the GitHub Release page from
  the tag and publishes to the registry, skipping a version already published — recorded in
  `cmem/release.md` § "Release History" (newest first, a summary of what changed). The level
  (patch / minor / major) is the owner's: ask if it was not given.

Each command includes the one before it, and none goes further than its own word (a "commit"
never pushes, a "push" never releases). This repo's own gate and merge rules apply at each step.
🔒 **A version change reaches `main` only through `deno task release`:** CI releases any pushed
new version and, since 2026-11-20 (H37 (e)), no longer re-checks the bump — a "push" never carries
a changed version line.

**The review words (🔒 owner, 2026-11-17: the FINAL standard; workspace `review-process.md`,
Tooling rule 13, letter H37 — it replaced the three words of 2026-11-12, H35)** — the same in
every project; wasmtk's slots are in [review-process.md](review-process.md):

- **"review"** — all five REQUIRED classes, in order: basic, hardening, licensing, security,
  privacy (after an optional efficiency review when asked) — one loop (§ 9).
- **"basic review"**, **"hardening review"**, **"licensing review"**, **"security review"**,
  **"privacy review"**, **"efficiency review"** — the same loop for that one class.

The loop: a first review, one agent per class over everything since the last release; triage; fix
one class at a time with targeted tests; a NEW agent per class re-reviews the fixes only; the
first empty re-review ends it, then the full suite once on every supported platform. A reviewing
agent never commits, pushes or releases. 🔒 **"review" is REQUIRED before every release:** the
main agent then writes `Review complete: <commit>` in the gitignored `cmem/review-issues.md`, and
`deno task release` refuses without it, or when code changed since that commit (guard 0g,
`scripts/review-gate.ts`).
