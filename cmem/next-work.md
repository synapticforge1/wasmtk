# Next-work — the ONE list of what is open

Only open items, each pointing at its record (workspace `memory-conventions.md`: working memory,
not an archive; git is the archive). Completed work appears below only as dated summaries with
commits. **The full text this file held before 2026-09-30 (1,240 lines: every census, bump log,
branch audit and superseded plan):** `git show 2d151714025:cmem/next-work.md`.

## 2026-10-26 — H11, H12 round 3, and the owner's number-type direction

Owner, 2026-10-26: "fix H11 and H12 then explain what the consumer suites are waiting on"; scope
chosen by the owner: H11 = the `wasm-bundle` switch, H12 = audit round 3 (not a gate waiver);
then, after round 3's size: "record + worst few", and "land" the switch.

- ✅ **H11: `wasmbundle` runs on binaryang's `bundle()`** (offload-inventory.md, 2026-10-26 note).
  Found measuring it and fixed: sw139 (shared heap at 0), sw140 (a negative CLI argument read as
  a flag), witgen accepting binaryang's `.wit` header, sw178–sw181 on the bundle path. Draft reply
  in `scripts/binaryang-report.md` (SENT 2026-10-26 via the workspace ledger, row C12, with the
  2026-10-23 pin report; one question: is `Module._inner` a
  stable contract). Open from H11: wasic's relocatable output (exact relocation), offload #1 for
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
  **Waiting on the owner: decisions N1–N4 and M2 / M4.**
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
  [history-purge-2026-10-26.md](history-purge-2026-10-26.md); the H7 stamp is now `4a5c3cf668d`.
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

## For the workspace review — all taken up (W1–W3 closed by letter H15, W4–W5 by the workspace, 2026-10-23)

Kept as the record of what was raised. W1 (the Bun rule) is the workspace floor now; W2's first
exception (a probe needing the import map) is in the floor, its second (a Deno ORACLE,
`Deno.inspect`) is not, which the workspace may still name; W3 is a log of rule slips, nothing to
act on. Nothing here is written outside this repo; the workspace pulls it on its sweep.

