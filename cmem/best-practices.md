# Best Practices — the method rules, extracted from what went wrong

**This file holds METHOD, not findings.** Post-mortems stay in their homes —
[compiler-bugs.md](compiler-bugs.md) for defects, [roadmap.md](roadmap.md) for programme state,
[design-decisions.md](design-decisions.md) for the decisions, [testing.md](testing.md) for how to run
things. What lives here is the transferable part: *how to work on this codebase so the same class
does not recur.*

**Provenance.** Adopted 2026-08-24 from the sibling **wazmrt** project's `cmem/best-practices.md`,
which pioneered the format. Rules marked **[wazmrt]** are imported — they were paid for over there,
and several were then independently re-paid for here, which is exactly why they were worth
importing. Rules marked **[wasmtk]** are ones this project bought itself. Where a rule carries both,
the incident on each side is named.

⚠️ **Read this before a conformance pass, an audit, a backend bump, or any change to a
producer/consumer pair.** Most entries exist because someone competent did the obvious thing.

---

## 1. Verifying a change

**Diff the OUTPUT, not the exit code.** [wazmrt + wasmtk] A run that still exits 0 while silently
dropping passes is a regression. Already the standing rule in the `look for code issues` trigger in
[INDEX.md](INDEX.md).

**Judge a conformance pass by what it RUNS, not by the failure total. Check that no FILE lost
passes — that is the regression test; the total is not.** [wazmrt, then wasmtk] A number that only
ever goes down can be improved by running less. **Independently re-paid for here 2026-08-20:** the
`wast` gate asserted `failed === 0` plus a single global floor (`totalPass >= 10000` against
~12,444), so when a corpus sync took `return_call.wast` from 44 passes to 12, the gate printed
`ALL CLEAN`. The corpus could have shed ~2,400 more passes silently. The fix — a per-file baseline in
`tests/wast_baseline.json` where every file must hit its number exactly — is this rule implemented.
See [testing.md](testing.md).

