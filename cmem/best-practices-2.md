# best-practices — part 2 of 3

Continues [best-practices.md](best-practices.md) (split by size on 2026-11-20, letter H38). Sections:

- 4. Tests and gates

## 4. Tests and gates

**A new test that has never failed has not been shown to test anything.** [wazmrt + wasmtk] **Applied
here 2026-08-20:** before committing the per-file baseline gate, its baseline was deliberately
perturbed in both directions (one file +5, one −3) to confirm it reported LOST and GAINED coverage
and exited non-zero. A gate that cannot fail is not a gate.

**A PASS IS A CLAIM ABOUT *WHY* SOMETHING FAILED — count the failure kinds behind every pass
path.** [wasmtk, 2026-09-28] A spec runner's `assert_invalid` / `assert_trap` / `assert_unlinkable`
passed on ANY failure. Tallying what each path actually caught found 186 false passes. The largest
share was the backend being unable to parse newer syntax, scored as "correctly rejected". A path
that accepts any failure turns every gap in the thing under test into GREEN, and grows greener as
the gaps grow. The 2026-09-19 fix to one directive did not make anyone check its siblings: when a
class of bug is fixed in one handler, audit every handler of the same shape. Related tell: an exit
code of 0 is also a claim. `wasmtk run` printed "Uncaught … Error" and exited 0, and no suite looked
at the code.

**A CHANGE'S OWN NEW SURFACE IS THE ONE PLACE THE AUDIT THAT PRODUCED IT WILL NOT LOOK.** [wazmrt]
The new gate's own `--update-baseline` path is exactly such a surface — it is the part that OOMed
after the gate itself was working.

**A goal with no gate is a preference, and a gate with no trigger is a preference too.** [wazmrt]
wasmtk's trigger is written down in [INDEX.md](INDEX.md): a CHANGE fires the full suite set, not a
batch. Know which one you are in.

**Design the gate so an IMPROVEMENT also fails.** [wasmtk, 2026-08-20] Files pinned at 0 passes —
like `ref_null.wast` — exist so that the day a backend learns to encode `ref.null`, the gate *says
so* rather than absorbing the win silently. This will look like a regression during a version bump;
it is written down in [next-work.md](next-work.md) (before 2026-09-30: `git show 2d151714025:cmem/next-work.md`) so nobody has to diagnose it live.

**Prefer a self-discovering list to a hand-maintained one.** [wasmtk] `--update-baseline` finds
unrunnable files by chunking across subprocesses and retrying a dead chunk file-by-file, because a
hardcoded skip list goes stale exactly like the `KNOWN_*` lists in §3. An OOM cannot be caught
in-process, so a single-process scan is one bad file away from losing every result.

**Assert forward progress structurally, not per-symptom.** [wasmtk, 2026-08-24] The S-expr reader
stalled on a lone `;` because `readAtom` stopped without consuming it. The fix was not "handle `;`" —
it was "any character `readAtom` cannot consume is taken as a one-character atom", so the loop can
never stall on a future one.

**A green baseline proves nothing about shapes the corpus does not contain — coverage of INPUTS is a
separate axis from strictness of COMPARISON.** [binaryang → wasmtk, 2026-08-27] binaryang's 421-file
byte-identical baseline was unchanged by every one of six real defects, "which is also why none of
this was ever caught by it". A very strict comparison over a narrow corpus reads as reassurance it
has not earned. **Ours has the identical blind spot:** the 417-module corpus contains no ref types,
so it is structurally incapable of seeing four of those five defects no matter how green it reads.
Before trusting a baseline, ask what shapes it *contains*, not how tightly it compares them.

**When a lookup rejects your input, "my input is wrong" and "their lookup is wrong" are BOTH live —
do not record the first as fact.** [wasmtk, 2026-08-27] We tried `runPasses(["coalesce-locals"])`,
got `Unknown pass`, and wrote it down as "unknown to the compat surface" — phrasing that quietly
blames our spelling. The spelling was right; their resolver was wrong (their compat layer emulates
`npm:binaryen`, where kebab-case is what the docs specify). The cost was abandoning a pass bisect
that would have named the defect in an afternoon. An error message is a claim by the other side, not
a verdict on you.

**Do not lift a safety measure on an upstream's word that it is fixed — wait for a version you can
pin, then re-run your own gate.** [binaryang + wasmtk, 2026-08-27] Fixes existing on an unpublished
branch are not a thing you can pin, roll back to, or hand a colleague. Upstream said this plainly
themselves — *"we'd rather you re-verified than took this note's word for it"* — which is worth more
than the fix. The prior removal of this same skip was authorised by evidence that felt equally
solid.

