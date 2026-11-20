# Roadmap, phase status & vision

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 5.** The sections continue in:

- [roadmap-2.md](roadmap-2.md): from "Prioritized execution order (set 2026-06-03)"
- [roadmap-2b.md](roadmap-2b.md): continued
- [roadmap-3.md](roadmap-3.md): from "Prioritized execution order (set 2026-06-03) (continued)"
- [roadmap-4.md](roadmap-4.md): from "Congruent polyglot-producer goal + ABI posture (added 2026-06-03 — full detail i"
- [roadmap-5.md](roadmap-5.md): from "TypeScript feature gaps compilable later (now scheduled — see "Prioritized execu"

> **README roadmap-table convention (owner directive):** the README's `## wasmtk Toolkit Roadmap` →
> `### Feature Status` is ONE unified `| Complete | Phase | Feature | Highlights |` table.
> **Complete** is `✅` (shipped) or `⏳` (incomplete: to-do / planned / blocked). **All incomplete
> (`⏳`) rows are ALWAYS listed at the end of the table, after every `✅` row** — when adding a new
> item, put a `⏳` row at the bottom and flip it to `✅` (moving it up among the completed rows) once
> it fully ships. Highlights are full descriptions (no `…` truncation): a feature says what it does;
> a bug fix states the issue and the fix. Detail sections were collapsed into this table (2026-07);
> deep internals live in `cmem/`, worked examples in each command's README section.
>
> **ROW PLACEMENT — group by PHASE, not by date (owner directive 2026-07-28).** A new enhancement or
> bug-fix row goes **immediately beneath the phase row it belongs to**, so everything about a phase
> reads together. Do NOT append new dated rows to the end of the `✅` block — they are invisible
> there (this is exactly what went wrong on the 2026-07-28 stress-test batch: five correctly-dated
> rows were added at the bottom and the owner could not find them). The only global ordering rule
> that outranks this is the `⏳`-always-last rule above.
>
> **ROW LABELLING.** The **Phase** column carries the phase number, the kind of change, and the date:
> `NN (YYYY-MM-DD)` for the phase itself, `NN bug fix (YYYY-MM-DD)` / `NN enhancement (YYYY-MM-DD)`
> for a later change to that phase. Put the date in the **Phase** column, never buried in Highlights.
> End the Highlights with the regression/stress-test filename(s) that cover the change (e.g.
> ``Stress test `26_NestedForOfMatrix` ``) so the row points at its own proof.
>
> **This applies to every future stress-test batch.** When a batch surfaces bugs across several
> phases, the rows scatter — one under each affected phase — rather than clustering as a batch.
> The batch itself is recorded as a single unit in `compiler-bugs.md` (post-mortems) and
> `testing.md` (counts); the README only ever gets the per-phase, user-facing rows.
>
> **BREAKING CHANGES GET THEIR OWN TABLE (owner directive 2026-07-30).** A change that can require a
> consumer to edit source — a removed/renamed export, a moved entrypoint, a changed signature or
> default — does **NOT** go in the Feature Status table, where it would be invisible among hundreds
> of additive rows. It goes in **`## wasmtk Toolkit Roadmap` → `### ⚠️ Breaking Changes`**, the table
> placed **immediately above** `### Feature Status`. Columns:
> `| Version | What changed | How to migrate |`. Rules: state the replacement **concretely** (the
> exact import line / new call), say explicitly what is *not* affected so readers can bound the
> blast radius, and give the reason. Use `_next release_` in the Version column while unreleased and
> replace it with the real version at publish time. A breaking change may ALSO warrant a Feature
> Status row if it ships alongside a feature — but the Breaking Changes row is mandatory.

> Closed sections (16) moved verbatim to [archive/roadmap-to-2026-11-20.md](archive/roadmap-to-2026-11-20.md) on 2026-11-20 (H38).

## The unreleased block (on `main`, after v3.0.0)

1. **`wasmbundle` on binaryang's `bundle()` (2026-10-26, H11).** One memory, every index space
   renumbered on the IR, each import shared once; wasic's heap / tag / kind shared through a
   `wasmtk_rt` module of ours; relocation guessed with a printed warning until wasic marks its
   addresses. A start function, global exports and non-wasic counters now survive a bundle
   (sw178–sw181); `-o` naming an input is refused. Output differs in layout from the regex
   bundler's (each image at its own base). New import-map entry `binaryang-bundle`.
