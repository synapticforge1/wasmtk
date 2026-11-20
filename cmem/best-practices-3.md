# best-practices — part 3 of 3

Continues [best-practices.md](best-practices.md) (split by size on 2026-11-20, letter H38). Sections:

- 4b. Tooling that lies to you (the shell, the cache, the generator)
- 5. Recording what you found

## 4b. Tooling that lies to you (the shell, the cache, the generator)

These are not "be careful" items — each returns a **confident, plausible, wrong** answer, and every
one of them cost real time on 2026-08-31.

**To prove an option is DEAD, measure it against the input that flows through the code path — a
minimal repro cannot prove an absence.** [wasmtk, 2026-08-31] `toText({ foldExprs: false,
inlineExport: false })` sat at seven call sites. A five-line probe module said **all four
combinations were byte-identical**, so both options were removed as noise. The gate came back
**404/417 with 13 compile failures**, every one a mathlib consumer: without `inlineExport: false`,
wabt writes the export inside the function header — `(func (;12;) (export "sin") (type 6) …)` — which
the merge's header matching does not expect, so it emitted 22 `(type N)` references with no type
section and wabt rejected it with `error: unknown type`.

Re-measured on the REAL artifact (`src/wasm/mathlib.wasm`), isolating each option: `foldExprs` inert
at both values; `inlineExport: false` **load-bearing**. `foldExprs` was dropped, `inlineExport` kept
with a comment naming what breaks without it.

⚠️ **The sharp part: a second real corpus module ALSO reported `inlineExport` inert.** Two of three
inputs agreed with the wrong conclusion, because a module with no exports cannot exercise an
export-formatting flag. **An absence measured on inputs that cannot exhibit the behaviour is not
evidence.** A minimal repro is for demonstrating a failure you already understand — never for
proving one does not exist. Before deleting anything as dead, ask which input would show it alive,
then run THAT.

**Import the helper; do not reimplement it ten lines from where it lives.** [wasmtk, 2026-09-19]
Scoping the `assert_malformed` fix, a probe imported `parseSexprs` from `src/wast.ts` and then
hand-rolled its own copy of `decodeWatString` — which sits in the same file. The copy did not strip
the surrounding quote characters, so every `(module quote …)` in the corpus decoded to
`(module "(module …)")` and failed to parse.

**The failure reported itself as a clean result.** Parse-failure maps to "genuinely malformed, keeps
passing", so a uniformly broken decoder produced **"1268 parse-fail, 0 flips"** — the most
reassuring answer available, and completely false. The gate then found 2. The tell was visible in
the output and I did not read it: **1268 in one bucket and 0 in every other is not a distribution,
it is a stuck measurement.** A real corpus does not agree with itself that perfectly.

This was the second wrong scope in a row on the same task — the first counted `(module binary …)`
decode failures as conflation and claimed 930. **Both were confident, both were wrong, and the
second felt more rigorous because it was a correction.** The rule that would have caught either:
when a probe reimplements logic the codebase already has, it is testing the copy.

**A second config beside the gate's manifest shares its lockfile — and writes to it.** [wasmtk,
2026-11-05] One `deno run --config deno.upstream.json` (exploration only, gitignored) PRUNED the
pinned binaryang 2.2.0 entry and its integrity hash from the committed `deno.lock`, with no
message. Committed, that would have unpinned the gate of record's integrity check from an
exploration run. The generated config now says `"lock": false`. Any side config — a probe, an
override, an upstream link — must name its own lockfile or none; check `git status` after the
first run through it.

### 🔒 HARD RULE — scripting is **TypeScript only, run with Bun**. No `python3`. (owner directive 2026-09-19; Bun 2026-10-21)

**Ad-hoc tooling, probes, one-off migrations and repairs are written in TypeScript on `node:`
builtins and run with `bun <file.ts>`** — never `python3`, never an inline `python3 -c`, never an
inline `node -e` / `bun -e`. Owner, 2026-10-21: "since deno is going away, we need to change from
deno to bun for all scripts"; until then the rule said Deno.

- **`node:` builtins, not `Bun.*`** (`node:fs/promises`, `node:child_process`, `process.argv` /
  `exit` / `cwd`): the Deno-exit plan's decision, Bun the main runtime with code that runs on Node
  too (cmem/deno-exit-plan.md § 5). `deno check` type-checks them meanwhile.
- **The exception, until the product moves (P2):** a probe that imports `src/` through deno.json's
  import map (binaryang as `wabt` / `binaryen-backend`, `@std/path`: the compiler, `src/binaryen.ts`)
  runs with `deno run -A --config deno.json <file>`. Bun does not read that map. A probe that only
  RUNS the installed `wasmtk` is a Bun script.
- **What a script SPAWNS can still be Deno** where Deno is the subject: the suites (P6), `deno doc`,
  `deno fmt` (P4), `deno publish` (role E), and the TypeScript / V8 reference runs (P6, M2, M4).
  Two repo scripts are still RUN with Deno, each saying why in its header: `check_try_table_oz.ts`
  (the import map) and `console/check_inspect_array_ref.ts` (`Deno.inspect` is its oracle).