**A fixture that proves a FEATURE works does not prove an OPTIMISER is safe — never lift a safety
skip on one.** [wasmtk, 2026-08-25] `scripts/eh_try_table_fixture.wat` was written to show
`try_table` survives the pipeline, and it does: exit 34 through full `-Oz`. On that evidence the
binaryen skip for throwing modules was deleted — and the full gate immediately failed
`15_Exceptions` and `15_LexicalShadowing_Stress`, because the fixture holds **no local live across a
catch edge**, which is the only thing the bug touches. A skip exists to prevent a *class* of defect;
the evidence for removing it must exercise that class, not the happy path the feature already owns.
**Ask what the skip was protecting, then check the fixture actually reproduces it — a green fixture
is not a green gate.**

**Run gates in dependency order: a gate that reads a generated corpus must run AFTER the suite that
regenerates it.** [wasmtk, 2026-08-25] `testing.md` says to run `engine_cross_check_tests` after
`wasi_tests`; the first full-gate script ran it before. Its `0 regressed, 8 improved` was therefore
measured against a corpus built by the *previous* compiler — a real-looking number that answered a
question nobody asked. Ordering inside a gate script is load-bearing, not cosmetic.

**A reported SHAPE may be a symptom of a PRECONDITION that never mentions it — ask for the
precondition.** [binaryang → wasmtk, 2026-08-27] A defect was reported to us as "a tag whose param
is `(ref $T)`". We wrote down the obvious follow-up: audit our fixtures for `(ref $T)` tag params.
Upstream then re-probed it and the real precondition was a **conjunction neither half of which
mentions the tag's types** — the module contains a struct or array type, AND no function shares the
tag's exact signature. Our audit would have returned no matches and we would have recorded
"unaffected", a conclusion that does not follow from that check. We were in fact clear, for an
entirely different reason (wasic emits no struct or array types at all). **The right answer arrived
by luck; the check was wrong.** When an upstream reports a shape, ask what makes it fire.

**An import alias must not collide with a package the project could actually resolve.**
[binaryang → wasmtk, 2026-08-31] Our `"binaryen"` alias pointed at a JSR compat subpath, but the
facade behind it can also be pointed at the real `npm:binaryen`. One specifier, two packages,
selected by configuration — and `import ... from "binaryen"` told the reader nothing about which.
Renamed to `binaryen-backend`. **The test is not "is the name accurate?" but "could this name also
resolve to something else here?"**

**An upstream fix that does not move your number means the binding constraint may have MOVED, not
that the fix failed.** [wasmtk, 2026-08-31] `ref_null.wast` sat at 0 pass / 32 skip, recorded as an
upstream encoder bug. Upstream fixed their half; our number did not move, because our own runner's
`constType()` had become the binding constraint — and **nothing re-announced it, because a skip is
not a failure**. The tell was in the row all along: `unbuilt modules = 0` meant the modules
ASSEMBLED, so whatever stopped them was downstream of the assembler. Teaching the runner to marshal
`ref.null` was worth **+123 assertions across 16 files**. **When a fix lands and your metric is flat,
re-ask which layer binds before re-reporting it upstream.**

**Converting a SKIP into a FAILURE is a false negative — read what the new failures actually say.**
[wasmtk, 2026-08-31] Admitting `ref.null` turned 32 skips into 25 passes and **7 failures**. All
seven were `type incompatibility when transforming from/to JS` — V8 refusing to marshal `exnref` /
`anyref` / user-defined heap types. That is a limit of the HARNESS; recording it as a failure asserts
the toolchain got something wrong when the module is fine and only the test cannot see it. The runner
already had the precedent — NaN payloads that cannot cross the JS boundary are skipped, with a
comment saying why. **A new failure appearing beside a big win deserves the same scrutiny as a
regression, and is exactly when you are least inclined to look.**

**Hand over the CHECK, not the CONCLUSION.** [binaryang → wasmtk, 2026-08-31] A defect reached us as
"a tag whose param is `(ref $T)`", and the follow-up we wrote down was "audit our fixtures for
`(ref $T)` tag params". That is **a conclusion shaped like a check** — unfalsifiable by its recipient,
because running it can only confirm the sender's framing. The real precondition was a conjunction
that never mentioned tag types, so our audit would have returned no matches and we would have
recorded "unaffected" on reasoning that does not support it. Upstream named the rule after correcting
themselves: **give the other side the predicate, not your evaluation of it.** The receiving version:
when handed a shape, ask what makes it fire before auditing for the shape.