- **W1. The scripting rule changed here: Bun, not Deno** (owner, 2026-10-21: "since deno is going
  away, we need to change from deno to bun for all scripts"). wasmtk's scripts and probe rule are
  `bun` on `node:` builtins (INDEX.md rule 1, best-practices.md §4b, deno-exit-plan.md § P5). The
  workspace floor still says Deno: `../cmem/working-rules.md` rule 1 ("Scripting is
  Deno/TypeScript only") and the workspace `CLAUDE.md` ("Scripting is Deno/TypeScript (or the
  repo's own language)"). Asked: decide whether the floor becomes Bun for every Deno repo
  (binaryang is mid-migration; the frozen wabt-ts / binaryen-ts stay as they are), or records
  wasmtk as differing.
- **W2. Two kinds of exception the floor may want to name:** a probe that imports a repo's own
  `src/` through deno.json's import map still runs with Deno until that repo's dependencies
  resolve by bare name; and a script whose ORACLE is Deno (wasmtk's
  `console/check_inspect_array_ref.ts`, `Deno.inspect`) stays Deno. Measured: `node:util`'s
  inspect quotes with `'` (61 of 444 arrays differ), `Bun.inspect` does not group columns (334 of
  441). Relevant to any repo comparing console output with Deno's.
- **W3. Rule slips to watch for** (recorded honestly, 2026-10-21): one `sed -i` on a scratch file
  and one inline `git commit -m` in this repo (the latter amended from a file before merging).
  2026-10-22: one scratch probe written by a shell redirect (`grep -v … > file`) instead of
  `Write`; scratch only, nothing in the repo. The pattern: a quick "this file minus one line"
  probe reaches for the shell. And one `sed -n` READ of src/wasic.ts (no edit) where `Read` was
  the rule. Also learned: the installed `wasmtk` shim runs the CURRENT `src/` (a stash changed
  its behaviour without a reinstall), so an inversion check must stash, not merely skip the
  reinstall. **2026-10-23, two more:** (a) two inline `git commit -m` on a local branch (folded
  into `-F` commits before anything was pushed); (b) a chained shell probe ran PAST a failed
  `git clone` (exFAT "dubious ownership": a clone FROM this drive needs `-c safe.directory=…`, as
  `scripts/check_compat_gate.ts` does), so its `git checkout -B` / `commit` / `tag v3.0.0` /
  `tag v2.1.0` ran in the REAL repo. Caught at once from the output; nothing was pushed; the two
  tags and two branches were deleted and `deno.json` was back at 2.0.3 on the working branch.
  Lesson: a multi-step probe that changes directory must stop when the `cd` or the clone fails
  (`set -e`, or `&&` all the way), and must never `tag v*` outside a clone it has verified.
  Later the same day: (c) the same chaining slip once more (a `cd` into a worktree that failed to
  check out, then a read-only compile ran in the repo: no change), after which the worktree probe
  became a `set -euo pipefail` script; (d) one HEREDOC, feeding a bisect's input lines to a shell
  loop (scratch only, nothing written to the repo) — the rule covers any content, input lists too.
- **W4. rsxtk DOES publish** (measured 2026-10-23, crates.io API: crate `rsxtk`, 34 versions,
  default 0.4.4, created 2026-01-06). The workspace says it "publishes nowhere": `projects.md:20,37`,
  `working-rules.md:202`, letter H19 item (11). So rsxtk's `Cargo.toml` contact email falls inside
  the 2026-10-23 maintainer-email exception rather than being an owner question. wasmtk's README
  tells users `cargo install rsxtk`, which depends on that crate. **Taken up by the workspace
  2026-10-23** (`working-rules.md:202-203` now says rsxtk publishes).
- **W5. H18 counts EIGHT `bindgen_fixtures/*_host.ts`; there are SEVEN** (math, kebabcase, booleans,
  strings, imports, fnany, hostfn; `git ls-files`, 2026-10-23). They are also GENERATED:
  `tests/bindgen_tests.ts` rewrites each one on every run with `toFileUrl(...)` absolute paths
  (`:342-348` and six more), so hand-editing the fixtures as the letter suggests would be undone by
  the next run. The fix belongs in the generator (L3 below). **Taken up by the workspace
  2026-10-23** (H18 now says seven, fixed in the generator).

## Workspace letters H15–H20 + the 2026-10-23 email rule — scoped 2026-10-23

Read from `../cmem/handoffs.md` and `../cmem/working-rules.md` on 2026-10-23. None of these were
recorded here before. Measured the same day: `origin` = `jrmarcum/wasmtk`, `main` 131 ahead of
`origin/main`, no `maintenance.strategy`, the local `user.email` is the owner's personal address
(not noreply), and the drive-path scan (working-rules § Records) hits 11 tracked files.

- **L1. rsxtk moved to `synapticforge1/rsxtk`: DONE 2026-10-23** (owner-directed). Three mentions:
  `polyglot-producers.md:74`, `vision.md:83`, `roadmap.md:1418` (that one also wrongly called the
  crate `jrmarcum/rsxtk`; the crate is `rsxtk`). No other repo URL for rsxtk exists in tracked
  files; the crates.io links stay as they are.
- **L2. H17 (1): two stale binaryang clone URLs: DONE 2026-10-23** → `synapticforge1/binaryang`:
  `scripts/upstream-link.ts:52` (a printed hint) and `workflow.md:17`. No suite reaches either.
- **L3. H18: drive paths in tracked files: DONE 2026-10-23.** (a) `tests/bindgen_tests.ts` writes
  the seven host runners with relative specifiers (`./<name>.bindings.ts`, `new URL("./<name>.wasm",
  import.meta.url)`) instead of `toFileUrl(...)`; regenerated. Gate: `bindgen_tests` 142/142 (= the
  recorded baseline; a test-harness change, no `src/` edit). Inverted from a copy of the folder
  with its `.wasm` corrupted: the new runner fails (exit 1), the old absolute runner still printed
  7 / 10 / 25 from the original checkout, so before the fix the runners never read their own
  folder. (b) memory lines: `legacy-claude-archive.md:852,893` (→ `<home>\TMP\…`; otherwise
  verbatim), `roadmap.md:1123` and `vision.md:178` (→ `../universalWasmLoader/`; both had also
  named the old `GithubProjects\` location). Scan: zero hits outside `upstream/`.
- **L4. H19: history purged and force-pushed: DONE 2026-10-23** (owner: "proceed"; "it is okay for
  the older tags to not be byte identical"; "update the branches to the latest here"). Every ref
  rewritten: personal address → noreply on every commit, 166 historical blobs with drive paths
  swapped for cleaned copies, `.claude/` removed from every commit; 723 → 723 commits, verified
  pair by pair; 152 refs force-pushed with leases. Local `user.email` is now noreply. **Every hash
  changed** — the record, the branch decisions and the tag-by-tag map are in
  [history-purge-2026-10-23.md](history-purge-2026-10-23.md); the 100 hashes cited in this repo's
  Markdown were rewritten through the map. The H7 stamp (old `f50c8e4`) is now `4a5c3cf668d`, on
  the pushed `main`: loader-js can re-stamp from it (drift X8). Never push from the private
  pre-purge bundle or an old clone. **Open (owner): the GitHub Support request** — old commits are
  still served by hash (measured 2026-10-23: the old v2.0.3 commit returns 200); 0 forks, 0 pull
  requests, first changed commit = the old root `91bb017952f`. Draft ready in the gitignored
  `cmem/local/github-support-request-2026-10-23.md`; only the owner's account can send it.
  `upstream/binaryang` was re-cloned after binaryang's own purge (binaryang letter, below).
- **L5. H16: `.git` on exFAT: DONE 2026-10-23.** After the push: `gc --prune=now` → 1 pack /
  34 MiB (was 126 / 2.90 GiB), `fsck` clean, `maintenance.strategy gc` set; the one stash kept.
  Details in the gitignored `cmem/local/environment.md` (new this day; `.gitignore` line checked).
- **L6. H17 (2) + H20: the move to `synapticforge1/wasmtk`: DONE 2026-10-23.** The owner moved
  the repo and updated JSR's GitHub link before the purge. Here: `origin` set to
  `synapticforge1/wasmtk`; `scripts/publish.ts:52` and `vision.md:79,355` updated. The JSR scope stays
  `@jrmarcum` (every `@jrmarcum/wasmtk` specifier is a package name, not a location);
  `legacy-claude-archive.md:2522` keeps the old name as history. Still to check before 3.0.0's
  publish: that the JSR publishing path works from the new location (H20).
- **L7. H15 (scripting rule): record only.** The floor is now TypeScript on Bun, which wasmtk
  already does (2026-10-21); nothing to port. The letter closes W1–W3. W2's first exception (a probe
  needing the import map) is in the floor; its second (a Deno ORACLE, `Deno.inspect`) is not.
- **L8. 2026-10-23 maintainer-email exception: nothing to do.** `deno.json` has no author field and
  JSR reads none; wasmtk carries no contact email and needs none.

All eight done or recorded 2026-10-23. Still open from these letters: H20's check that JSR
publishing works from `synapticforge1` (before 3.0.0), and the other repos' parts of H17 (3).

## Open now

> **2026-10-23, the owner's order: the smaller items, then the remaining compiler fixes, then
> sw119.** Smaller items done (wast mirror guard: S1 BLOCKED on binaryang's `delegate` fix;
> engine baseline +189; `wasmbundle` imports; H6 Rule 4 + CI's gate on the tag); binaryang 1.15.0
> then 1.16.1 pinned. **ld103–ld105 FIXED**, and with them **four silent bugs found and fixed**
> (sw129 a `push` method compiled as an array push; sw130 a string `unshift` appended; sw131
> class field initialisers dropped; sw132 a derived class without a constructor skipped its
> base's) plus ld110; then **ld106–ld109 FIXED** (owner: "fix the items left open"), with ld111,
> ld112 and sw133 (silent) found and fixed: open now silent 1 (sw119), loud 1 (ld45)
> (compiler-bugs.md, the 2026-10-23 entries).
> **2026-10-24: ld45 FIXED** (the object writer, `src/inspect_wat.ts` + wasic's per-type writers;
> design-decisions.md "console.log's object writer"), with **ld113 and sw134–sw136 (silent) found
> and fixed** (compiler-bugs.md, the 2026-10-24 entry): open then silent 1 (sw119), loud 0.
> **2026-10-24: sw119 FIXED** (on by default, the `--i32-check` flag removed; console / template
> operators, comparisons, `++` / `--` covered; `45_random-numbers` passes unchanged), with **sw137,
> sw138 (silent) and ld114 found and fixed** in the merge (compiler-bugs.md, the 2026-10-24 sw119
> entry): **open now silent 0, loud 0.** Found with it and FIXED the same day (owner: "add a per
> test timeout"): the wasi suite had no per-test timeout — a module that loops (sw137's
> `main_arraymethods`) hung the run for an hour with no output. Every `runStep` is killed at
> `WASI_STEP_TIMEOUT_S` (default 300; the whole process tree, `taskkill /T` on Windows, where
> `wasmtk` is a `.cmd` shim) and FAILS, even where a failure is expected. The superseded branch
> `feat/i32-overflow-check` (643a33c6, local only) deleted (owner).
> **2026-10-24: binaryang 1.16.1 → 2.2.0 PINNED** (owner: "bump and push"; 2.2.0 came out the same
> day, after 2.1.0), gate GREEN, **NOTHING moved, as predicted** from the changelog (1.17.0: new
> flags only; 2.0.0: removes the `sat-float-to-int` spelling, which wasmtk never used; 2.1.0 and
> 2.2.0: validator feature checks, and the default-features bug that refused every function table —
> wasmtk validates only with `allFeatures()` or a set derived from it, `src/wast.ts`). Golden 566
> byte-identical, wast 64,506 / 0 / 16 with the one known accepted-invalid (`try_delegate`, the
> `delegate` defect, still not fixed in 2.2.0; report `scripts/binaryang-report.md` still unsent),
> cross-check 1368, `-Oz` guard 42 / 42, wasi 507/507. Reference: binaryang `docs/opcode-guide.md`
> (the portable opcode set; `throw` / `try_table` portable, legacy `try` lowered by
> `TranslateToExnref`; standalone runtimes measured at their maximum switches — wazero at its
> defaults refuses exception handling, which is why sw119 traps without a try).
> **2026-10-24: 3.0.0 PUBLISHED** (owner: "push", then "Publish 3.0.0 now"): `deno task publish`
> tagged `v3.0.0` (at `4708daa4`) and pushed; CI run 40083193079 green in every step — the
> compatibility gate on the tag, `deno publish`, the `release/v3.0.0` branch, the GitHub Release,
> and **provenance RECORDED on JSR** (the verify step passed). JSR latest 3.0.0. **H20 DONE:** JSR's
> `@jrmarcum/wasmtk` is linked to `synapticforge1/wasmtk` (api.jsr.io `githubRepository`), and the
> publish from it worked. (The bump, before it:)
> **2026-10-24: 3.0.0 BUMPED and pushed (owner: "lets bump and push"), NOT tagged, NOT published.**
> The gate's floor since v2.0.3 is MAJOR. Before it: `deno doc --lint` was RED (8 errors: five
> setters typed `typeof` a private variable, three exports whose JSDoc had been separated from them)
> — fixed, surface re-baselined in its own commit. CHANGELOG § 3.0.0, the README's Breaking
> Changes rows versioned, roadmap promoted. **To publish (owner's word):** H20 first (JSR publishing
> from `synapticforge1`: the JSR package is `@jrmarcum/wasmtk`, linked to the moved repo?), then
> `deno task publish` (tags v3.0.0 and pushes; CI's gate on the tag, then `deno publish`).
> **Next:** nothing open in the compiler (silent 0, loud 0). Open elsewhere: the binaryang report
> (`delegate`) and the GitHub Support request, both for the owner to send. (H20 and the 3.0.0
> publish: DONE, above.)

> **PAUSED 2026-10-22 (owner: "update the project memory files and pause until later today").**
> Branch `fix/loud-refusals` = main (main PUSHED 2026-10-23 after the H19 purge; the branch
> itself is local only), last compiler commit "fix(wasic): generic classes
> (ld100) …", every gate green, wasi 497/497, golden 554. **Resume at ld45** (an object writer for
> `console.log(p)` / `console.log(ps)`: util.inspect's `{ k: v }` and its line breaking; a whole
> struct is refused today, sw127), then ld103 (`this.items.push(x)` on an array field), ld104 (a
> field of a call's result, `c.bump().n`), ld105 (`xs.filter(…).length` in console.log). sw119
> (i32 overflow) waits for the owner. Then items 3–5 (binaryang 1.10.0 items, H10, nullable gaps).
> Workspace-review notes W1–W5: all taken up 2026-10-23 (section above).

> **2026-10-22, the loud refusals in progress, branch `fix/loud-refusals`, one commit per group:**
> group 1 (expressions: ld38 `toFixed`, ld43, ld66–ld70) DONE, gate green, `4m_ExpressionGaps`;
> group 2 (statements: ld71 `++` / `--` as a value, ld72 compound assignment on elements, ld73
> one-line `do`, ld78's default-from-an-earlier-parameter and two `for` declarations) DONE,
> `5f_IncrementsAndCompoundForms`, `5f_CompoundIndexSideEffectRefused`; group 3 (strings, tuples,
> objects: ld76, ld77, ld80) DONE, `28_StringsTuplesAndObjects`; group 4 (module globals: ld41,
> ld42) DONE, `63_ModuleGlobals2DAndBoolean`, found ld94 (`string[][]`, refused everywhere).
> Group 5 (callbacks / loops: ld78's last forms, ld91–ld93) DONE, `5h_CallbacksChainsAndLoops`;
> found and fixed ld97–ld99, found ld95 (a literal array of functions) and ld96 (a capturing
> array-method callback), both open and refused with a message. Group 6 (classes: ld74, ld79)
> DONE, `29_ClassDispatchAndChaining`; found and fixed sw126 (silent: overridden methods ran the
> base's version through `this` or a base-typed parameter); generic classes split off as ld100.
> ld45 (struct-array printing) looked at: a SINGLE struct printed its address (sw127, silent);
> now refused, as the array is. ld45 is the object writer (util.inspect's `{ k: v }` and its line
> breaking), a feature, NOT started. The loud compiler groups are done; left: ld45, ld94–ld96,
> ld100 (features / gaps, each refused with a message), then the 9 tool rows. Tool group 1
> (ld89 `dync`, ld90 CLI flags) DONE; group 2 (ld84 bundler exports, ld85 same-basename imports,
> ld87 `mod` i64) DONE; group 3 (ld81 wasmbundle memory, ld82 bindgen camelCase, ld83 deno
> binding) DONE: **all loud tool rows closed**. Owner 2026-10-22: "fix the compiler issues first":
> sw123 DONE (null vs undefined, `24_NullVersusUndefined`); ld94 (`string[][]`) and ld95 (function
> array literals) DONE; ld96 (capturing callbacks) DONE, sw128 found and fixed; ld100 (generic
> classes) DONE, ld101 (class string fields) and ld102 (string method in console) found and fixed;
> found and open: ld103 (array-field push), ld104 (field of a call's result), ld105 (`.length` of a
> method result in console). Next ld45 (object printing), then ld103–ld105; sw119 waits for the
> owner. Then items 3–5.

> **2026-10-21, the Deno-exit plan's P5 (scripts) DONE, ahead of P0–P4 by the owner's order:**
> the repo scripts and the 5 script tasks run with `bun` on `node:` builtins, and the probe rule
> says `bun` (deno-exit-plan.md § P5 has every A/B and the two scripts that stay Deno). Then the
> same day: (1) the `try_table` `-Oz` skip was found ALREADY removed (2026-08-27, binaryang
> 1.5.2); `check_try_table_oz` (42 / 42 on 1.13.0) now reads as the regression guard it is;
> (2) `src/wasm/caps_bytes.ts`'s six embedded capability libraries re-embedded from fresh `modc`
> builds (6–17 % smaller each, WIT unchanged); (3) the workspace items above; (4) **sw122 FIXED**
> (parseFloat / Number / parseInt correctly rounded, `$__dec_to_f64`; 4,078 values identical to
> Deno; dynrt re-embedded, it parses literals with parseFloat; `53_NumberParseRounding`).
> **Next:** the 22 loud compiler rows (all refusals: ld38, ld41–ld43, ld45, ld66–ld74, ld76–ld80,
> ld91–ld93), then the 9 tool rows, then items 3–5. Silent open: sw119 (owner-ruled, a branch),
> sw123 (nullable gaps, item 5).

> **2026-10-20, the loud rows, group 1 DONE: every round-2 row that built an INVALID module or
> trapped** (ld48–ld50, ld52–ld57, ld59–ld61, ld63, ld64, ld75; ld46, ld62 found already passing;
> silent sw124, sw125 found and fixed). Gate green: wasi 482/482, golden 539, wast 64,506 / 0 / 16,
> go 7 / 7 / 12. Tests `4l_MixedOperandTypes`, `28_ArrayCallbackEdges`. Found and OPEN: sw122
> (`parseFloat` not correctly rounded; silent, so ahead of the loud rows in the owner's order),
> sw123 (`T | undefined` holding undefined prints `null`; with the nullable gaps, item 5), loud
> ld91–ld93. **Next:** sw122, then the 22 remaining loud compiler rows (all clean refusals: ld38,
> ld41–ld43, ld45, ld66–ld74, ld76–ld80, ld91–ld93), then the 9 tool rows (ld81–ld85, ld87,
> ld89, ld90), then items 3–5.

> **PAUSED 2026-10-19, end of day (owner).** `main` is clean at `6068e6d7b48` and green on
> binaryang 1.12.1: wasi **480/480**, golden **537** (9 fail on purpose), typed_decl 45, wast
> 64,506 / 0 / 16, cross-check 1152 on baseline, go 7 / 7 / 12, outpath 12, merge_layout 7,
> tool_rows 16, wast_cli 4; api-surface unchanged since its last re-baseline. Nothing pushed,
> published or tagged. **Done today:** every silent TOOL row (sw109–sw118) and every unruled silent
> COMPILER row of audit round 2 (sw75–sw108, sw121, with loud ld47, ld51, ld58, ld65); the owner's
> rulings 1–3 built (sw95, sw87, ld88); sw120 (null string fields; string field assignment);
> ruling 4 (sw119) MEASURED on branch `feat/i32-overflow-check` (643a33c, not merged). Tally:
> silent 1 open (sw119), loud 36 compiler + 9 tool open. **Resume with (owner's order):** (1) the
> loud rows, grouped by root (compiler-bugs.md § audit round 2, "Loud, compiler" / "Loud, tools",
> plus the round-1 table's open loud rows); (2) items 3–5 (binaryang 1.10.0 items, H10, the
> remaining nullable gaps, e.g. ld64 a nullable string LOCAL); (3) THEN scope the number-type
> reversion and inference model (§ "Owner's direction, 2026-10-19, late" below).
> **Owner's decisions, 2026-10-19, end of day (NOT BUILT; design-decisions.md § "Owner's
> decisions of 2026-10-19, end of day"):** (a) **the i32 overflow check is ON by default**
> (sw119): finish branch `feat/i32-overflow-check` (cover console.log's operator path, template
> parts, `++` / `--`), migrate `45_random-numbers` to wasMath's wrapping `i32.*`, decide what the
> `--i32-check` flag becomes (an opt-OUT, or removed), full gate, re-baseline the API in its own
> commit; (b) **retire the `u32` / `u64` TYPES now** (the `u32.*` / `u64.*` operations stay):
> remove the aliases from wasMath, wasic's u64 print-unsigned tracking, migrate the 2 corpus
> programs and wasMath's own tests; (c) **bindgen checks at the boundary and reports every
> issue**: an i32 argument must be an integer in range (else a RangeError naming the parameter
> and type), i64 takes a bigint (a safe-integer number converted), f32 rounds, unsigned RESULTS
> returned unsigned; the WIT u32 / u64 → s32 / s64 collapse (bindgen.ts:73–79) to be revisited
> with (b). **Order (owner, 2026-10-19): AFTER the bug fixes** (the loud rows and items 3–5);
> "do not add to the issue we are trying to fix" — no new behaviour while the fix list is open. **2026-10-20: binaryang 1.13.0 PINNED, gate green
> (wast 64,506 / 0 / 16, guard 0, go 7 / 7 / 12, wasi 480/480); the reply was SENT 2026-10-20
> (`scripts/binaryang-report.md`).** Still pending from before: the 3.0.0
> release, the Deno-exit plan P0.
>
> **PAUSED 2026-10-15, end of day (owner).** `main` is clean at `6a833d4` and green on binaryang
> 1.12.1 (wasi 466/466, golden 523, typed_decl 45, wast 64,506 / 0 / 16, go 7 / 7 / 12; nothing
> pushed, published or tagged). Done today: binaryang 1.12.1 pinned (`go_asyncify` 12 / 12, count
> sent); the `wasmValidate` letter answered; all 21 loud rows of 2026-10-13 closed (two batches,
> with sw72–sw74 found and fixed); the owner's string-index ruling built (sw71); audit round 2
> (below). **Resume with:** the fix order below (steps 1–2b done 2026-10-19; step 3, the compiler silent
> rows: every unruled silent row done 2026-10-19 (`4k_LastSilentRows` the last); next: the
> owner-ruled ~~sw95 (array out-of-range → undefined)~~ DONE 2026-10-19, ~~sw87 (bare sort() as strings)~~ DONE 2026-10-19, sw119 (i32
> overflow store check: MEASURED 2026-10-19 on branch `feat/i32-overflow-check`, not merged; 460 / 461
> programs identical, 1 throws (an LCG relying on wrapping), +2.8% size, an arithmetic loop ~2.3×
> slower; console.log / templates / `++` not covered yet; OWNER'S DECISION: finish and turn on?) and ~~ld88 (wast exit codes)~~ DONE 2026-10-19; ~~sw120~~ DONE 2026-10-19
> (`24_NullableStringFields`); then the loud rows, step 4), then items 3–5 (binaryang 1.10.0
> items, H10, nullable gaps). **Owner, 2026-10-19: finish the current fixes before anything that
> can break more, THEN scope the reversion and the inference model for all the number types**
> (the "Owner's direction" note below).
>
> **Owner's direction, 2026-10-19, late: JavaScript projects and npm (design-decisions.md §
> "Direction of 2026-10-19: untyped is JavaScript's number; JavaScript and npm through the
> bundle"). NOT BUILT; plan, in order:** (a) MEASURE `number` inference: re-allow untyped
> declarations as JavaScript's `number` (f64), `bigint` as i64, wasm types as opt-in hints; run
> the corpus with its annotations stripped (matches Deno? speed cost?), as sw119 was measured
> first; (b) jstyper inside the bundle (a `.js` import runs it; `wasmtk wasic x.js` too) and jstyper
> INFERENCE when there is no `.d.ts` (a shipped `.d.ts` / JSDoc first, then call sites and use,
> then the `number` default; the rest reported, never guessed); (c) npm: resolution
> (`npm:` / `node_modules`, `exports` / `main`, transitive deps), **CommonJS converted by esbuild
> (owner's choice)**, then (b); jstyper must unwrap esbuild's `__commonJS` / `__toESM` shims;
> per-package verdict (compiled / `dync` / kept on the host as an import); then try a handful of
> real packages. Open questions with it: sw119 on by default? retire the `u32` / `u64` TYPE
> annotations (wasMath is unreleased, 2 corpus programs use them)? boundary checks in bindgen
> (i32 integer + range, unsigned results)?
>
> **Owner's answers, 2026-10-19: all four questions decided, none built yet** (design-decisions.md
> § "Owner's rulings of 2026-10-19"): (1) an out-of-range ARRAY read gives `undefined`, as for
> strings; a float array index keeps D3's conversion (sw95); (2) semantics follow the function's
> origin: a JavaScript / TypeScript function does what JavaScript does (sw87: a bare numeric
> `sort()` sorts as strings), a wasm-specific function does what the wasm instruction does; (3)
> `wasmtk wast` exits 1 on an unbuilt module not on a known list and on 0 files (ld88); (4) i32
> overflow: `+ - *` give JavaScript's result, and storing a value that does not fit an `i32` slot
> throws a run-time error; wrapping is wasMath's `i32.*` (new row sw119; measure the corpus
> before building). All four join the round-2 fix order.
>
> **2026-10-15: Phase 0b audit round 2 DONE (item 2 of the owner's list)** — compiler-bugs.md §
> "audit round 2". Four parallel auditors, every row RUN; repros in `scripts/phase0/round2/`.
> **Found: 33 silent-wrong compiler bugs (sw76–sw108), 10 silent tool defects (sw109–sw118),
> 34 loud compiler rows (ld47–ld80), 10 loud tool rows (ld81–ld90)**, and a grep-verified dead-code
> list. **Proposed fix order** (silent first, the owner's standing order): (1) ~~sw113, the CLI
> overwriting its INPUT file~~ **DONE 2026-10-19** (with sw114; `src/outpath.ts`,
> `tests/outpath_tests.ts`); (2) ~~sw109 / sw110 / sw112~~ **DONE 2026-10-19** (with ld86;
> `tests/merge_layout_tests.ts`; sw112 as a refusal), merges and bundles that
> mis-seat data or rename wrongly; (2b) ~~the other tool rows sw111, sw115–sw118~~ **DONE
> 2026-10-19** (`tests/tool_rows_tests.ts`): **all ten silent tool rows are closed**; (3) the compiler silent rows grouped by root: ~~array /
> string helper index normalisation (sw80–sw85, sw81, sw91, sw92)~~ **DONE 2026-10-19** (with ld47;
> `28_RelativeIndexMethods`), ~~spread (sw77–sw79), string-array
> paths (sw76, sw107)~~ **DONE 2026-10-19** (`28_SpreadLiterals`, `28_StringArrayJoinSearch`), ~~finally~~ **DONE 2026-10-19**
> (`15_FinallyOnEveryExit`; a throw from finally too, the owner's follow-up), ~~block scoping
> (sw104, sw105)~~ **DONE 2026-10-19** (`5e_BlockScopedDeclarations`), ~~console printing (sw96,
> sw98, sw102, sw103)~~ **DONE 2026-10-19** (with sw75; `7i_ConsoleUnaryBoolStringFields`; found
> sw120 null string fields, sw121 a struct variable as an array-literal element) (sw106), block scoping (sw104, sw105), console unary / boolean /
> pointer printing (sw96, sw98, sw102, sw103), then the rest; (4) the loud rows. **Owner's
> questions:** sw95 (array out-of-range reads: refuse, or undefined like the string ruling?),
> sw87 (a bare numeric `sort()`: implement string order, or refuse?), ld88 (`wast` exits 0 on
> unbuilt modules: intended?), and i32 overflow wrapping (the contract?). Items 3–5 (the
> binaryang 1.10.0 items, H10, the nullable gaps) wait behind this unless the owner reorders.
>
> **2026-10-15: H12 loud rows, batch 1 DONE** (compiler-bugs.md; the owner asked for items 1–5 of
> the open list: the loud rows, audit round 2, the binaryang 1.10.0 items, H10, the nullable gaps).
> Closed: sw26, sw30, sw31, ld01, ld03, ld05–ld09, ld11–ld13, ld19, ld20, ld22, ld23, ld34; found
> and fixed sw72 (a function-typed declaration emitted nothing), sw73 (a function's local array
> made a same-named top-level one read zeros), ld39, ld40. **Batch 2 (the same day): ld10, ld14,
> ld37 closed, sw74 (a struct array printed addresses) and ld44 found and fixed: ALL 21 loud rows
> of 2026-10-13 are closed.** **Open now: 1 silent (sw71, an out-of-range string index gives
> `""`), 5 loud, all found 2026-10-15: ld38 (`toFixed`), ld41 (top-level 2D array in a function),
> ld42 (top-level boolean in a function), ld43 (`(…).length` in console.log), ld45 (printing a
> struct array).** **Owner's ruling (2026-10-15): a float string index is a compile error, and an
> out-of-range `s[i]` is `undefined`, as JavaScript** — BUILT the same day (sw71 fixed;
> design-decisions.md § "A STRING index is an integer"; README Breaking Changes row; 3 corpus
> programs migrated). Found with it: sw75 (silent), ld46. **Open: 1 silent (sw75), 6 loud (ld38,
> ld41–ld43, ld45, ld46).** **Next:** items 2–5 (audit round 2, the binaryang 1.10.0 items, H10,
> the nullable gaps).
>
> **2026-10-15: binaryang PINNED at 1.12.1** (from 1.12.0; its one change restores a paused
> call's operands on an Asyncify rewind). **`go_asyncify_tests` 12 / 12**: the nested goroutine
> program runs; nothing is KNOWN-failing any more. Full gate green, every other number unchanged
> (testing.md). Reply with the count SENT 2026-10-15 (owner; `scripts/binaryang-report.md`).
> Next, unchanged: the 21 loud rows.
>
> **2026-10-15, binaryang letter: `wasmValidate` could return `Ok` with an error in `errors`;
> fixed on their `main`, in the release AFTER 1.12.1** (plus seven more shapes V8 refuses, now
> refused). Ours reads `result`: `src/wast.ts` `binaryangInvalid`, the second `assert_invalid`
> oracle and the `validatorRejectedValid` guard. The defect could only turn a pass into a skip;
> the guard has read 0 throughout. **On that release:** bump the pin, run the wast gate, expect
> `assert_invalid` passes up / skips (16) down, guard 0; explain each moved file; send the
> numbers. Reply SENT 2026-10-15 (owner; `scripts/binaryang-report.md`).
>
> **PAUSED 2026-10-13, end of day (owner).** `main` is clean and green on binaryang 1.12.0 (wasi
> 458/458, golden 515, wast 64,506 / 0 / 16; `go_asyncify` 11 / 12 KNOWN). **No silent-wrong row is
> open.** Resume with: the 21 loud rows (compiler-bugs.md; ld34 a float index into a string in
> console.log, ld37 a whole string / boolean / bigint array in console.log, the oracle for its
> layout in `scripts/console/inspect_array_ref.ts`). Waiting on others: ~~binaryang's release with
> the nested-Asyncify fix~~ (1.12.1, pinned 2026-10-15, 12 / 12, count sent); the owner's word on the
> Deno-exit plan (deno-exit-plan.md, P0–P8) and on releasing 3.0.0 (roadmap.md items 27–33;
> nothing pushed, published or tagged).
>
> **2026-10-13, later: binaryang PINNED at 1.12.0** (from 1.8.1; the owner's choice to skip
> 1.11.0). `go_asyncify_tests` **9 → 11 / 12**: binaryang's Flatten fix holds; the NESTED goroutine
> program now builds but TRAPS (`uninitialized element` during a rewind into `$main.main$1`), while
> upstream `wasm-opt` 133 `--asyncify` on the same bytes runs it: a second binaryang Asyncify bug.
> Reproducer `scripts/repros/tinygo043_nested_pre_asyncify.wasm`; letter **SENT 2026-10-13**
> (owner; `scripts/binaryang-report.md`). **binaryang replied the same day: fixed on their main,
> UNRELEASED** (the rewind did not restore a `call_indirect`'s operand temps); a 1.12.1 would
> carry it. On that release: bump the pin, re-run `go_asyncify_tests` (expect 12 / 12), send them
> the count. The gate carries nested as KNOWN (11 / 12).
> The new optimizer also broke two merge assumptions, fixed with the bump (design-decisions.md §
> "Merge (wasmmerge) invariants"): block types printed by index, and `$__malloc` inlined away
> (a wasic library now exports `__heap_ptr`).
>
> **2026-10-13: Go asyncify broken by a toolchain update — CLOSED 2026-10-15** (binaryang 1.12.1
> fixed both Asyncify bugs; `go_asyncify_tests` 12 / 12 since that pin, and on 1.13.0 2026-10-20;
> the "9 / 12 is EXPECTED" rule below is retired). The record as written: the machine now has Go
> 1.27.2 + TinyGo 0.43.0 (testing.md records Go 1.26.7 + TinyGo 0.41.1 green, and that TinyGo 0.42
> was the first to support Go 1.27). `go_asyncify_tests` 9 / 12: WaitGroup+Mutex, pipeline and
> nested fail in the in-house asyncify step, `Flatten: unresolved call target
> "$asyncify_stop_unwind"`; identical on `main`. **Diagnosed the same day: a binaryang bug.**
> TinyGo 0.43 still imports the four `asyncify.*` functions, but now also calls `stop_unwind` from
> a new panic-catch wrapper (`…asyncifysuspendcatch.0.paniccatch`). binaryang's `Asyncify` fails on
> it in 1.8.1 AND 1.10.0; upstream binaryen.js 123 succeeds and the result runs (`wg-counter: 45`).
> Report SENT 2026-10-13 (owner; `scripts/binaryang-report.md`), reproducer
> `scripts/repros/tinygo043_waitgroup_pre_asyncify.wasm`. **binaryang replied the same day: fixed
> on their main (their analysis did not stop propagation at the bottom-most runtime, as
> upstream's does), UNRELEASED; it ships in 1.11.0, their owner's timing.** Our reply with
> upstream's `asyncify-verbose` set (25 functions; `…paniccatch` not instrumented) was SENT
> 2026-10-13 (`scripts/binaryang-report.md`). On 1.11.0: bump the pin (a binaryang bump
> is a full gate; the optimizer moves too), re-run `go_asyncify_tests`, send binaryang the count. **Owner, 2026-10-13:
> wait for binaryang** (no workaround in wasmtk): `go_asyncify_tests` 9 / 12 is EXPECTED on this
> machine until binaryang's fix and a pin bump; the gate treats those 3 as known, any other change
> as a failure.
>
> **2026-10-13: wasMath L4 DONE** (ld29, ld30, ld31, sw64, the u64 printer; wasm-number-types.md).
> **D6 BUILT 2026-10-13** (`src/diagnostics.ts`; design-decisions.md § "The compile-error report").
> **sw62 FIXED 2026-10-13** (any console line over 128 bytes corrupted memory; the line is built in
> a growable heap buffer now). **sw66 + sw67 FIXED 2026-10-13** (an array prints as Deno prints
> it, `$__arr_inspect`; found with them sw69, sw70 silent and ld37 loud). **binaryang 1.12.0
> PINNED** (above). **sw69 FIXED 2026-10-13** (array and struct literal values; compiler-bugs.md).
> **sw70 FIXED 2026-10-13** (a local array shadowing a module one). **sw68 FIXED 2026-10-13**
> (a nested console.log in an argument): **no silent-wrong row is open.** **Next, in order:** the 21 loud
> rows (ld34, ld37), then the rest of the binaryang items. The next release is MAJOR (3.0.0) and
> waits on the owner's word.
>
> **PAUSED 2026-10-09, end of day (owner).** `main` was clean at the integer-division commit
> (`5fde9c0`). Decided later the
> same day (owner): `(a / b) | 0` STAYS refused, pointing at wasMath; **D6: a compile-stopping
> issue is REPORTED with its location** (below); **D3: an implicit f64 → i32 conversion is
> REFUSED**, naming `f64.toI32` (traps) / `f64.toI32Sat` (clamps) / `f64.toI32Wrap` (wraps).
>
> **D3 BUILT 2026-10-13** (design-decisions.md § "Wasm types in TypeScript"): stores into declared
> integers, `as i32` / `as i64` on a float or an `any`, and floats into wasMath `i32.*` / `i64.*`
> arguments are refused; indices and positions kept. Found with it: ld34 (open), ld35 (fixed).
>
> **D3 SCOPE DECIDED (owner, 2026-10-13), after a measurement** (every implicit float → integer
> conversion in the corpus tagged by the statement it is in): only 2 programs STORE a float into a
> declared integer (`38_MathExactSemantics`' `const fl: i32 = Math.floor(y)` ×7, `18_Multi-Scope…`'s
> `const namePtr: i32 = nameMatrix[d][v]` from a `number[][]`); 26 programs use a float as an
> INDEX or POSITION (`arr[i]`, `s.indexOf(x, pos)`, `splice(i, 1)`, 115 conversions), which
> JavaScript itself converts. **Refused: stores into a declared integer** (declaration,
> assignment, argument to an integer parameter, return from an integer function, field / element
> store) **and `x as i32` / `as i64` on a float** (it names the type, not the conversion). **Kept:
> indices and positions.**
>
> **D3 refusal (owner 2026-10-09; designed, not built).** Today wasic silently inserts
> `i32.trunc_f64_s` wherever an f64 meets an i32 destination: `const x: i32 = f`, an f64 argument
> to an i32 parameter, an f64 returned from an `: i32` function, an f64 stored into an i32 field
> or array element, `Math.floor(y)` into an i32 (the ld15 convention, design-decisions.md), the
> `asDefault` / `asExpected` paths of both emitters, and `x as i32` (decide whether an explicit
> `as` counts as the program saying so; it does not say WHICH conversion, so likely refuse too).
> Plan: (1) list every site that emits `i32.trunc_f64_s` / `trunc_f32_s` / `i64.trunc_*` from a
> value the program did not convert (grep both emitters; L1's ld27 trunc check is one), (2) raise
> one diagnostic from a shared message like `intDivisionDiagnostic`, (3) MEASURE the corpus on a
> branch first (golden-WAT status changes), expect many more programs than division's 10, (4)
> migrate them to the wasMath call that prints what wasm printed (`toI32`), (5) the wasMath i32
> namespace's own known gap (an out-of-range f64 into an `i32.*` argument traps where the body
> wraps) closes with it. Also i64 destinations (`trunc_f64_s` to i64) by the same rule. Pairs
> naturally with the D6 report.
>
> **Compile-error report (D6, owner 2026-10-09; BUILT 2026-10-13, the design below as built,
> except the summary line is the CLI's `❌ wasic: N errors in <file>; no .wasm was written.`).** Today a refusal prints
> `⚠️ <text>` lines, then "Compilation aborted: N unsupported feature(s)" and a `wasmtk dync`
> hint: no location for most errors, "unsupported" for deliberate refusals, and dync advice that
> does not apply. Proposed, per error: `error[<code>]: <what>`, `--> file:line:col`, the source
> line with a `^^^` marker, `= TypeScript: …` / `= wasm: …` where that is the reason, `= help:`
> the fix in the user's own names; then `wasic: N errors in <file>; no .wasm was written.`, exit
> 1, the dync hint only for genuinely dynamic code. Same report from `wasic` and `modc`. Work:
> diagnostics become structured (code, message, position, help) instead of strings, and positions
> map back through the bundler's rewrite to the user's file. **Found doing this: the
> typed-declaration diagnostic's line was OFF BY ONE in a program that imports wasMath** (it
> counted lines in the BUNDLED source, which drops the import): FIXED by D6, which locates in the
> files as written; typed_decl asserts it ("line number after a wasMath import").

> **2026-10-09, state.** binaryang shipped 1.9.0 (`./definitions`) and 1.10.0 (`wasm-bundle`,
> `(@reloc data)`); the owner ordered the open compiler bugs FIRST, then those items (§ "binaryang
> caught up" below). Five H12 batches merged locally today, each through the full gate:
> `7528042` (string conversions, sw06–sw09, sw19, sw28, sw50, ld24, ld25), `93aa40a` (`&&` / `||`
> operands, boxed parameters: sw48, sw49), `3fb3b27` (closure result types: sw52, ld21), `e657fff`
> (boxed f64 captures: sw53), `c40c16d` (nullable fields carry a flag word, owner's option A:
> sw51, sw54–sw56, ld26). Suite 449/449. Nothing is pushed; nothing is half-done; `main` is
> clean. Then the wasm number types were scoped (wasm-number-types.md); its `Math` scan found
> sw57–sw61 and ld27–ld29 (and sw62, a console bug). wasMath L1, L2, L3 followed (L3 closed the
> `Math` rows), then the owner's division decision (integer `/` is a compile error; sw36, sw37
> closed). Open silent-wrong: sw62, sw64.

- ⏳ **H6 (workspace letter, owner chose it 2026-09-30).** Done: H6.1 SemVer `3542840`, H6.2 the ★
  block `f075a60`, H6.3 the compatibility gate `1348f60` + reviewed exceptions `66a3bfb`, H6.4 the
  CLI surface `2d15171` (rules: design-decisions.md § Semantic Versioning and § The compatibility
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
  - ✅ **Rule 4 (deprecate before remove) and CI's repeat of the gate on the tag: BUILT
    2026-10-23.** `scripts/api-surface.ts`: a `@deprecated` doc tag (own line) is a
    `(deprecated)` / `(deprecated):<member>` surface key; `Floor.undeprecatedRemovals` lists every
    removal the last release did not deprecate (symbol, member, entrypoint; the CLI surface is
    exempt, it has no doc comments); `bump` refuses one at ANY kind; `--verify-tag <tag>` runs in
    `publish.yml` before `deno publish` (snapshot matches, version = tag, one SemVer step at or
    above the floor since the previous tag, Rule 4; `fetch-depth: 0`). Tests:
    `tests/api_surface_tests.ts` (24, inverted: deprecation ignored → the 4 allowed-removal cases
    fail) and `scripts/check_compat_gate.ts` F1–F4 (19 / 19). **Found with them:** (1) the gate
    recorded `./utils VERSION` by its literal type, so every bump made the snapshot stale and the
    next floor major — CI would have refused every release; now recorded as `string`
    (re-baselined in its own commit); (2) `check_compat_gate` A1, A2, D1 had failed since
    2026-10-09 (they assumed a MINOR floor; it is MAJOR) — corrected.
- ⏳ **Wasm types in TypeScript** (wasm-math-plan.md). **All decisions D1–D6 settled 2026-10-09**
  (owner): integer `/` is a compile error (built); D3, refuse an implicit f64 → i32 (BUILT
  2026-10-13); D6, a located compile-error report (BUILT 2026-10-13); both recorded in the note at
  the top and in design-decisions.md. Before that: the owner
  ruled (2026-09-30): the declared
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
    **L2 DONE 2026-10-09** (wasic / modc lower the calls; 176 of 199 exact from compiled programs,
    0 failed, 23 = the Math bugs; corpus programs `39_WasMath*`; the whole corpus takes its types
    from wasMath; README section "The same values in TypeScript and in WebAssembly"). **L3 DONE
    2026-10-09** under the owner's **"CR, in both"** (compiled `Math` stays correctly rounded;
    wasMath's Math-style members run the same mathlib in Deno; plain `Math` in Deno may be 1 ulp
    off, documented): sw57–sw59, sw61, sw63, ld27, ld28, ld33 fixed, sw60 closed by decision;
    Payne–Hanek trig reduction; 199 / 199 exact from compiled programs. **L4 DONE 2026-10-13**
    (ld29, ld30, ld31, sw64, u64 printed unsigned). The library's track is complete; its one known
    gap (an out-of-range f64 into an `i32.*` argument trapped) is CLOSED by D3 (2026-10-13): a
    float into a wasMath integer parameter is now a compile error.
- ⏳ **H12 compiler bugs** (compiler-bugs.md, the round-1 table): **0 open silent-wrong, 21 open
  loud** (2026-10-13: sw62, sw66–sw70 fixed; ld34, ld37 found; L4 closed sw64, ld29–ld31; 2026-10-09, night: sw36, sw37 closed by the owner's division decision; before that,
  wasMath L3: the `Math` rows sw57–sw61, sw63 and loud ld27, ld28, ld33; earlier the same day
  sw06–sw09, sw19, sw28, sw48, sw49, sw51–sw53 and friends).
  - Open silent: NONE (2026-10-13: sw68, sw69, sw70 fixed).
  - NEXT: the 21 loud rows, then Phase 0b audit round 2. The owner's order (2026-10-09): these
    compiler bugs BEFORE the binaryang 1.10.0 items below.
  - Nullable gaps left by sw51's option A (no corpus use; design-decisions.md § "Nullable FIELDS
    carry a flag word"): class-embedded tuple destructuring, union-variant / `Record` fields,
    nullable PARAMETERS (no flag), `p.x ??= v`.
- ⏳ **wast: 7 `(module definition …)`s V8 refuses for its own size caps** (`memory64` 1, `table`
  1, `table64` 1, `memory_max_i64` 4). A definition asserts only validity, so binaryang's
  `wasmValidate` ACCEPTING it could be the verdict, if binaryang accepts no INVALID module.
  **2026-10-23: that condition is now MEASURED, and it does not hold — BLOCKED on binaryang.** The
  guard (`WastResult.validatorAcceptedInvalid`, the mirror of `validatorRejectedValid`) runs on
  every `assert_invalid` module that decodes, under the FILE's features. Over the corpus on 1.15.0:
  5 threads modules are valid only because multi-memory is on (excluded, as binaryang's data
  records), 6 `br_on_cast` modules only because `customDescriptors` was on outside its directory
  (now on only in it, as binaryang's data says), and **1 is a binaryang defect: a legacy
  `delegate`'s label depth is not checked** (`legacy/try_delegate.wast`; probed: `delegate 1` and
  `delegate 2` out of range both VALID to binaryang, invalid to V8). Pinned in
  `tests/wast_tests.ts` `KNOWN_ACCEPTED_INVALID`; inverted both ways (pin removed: that file red;
  customDescriptors everywhere: the two br_on_cast files red, 3 each). Reported in the DRAFT to
  binaryang. When their fix lands and the pin reads 0, the definition verdict is a few lines in
  the `kind === "definition"` catch (judge only an engine SIZE-CAP refusal, not an unimplemented
  proposal — two custom-descriptors definitions would otherwise be judged too), then re-record the
  4 files' `unbuilt`. The plain `memory64.wast` module `(module (memory i64 0 0x1_0000_0000_0000))`
  must instantiate: it stays an engine skip.
- ✅ **The five `36_*` modules are in `tests/engine_baseline.json` (2026-10-23)**, with every other
  module added since the baseline was last recorded: 189 pairs over 63 modules (185 `match`, 4
  wazero `reject` in exception-handling tests, the class 33 pinned wazero rejects already are);
  the re-record only ADDED (0 removed, 0 changed). Cross-check: 1341 on baseline, 0 unpinned.
- ✅ **`wasmbundle` routes `importWat` (2026-10-23)**: a non-WASI import in a bundled module was
  dropped (the bundle did not compile); now kept before every function. Test in
  `merge_layout_tests` (11 / 11); tool_rows, witgen, the go suites and the one corpus pipeline that
  bundles (`18_WasmImportMerge`) green.

## Planned

- **Leaving Deno for Bun + Node, JSR stays** (deno-exit-plan.md, scoped 2026-10-13; owner's
  direction 2026-10-12). Phases P0–P8. All owner decisions M1–M7 settled 2026-10-13 (Bun is the
  TypeScript reference; Bun + Deno + Node LTS + web supported; run-time `.wasm` loading through
  universal-wasm-loader, which lands first). Not started; P0 waits on the owner's word.

- **`wasic` modularization, Phases 1–3** (wasic-modularization-plan.md; letter H12): output-
  preserving, gated by golden-WAT and `wasic_seam_tests`.
- **Offload #1: our regex-over-WAT merging gives way to binaryang's parser** (offload-inventory.md;
  I2 / H11). The trigger is MET on our pin (2.2.0). The bundle path moved 2026-10-26; the wasic
  MERGE path (`import … from "x.wasm"`, wasmmerge.ts) is what remains.
- **The next release after 3.0.0** (roadmap.md § "The unreleased block (on `main`, after
  v3.0.0)"): not scheduled; the owner's word. The package SURFACE gained nothing and lost nothing
  this session (`runWasmBundle`'s signature unchanged; `deno task api-surface --floor` is what
  decides — re-measure before bumping). BEHAVIOUR changes it must name: an i32 literal that does
  not fit is now refused (sw160, BREAKING row in README), `wasmbundle` output laid out per image
  (README row), fresh `new`, switch order. Before a patch / minor: Rule 3's previous-tag tests
  (`bun scripts/check_prev_tests.ts`) and, once they exist, the consumer suites (H6.5b). The
  owner's number-type direction, if built first, would make it a MAJOR (hints and wasMath
  removed, after a deprecating release). (The 3.0.0 run-up text this item held is in git:
  `git log -S"The next release" -- cmem/next-work.md`.)

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
    1. ~~Bump the pin 1.8.1 → 1.10.0~~ DONE 2026-10-13 as 1.8.1 → 1.12.0.
    2. wasic emits `(@reloc data)` on every data address: strings, arrays, structs,
       string-array pointer words, `$__heap_ptr`'s initial value.
    3. Bundle the three projects UNOPTIMISED and report.
    4. ~~Then retire `wasmbundle.ts` and its range relocation~~ DONE 2026-10-26: `wasmbundle.ts`
       is now a pass around binaryang's `bundle()` (relocation guessed, warned, until 2 lands).
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

- ~~**H10** waits on **H9**~~: UNBLOCKED. binaryang 1.9.0 published `./definitions` (D1, D2, D3;
  § "binaryang caught up" above), and our pin (1.12.x) carries it. H10 is ours to start, after the
  compiler bugs (the owner's order, 2026-10-09). Our original request (SENT 2026-09-30) is in
  `scripts/binaryang-report.md`.
- **H4 and H11** are answered here (H4 re-verified item by item 2026-09-30); the workspace closes
  them in `../cmem/handoffs.md`.
- ~~binaryang's release after 1.12.1~~ **1.13.0 PINNED 2026-10-20** (letter of 2026-10-20): wast
  64,506 / 0 / 16, guard 0, `go_asyncify` 12 / 12, 43 pipeline goldens moved (optimizer). **The
  reply was SENT 2026-10-20** (`scripts/binaryang-report.md`, top section).
- **binaryang letter, 2026-10-23 (three items, no code asked of us):**
  1. **1.14.0 and 1.15.0 published** (JSR + npm, provenance on both; we pin 1.13.0; nothing removed
     or renamed). 1.14.0 adds `Memory64Lowering` (`--memory64-lowering`, opt-in; no other output
     moves). 1.15.0 runs `SSANoMerge` first at `-O3` / `-Os` / `-Oz`: **optimizer output moves**,
     so expect the golden-WAT PIPELINE entries that merge an `-Oz` library to move again (43 did on
     1.13.0); wasic's own output should not. **1.15.0 PINNED 2026-10-23** (owner: "bump now,
     first", ahead of the remaining fixes): gate green, every prediction held — wast 64,506 / 0 /
     16, guard 0, `go_asyncify` 12 / 12, 43 pipeline goldens moved, only merged-library functions
     (testing.md, 2026-10-23). Reply DRAFTED in `scripts/binaryang-report.md` (top section).
     **1.16.1 PINNED the same day** (owner: bump first again): nothing moved, every suite green;
     added to the same draft.
  2. **binaryang's history was rewritten too (H19, on GitHub 2026-10-23).** `upstream/binaryang`
     was RE-CLONED here the same day from `synapticforge1/binaryang` (the old clone had no local
     work: clean, no stash, `main` only; the new one is at `v1.15.0` `ae9e871`, 22 tags). A
     binaryang hash quoted in this repo's records before 2026-10-22 is an OLD one; translate it
     with binaryang's `cmem/publishing.md` § "The history purge" (not translated in bulk here).
  3. **The provenance outage was scope-wide** — recorded in design-decisions.md § JSR provenance
     (2026-10-23 entry; our "specific to wasmtk" conclusion withdrawn).

  Nothing to reply on 2 and 3; the reply on 1 was SENT 2026-10-26 (ledger C12, with a note that
  2.2.0 was pinned since).

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
- **2026-09-30 — the wasm-types ruling and the Math scope** (`dd5df73`): design-decisions.md,
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
  `LowerCustomPageSizes` held on 1.8.1 (`55f3fa7`); `assert_trap` checks the trap KIND
  (`abe1d94`, from 5,263 logged passes); pin 1.8.1 (`c689998`; compat `toText` re-laid-out,
  tokens identical, 60 golden entries layout-only); the lowering wired into the wast gate, skips
  66 → 16 (`62b70ae`); reply SENT (`21460bf`). design-decisions.md and testing.md hold the rules.
- **2026-09-29/30 — H12 fixes**: sw01 + sw33 (`c263f25`), sw02 (`3b903f4`), sw03 + sw34
  (`a85f488`), the console fallback delegates or aborts: sw04 + sw27 fixed, 7 rows loud
  (`8147f1b`); sw05 + sw35 found with it, sw21 (`a5d1ee5`); sw18 + sw22 + sw23, loud rows (2026-09-30,
  `fix/h12-sw18-sw22-sw23`). Open silent-wrong 31 → 18, then 19 with sw36 found.
- **2026-09-29 — binaryang 1.7.1 and the validator oracle** (`1ad8728`): wast 64,434 / 105 →
  64,473 / 66, the guard at 0 valid modules rejected.
- **2026-09-30 — stale-item sweep** (`4680925`): every open marker re-checked against code or a
  test; three closed, one sharpened.
- Everything earlier (the binaryang 1.5.3 → 1.7.0 bumps, the false-pass audit, the wast census
  history, the EH migration, the runner fixes, the branch audit): `git show
  2d151714025:cmem/next-work.md`.
