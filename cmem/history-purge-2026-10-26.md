# history-purge-2026-10-26.md — the second rewrite: one binary's debug paths, and its old→new map

**Every commit hash that contains the file `tests/module/wasm_mod/fib-zig_mod.wasm` (or the same
blob at an earlier path) changed again on 2026-10-26** — that is every commit from the v1.2.x line
to `main`, 745 commits. A wasmtk hash quoted before 2026-10-26 (and after the first purge,
[history-purge-2026-10-23.md](history-purge-2026-10-23.md)) names a commit that no longer exists
here: translate it with the tables below. The 102 citations in this repo's tracked Markdown were
rewritten the same day through the full map (a token rewritten only where it prefixed exactly one
old commit; the first purge's record and the verbatim legacy archive were left as they are).

## Why and what (owner, 2026-10-26: "lets get the second history fixed")

Workspace letter H18 (`../cmem/handoffs.md`; ledger `../cmem/workspace-correspondence.md`).
Making wasmtk's privacy scan include binaries (letter H22, recorded in INDEX.md § Policy) found that
the committed Zig fixture `fib-zig_mod.wasm` carried DWARF with the owner's user-profile, scoop and
AppData paths and the workspace's old project path. Every earlier scan used `git grep -I`, which
skips binaries, so the first purge (text only) missed it — binaryang found the same class in five
of its own binaries the same day. A scan of EVERY blob reachable from every GitHub ref (14,082
blobs, binaries included) found exactly ONE leaking blob, `60cc8c8d50`, one version of that file;
the other 19 hits were the std path library's own doc examples (`C:\Users\foo`, left alone in
both purges) and the privacy rule's own placeholder text.

The fix at HEAD (`4084d37c8b2`, before this rewrite `951fd35a`) removed the module's seven
`.debug_*` custom sections byte-exactly (6,225 → 336 bytes; `mod_tests` 55 / 55). This rewrite put
that clean blob (`fffef477b5`) in place of the old one in every commit.

## How