**Measuring line endings is booby-trapped in BOTH directions — use a positive control.**
[binaryang + wasmtk, 2026-08-31] Measured against `LICENSE-APACHE`, whose true CR count is **184**:

| method | reports | wrong how |
| --- | --- | --- |
| `grep -c '\r'` | 140 | the backslash is a BRE escape — it counts literal `r` characters |
| `grep -c $'\r'` (no `-U`) | **0** | grep strips CR in text mode on this platform |
| `grep -cU $'\r'` | 184 | correct |
| byte count in python | 184 | correct |

Upstream's error read **high and plausible** and confirmed the theory they were testing; ours would
read **low and plausible** and confirm the opposite. Neither looks wrong. **Before trusting any
line-ending measurement, run it against a file known to contain CRLF** — if the method cannot see a
known positive, every negative it produced is worthless. The same applies to any "absence" measured
by grep.

**A second oracle must be shown unable to MANUFACTURE passes before its verdicts count.**
[wasmtk, 2026-09-29] binaryang's validator became the wast runner's second `assert_invalid` oracle.
An oracle that rejects too much turns every invalid-module assertion into a pass, which is the
false-pass class the 2026-09-28 audit removed. So the runner validates every module the spec
calls VALID and fails the gate on a single rejection (0 of all 288 files), and the guard was
inversion-checked by narrowing the feature set (it flagged 3 valid GC modules). A rejection also
counts only when the same bytes DECODE, because the validator pools decode and validation errors.
**Ask of any new verdict source: what does it do with the inputs whose answer you already know?**

**When a verdict API reports in two places, know which one you read, and which way a disagreement
falls.** [wasmtk, 2026-10-15] binaryang's `wasmValidate` returns `result` AND `errors`; through
1.12.1 one check filled `errors` and left `result` `Ok`. Our oracle reads `result`. The question
was not "was it affected" but in WHICH direction: a missed refusal only became a skip for us
(safe), and our "rejects nothing valid" guard was untouched. Found by binaryang mutating OUR
binaries against V8, not by any check of ours. **For any verdict source, write down which field is
the verdict and what a disagreement between its fields would do to the count.**

**Measure a change in steps, so each gain has one cause; then a wrong prediction is a finding.**
[wasmtk, 2026-09-29] The prediction for binaryang 1.7.1 plus the new oracle was 105 → 94 skips; the
result was 66. Because the pin and the oracle were measured separately (96, then 66), both misses
were explainable within minutes: `table.wast` gained on the pin alone, and the oracle judged 28
assertions V8 had refused only for its own limits. Measured together, +39 would have been one
unexplained number, and "better than predicted" is exactly when nobody asks why.

**A golden check that shows the FIRST differing line hides the rest: diff the whole output before
re-recording.** [wasmtk, 2026-09-29] sw02 changed 11 golden entries, and 9 of the first lines were
the same harmless new local declaration. A full old-vs-new WAT diff (compile both, drop the known
change, list the rest) showed 2 real changes, and one of them carried a pre-existing silent stub
(`(;? e instanceof Error ;) (i32.const 0)`), filed as sw34. Re-recording on the first line alone
would have frozen that stub into the golden snapshot without anyone seeing it.

**A check that "nothing went wrong" also passes when NOTHING HAPPENED; assert the thing happened
too.** [wasmtk, 2026-09-30] "The lowered module passes binaryang's validator" was
`validatorRejectedValid.length === 0`. Against the runner WITHOUT lowering it passed, because an
empty rejection list is exactly what no lowering looks like. Only the inversion run showed it; it
now also requires `lowered.modules === 1`. **Every absence assertion needs a presence beside it.**

**Build a classifier from LOGGED data, not from what you remember the messages to be.**
[wasmtk, 2026-09-30] Before making `assert_trap` check the trap kind, every trap pass of the corpus
was logged as (spec message, V8 message): 5,263 passes in 39 pairs. That one measurement gave the
mapping, showed the gap was latent (all 39 already the right kind), predicted the gate would not
move (it did not), and surfaced V8's one ambiguity (overflow and NaN conversion share a message)
before it could be mistaken for a bug.

**When a dependency changes an output you PARSE, diff it at token level before you pin, whatever
the changelog says it covers.** [wasmtk, 2026-09-30] binaryang 1.7.2's notes described the new
text layout as `wasm2wat`'s; measuring the compat `readWasm(…).toText()` we actually call showed it
changed too (124/124 texts), and that the token streams were identical. That turned "might break
the merge regexes" into a checkable prediction the gate then confirmed.

