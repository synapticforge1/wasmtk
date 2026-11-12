# review-process.md — wasmtk's slots in the workspace review standard

🔒 **The process is the workspace's `../cmem/review-process.md`** (owner, 2026-11-12: "accept the
review process and make it a standard for all projects. each project may have differing individual
issues, but the overall process should be the same"; letter H35; source: S3D-ReportCompiler's,
ledger C46). It is NOT restated here: its §§ 1–6 govern — fresh read-only reviewers given the
CODE, never the author's conclusions; 3–4 per round, scopes not overlapping; every finding
re-verified by a run, fixed as its CLASS with a test that fails without the fix (inverted, a mutant
per part); rounds on the fixes, briefed fresh, **until a round's reviewers find nothing — then the
review stops**; the owner decides scope and order; a review never commits, pushes or releases.

The owner's words: **"review"** → its § 2, **"security review"** → § 3, **"hardening review"** → § 4
(INDEX.md § "Owner commands"). 🔒 **A security review and a hardening review are REQUIRED before
every release**, each run to its empty round on everything since the last release, and recorded in
that release's entry in [release.md](release.md) BEFORE the bump — `deno task release` refuses
otherwise (§ 3 below).

This file holds what differs for wasmtk: the slots of the workspace file's § 7. Written 2026-11-12;
every number below is a claim with its date — re-derive before relying on it.

## 1. The slots

**Private data — never given to a reviewer, never read by one (§ 1.1, § 5):** `cmem/local/`
(machine facts, gitignored); `CLAUDE.md` (machine-local pointer, gitignored); `.claude/`; the
owner's paths anywhere. A reviewer works in its own scratch folder under the system temp folder and
never inside `upstream/binaryang/` (a sibling's checkout — read-only reference, not wasmtk's code).

**The worst silent case (§ 1.2) — ranks above everything:** `wasic` (or `dync`, `modc`, `hybrid`)
compiles a TypeScript program into a VALID module that runs and prints something DIFFERENT from
what the same program prints under JavaScript's semantics — the `silent-wrong` class of
[compiler-bugs.md](compiler-bugs.md) (`sw` rows). Close behind: a tool that reports success on
output that is wrong (`wasmmerge` / `wasmbundle` producing a module that validates but computes
something else; the `wast` runner counting a wrong result as a pass; a golden snapshot recording a
failed compile as the expected result).

**Reference results (§ 1.3.4) — must still hold after every group of fixes** (the counts, dated, in
[testing.md](testing.md); the impact map there says which suites a change reaches):
- `wasi_tests` — 509 / 509 (2026-10-26);
- golden WAT — 568 entries (2026-10-26), `tests/.golden` (gitignored: copy aside before `--record`);
- `wast_tests` — 64,506 passed / 0 failed / 16 skipped (2026-10-24), per file against the recorded
  baseline, the validator-oracle guard at 0, `KNOWN_ACCEPTED_INVALID` as recorded;
- `engine_cross_check` — 1368 pairs + 6 (2026-10-26);
- `merge_layout` 17, `go_asyncify` 12 / 12, and the rest of the suite set as testing.md lists it.

A change to any of them is a finding until explained. **The gate order is load-bearing**
(`wasi_tests` → `engine_cross_check` → `wast_tests`), and **reinstall before testing**
(`deno task install`: the suites run the installed `wasmtk`).

**CI (§ 1.5):** `.github/workflows/publish.yml` `checks`, on `ubuntu-latest`, on every push to
`main`: is-release, the surface floor for a release, `deno check main.ts`, the JSR dry run on the
published tree. **CI runs no test suite** (the gate is local: installed `wasmtk`, Go, Zig, Rust,
standalone engines) — what the local machine proves is the gate; CI's half is the checks job.