**Pass counts over a corpus you cannot fully run are UPPER BOUNDS, not measurements. Skips are not
passes.** [wazmrt] Live figure here: the wast gate reads **63,800 passed / 0 failed / 804 skipped** (2026-09-28, after the false-pass audit removed 186 passes that rested on the wrong failure; with the gate's experimental V8 flag; before it 37,674 / 26,944)
(re-recorded 2026-09-28 after the runner fixes on binaryang 1.6.0); before those, the last measured skip count was **27,153**, at 37,365 passed
(2026-09-19, binaryang 1.5.3, after the vendored threads patches and the `assert_malformed` stage
split). **The two crossed over** — this
corpus used to skip more than it ran (27,983 / 37,252 on 1.3.5). The prediction that a bump would
cross them was right, and the bump LANDED — an earlier 1.4.0 attempt was reverted, 1.4.1 was not.
Any headline quoting passes without skips is still overstated by more than the number itself.

**Read the SKIP column in the same row as the failure count — and rank work by ASSERTIONS UNBLOCKED,
not failures closed.** [wazmrt] A file reading `0 passed, 0 failed, 34 skipped` is not healthy, it is
*dark*. **Vindicated hard on 2026-08-25:** `ref_null.wast` sat at 0 passes / 34 skips because wabt-ts
could not encode `ref.null` at all; the 1.4.0 fix moved the WHOLE CORPUS by **+9,264 passes and
−9,977 skips**. One toolchain fix lit up ten thousand assertions, and it had been sitting behind a
column nobody gates on. **An item whose symptom is a SKIP cannot be sized from the failure column at
all.**

**Do not FILTER output and then trust the filtered view — it is how a measurement lies to you.**
[wasmtk, 2026-08-24] Twice in one session: `deno run tests/wasi_tests.ts | grep -E "Passed|Failed" |
head -3` matched the suite's per-phase `✅ … Passed:` chatter and cut the 417/417 summary off
entirely, so the number most needed was discarded by the reader; and `wasmtk convert bad.wat | tail`
followed by `$?` reported **tail's** status, not wasmtk's, which nearly fabricated an exit-code
finding out of nothing. **Read the tail unfiltered, and use `${PIPESTATUS[0]}` — or do not pipe at
all when the exit code is the measurement.**

**Re-measure before quoting any number.** [wazmrt + wasmtk] Counts go stale silently, and a stale
number is worse than none because it reads as current. **wasmtk's own version of this rule is
stronger and predates this file:** regenerate the corpus before validating against another runtime,
or a stale artifact is a false positive ([testing.md](testing.md)). It earned its keep on 2026-08-24
— regenerating first is what proved a sibling project's `KNOWN_INVALID` list stale rather than
confirming it.

**A CARET RANGE PLUS A LOCKFILE IS NOT A PIN — it is a pin until someone reloads.** [sibling
project, then wasmtk the same day] Arrived as a report from the binaryen-ts side, and we were sitting
in it: `deno.json` asked `^1.3.5` for wabt-ts, the lock held 1.3.5, and JSR had published 1.4.0 —
which the caret accepts. Deleting one config line was enough to let a reload pull 1.4.0 in, and the
`wast` gate went **156 files off-baseline** while `deno.json` still read "1.3.5". Harmless until then
only by luck of timing.

**The distinction that matters is WHY the constraint exists.** Most ranges express *compatibility*,
and a lockfile is the right home for that. A few express *correctness* — "our code is bug-compatible
with exactly this version" — and those belong in the **specifier**, where a reload cannot move them.
Ours was the second kind written as the first. **Both backends are now EXACT pins**, and since
2026-08-27 they are one package: `@jrmarcum/binaryang` (1.6.0 as of 2026-09-28), reached through `compat/wabt` and
`compat/binaryen` at the same version. The caret came off binaryen-ts too — "that one really is a
compatibility range" did not survive contact with an optimiser that silently miscompiles.

**The tell:** ask what `--reload` would do, then ask again imagining the next upstream release as
already published. If the answers differ, the range is doing work a lock cannot.

**Reinstall before testing.** [wasmtk] The suites invoke the globally-installed `wasmtk`, so after
editing anything in `src/` or `deno.json` you MUST run `deno task install` or you are testing the old
binary. Never hand-write the `deno install` line — `--allow-ffi` is required.

## 2. Investigating a defect

**A speculative probe must undo EVERY side effect, not only the ones its suppressor knows about.**
[wasmtk, 2026-09-29] The sw02 fix let the console string resolver try `emitStringAssign` inside
`quietEmit`. `quietEmit` silences the terminal emit fallbacks only; `emitStringAssign`'s
"Unsupported string assignment" went straight into `diagnostics`, so a probe that was allowed to
fail aborted the compile, and two passing tests stopped building. The fix snapshots
`diagnostics.length` and truncates back on failure. (It still leaves `__str_op` in `stringVars`, a
name no program can use; recorded rather than claimed clean.) **A probe that can fail must leave no
trace when it does: diagnostics, registered names, declared locals, allocated data.**

**Before debugging a toolchain failure, prove it is yours: rebuild the UNMODIFIED commit.**
[wazmrt + wasmtk] A one-command falsification is worth more than any amount of reading the diff you
already believe in. **Used here 2026-08-20:** three Go suites went red during a session that had
touched `src/wast.ts`. Reverting that one file to HEAD reproduced the failure exactly, reclassifying
it in one step from "what did I break" to "what broke around me" — Go 1.27 had been installed that
morning and TinyGo 0.41.1 caps at 1.26.

**Identify the LAYER before naming a cause.** [wazmrt + wasmtk] Each layer has its own cheap query,
and the cheapest is often never run. **Used here 2026-08-24** on the `wast` runner OOM: parser →
assembly → instantiate → the `module quote` path, each tested in isolation. The first three were fine
at 6–7 MB; the fourth died. Without that split, the "obvious" conclusion — a memory-lifetime redesign
around instantiated modules — was the one already written down, and it was wrong.

**A prediction in a scoping note is not a diagnosis.** [wasmtk, 2026-08-24] The runner OOM was sized
**L** with "likely instantiated modules and their `WebAssembly.Memory` buffers … a lifetime
redesign". It was two discrete bugs: an infinite loop in our own S-expr reader on a lone `;`
(~1.9 GB), and a wabt-ts `parseWat` blow-up on `(ref (exact any))` — **50 characters → 4 GB**. With
ours fixed, 287 files peak at **52 MB**. There is no creep. Write the guess down as a guess, and
delete it the moment measurement lands.

**…and the same applies to a prediction about the FIX, not just the cause.** [wasmtk, 2026-08-24]
The `boolexpr` double-evaluation was filed as needing "a spare local plumbed through the emitter",
which is why it was deferred out of the `fd_write` change as too invasive. It needed **no local at
all** — one statement-form `if` with both stores inside each arm evaluates the operand once, and is
simpler WAT than what it replaced. A cost estimate written before opening the code deferred a
20-line fix on the strength of an imagined one. Size it when you look, not when you file it.

**A partial fix that measures as insufficient must be recorded as partial, loudly.** [wasmtk]
Hoisting the per-file WABT instance to a process-wide singleton was correct and did not stop the OOM.
Recording it as "the fix" would have sent the next reader looking in the wrong place; recording it as
"real but NOT sufficient — most retention is elsewhere" is what kept the investigation open.

**A hang is a MEASUREMENT before it is a mystery — read the CPU time.** [wasmtk, 2026-08-25] A
process pinned near 100% CPU is spinning; one at ~0% is blocked on I/O. They are different bugs with
disjoint suspect lists, and the check costs one command
(`Get-Process deno | Select Id,CPU,StartTime`). **Paid for here:** a `wasi_tests` run appeared stuck;
the two live processes showed 1146s and 540s of CPU against roughly the same wall-clock. That single
reading killed the plausible "blocked waiting on stdin" theory outright and reframed it as a loop —
which is what memory corruption looks like from the outside. Do not infer a hang's nature from where
the log stopped.

**Check whether the suspect code is REACHABLE from the failing input before bisecting it.**
[wasmtk, 2026-08-25] The freshest, most invasive change is the intuitive culprit and it is often
innocent. The `try_table` EH migration had landed hours before the hang, in the same pipeline — but
`grep -c 'try\|catch'` on the two hanging modules returned **0**, and their WAT contained no
`try_table`. One grep, before any bisect, moved the search to the actual variable (the backend bump).
Reachability is cheaper than bisection and strictly more conclusive.

**When a text-parsing fix is correct but the symptom persists, the bug has SIBLINGS — grep, don't
re-derive.** [wasmtk, 2026-08-25] Three folded-only `(i32.const N)` regexes were fixed in
`wasmmerge.ts`; the module still failed with the identical symptom. Three more lived in
`wasmbundle.ts` and `wasic.ts`. The second round of debugging was pure waste — a single
`grep -rn -F '\(i32\.const' src/*.ts` enumerated all six up front. This is the
**parallel-code-paths** warning in `CLAUDE.md` in its most expensive form: when you fix a pattern,
search for the pattern, and make the search's empty result the acceptance criterion.

**Parsing generated text: a no-match must be distinguishable from a legitimate empty result.**
[wasmtk, 2026-08-25] A regex that hard-codes a formatter's choices does not throw when the formatter
changes — it returns "nothing found", which every caller reads as valid. Here that meant "this module
has no data segments", which disabled relocation, seated the heap inside static data, and surfaced
two layers away as an infinite loop. If a scan over a non-empty input yields zero matches, that is a
defect signal, not a value.

## 3. Producer/consumer pairs — the recurring blind spot

wasmtk sits in a three-project triangle with **wabt-ts** (assemble) and **binaryen-ts** (optimise),
and ships output to third-party engines. Almost everything here is about that boundary.

🚨 **A round-trip proves agreement with YOURSELF. When a bug can only be seen by a third party, the
test has to BE a third party.** [wazmrt, then wasmtk — the sharpest shared lesson] **Re-paid for here
2026-08-24 in the most expensive possible way:** every TypeScript `try`/`catch`/`finally` compiled to
the *legacy* exception-handling proposal. wabt-ts parsed and re-encoded it faithfully, V8 executed it
correctly, and the wasi suite was **417/417 green** — while all 10 affected modules were rejected
outright by wasmtime, the host WASI names. The corpus was blind by construction. Only putting the
bytes to a different engine could see it, and that is what the sibling project did.

**Two consumers agreeing is not corroboration when they share the mistake.** [wazmrt] Count the
implementations of a rule before trusting they check each other. Our oracle was V8 in *both* the wasi
runner and `wasmtk wast` — one engine wearing two hats is one data point, not two.

**A workaround in the producer for a gap in the consumer does not stay cosmetic.** [wazmrt] Live
decision this bears on: `wasic` emits legacy EH and wabt-ts cannot encode `try_table`. The available
shortcut is to keep emitting the dead form and post-process it downstream. Fix the gap; don't route
around it.

**A stale vendored snapshot is indistinguishable from live data unless something records its
provenance.** [wasmtk — twice in one week, in BOTH directions] `proposals/threads/` in the spec
testsuite still asserts "multiple memories" is invalid; that is upstream's frozen 2020 snapshot, not
local drift, and a downstream project filed it against us as a stale corpus. Days later a sibling
filed seven modules as "genuinely invalid" from *their* frozen 272-file copy of our corpus — all
seven run clean today. **Neither was carelessness.** The fix is mechanical: pin the upstream SHA and a
re-sync recipe next to the vendored copy ([testing.md](testing.md)).

**A `KNOWN_*` list that asserts a thing STAYS broken inverts its own purpose the moment the thing is
fixed.** [wasmtk, from the sibling's incident] Theirs was designed to shrink as our codegen improved;
frozen against old bytes it passes for the wrong reason and masks the fix. Applies directly to our
own baseline entries pinned at 0 — those are safe only because `--update-baseline` re-measures them.

**A claim about ANOTHER project's code is a HYPOTHESIS until you open their source and grep for it.**
[wazmrt, then wasmtk] wazmrt bought this when an adoption ledger's "Benefit" line — *loaders bind
once to a familiar ABI* — turned out to be false; the loaders used a different API entirely, and
nobody had checked. **Re-paid for here 2026-08-24, in both directions in one day:** a sibling's
report asserted *"wabt-ts's WAT parser already accepts `try_table`, so this needs no wabt-ts
change"* — the parser does; the binary writer cannot encode any handler form, which inverted their
whole recommendation. The same day, their list of seven "genuinely invalid" modules turned out to run
clean. **Both reports were careful and both were partly wrong, because the checkable half was
assumed.** Verify inbound claims before acting, and expect the same of ours — mark what you measured
and what you inferred, so the other side knows which half to check.

**Never green-wash our own gaps; a well-argued entry in a baseline is still an entry.** [wazmrt] The
alternative to fixing a class is a permanent "known deviation" nobody re-examines, which hides the
next genuine failure in the same file. That argument arrived here from a downstream consumer on
2026-08-20 and it was right.

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

| | estimate | actual | why |
| --- | --- | --- | --- |
| wasmtk, `ref.null` | 32 assertions | **123** | `table_fill` / `table_set` / `table_grow` pass `ref.null` as an ARGUMENT — the count found where the instruction is *asserted*, not where the value is *used* |
| binaryang, `br_on_cast` | inflated by a 114-assertion file | **20–40** | the file was counted because it *contained* `br_on_cast`; it dies in the parser on `(exact $T)` long before reaching one |

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

## ★ The workspace's convergent rules — a COPY, stamped 2026-10-27 (workspace letters H6, H24, H27, C8)

**Copied from synapticforge1/cmem/best-practices.md on 2026-10-27** (the stamp wording of letter
H27 and `memory-conventions.md` § Open book; first copied 2026-09-30). **28 rules**, every bullet the
source marks **★ = convergent**: two or more repos derived it without reading each other. Copied
VERBATIM, with the source's section headings (`##` there, `###` here) and rule numbers, so a rule
can be cited as "workspace 2.1" in either place. **Checked by TEXT, not by count**: a one-time Bun
script compares the 28 bullets by number and whitespace-normalized full text. 2026-10-26: before
the re-copy 1 difference (5.2, letter H24's new wording), after it 0. 2026-10-27 (ledger C8, the
source's 6.1 now cites binaryang's post-purge `8d9ba0cb9`): before 1 difference (`DIFF 6.1`), after
it 0, one line changed in the diff; inverted (one word added to the copy's 2.1, in memory) it
reports `DIFF 2.1`; control, loader-js's copy, 0.

- **Do not edit these here.** The source is authoritative. If it changes, re-copy the whole block
  and re-stamp the date; a hand-edited copy is the drift H10 exists to stop.
- **This repo's own sections above stay.** Several ★ rules began here (the `[… + wasmtk]` tags);
  where they overlap, the entries above carry the incident detail and the `[wasmtk]` history.
- **Check before relying on the copy:** if the source file is newer than this stamp, the copy may
  be stale.

### §1 Evidence and measurement

- **1.1 ★ An exit code is not evidence; diff the OUTPUT counts, per file.** Exit-0 runs silently
  dropped passes in four repos; binaryen-ts's serious defects were valid wasm with the wrong value;
  wabt-ts's `wat2wasm` silently deleted an instruction. [wabt-ts + binaryen-ts + wazmrt + wasmtk + wasmrt]
- **1.2 ★ A green suite is evidence about the tests, not the code.** The fuzzer had zero `makeLoad`
  / `makeBreak`; `deno test tests/` collected 513 of 908 and exited 0. [binaryen-ts + wabt-ts]
- **1.3 ★ Re-derive before quoting any number; a count in prose is a dated claim.** Counts were
  cited eight days stale; artifacts doubled while "smallest binary" was the goal; three commit
  messages contradicted their own diffs. [every repo]
- **1.4 ★ When the corpus can move, the denominator is a measurement, and a comparison must print
  it.** The failure total matched on both sides by coincidence after +4 files; four totals were
  computed over zero modules because `--enable-all` is not a `wasm-opt` flag. [wasmrt + binaryang]
- **1.11 ★ Validate the harness against a known positive; an extreme number is evidence about the
  harness, and a broken harness can score BETTER.** 1937/1937 failing; give it an input it must
  fail on. [wabt-ts + binaryen-ts]

### §2 Gates and tests

- **2.1 ★ A new test that has never failed has not been shown to test anything: invert it and
  watch it fail for the RIGHT reason.** A baseline probe appended a WAT comment and could not fire;
  deleting the release guard left twelve tests green; a mutant caught by a different check is a bad
  mutant. [wazmrt + wabt-ts + binaryen-ts + binaryang + wasmtk]
- **2.3 ★ A gate that cannot fail is decoration; a gate with no trigger, a goal with no gate, a
  gate that only prints, and a property asserted in a doc comment are all preferences.** `| tail`
  swallowed the oracle monitor's status; `check-bridge-corpus.ts` exited 0 either way; "exhaustive
  over `Op`" ended in `_ => return None` and shipped four ungated ops. [wazmrt + wasmrt + binaryang]
- **2.4 ★ The local gate must BE CI's gate: read the steps from the workflow file.** 65 unpushed
  commits were red by CI's standard; `tasks.md` went binary to grep from NUL bytes because the
  hygiene gate was scoped to what the compiler reads, not what the workflow reads. [binaryang + wabt-ts]
- **2.16 ★ A change's own new surface is the one place the audit that produced it will not look —
  re-run the governing audit against the new members before landing.** The `--update-baseline` path
  OOMed; the day's own suites passed throughout six silent CLI regressions. [wazmrt + wasmrt + wasmtk]

### §3 Producer/consumer pairs and oracles

- **3.1 ★ A round trip proves agreement with yourself; when a bug is visible only to a third party
  the test has to BE a third party — hand the bytes to an outside reader as a GATE, not a habit.**
  Legacy EH: wabt-ts parsed it, V8 ran it, wasi 417/417 green, wasmtime rejected all ten modules;
  `(ref any)` emitted as an internal tag byte and `try_table`'s label off by one in assembler,
  validator and interpreter alike — wasmtime refused both in one afternoon. [wazmrt + binaryen-ts + wabt-ts + wasmrt + wasmtk]
- **3.2 ★ Agreement between components that learned the convention from each other is not
  evidence, and there can be three.** Decoder and encoder shared a catch-depth off-by-one; every
  round trip was byte-identical and green. [binaryen-ts + wabt-ts + wazmrt + wasmrt]
- **3.3 ★ Producer/consumer pairs are the recurring blind spot; fix the gap, not a post-process
  workaround, and pin both directions.** T13.22 cancelling off-by-ones across a repo boundary,
  invisible for four releases; fixing one direction turned silent accept into loud reject. [binaryang + wazmrt + wabt-ts]
- **3.8 ★ A stale vendored snapshot is indistinguishable from live data without recorded
  provenance: stamp source + date in the change that creates it, and never let a check read an
  artifact it did not just produce.** A 2020 `proposals/threads/` snapshot was filed against us; a
  frozen 272-file copy filed seven "invalid" modules that run clean; a size gate read yesterday's
  artifact. [wabt-ts + wasmtk + wasmrt + wazmrt]
- **3.10 ★ A claim about another project's code is a hypothesis until you grep their source; a
  stated BENEFIT is a hypothesis about someone else's code.** "wabt-ts accepts try_table" (the
  writer could not encode it); the wasm-c-api "drop-in" payoff never existed — the loaders use
  `wasmtime_*`. [wasmtk + wasmrt + wazmrt]

### §4 Where defects hide

- **4.1 ★ One authoritative enumeration; a second copy drifts into silence; one reader per grammar
  production, and a production has more than one site.** `deepCopy` covered 29 of 79 kinds; the heap
  type table existed three times; a private `skip_const_expr` refused two valid modules; reftype was
  read as valtype at the table-type site for the project's whole life. [binaryen-ts + wabt-ts + wasmrt + wazmrt]
- **4.2 ★ A value read and discarded is a decision; a wrong decode made harmless by a guard in
  another file is a load-bearing coincidence.** `r.readU32(); // table index`; three reserved bytes;
  `br_on_cast` flags, the elemkind byte, element flags `8`. [binaryen-ts + wabt-ts + wasmrt]
- **4.3 ★ Silent-wrong output is the worst class and where every serious defect has been: ask "what
  would a wrong answer look like?" first, and prefer a hard error over a stub.** A feature can be
  decoded, validated, printed and never execute (the start function, five releases). [wasmrt + wasmtk + wabt-ts]
- **4.16 ★ A rationale expires; the code it justified does not: a comment justifying a deviation
  names the authority it defers to; "by design" and "out of scope" age badly by definition; a stale
  rationale is worse than none.** "Mirroring the oracle" survived the oracle's retirement five weeks;
  the `import.meta.main` ban's reason expired while the rule stayed right for another reason.
  [wasmrt + wazmrt + binaryang]

### §5 Investigating

- **5.1 ★ Prove, do not assume: prove the REASON, not just the answer; UNVERIFIED is a legitimate
  status.** Four read-not-verify claims were wrong when run; a `--features` alias rationale was
  right by luck. [wazmrt + wasmrt]
- **5.2 ★ Identify the LAYER before naming a cause; the stage that REPORTS a failure is usually
  not the stage that caused it; finding a real defect at a layer is not evidence it causes your
  symptom — vary one thing.** "Memory-grow ordering" was decoder reordering; a symptom caused by the
  development drive's FILESYSTEM (exFAT) was diagnosed wrong three times. [wazmrt + binaryen-ts + wasmtk + wasmrt]

### §6 Recording and claims

- **6.1 ★ A written result is a CLAIM: a commit message, a status line, a doc of a safety guard, a
  contract row verified by reading. Compare it to the artifact; put a pin where the tool enforces
  it.** `8d9ba0cb9` (was `b8fafaa3f` before binaryang's 2026-10-23 purge; corrected here 2026-10-26, ledger C8) said "pin to 132" and left 116; prose has no failure mode. [binaryang + wabt-ts + wasmrt]
- **6.2 ★ Write down the thing you only said out loud; write the negatives (what was varied, what
  held fixed), the calibration, and what you did NOT check; distinguish clean / measured /
  UNMEASURED.** Knowledge that exists only in a conversation is operationally identical to
  knowledge nobody has. [wabt-ts + binaryang]
- **6.3 ★ Record findings that were WRONG so they are not fixed again; a retraction re-checks the
  REASONING, not the requirement; a correction is a dated claim too; a reopen condition is not
  self-checking.** [wazmrt + wasmtk + binaryen-ts + wabt-ts]

### §7 Tooling that lies

- **7.1 ★ Do not author file CONTENT through a shell heredoc; scripts go in files, always; commit
  messages through `-F <file>`.** Four corruption modes (escapes eaten, long commands truncated,
  backticks substituted, `$$` templates), five corruptions including a NUL byte in `.gitattributes`;
  broken five times by the rule's own author. [binaryang + wasmtk + wazmrt + wasmrt]
- **7.2 ★ When the exit code IS the measurement, do not pipe.** `deno fmt --check | tail -1`
  committed a failing check; `| tail -20` swallowed the oracle monitor. [wasmtk + wasmrt + wabt-ts]
- **7.3 ★ A change that silently does nothing is indistinguishable from one that worked: prefer
  "fail if absent" over "act if present"; edit scripts assert each match exactly once; read back;
  omission is not reset.** Seven no-ops in one register (replace without asserting the target, an
  omitted workspace key, a `--dry-run` that bumped). [binaryang + wazmrt + wasmrt]
- **7.6 ★ Line endings: pin in `.gitattributes` wildcard-first; measure with a positive control;
  never fix with `git config`; test inputs whose bytes feed a digest are never whitespace-trimmed.**
  `grep -c '\r'`=140, `grep -c $'\r'`=0, `grep -cU $'\r'`=184 on the same file. [wasmtk + binaryang + wazmrt + wasmrt]

### §8 Working across repos

- **8.1 ★ Read freely, write never: nothing is written into a sibling's tree — not its source, not
  its `cmem/`, not its copy of the contract — unless the owner directs that write, and then it is
  logged in both memories.** Two destructive overwrites on 2026-08-19; a commit that laundered
  authorship. [wasmrt + wazmrt + binaryang + wabt-ts]