**A suite that passes in the working tree has not been shown to pass in a FRESH CLONE:
gitignored build artifacts can stand in for a build that fails.** [wasmtk, 2026-09-30]
`bindgen_tests` read 142/142 for five weeks while `modc` could not build two of its fixtures: the
suite trusted `modc`'s exit code (0 on failure) and graded the `.wasm` files a successful build had
left on 2026-08-25. Only running the tests in a fresh clone (H6.5a) showed it. **A test that reads a
build output must delete it first and require a fresh one**, and a release check runs the suites
somewhere no old artifact can exist.

**An exit-code contract is checked by a SWEEP, not by reading one handler.** [wasmtk, 2026-09-30]
Fixing `modc`'s exit code, then running every command against a missing input, found three more
commands that printed ❌ and exited 0 (`info`, `mod <file>`, `wasic x.js`). The defect was a
pattern (a `void` function that catches and returns), so it was never in one place.

**Take a fixture's expected outcome from the spec's own file.** [wasmtk, 2026-09-30] A fixture
asserted `(pagesize 3)` INVALID; the spec calls it MALFORMED (a parse error, `assert_malformed`),
and the runner rightly refused to score a parse failure as a validation verdict. The spec's
`assert_invalid` form is `(pagesize 2)`. Copy the form; do not reconstruct it.

**Turning a silent fallback into an abort is also a probe: whatever now reaches the abort was
wrong UPSTREAM too.** [wasmtk, 2026-09-30] sw05's new "cannot emit the string expression" fired on
`names[0]) + count(names[2]`, which is not an expression at all: the call matcher had swallowed
`f(a) + f(b)` whole (sw35, silent on the old compiler, confirmed there). Read what a new
diagnostic QUOTES before deciding the new diagnostic is too strict. And when a fix changes
emitted text in a benign way (here an unused local on 25 golden entries), classify the golden
diffs with a script that ignores exactly that delta and nothing else. Then "0 real diffs" is a
measurement, not a skim of 27 first-differing lines.

**A fix that makes an invalid module VALID can turn a loud bug silent. Compare every repro's
CLASS before and after, not just the rows you meant to fix.** [wasmtk, 2026-09-30] Widening a
binary op's i32 result to the f64 a caller asked for fixed `1 << n`. It also made
`"ok: " + (a > b)` (ld06), a module V8 used to refuse, load and print `ok: 1`: a comparison's
i32 is a boolean, and no numeric conversion of it is right. The targeted rows all flipped to
MATCH; only the full verifier run showed ld06 moving from RUN-FAIL to DIFFER. A LOUD → SILENT
move is a regression even when the count of passing rows goes up.

**When a fix changes core emission, read the golden diff for INVALID WAT before reading it for
intent.** [wasmtk, 2026-10-06] The operator fixes first changed 79 entries. Grepping the new
WAT for impossible shapes (`f64.mul (i32.load`, `f64.abs (f64.eq`, `"success": false`) found
three defects in the fix itself within a minute: a type fallback trusted, a guard that only
held under the old table order (`==` inside `!==`), a truthiness test applied to comparisons.
After the fixes, 4 entries changed, each explainable. The size of a golden diff is a signal:
a narrow fix that moves 79 programs is not narrow.

**Separate the VALUE from the PRINTER, and the CHANGE from the RENUMBERING.** [wasmtk,
2026-10-06] After the Math fix, `Math.sign(-0)` still printed `0`. `1 / Math.sign(-0)` printed
`-Infinity`: the value was right and the printer was wrong (sw41, a different bug in a different
place). A repro that prints a value through the code under suspicion tests two things at once.
Likewise a golden-WAT diff of 42 entries read as 200+ changed lines until function indices
(`__fn\d+`) were normalised away: one inserted helper renumbers every later function. Normalise
exactly the known-benign delta, then read every remaining line.

### 🔁 STANDING QUESTION, both projects: *where is this construct USED, not where is it NAMED?*

[binaryang + wasmtk, adopted 2026-08-27 — carried in binaryang's handoff and here, deliberately in
both so neither side has to remember it alone.]

**Ask it before sizing any conformance or migration work.** Both projects made this error
independently, four days apart, in opposite directions:

(Table as a list — estimate · actual · why:)

- wasmtk, `ref.null` — estimate: 32 assertions — actual: **123** — why: `table_fill` / `table_set` /
  `table_grow` pass `ref.null` as an ARGUMENT — the count found where the instruction is *asserted*,
  not where the value is *used*