**Classes for a class-by-class review (§ 2.2)** — the ones this repo's audits keep finding: (1)
**fall-throughs** — unhandled input emitting a comment stub and a bare `0` / `""` instead of a
`diagnostics` abort; (2) **parallel code paths** — `src/wasic.ts` and `src/console_log.ts` each
carry their own operator loop and string handling, so a fix in one is usually owed to the other;
(3) **number-type boundaries** — i32 / f64 / f32 / i64 conversions, overflow, integer `/`; (4)
**regex-over-WAT** in the merge / bundle path; (5) **workarounds and dead code** (the "look for code
issues" trigger, INDEX.md).

## 2. The seven security surfaces for wasmtk (§ 3.1)

1. **Untrusted input runs nothing and loads nothing it was not asked to.** wasmtk's inputs: a
   TypeScript source given to `wasic` / `dync` / `modc` / `jstyper` / `tsbundler` (compiling must not
   execute it — `wasmtk run` executes it BY DESIGN, and says so); `.wasm` / `.wat` modules given to
   `wasmmerge`, `wasmbundle`, `bindgen`, `witgen`; a `.wit`; a `.wast` script (the spec runner
   instantiates and RUNS its modules in V8 by design); Go / Zig / Rust producer projects (the
   producer verbs RUN those toolchains by design). The review checks that nothing runs or loads
   beyond what the command names (an import, a path in a module, an environment variable).
2. **Malformed input is a refusal by name** — a located `diagnostics` error (owner D6, 2026-10-13),
   never a crash, a stack trace or a guessed module.
3. **Paths:** an output never overwrites an input (`-o` naming an input is refused — the `outpath`
   suite, sw174); nothing is written outside the requested output; a refusal deletes nothing.
4. **Resources — required:** a time limit on every external process (the producers' toolchains,
   standalone engines, `deno` subprocesses) and on every network request; memory measured on the
   largest real input; a huge input fails loudly, never half-written. **Known today (2026-11-12):**
   the wasi suite's per-step `WASI_STEP_TIMEOUT_S`, the release scripts' `HTTP_TIMEOUT_MS`; the
   producer verbs' and the CLI's own subprocess limits are NOT yet measured — the first security
   review's first question.
5. **The release path:** `publish.yml` as built 2026-11-10 (release-process.md § 5): publishing
   only from CI, the Rekor id read back fatal, actions pinned to commit hashes, each job's token
   scoped, no `gh`; `scripts/release.ts` neither tags nor publishes.
6. **Dependencies:** the import map in `deno.json` (`@std/cli`, `@std/path`, binaryang pinned
   EXACTLY, `wasm2js` from npm) and `deno.lock`; each pin's licence read from the installed package;
   the vendored corpora (`tests/module/wasm_wast/testsuite-main`, wasm-wat-samples) keep their
   licences.
7. **Privacy:** INDEX.md § "No secrets or personal information" — the scan (`-I` and `-a`, binaries
   included) on every diff before a commit; a golden or test snapshot never freezes a machine path.

## 3. Release gate and records (§ 6)

**The environment matrix for a hardening review (§ 4.1):** Windows 11 (the owner's machine, exFAT
project drive — see `cmem/local/`), Deno 2.x (the product's runtime today), Bun 1.4.4 (scripts),
the Node LTS lines and Bun as product runtimes once the Deno-exit plan's P2 lands
([deno-exit-plan.md](deno-exit-plan.md)); CI `ubuntu-latest`; the INSTALLED package as a user gets
it (`deno run -A jsr:@jrmarcum/wasmtk@X.Y.Z`), not the working tree; Go (TinyGo), Zig and Rust
toolchains for the producer verbs; wasmtime / wasmer / wazero for the cross-check.

**Where findings go:** [compiler-bugs.md](compiler-bugs.md) — the findings ledger, one row each
(`sw…` silent-wrong, `ld…` loud), with the class, the fix, the regression test and what was found
and NOT fixed. **The round's record:** [next-work.md](next-work.md) (reviewers, scope, counts,
what is next). **A claim found wrong:** corrected where it stands, marked 🔁 with the date and the
row that found it.

**Before every release (the H35 gate):** the release's entry in [release.md](release.md) (§
"Release History", `### X.Y.Z`) carries exactly two record paragraphs at column 0, each EXACTLY
in this form (line breaks inside a paragraph are fine), and nothing after the final period:

```
**Security review (vX.Y.Z):** <scope, with the findings rows>; rounds <n>; ended by an empty round (round <n>, <YYYY-MM-DD>).

**Hardening review (vX.Y.Z):** <scope>; rounds <n>; ended by an empty round (round <n>, <YYYY-MM-DD>).
```

`vX.Y.Z` is the entry's own version (review round 4: an entry could otherwise borrow the records
of the release below it). The last round IS the empty one, so both numbers are equal; the date is
a real date. The scope is plain text: no `;`, `<`, backtick or backslash. release.md itself must
stay plain Markdown (release.md's header lists what the gate refuses). `deno task release`
(`scripts/release.ts`, guard 0g) refuses unless both are there in this form, and CI repeats the
check on the pushed bump commit (`release.ts --verify-commit`). **Strict on purpose** (review round
2, 2026-11-12): round 1 read free prose for "ended by an empty round" with a list of negating
words, and round 2 found five more phrasings of an UNFINISHED review that still passed — a fixed
form cannot be half-matched. **Plain Markdown on purpose** (round 4): rounds 2–3 emulated what
Markdown hides, and each round found another construct; refusing every hiding construct by line
cannot be half-matched either.
