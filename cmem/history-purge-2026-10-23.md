# history-purge-2026-10-23.md — the H19 rewrite of every ref, and its old→new map

> **2026-10-26: a SECOND rewrite** changed most of the "new" hashes below again (one binary's
> debug paths, which this text-only purge missed). This file's map stays as it was (old → the
> 2026-10-23 value); take the second hop in [history-purge-2026-10-26.md](history-purge-2026-10-26.md).

**Every commit hash in this repository changed on 2026-10-23.** A hash quoted anywhere outside
this repo before that date (JSR provenance, the loaders' fixture stamps, the workspace letters,
old chat transcripts) names a commit that no longer exists here. Translate it with the tables
below. The citations inside this repo's tracked Markdown were rewritten the same day (100 in 12
files, a token rewritten only where it prefixed exactly one old commit).

## Why and what (owner, 2026-10-22: "a necessary thing for security"; "proceed", 2026-10-23)

Workspace letters H18/H19 (`../cmem/handoffs.md`; rule in `../cmem/working-rules.md` § Records).
Measured over all 231 refs before the rewrite (every blob reachable from any ref, 13,657 blobs /
916 MiB; every commit message; every identity):

- **The owner's personal address** was the author/committer email on all but 4 identity slots
  (1,434 of 1,446) → the GitHub noreply address. `noreply@github.com` (GitHub's web committer, 8
  slots) left as it was. No commit message and no file content held the address.
- **Personal drive paths** in 166 historical blobs: `cmem/roadmap.md` (138 versions),
  `cmem/vision.md` (14), `cmem/legacy-claude-archive.md` (1), and the generated bindgen host
  runners under both their old `tests/bindgen_fixtures/` and current `tests/module/bindgen_fixtures/`
  homes (13). Each blob was swapped for a copy with the prefix replaced by `<projects>\`,
  `<home>\` or `file:///<repo-root>/`; the cleaner asserted the line count unchanged, only matching
  lines touched, round-trip UTF-8, and zero matches left.
- **`.claude/`** (`settings.local.json`, which held a user-profile path, and a
  `scheduled_tasks.lock`) was tracked from 2026-05 to 2026-07-30: removed from every commit. No
  commit became empty-and-dropped; the count stayed 723.
- **Left alone:** 18 blobs under `node_modules/.deno/@jsr+std__path@1.1.4/` whose matches are
  the library's own doc examples (a made-up `foo` folder under a Windows user directory), not
  paths on the owner's machines.

## How

