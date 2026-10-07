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

1. **Scripting is Deno/TypeScript ONLY.** Ad-hoc probes, migrations and repairs are written as
   `.ts` in the scratchpad and run with `deno run -A <file>`. **No `python3`**, no inline
   `python3 -c`, no `node -e`. It is the language the repo is already in, a TS probe can import
   the real modules instead of reimplementing them, and python brought a second encoding regime
   (cp1252 stdout) and a second escape pass into a UTF-8 repo.
2. **No heredocs. Ever, in any language.** Not `<<'EOF'`, not `@'…'@`, and **not for commit
   messages** — write the message with `Write` and use `git commit -F <file>`, never `-F-`.
   Five content corruptions trace to heredoc transport, including a literal NUL byte written into
   `.gitattributes` and another into the rule warning about it. **The corruption is invisible in
   the source that produces it**, so attention does not help; use `Write`/`Edit` for content and
   let the shell only RUN things.

Full rationale and the incident list: [best-practices.md](best-practices.md) §4b.

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

## Files

| File | What it holds |
| --- | --- |
| [best-practices.md](best-practices.md) | METHOD, not findings: rules that stop a defect class recurring, each with its incident and origin tag; ends with the workspace's 28 ★ convergent rules (a stamped copy, never edited here). Read before an audit, a conformance pass or a bump. |
| [workflow.md](workflow.md) | The working loop (branch only for a fix → gate → memory → commit → merge), the release flow (SemVer bump behind the compatibility gate), the binaryang bump checklist, `upstream/` co-development, context boundaries, traps. |
| [overview.md](overview.md) | What wasmtk is; repo layout; the key source files. |
| [architecture.md](architecture.md) | wasic / modc / bindgen / hybrid; the pluggable binaryang backend; the build and merge pipeline; the `wast` spec runner. |
| [testing.md](testing.md) | How to run every suite; which suites a change reaches (impact map); current counts, dated; the wast per-file baseline and its oracles; the engine cross-check; the vendored spec corpus. |
| [compiler-bugs.md](compiler-bugs.md) | The live defect log: root cause, fix, regression test, class (silent-wrong / loud) and tally, incl. the H12 round-1 table of open compiler bugs. Read before debugging anything. |
| [design-decisions.md](design-decisions.md) | Invariants that must not be reverted silently: typed declarations, the declared type deciding wasm-typed arithmetic (owner ruling), operator grouping per JavaScript's precedence table in both emitters, f32 conversion at every boundary, the thrown kind, console formatting vs string conversion, the binaryang pin and wast oracles, SemVer and the compatibility gate, the console error path, WAT-text rules. Read before changing codegen, a backend or the release scripts. |
| [roadmap.md](roadmap.md) | Releases and phases, and the unreleased block since the last tag; README roadmap-row and Breaking Changes conventions. |
| [next-work.md](next-work.md) | The ONE list of what is open, each item pointing at its record; completed work only as dated summaries with commits. |
| [capabilities.md](capabilities.md) | Tier-1 stdlib capability libraries (Set, Map, Date, JSON, RegExp) and virtual `wasmtk:<cap>` imports. |
| [polyglot-producers.md](polyglot-producers.md) | Go / Zig / Rust producers: CLI verbs, build invariants, mergeability rules, asyncify. |
| [dynrt-design.md](dynrt-design.md) | The dynamic runtime (`dync`): value model, interpreter, `any` integration, GC. |
| [async-design.md](async-design.md) | Promise / async design and its invariants. |
| [math-cr-sweep.md](math-cr-sweep.md) | The correctly-rounded `mathlib` sweep: dd framework, recipe, gotchas, oracle harness. |
| [stdlib-bundling-brief.md](stdlib-bundling-brief.md) | On-demand stdlib bundling design brief (§1–§7d). |
| [offload-inventory.md](offload-inventory.md) | What wasmtk does that binaryang, a runtime or a loader could own (letter H11), each with its trigger. 2026-10-06: the owner decided `wasmbundle` → binaryang's `wasm-bundle` (exact relocation via `linking` / `reloc.*`); nothing has moved yet. |
| [vision.md](vision.md) | Polyglot ecosystem vision; "TypeScript as a DLL"; loader strategy; repo map. |
| [wasm-math-plan.md](wasm-math-plan.md) | The declared-type rule for `/` (owner ruling 2026-09-30) and the `Math` work: Phase 1 (exact `sign` / `round` / `hypot`, Math results at the declared type) DONE 2026-10-06; Phases 2–4 wait on the owner's decisions D1–D6. |
| [wasic-modularization-plan.md](wasic-modularization-plan.md) | Plan of record for splitting `src/wasic.ts` (letter H12): the layers, the seam rules and gate, the phases. |
| [component-model-discussion.md](component-model-discussion.md) | OPEN design discussion, not implemented: a polyglot component model. |
| [legacy-claude-archive.md](legacy-claude-archive.md) | The pre-2026-07-30 `CLAUDE.md` (228 KB), verbatim: history, not policy. |

## Related files outside cmem

- `README.md` — the public, user-facing doc (install, usage, capability surface, examples).
- `CLAUDE.md` — small auto-loaded pointer file; machine-local, gitignored.