2. **Every `new` makes a fresh object (sw141, sw142).** `$__new_<C>` wrappers; class variables are
   pointer locals. Every class program's WAT moved (44 goldens), no output did.
3. **`switch` in source order, nested switches, `case CONST:`, float switch expressions**
   (sw149–sw152).
4. **BREAKING (the next release's floor decides): an i32 literal that does not fit is a compile
   error (sw160)**, the owner's rule 4 at compile time; bitwise operands and integer typed-array
   stores still wrap as JavaScript does. Needs a README Breaking Changes row.
5. **CLI:** a negative number argument is an argument (sw140); `dync -o <input>` refused (sw174);
   witgen replaces a binaryang-generated `.wit` (H11).
6. **sw139:** the regex bundler's shared heap at 0 (fixed before the switch, kept as a test).
7. Test harness: the golden snapshot writes the repo root as `<repo>`.
8. Release and dev tooling (not user-facing): `publish.yml`'s gate, OIDC and provenance steps run
   on Bun through `scripts/publish-workflow.ts` (2026-10-27; first runs at the next tag);
   `deno task upstream:link` maps every binaryang pin through the checkout's `jsr.json` and its
   config uses no lockfile (2026-11-05). The release follows the workspace's
   release-process.md § 5 in the owner's order D1 (2026-11-10; H30, H32, H33, C30, C34, C44):
   `deno task release` pushes `main` only; `publish.yml` on each push to `main` = `checks`
   (`is-release` only since 2026-11-20, H37 (e)) →
   `tag` (CI's annotated tag) → `release` (the GitHub Release page from the tag, REST API, never
   `gh`, no `release/<tag>` branch) → `jsr` (last; skips an upload already made; Rekor fatal);
   every action pinned to a commit. Releases recorded in `cmem/release.md`. Self-test
   `scripts/check_publish_workflow.ts`.
9. **Backend → binaryang 4.1.1 (4.0.0 on 2026-11-18 from 2.2.0; 4.1.1 on 2026-11-20).** wasmtk's output is unchanged (golden
   568 byte-identical, wasi 509/509); binaryang's validator now checks a legacy `delegate`'s label
   depth (2.2.2), so the wast gate needs no accepted-invalid pin. 4.0.0's input limits (256
   nesting levels, malformed UTF-8 in WAT refused, bounded locals) apply to what wasmtk passes it.
10. **H39 (2026-11-20): every system call in `src/host.ts`** (was `src/rt.ts`), gate
    `deno task check-host`; **`wasmtk --self-check`** (new flag: MINOR); every write atomic;
    `-o NUL` works on Windows under the installed permissions (ld136) and writes no `.wit` beside a
    device (ld137). README § "`wasmtk --self-check`" (with the "Tested on" line); cmem/platforms.md.
11. **H37 (2026-11-20), release tooling (not user-facing):** `deno task release`'s first step is
    the review gate (`Review complete: <commit>` in the gitignored issues file,
    `scripts/review-gate.ts`); the review-record parser and `--verify-commit` deleted; CI's
    `checks` runs `is-release` only; `scripts/check-privacy.ts` (+ self-test). H38: `cmem/`
    reorganised (STATE, router INDEX, archive, splits; `scripts/check-cmem.ts`).

> **Releases are recorded in [release.md](release.md) § "Release History" since 2026-11-10** (🔒
> owner D3: one place, newest first). The "Release status" sections below are the earlier
> per-release logs it indexes; no new one is written here.

## Compiler phase status

All **50 phases complete** plus sub-phases 5e/5f/5g/5h/6d/12b/13b. Full per-phase implementation
detail lives in `README.md` ("Completed Phases") and the legacy `CLAUDE.md`. Summary of milestones:

- Core language (functions, control flow, types, operators, enums, templates).
- Closures: first-class fns (5e), heap closures/factories (5f), named fn-type aliases (5g), shared
  mutable captures with heap-boxing (5h).
