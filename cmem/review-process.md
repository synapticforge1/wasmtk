# review-process.md — wasmtk's slots in the review standard

Last verified: 2026-11-20. 🔒 **The process is the workspace's `../workspace/cmem/review-process.md`, the
FINAL standard** (owner, 2026-11-17; letter H37 — it replaced the 2026-11-12 standard, H35, which
this file followed until 2026-11-20; that version is in git history). It is not restated here:
five REQUIRED classes in order — basic, hardening, licensing, security, privacy — after an optional
efficiency review; closed item lists, boundary rules and severity floors (§§ 2–8, 11); one loop
(§ 9); fixed briefs, issues in a gitignored file, gates as scripts (§ 10). The owner's words are in
[working-rules.md](working-rules.md) § "Owner commands". This file holds what differs for wasmtk:
the slots of the standard's § 12. Every number below is a claim with its date.

## The release gate

`deno task release` (`scripts/release.ts`) runs the review set's RESULT check as its FIRST step
(guard 0g, `scripts/review-gate.ts`, since 2026-11-20): the gitignored `cmem/review-issues.md` must
hold exactly one line `Review complete: <commit>`, that commit an ancestor of HEAD, and nothing but
the bump's files, `CHANGELOG.md` and `cmem/` changed since. The main agent writes that line only
when a re-review came back empty in EVERY class and the full suite then passed on every supported
platform; until then it reads `Review complete: none`. Every other gate then runs locally in the
same command (0i the compatibility gate, 0e the cold checks); CI runs no test (H37 (e)).

## Where findings go

- **Open issues:** `cmem/review-issues.md` — gitignored, never on GitHub; `scripts/check-privacy.ts`
  refuses it if it is ever tracked. It also lists every REJECTED finding with its reason.
- **Fixed:** a row in the tracked defect log [compiler-bugs.md](compiler-bugs.md) (`sw…` silent-wrong,
  `ld…` loud) with the fix and its regression test, once fixed; closed rows move to `archive/`.
- **The review's record in a release:** the reviewed commit and per-class counts in that release's
  entry in [release.md](release.md); never the issues themselves.
- **Reviewers' files:** under the main session's scratchpad, removed at triage (working-rules.md
  § Scratch space).

## Slot: private data — never given to a reviewer

`cmem/local/` (machine facts), `cmem/review-issues.md` (except to a re-reviewer, its own class's
issues), `CLAUDE.md` (machine-local), `.claude/`, the owner's paths anywhere. Never inside
`upstream/binaryang/` (a sibling's checkout, read-only reference, not wasmtk's code). A reviewer
gets its class's item list word for word, the scope, and `cmem/STATE.md` — nothing else.

## Slot: reference results — must still hold after every group of fixes

Dated counts in [testing.md](testing.md) (its impact map says which suites a change reaches):
`wasi_tests` 509 / 509, golden WAT 568 byte-identical, `wast_tests` 64,506 / 0 / 16 with
`KNOWN_ACCEPTED_INVALID` empty, `engine_cross_check` 1374 on baseline, outpath 17, wasic_seam 11,
merge_layout 17, `go_asyncify` 12 / 12 (all 2026-11-20, binaryang 4.1.1). A change to any of them
is a finding until explained. **Reinstall before testing** (`deno task install`); the gate order is
workflow.md § The full gate.

## Slot: platforms

The support matrix and platform notes: [platforms.md](platforms.md) (tier 1, per engine; every OS
call in `src/host.ts`, settings tagged with their platform ID there).

## Slot: licences — the inventory and the notices

- 🔒 **wasmtk's own licence: dual, MIT OR Apache-2.0** (owner, 2026-11-20: "with wasmtk
  specifically we are dual licenced as APACHE and MIT"): `deno.json` / `package.json` say
  `MIT OR Apache-2.0` (deno.json said `MIT` until then), `LICENSE-MIT`, `LICENSE-APACHE`, the
  README § License.