- binaryang, `br_on_cast` — estimate: inflated by a 114-assertion file — actual: **20–40** — why:
  the file was counted because it *contained* `br_on_cast`; it dies in the parser on `(exact $T)`
  long before reaching one

Undershooting cost nothing but a surprise. Overshooting would have reordered a release around a file
that no amount of `br_on_cast` work could move. **Same failure, and the direction is luck.**

The generalisation covers a whole family this week: *"contains the instruction" ≠ "is blocked by the
instruction"*; a fixed thing left in the wrong column because a skip never re-announces itself; a
defect reported by a SHAPE when the precondition was a conjunction not mentioning it. **Every one is
attributing a result to the property that happened to be in view.**

The check is cheap and mechanical: **grep finds names; sizing needs uses.** Before quoting a number,
name the construct, then ask separately — where is it *declared*, where is it *asserted*, and where
is it *consumed*? If those three sets differ, the estimate is measuring whichever one the grep
matched.

**The pattern is not detectable by being careful — it is detectable by being ENUMERABLE.**
[binaryang's framing, adopted 2026-08-31, and it is why this is a SECTION and not four incident
entries.] Most instances were caught by the other side having a different vantage point. But upstream
caught one of their own — a convert-pair probe reporting `bin-roundtrip=OK`, green for the wrong
reason because validity was the property in view while opcode survival was what governed — and only
because the pattern had been named twice in two days and they went looking for it. So self-review CAN
catch it. What self-review cannot do is notice it unprompted, because at the moment of the error the
property in view feels like the property that matters. **A list you can walk beats an intention to be
thorough.** Walk this one whenever sizing, attributing, or clearing:

1. Where is the construct **declared**, **asserted**, and **consumed**? If those sets differ, say which one the number came from.
2. Is this file *blocked by* the thing, or does it merely *contain* it?
3. If an upstream fix did not move the number, has the binding constraint moved to us?
4. Was a reported SHAPE the actual precondition, or a symptom of one?
5. Is this test green because the thing works, or because the thing was never exercised?
6. Does my measurement see a known positive?
7. Am I proving something is DEAD from an input that could not show it alive?
8. Does my probe **reimplement** anything the codebase already exports? If so I am testing the copy.
9. **Is the distribution suspicious?** All-in-one-bucket, a round zero, or a total that matches the
   input count exactly are signatures of a STUCK measurement, not findings. Sanity-check against one
   case whose answer is known by hand before believing the aggregate.

**Stopping a background suite kills the SHELL, not its children — verify the machine is idle before
the next measurement.** [wasmtk, 2026-08-25] A hung `wasi_tests` run was stopped via the task
harness; two orphaned `deno` processes kept spinning at ~98% CPU and were still there **30 minutes
later**, at 2140s and 1533s of CPU, competing with every build and timing measurement taken in
between. Nothing reported an error — the harness said the task was stopped, and it was. After killing
a long run, list the process table and kill survivors by PID. On a gate whose failures are *timeouts*,
a stray CPU hog is not just noise, it manufactures the symptom you are hunting.

**When a script moves runtime, move EVERY caller — CI YAML included — or the local gate stops being
CI's.** [wasmtk, 2026-10-27] P5 (2026-10-21) moved `deno task api-surface` to `bun`; `publish.yml`
kept `deno run -A scripts/api-surface.ts` for six more days, so the tag gate and the local gate ran
the same file on two runtimes. Found only by a rules review. Before calling a port done, grep the
script's name across `.github/`, `deno.json` tasks and docs, and A/B the CI invocation too.

**A rename blinds every guard that matches the old name as TEXT — and a blind guard stays
green.** [wasmtk, 2026-11-20, H39] Renaming `rt` → `host` left `tests/wasic_seam_tests.ts`
forbidding `\brt\.` in the compiler core: it kept passing, and would have kept passing with any
`host.*` call there. The same rename broke `scripts/api-surface.ts` loudly (its `parseArgs(Deno.args`
anchor) — the loud one is the lucky case. Before a rename, grep tests/ and scripts/ for the old
name inside regexes and string patterns, not only as an identifier; after it, prove each guard
still fires with a case using the NEW name.

**Run the product the way users run it, not the way the gate runs it.** [wasmtk, 2026-11-20]
`-o NUL` worked from source (`deno run -A`) and failed in the installed CLI (explicit
`--allow-write`): Deno's permission check refuses a bare Windows device name. Every suite runs the
installed binary, but none wrote to a device. The self-check (`wasmtk --self-check`) runs the
installed permissions by construction — run it after `deno task install`, not from `main.ts`.