- Arrays: static+dynamic, growth, full method set, 2D (6d), rest/spread, typed arrays (31).
- Structs/interfaces, destructuring, interface dispatch (12b), tuples (23), generics by
  monomorphization (14), exceptions (15), module system (16), class inheritance + vtable (47).
- Type system extras: never/void/readonly (21), `as` casts (22), nullable `T|null` (24), nullish/
  logical ops (25), `for…of` (26), intersection types (33), type predicates (34), `typeof`/`keyof`
  (35), simple conditional types (36).
- Strings: full method set + escape processing (46); string arrays as params (43); string-returning
  user fns (42). Math intrinsics incl. extended via merged `mathlib.wasm` (38).
- Tooling: multi-file bundling (8), WASM import bundling (18), wasmbundle CLI (19/20), modc lib mode
  (17), jstyper (39), external interface mapping (40), WIT generation (41), bindgen (50), hybrid.

## Stages beyond the phases

(Table as a list — Stage · Scope · Status:)

- 0 — Scope: Canonical ABI **calling-convention alignment** — `cabi_realloc` export, (ptr,len)
  string params, and (2026-06-15) **canonical callee-allocated string returns +
  `cabi_post_<name>`**. Only the container is deferred (P1 core + sidecar WIT, not an embedded
  component). See [polyglot-producers.md](polyglot-producers.md) /
  [architecture.md](architecture.md) — Status: ✅ 2026-05-19; return-side forward-aligned 2026-06-15
- 0.5 — Scope: Dual JSR `/compat` backend migration (wabt-ts + binaryen-ts) — Status: ✅
- 0.6 — Scope: Allocator unification in wasmmerge (shared heap across merged libs) — Status: ✅
  2026-05-30
- 0.7 — Scope: Tier-1 stdlib capability libs (Set/Map/Date/JSON/RegExp) — Status: ✅ 2026-05-30/31 —
  see capabilities.md

## stdlib-bundling brief — remaining work items (§7)

| # | Item                                                                               | Status                                                                                              |
| - | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1 | Confirm wasmmerge malloc/heap handling                                             | ✅                                                                                                  |
| 2 | Implement allocator-unification pass                                               | ✅                                                                                                  |
| 3 | Author Tier-1 caps (Set, Map, Date, JSON, RegExp)                                  | ✅ **all 5 done**                                                                                   |
| 4 | Wire capability selection (feature-level tree-shake — bundle only referenced caps) | ✅ 2026-06-02 — embedded caps + virtual `wasmtk:<cap>` import, auto-merge only referenced           |
| 5 | Promise/async: microtask runtime; lift `hybrid` async exclusion                    | ✅ COMPLETE 2026-06-15 — #13 13.1a–13.5 (eager microtask runtime, not state-machine; suite 317/317) |
| 6 | Evolve `hybrid` from `// @wasm` annotations → TS-type-driven routing               | ✅ 2026-06-02 — `--auto` mode routes fully-typed fns to wasic, dynamic to host                      |
| 7 | Decide the §6 kernel scope question (drop `javyc` vs ship own dynamic runtime)     | ✅ DECIDED 2026-06-02 — **build wasmtk's own dynamic runtime** (see below)                          |

**§7-#7 decision (2026-06-02, project owner) — ✅ DELIVERED (v1.9.0–v1.11.1):** wasmtk **shipped its
own dynamic-runtime module** to cover the irreducible kernel (`eval`/`new Function`, pervasive
`any`, open-prototype mutation) rather than declaring it out of scope or relying on `javyc`
long-term. The own runtime (the `wasmtk:dynrt` interpreter) is complete; **`javyc` (QuickJS) was
retired and DELETED in v1.11.1** (the whole-file entry is `wasmtk dync`). `hybrid --auto` (#6)
routes dynamic-shaped functions to the own runtime (its fallback is the HOST, never Javy). The
paragraph's original "not implemented yet / interim fallback" wording reflects the 2026-06-02 state.

**#5 Promise/async is COMPLETE** (2026-06-15 — #13 13.1a–13.5; eager microtask runtime + `hybrid`
lift; suite 317/317). The remaining large track is the **own dynamic runtime** (#7 decision) — gated
behind Phase 51 language hardening (now done), so unblocked.