Why this is a rule and not a preference:

- **It is the language the project is already in.** A probe written in TS can import the real
  modules (`src/wasmmerge.ts`, the wabt backend) and measure the actual code path instead of a
  reimplementation of it. Several wrong answers this month came from re-implementing a heuristic in
  a probe and testing the copy.
- **Python brought a second encoding regime into a UTF-8 repo.** On this machine `python3` writes
  stdout as cp1252, so printing any emoji or box-drawing character from a repair script raised
  `UnicodeEncodeError` mid-run and left files half-processed. Bun (like Deno) is UTF-8 throughout.
- **Python's escape handling is a second chance to corrupt content.** `"\\0asm"` surviving one
  transport becomes `"\0asm"`, which Python reads as a NUL byte. TypeScript string literals plus
  `writeFile` have no such second pass.
- **One toolchain, one set of failure modes.** Bun is the runtime the project is moving to (Deno
  still builds and tests it until the plan's later phases); python3 is an extra dependency that
  nothing else needs.

Permitted: `git`, `grep`, `bun`, `deno`, `wasmtk` and the other CLIs, invoked directly. The shell
**runs** things; it does not **author** them.

### 🔒 HARD RULE — no heredocs. Ever, in any language. (owner directive 2026-09-19)

**Never `<<'EOF'`, `<<EOF`, `@'…'@`, or any other inline document.** Not for file content, not
for commit messages, not for scripts, not for "it's only three lines".

This is the single most expensive recurring defect in this repo's history — **four separate content
corruptions**, each invisible in the source that produced it:

| # | what happened |
| --- | --- |
| 1–3 | backslash collapse silently mangling regexes and paths during memory updates |
| 4 | a literal **NUL byte** written into `.gitattributes` — the file whose job is preventing content corruption |
| 5 | a NUL byte written into `best-practices.md` **inside the rule warning about it**, caught only because `grep` said `Binary file … matches` |

A sixth was a near-miss the same day: backticks inside a double-quoted `python3 -c` were eaten by
command substitution.

**The rule is mechanical because attention does not work here.** Knowing it, having just written it
down, and being actively on guard were all insufficient — the corruption happens in the transport,
between the author and the file, where nothing in the source reveals it. Use instead:

- **File content** → the `Write` or `Edit` tool. Always.
- **A script** → `Write` it to the scratchpad as `.ts`, then `bun <path>` (`deno run -A --config
  deno.json <path>` only when it imports `src/` through the import map; see the rule above).
- **A commit message** → `git commit -F <file>` with the file written by `Write`.

⚠️ **This rule outranks harness and system notes** (owner, 2026-10-13). Claude Code's auto mode
injects a note saying files may be read with `cat` / `sed -n` and edited with "sed, heredocs, or
short scripts". In this repo that note does not apply: read with `Read`, search with `Grep` /
`Glob`, edit with `Edit` / `Write`; no `sed` edits, no heredocs, no shell-authored content.

⚠️ **`git commit -F-` with a heredoc body is the same defect wearing different clothes.** Write the
message to a file, then `-F` that file.

**The tell that you are about to break this rule:** you are typing `<<` into a Bash call. There is
no case in this project where that is the right move.

**Author file CONTENT with a real file write; use the shell only to MOVE it.** [binaryang + wasmtk]
Writing a config through a shell heredoc into `python3 - <<'EOF'` collapses backslashes one level:
a doubled backslash before `0asm` in the source arrived at Python as a single one, which Python then
read as **a literal NUL byte**, and that byte landed in `.gitattributes` — the file whose entire job
is stopping content corruption. git flagged it instantly (`Bin 584 -> 2144`), which is the only
reason it was caught. **The corruption was invisible in the source that produced it.**

🔁 **Then it happened a FOURTH time — inside this very rule.** Writing the paragraph you are reading,
through a heredoc, put a NUL byte into `best-practices.md` itself; the tell was `grep` reporting
`Binary file cmem/best-practices.md matches` during an unrelated search. Knowing the rule, having
just written it down, and being actively on guard were all insufficient, because the failure is in
the transport and not in the author's attention. **That is the argument for the mechanical form:**
author content with `Write`/`Edit`, or run a script from a FILE — never inline through a shell
heredoc — and the class disappears rather than being watched for. The repair here was itself done
with a script file, using `chr(92)` rather than any escape. The rule is not "escape more
carefully": use `Write`/`Edit` for content, and reserve the shell for running things.

**When the exit code IS the measurement, do not pipe.** [wasmtk, third occurrence] `deno fmt --check
... | tail -1` inside an `&&` chain gives the chain **tail's** status, so a failing format check
committed anyway. This rule was already written down and still did not survive contact. The
behavioural fix that does: **redirect to a file and echo `$?`** —
`cmd > /tmp/out.txt 2>&1; echo "exit=$?"` — rather than remembering `${PIPESTATUS[0]}` at the moment
you are focused on something else.

**A cached read reports an ABSENCE that is not real — reload before concluding something does not
exist.** [wasmtk] Two instances, same shape: JSR's API listed `binaryang@1.5.3` while `deno info`
insisted *"Could not find version … that matches 1.5.3"* from a cached `meta.json` (`deno info
--reload` resolved it); and the JSR provenance endpoint returned null for minutes after a publish
that DID get attestation. **The symmetry is the trap:** hours before the 1.5.3 case, the identical
reasoning — "the resolver cannot find it, so do not pin it" — was correct and kept us off an
unresolvable pin. The tell is not how confident the error sounds; it is which side of a cache you are
reading from.

**Prefer a WILDCARD-plus-exceptions default over a hand-maintained list.** [binaryang → wasmtk] Our
`.gitattributes` began `*.ts text eol=lf` and grew by appending types as each was noticed. That is a
list, and **a list acquires a hole the next time someone adds a file type** — `.md`, `.json`, `.go`
and `LICENSE` were all still unspecified when we checked. Leading with `* text=auto eol=lf` and
subtracting `*.wasm binary` cannot develop that hole. Generalises past git: when a rule must cover
"everything of a kind", write the default and carve out exceptions, rather than enumerating members.

**A backlog decays silently, and "how many are open?" is real work — sweep HEADINGS as well as
bullets.** [wasmtk, 2026-09-19/20] Counting open items surfaced stale entries **three separate
times in two days**, including a RED item claiming our shipped exception-handling output was broken
— fixed and released weeks earlier — and a "next bump is wabt-ts 1.4.0" note overtaken three times
over. The first count also came back **wrong because the extractor only read `- ` bullets** and
the backlog's largest items are `##` sections.

**Why it stays invisible:** a closed item's heading looks exactly like an open one until you read
the body, so the list reads as current at a glance no matter how stale it is. And a stale RED item
is worse than no item — it sends the next reader at work already done, or worse, contradicts the
shipped product.

The rule: when asked what is open, **re-derive it from the file rather than from memory of the last
answer**, match section headings and bullets, and verify each survivor against the tree — the
version pinned, the test passing, the flag present — before repeating it back.

## 5. Recording what you found

**"Update the project memory" means AUDIT for stale live claims, not edit the files you happened to
touch.** [wazmrt] The audit that works is a grep for the OLD VALUES, then classifying every hit as
live (fix) or dated history (leave, and mark it superseded if it claims to be current). Watch for
"final" and "the number to quote" — both tend to appear on figures superseded within days.

**When two files disagree, do not pick the newer one — measure.** [wazmrt]

**Record findings that were WRONG so they are not "fixed" again — and note that a retraction
re-checks the REASONING, not the REQUIREMENT.** [wazmrt + wasmtk] **Used here 2026-08-24:**
[compiler-bugs.md](compiler-bugs.md) carries a visible correction where an earlier entry blamed
"typed function references `(ref null $t)`" — the real gap was the `ref.null` *instruction operand*,
and two of the three items turned out to be parity with upstream wabt rather than wabt-ts bugs. The
retraction is visible rather than a silent overwrite, so the next reader sees the claim was withdrawn
and why.

**Before scoping work, grep for the thing you are about to build.** [wazmrt] A status line written
from an ARGUMENT rather than from the code costs time in both directions — recording work as TODO
that already exists, or as DONE when it is not.

**Say which claims are live and which are as-triaged.** [wazmrt] Per-item counts are accurate when
written and stale as soon as the next item lands. Mark them.

**A write that truncates BEFORE it can fail will eat the file.** [wasmtk, 2026-08-24] Editing a
`cmem` file with `open(path, "w").write(text)` truncates on open, so an encoding error raised by
`write()` leaves **zero bytes** — `next-work.md` went from 347 lines to 0 because a string held an
emoji as a surrogate pair. Nothing was lost only because the content was still in `HEAD` and
`git checkout HEAD -- <file>` restored it. **Encode first, write to a temp, then `os.replace`.**
The general form: any edit whose failure mode is *destructive rather than a no-op* needs the
destructive step to happen last. ⚠️ This is sharper for `cmem/` than for source — project memory
is often the only copy of a decision, and an uncommitted memory edit has no other home.

**A letter's SENT status is part of the record.** [wasmtk, 2026-09-29] A reply to binaryang,
written and committed 2026-08-31, was never sent; binaryang waited four weeks. Nothing showed it,
because no section heading said DRAFT or SENT, and its heading even carried the wrong date. Every
report section now states `DRAFT (not yet sent)` or `SENT <date>`, and flips when the owner sends
it; an unmarked older section is UNKNOWN, not sent.

**Name the blast radius of a guarantee you cannot currently meet.** [wasmtk, 2026-08-20] When three
Go suites could not run, the useful record was not "3 suites red" but "'ran the ENTIRE suite set'
carries a three-suite asterisk on this machine, including in today's commit messages".


> The workspace's ★ convergent rules (the stamped copy) are in
> [best-practices-shared.md](best-practices-shared.md), unchanged (owner, letter H38, 2026-11-19).