In a fresh `git clone --mirror` of GitHub on NTFS (not the exFAT checkout; VS Code's auto-fetch
cannot touch it): `git filter-branch --index-filter "bun swap_blob.ts" --tag-name-filter cat --
--all`, the filter swapping the one blob id wherever it sits in the index (any path), nothing else.
Backups first, in the workspace's machine-local `cmem/local/backups/`:
`wasmtk-pre-purge2-2026-10-26.bundle` (GitHub's 154 refs) and
`wasmtk-local-pre-purge2-2026-10-26.bundle` (this checkout's 234 refs, the stash included). They
hold the old blob: never push from them.

**Verified before pushing** (a script pairing every old commit with its new one by author,
committer, dates and full message): 745 pairs, 701 trees differing ONLY by `60cc8c8d50` →
`fffef477b5` at that path, 44 identical; the old blob unreachable from every new ref; four commits
reachable only from the unchanged tag `v1.1.8` kept their hashes. `main`'s tree is byte-identical
(`3f681dae29`).

**Pushed** 148 refs (74 branches, 74 tags) to GitHub with `--force-with-lease=<ref>:<old>` on each,
0 rejected; GitHub's 154 refs afterwards equal the rewritten mirror exactly (`ls-remote`). Six refs
did not change (`v1.1.8`, `wasmtk_1.1.8`, `wasmtk_1.1.1`, `wasmtk_v1.1.1` and two branches whose
history never held the file).

**This checkout:** the 35 branches that matched GitHub were moved to GitHub's new values; the 42
local-only branches and the stash were rewritten in place with the same filter — deterministic:
the merged work branch came out equal to GitHub's new `main` (`4084d37c8b2`) on its own. The
merged branch `fix/h11-bundle-findings-2026-10-26` was then deleted, `refs/original` removed,
reflogs expired, `gc --prune=now` (1 pack, 34 MiB); the old blob is no longer in this object store.
The stash was re-registered (`stash@{0}`, rewritten). A re-scan of every local blob: only the 19
non-personal hits above.

**Not in our control:** JSR's provenance for v3.0.0 and every earlier version names the OLD commits
(immutable); GitHub serves old commits by hash until its own garbage collection, and a full purge
is a GitHub Support request (the owner's; the 2026-10-23 draft in the gitignored `cmem/local/`
covers the same request). Other clones made before 2026-10-26 hold the old history: never push
from one; re-clone.

## The map

**Heads:** `main` `951fd35a65b` → **`4084d37c8b2`**.

**Cross-repo hashes:** the H7 fixture stamp `84b3e180eba` → **`4a5c3cf668d`** (loader-js re-stamps
from THIS one); the 2026-10-26 session's commits `85826c82` → `eb8e62bc45a`, `560f0120` →
`1638aad0d16`, `c9188296` → `c1070bf9ed0`, `1c9b69ba` → `d65f4c64377`, `951fd35a` → `4084d37c8b2`;
the 3.0.0 memory commit `27b5fbc1` → `0976c052cb3`; the next-work archive `f21bfb5f810` →
`2d151714025`; the first purge's new `main` `bbe713172e4` → `66ad545a0dd`.

**Tags** (old, i.e. the first purge's value → new):

1.2.2 `bd079875552`→`1d1732f7685` · 1.2.9 `401faed81e9`→`1b9bf8ce8ff` · v1.10.0 `d037aff69fb`→`df0a8ab8cfb` · v1.10.1 `c010e487ef2`→`dba0ee18219` · v1.10.2 `804504db35f`→`15a08fc21c7` · v1.10.3 `dd01dfc2b9f`→`89d963e0c62` · v1.10.4 `e2a5c3b06d8`→`14827b36289` · v1.10.5 `8731336659e`→`c101f74b796` · v1.10.6 `756059040c7`→`d2673765670` · v1.10.7 `b9578686047`→`4ee12d3569f` · v1.10.8 `92f8da88162`→`45ec67ebb2b` · v1.10.9 `2a58e4398a1`→`6bca13d5720` · v1.11.0 `035f8fcb163`→`cb4aa4938b1` · v1.11.1 `bc2d04ea16d`→`8ef36220988` · v1.11.10 `49603aa32ab`→`f700254fbc5` · v1.11.11 `ee81250585d`→`bc9dc4e3d09` · v1.11.12 `309b81ed2e5`→`bec0211526d` · v1.11.2 `328d298b3b2`→`1906fdb6268` · v1.11.3 `e4dd549445a`→`200bc137934` · v1.11.4 `55d05311465`→`fe6a79d64cd` · v1.11.5 `145518f59cf`→`f1b1fed3cad` · v1.11.6 `63d21c0645a`→`b86fdcca8de` · v1.11.7 `dbe77291cff`→`2410fef6e50` · v1.11.8 `04a496b72e5`→`ba5de1a7f39` · v1.11.9 `40e9c85f59f`→`59027ff1467` · v1.2.0 `0dd4806d4a3`→`d035c068193` · v1.5.6 `4a39a10dff5`→`18c128e22f7` · v1.5.7 `24ed7af4419`→`0d7cde90d85` · v1.5.8 `83cb9856a1c`→`d4e4ea62af7` · v1.5.9 `c9183b705df`→`89975ec51da` · v1.6.0 `58f268e77b0`→`d1dfb12ea25` · v1.6.1 `82048e9757e`→`d0d0c796f62` · v1.6.2 `59fb8fbb591`→`2cf1d19a86d` · v1.6.3 `2919326570e`→`e36278fb45d` · v1.6.4 `4ba842fb09f`→`69e834cff29` · v1.6.5 `0f6d61a648d`→`e250cb215c4` · v1.7.0 `5dec7eb0b51`→`a8e9605b449` · v1.8.0 `731a8a28ff9`→`c693aa03646` · v1.9.0 `908c0c5578d`→`511de872bc3` · v2.0.0 `66421a77ee9`→`e438ec89b43` · v2.0.1 `9acf13a3cfc`→`ac668811b55` · v2.0.2 `1f305cac0a9`→`276028af1ed` · v2.0.3 `2597f1fd4b2`→`9fae954972b` · v3.0.0 `e6159331b6f`→`4708daa4e93` · wasmtk_1.2.1 `3a801049771`→`defdfb04654` · wasmtk_1.2.3 `8aae794d106`→`438110fb328` · wasmtk_1.2.5 `ecdfdc154de`→`eb19d78ef49` · wasmtk_1.2.6 `de36bc3477a`→`4fd599c930f` · wasmtk_1.2.9 `401faed81e9`→`1b9bf8ce8ff` · wasmtk_1.3.2 `b6bb958c92c`→`72e3d372a21` · wasmtk_1.3.3 `4d886867285`→`171886f6f57` · wasmtk_1.3.4 `d24c08ae085`→`5d116d5127b` · wasmtk_1.3.5 `4b0b5a9a702`→`36d2968010d` · wasmtk_1.3.7 `6cfde9547a0`→`3a4a395e578` · wasmtk_1.3.8 `d08ed0f7121`→`5bc8f641a8e` · wasmtk_1.3.9 `96d1aab762b`→`9137ac3c711` · wasmtk_1.4.0 `b5eb3c3bfdc`→`70054c186f8` · wasmtk_1.4.1 `07289abfa64`→`46ee5efe241` · wasmtk_1.4.2 `21b318ef7c8`→`1f531c4a92b` · wasmtk_1.4.3 `c414d9f7e6d`→`5de7a0e5663` · wasmtk_1.4.4 `07659c71f30`→`8a833161b05` · wasmtk_1.4.5 `15281cc0289`→`8a8a33ece8e` · wasmtk_1.4.6 `f46502ac597`→`d7a7723d366` · wasmtk_1.4.7 `8f151355b77`→`780314001ad` · wasmtk_1.4.8 `4d8ec062323`→`26e625b25eb` · wasmtk_1.4.8.1 `e72a535fd07`→`f7dd35bc45f` · wasmtk_1.4.9 `33b43934630`→`0a84daa737b` · wasmtk_1.5.0 `be4666d1892`→`b8974470351` · wasmtk_1.5.1 `c7053358f7a`→`f4812837f6b` · wasmtk_1.5.2 `fa94e441c02`→`4cd09bbc0ca` · wasmtk_1.5.3 `af5b7e1ab2c`→`ec7508dda9d` · wasmtk_1.5.4 `5173ba25352`→`17b4a4c0ac7` · wasmtk_1.5.5 `13c2117555d`→`784e983017d` · wasmtk_1.5.6 `70885db5bb7`→`6cec07c3d06`

The full 745-line commit map is not committed (as in the first purge); an old hash is translated
from the private bundles by author date + subject, which the rewrite preserved exactly.