- **Third-party code inside wasmtk:** fdlibm (Sun Microsystems) — `src/wasm/mathlib.wat`'s trig
  kernels, 2/π table and atan coefficients, shipped compiled; its notice is preserved in
  `NOTICE.md` (added 2026-11-20). Nothing else found (`src/` searched for ported code and notices).
- **What the JSR package ships:** `main.ts`, `src/*.ts`, `src/wasm/*.ts` / `*.wasm` (wasmtk's own
  embedded libraries, built by `modc`), the README, the three licence files and `NOTICE.md`.
- **What it pulls in at install:** `@std/cli`, `@std/path` (JSR), `@jrmarcum/binaryang` (pinned
  exactly; it carries its own notices for the wabt / binaryen ports), `wasm2js` (npm). Not shipped:
  the vendored spec corpus (`tests/module/wasm_wast/testsuite-main`) and wasm-wat-samples.
- **The inventory gate:** `deno task check-licences` (`scripts/check-licences.ts`, self-test
  `--self-test`): every package in `deno.lock` must be in `licences.json` with an allowed licence
  (MIT, Apache-2.0, BSD-2/3-Clause, ISC, 0BSD), and the package must ship both licence files and
  `NOTICE.md`. Measured 2026-11-20 from the registries: 13 packages, all MIT (binaryang carries
  its own NOTICE for its Apache-2.0 ports). A new dependency is recorded after reading its licence.

## Slot: outputs that can carry user facts

- **`.wasm` from the producer verbs** (Go / TinyGo, Zig, Rust through rsxtk): the toolchain's debug
  sections can embed the build machine's absolute paths (found 2026-10-26 in a committed Zig
  fixture, history purged). wasmtk does not strip them today.
- **`.wasm` / `.wat` from `wasic`, `modc`, `dync`, `hybrid`:** the program's own identifiers and
  string literals; no path, no environment.
- **Generated files:** `.wit` headers name the source file's base name; `bindgen` host runners use
  relative specifiers (since 2026-10-23); golden snapshots write `<repo>` for the checkout.
- **Messages:** compile errors print the input's path and line to the terminal (not published);
  `--self-check` prints the runtime, OS and CPU only, and its temp folder's path nowhere.

## Slot: gate scripts (run locally; reviewers get only what needs judgment)

- **Privacy and credentials:** `bun scripts/check-privacy.ts [--commits <range>]` (self-test
  `scripts/check_privacy_gate.ts`) — every tracked file, binaries included; the issues file,
  `cmem/local/`, `.claude/`, `CLAUDE.md` refused when tracked.
- **Host:** `deno task check-host` (self-test `--self-test`); **memory size:** `deno task check-cmem`.
- **API surface:** `deno task api-surface --check`; the compatibility gate `--verify-release`
  (self-test `scripts/check_compat_gate.ts`: 4 stale cases since v3.0.0, next-work.md).
- **Release tooling:** `scripts/check_release.ts`, `scripts/check_publish_workflow.ts`.
- **Reference suites:** the full gate (workflow.md); `scripts/check_try_table_oz.ts`.
- **Licences:** `deno task check-licences`.
- **Missing (2026-11-20):** a vulnerability check of the dependencies.

## Classes this repo's audits keep finding (for the basic and hardening briefs' scope)

(1) **Fall-throughs** — unhandled input emitting a comment stub and a bare `0` / `""` instead of a
`diagnostics` abort; (2) **parallel code paths** — `src/wasic.ts` and `src/console_log.ts` each
have their own operator loop and string handling; (3) **number-type boundaries** — i32 / f64 / f32
/ i64 conversions, overflow, integer `/`; (4) **regex over WAT** in the merge / bundle path;
(5) **workarounds and dead code**. The worst silent case: a VALID module that prints something
JavaScript would not (the `sw` rows).

## Not applicable, with the reason

- **glibc 2.28 / musl builds:** none — wasmtk ships source to JSR (workspace `platforms.md`).
- **Per-platform release assets:** none; the add-platform step appends result lines only.