`git filter-branch --env-filter … --index-filter … --tag-name-filter cat -- --all` (no host Python,
so not `filter-repo`; loader-dotnet's template). The index filter ran `git rm -r --cached .claude`
and swapped the 166 blob ids. **The owner allowed the older tags' trees to change (2026-10-23)**:
H19 item (4) asked for byte-identical tagged trees to protect Go's checksum database, which does
not apply to a JSR package; removing `.claude/` from history is impossible otherwise.

**Verified before pushing** (a script pairing every old commit with its new one over the 155 local
refs): 723 pairs, every author/committer name and date and every message identical, every email
noreply, every tree difference either a `.claude/` deletion or a mapped blob swap, `HEAD`'s tree
byte-identical (`3a2cc7db40de`). A re-scan of the rewritten branches and tags: zero personal paths
(the 18 library examples only), zero personal addresses.

**Pushed** 152 refs (75 branches, 77 tags) with `--force-with-lease=<ref>:<old>` on each; GitHub's
refs afterwards equal the plan exactly. Branch decisions (owner, 2026-10-23: "update the branches
to the latest here"): `1.4.4` and `1.5.4` were one commit BEHIND GitHub, so the local branches
were fast-forwarded to GitHub's rewritten tips; `1.1.8` had diverged (a local rebase of the same
six commits onto "added logo to readme"), so the local branch was pushed — GitHub's six original
commits stay reachable through tags `v1.1.8` / `wasmtk_1.1.8`. The 40 branches that existed only
on GitHub (`release/*`, `1.1.1`, `1.3.7`) were rewritten through the commit map. Local-only
branches and the stash were not pushed.

**Not in our control:** JSR's provenance for 2.0.3 and earlier names the OLD commits (immutable);
GitHub serves old commits by hash until its own garbage collection, and a full purge is a GitHub
Support request (owner). The pre-purge state is kept privately as a bundle in the workspace's
machine-local `cmem/local/backups/`; never push from it.

## The map

**Heads:** `main` `673d7e30598` (the old `origin/main`) → `main` now `bbe713172e4` (the 133
unpushed commits are now pushed); the last pre-purge local commit `753a6b2e7ee` → `bbe713172e4`.

**Cross-repo hashes:** the H7 fixture stamp `f50c8e4` → **`84b3e180eba`** (on the pushed `main`,
so loader-js can re-stamp from it); the next-work archive `ab5d1273644` → `f21bfb5f810`.

**Tags** (old → new):

wasmtk_1.1.1 `91bb017952f`→`1b60b32fca9` · wasmtk_v1.1.1 `91bb017952f`→`1b60b32fca9` · v1.1.8 `1b6dd4d4b5e`→`1f10d24a8b4` · wasmtk_1.1.8 `1b6dd4d4b5e`→`1f10d24a8b4` · v1.2.0 `1d8cf70238a`→`0dd4806d4a3` · wasmtk_1.2.1 `dae71078fdc`→`3a801049771` · 1.2.2 `ddff09a069f`→`bd079875552` · wasmtk_1.2.3 `cea630ec9c1`→`8aae794d106` · wasmtk_1.2.5 `672644648fc`→`ecdfdc154de` · wasmtk_1.2.6 `a4e7c9e2683`→`de36bc3477a` · 1.2.9 `6b0f5d568f4`→`401faed81e9` · wasmtk_1.2.9 `6b0f5d568f4`→`401faed81e9` · wasmtk_1.3.2 `07a8b4e7fbf`→`b6bb958c92c` · wasmtk_1.3.3 `68404d9d8f6`→`4d886867285` · wasmtk_1.3.4 `e4908371c64`→`d24c08ae085` · wasmtk_1.3.5 `872a8d54e22`→`4b0b5a9a702` · wasmtk_1.3.7 `590d6fd109b`→`6cfde9547a0` · wasmtk_1.3.8 `fc2b63b2bf1`→`d08ed0f7121` · wasmtk_1.3.9 `e1bf7ea2063`→`96d1aab762b` · wasmtk_1.4.0 `c21046df2f2`→`b5eb3c3bfdc` · wasmtk_1.4.1 `44d1fe1d769`→`07289abfa64` · wasmtk_1.4.2 `6ece76ee2d5`→`21b318ef7c8` · wasmtk_1.4.3 `174b9002eea`→`c414d9f7e6d` · wasmtk_1.4.4 `7dcd15a7dd6`→`07659c71f30` · wasmtk_1.4.5 `c107b2f08f9`→`15281cc0289` · wasmtk_1.4.6 `37f53b5b6ac`→`f46502ac597` · wasmtk_1.4.7 `280febcefae`→`8f151355b77` · wasmtk_1.4.8.1 `6bc9f6af1ad`→`e72a535fd07` · wasmtk_1.4.8 `a3fb5448393`→`4d8ec062323` · wasmtk_1.4.9 `5c079702a01`→`33b43934630` · wasmtk_1.5.0 `a3901adb9a5`→`be4666d1892` · wasmtk_1.5.1 `51112ceb2a5`→`c7053358f7a` · wasmtk_1.5.2 `e54689076a4`→`fa94e441c02` · wasmtk_1.5.3 `ec5ff887ccb`→`af5b7e1ab2c` · wasmtk_1.5.4 `0c0106331a0`→`5173ba25352` · wasmtk_1.5.5 `37fc1ee701a`→`13c2117555d` · v1.5.6 `d2618307ef9`→`4a39a10dff5` · wasmtk_1.5.6 `3a1eaf47c28`→`70885db5bb7` · v1.5.7 `f9ccd673b84`→`24ed7af4419` · v1.5.8 `fb5b43c7d3d`→`83cb9856a1c` · v1.5.9 `b9773104479`→`c9183b705df` · v1.6.0 `6180562d94b`→`58f268e77b0` · v1.6.1 `6c0630729da`→`82048e9757e` · v1.6.2 `5a379c0795f`→`59fb8fbb591` · v1.6.3 `101fcab58c9`→`2919326570e` · v1.6.4 `c4017951712`→`4ba842fb09f` · v1.6.5 `078deeb4005`→`0f6d61a648d` · v1.7.0 `e64595f4b88`→`5dec7eb0b51` · v1.8.0 `6245e4ce4e1`→`731a8a28ff9` · v1.9.0 `1b46b0badca`→`908c0c5578d` · v1.10.0 `d8066a1a4d1`→`d037aff69fb` · v1.10.1 `4c0a1882661`→`c010e487ef2` · v1.10.2 `c36e7998b76`→`804504db35f` · v1.10.3 `7b70c0460a6`→`dd01dfc2b9f` · v1.10.4 `71d45698274`→`e2a5c3b06d8` · v1.10.5 `5bc4a4ac5de`→`8731336659e` · v1.10.6 `c65ad014ddb`→`756059040c7` · v1.10.7 `2c3cb3c1c49`→`b9578686047` · v1.10.8 `5d23b426617`→`92f8da88162` · v1.10.9 `ef97b35b8ab`→`2a58e4398a1` · v1.11.0 `4794f932718`→`035f8fcb163` · v1.11.1 `e5a5ad015f3`→`bc2d04ea16d` · v1.11.2 `8798c8b20cf`→`328d298b3b2` · v1.11.3 `964212cf3c8`→`e4dd549445a` · v1.11.4 `ddc0fe4e11f`→`55d05311465` · v1.11.5 `a76389e21a7`→`145518f59cf` · v1.11.6 `581db4fb98a`→`63d21c0645a` · v1.11.7 `a9f572bfe8d`→`dbe77291cff` · v1.11.8 `d7e591e63c7`→`04a496b72e5` · v1.11.9 `039a00c3df5`→`40e9c85f59f` · v1.11.10 `a89221db0da`→`49603aa32ab` · v1.11.11 `89fa0bfa333`→`ee81250585d` · v1.11.12 `56ab94c670c`→`309b81ed2e5` · v2.0.0 `ef208ee4635`→`66421a77ee9` · v2.0.1 `ebebd4e1f60`→`9acf13a3cfc` · v2.0.2 `14b4edcc028`→`1f305cac0a9` · v2.0.3 `43c4d8ef02f`→`2597f1fd4b2`

The full 723-line commit map is not committed (it would double this file for little use); any old
hash can be translated from the private bundle by matching author date + subject, which the
rewrite preserved exactly.
