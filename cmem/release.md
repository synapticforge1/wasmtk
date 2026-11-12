# release.md — how wasmtk releases, and every release, newest first

🔒 **The ONE place a release is recorded** (owner, 2026-11-10, decision D3: "releases should be
recorded in one place in every project; … release.md should be the file name with the newest first
in the 'Release History' with a summary of what changed in each one"; workspace
`release-process.md` § 5 U11, letter H33). Created 2026-11-10.

**The process** is the workspace's `../cmem/release-process.md` (§ 5, U1–U12, in 🔒 the owner's
order D1: "CI to check first, then push the tag, and then create the release page from the tag,
then publish the package to the registry"); wasmtk's names are in
[workflow.md](workflow.md) § "The release flow". In one line: the owner gives the go and the level
→ `deno task bump <kind>` → `deno task release` pushes `main` (no tag) → `publish.yml`: `checks` on
that commit → CI tags `vX.Y.Z` → the GitHub Release page from the tag → `deno publish` to JSR, the
Rekor id read back.

**Each entry:** the version and date, a summary of what changed (CHANGELOG.md § X.Y.Z is the
user-facing text), the CI run, the read-backs (JSR provenance, the page), and what was checked as a
user. 🔒 **From 2026-11-12 every entry ALSO records the two required reviews** (owner; workspace
`review-process.md` § 0, letter H35), written BEFORE the bump, as two paragraphs at column 0 in
EXACTLY the form `**Security review (vX.Y.Z):** <scope>; rounds <n>; ended by an empty round
(round <n>, <YYYY-MM-DD>).` (and the same for `**Hardening review (vX.Y.Z):**`), the version the
entry's own — `deno task release` refuses without both, and CI repeats the check on the bump commit
(guard 0g, `--verify-commit`; [review-process.md](review-process.md) § 3). **This file stays plain
Markdown** (since review round 4): no code fences, no HTML or comments (no line starting with `<`),
no indentation of 4+ spaces or tabs, headings only as `#`… at column 0 — the gate refuses such a
line by number, since each can hide text. The entries below predate the rule. Entries before this file existed are summaries of the records they came from; the full
per-release logs stay in [roadmap.md](roadmap.md) § "Release status (date) — vX.Y.Z", which this
file indexes (not moved, 2026-11-10).

## Release History

### 3.0.0 — 2026-10-24

**JavaScript's numbers, `console.log` of whole objects, located errors, binaryang 2.2.0. MAJOR.**
`+ - *` of `i32` values give JavaScript's result, and a store that does not fit fails (a trap
without a `try`); integer `/` and float-to-integer stores are compile errors; `console.log` prints
whole objects as Deno does; compile errors carry their location; the backend is binaryang 2.2.0;
the API-surface compatibility gate with Rule 4. Breaking items: README "Breaking Changes".
**Released** (owner: "Publish 3.0.0 now") with `deno task publish` (the pre-2026-11-10 flow): tag
`v3.0.0` at `4708daa4`, CI run 40083193079 green in every step; **JSR provenance: Rekor
3439121339** (re-read 2026-11-10); the first release from `synapticforge1/wasmtk`. Page:
`https://github.com/synapticforge1/wasmtk/releases/tag/v3.0.0` (made then by `gh` in CI; 200 on
the REST API 2026-11-10). Detail: roadmap.md § "Release status (2026-10-24) — v3.0.0".

### 2.0.3 — 2026-09-28

**Typed declarations; `wasmtk run` exit codes at parity with wasmtime; binaryang 1.7.0.** Detail:
roadmap.md § "Release status (2026-09-28) — v2.0.3".

### 2.0.2 — 2026-08-27 (recorded 2026-08-31)

**Backend on binaryang 1.5.3; wider `.wast` coverage; a Windows write-race fix.** Detail:
roadmap.md § "Release status (2026-08-31) — v2.0.2".

### 2.0.1 — 2026-08-27

**Standard exception handling; the merged backend; a silent memory-corruption fix.** The first
version with JSR provenance again after the 2026-07-08 → 07-30 scope-wide outage
(design-decisions.md § JSR provenance). Detail: roadmap.md § "Release status (2026-08-27) — v2.0.1".

### 2.0.0 — 2026-07-30

**Type predicates with inline object types; `./utils` slims down. MAJOR.** Published without
provenance (the scope-wide outage). Detail: roadmap.md § "Release status (2026-07-30) — v2.0.0".

### 1.11.12 — 2026-07-30

**Intersection types: base-typed parameters are checked.** roadmap.md § "… v1.11.12".

### 1.11.11 — 2026-07-30

**Discriminated unions: shared variant fields.** roadmap.md § "… v1.11.11".

### 1.11.10 — 2026-07-30

**Namespace members.** roadmap.md § "… v1.11.10".

### 1.11.9 — 2026-07-29

**An operator-precedence fix.** roadmap.md § "… v1.11.9".

### 1.11.8 — 2026-07-28

**A stress-test bug-fix release.** roadmap.md § "… v1.11.8".

### 1.11.7 — 2026-07-28

**Unified producer verbs; the Go browser path removed.** JSR score 100. roadmap.md § "… v1.11.7".

### 1.11.6 — 2026-07-27

**A portable dynamic runtime.** CHANGELOG.md § 1.11.6.

### 1.11.2 – 1.11.5, 1.9.x – 1.10.x

Not in CHANGELOG.md; what is known is in roadmap.md § "Release status (2026-07-08) — v1.11.3",
§ "(2026-07-02) — v1.11.2" and § "(2026-06-30)". v1.11.2 is the last version before the provenance
outage that carries a Rekor entry.

### 1.8.0 — 2026-06-15

**Async / Promises.** CHANGELOG.md § 1.8.0.

### 1.7.0 — 2026-06-15

**`Number.parseInt` / `parseFloat`; multi-level interface inheritance; the Canonical ABI's
return-side forward-alignment** (bindgen updated). JSR score 100 (provenance + docs).

### Before 1.7.0

Summarized in the README "Completed Phases" table and roadmap.md.
