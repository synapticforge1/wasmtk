# STATE: wasmtk

Updated: 2026-11-20, at the end of the session

## Version
- Released: 3.0.0 on 2026-10-24 (JSR `@jrmarcum/wasmtk`, provenance)
- Working branch: `main` (`review/2026-11-20` merged and pushed on 2026-11-20)
- Licence: MIT OR Apache-2.0 (owner, 2026-11-20); `NOTICE.md`; `deno task check-licences`
- Backend: `@jrmarcum/binaryang@4.1.1`, pinned 2026-11-20

## Now
- Review round 7 (the first under the final standard, H37): every class fixed and re-reviewed twice
- History rewritten a third time (P1): see `archive/history-purge-2026-11-20.md` for the hash map

## Review
- Run for: the next release ("review", five classes)
- Position: fixes done and re-reviewed; full gate green (win-x64, 2026-11-20)
- Open issues: RH2 only, blocked on binaryang (letter C48), in `cmem/review-issues.md`
- `Review complete: <commit>` not yet written: it waits on RH2
- Platforms passed: win-x64 (full gate 2026-11-20)

## Next
1. When binaryang answers C48: pin it, re-run RH2's reproducer (`next-work.md`), close RH2
2. A finer H38 pass: separate open and closed rows in the audit-round tables and "Open now"
3. H12 audit round 3: open silent rows (23 compiler + 20 tool, counted 2026-10-26)
4. The owner's number-type direction: measure, then a plan
5. `--self-check` on linux-x64 (WSL Ubuntu); a dependency vulnerability check

## Waiting on owner
- `const u: i32 = x >>> 0` stores -1 (the hash idiom relies on it): keep, or a RangeError (sw119)?
- Round 6's remaining groups (H37 (d) / (e) replaced the record parser L3 / L4 concerned)
- Decisions N1, N3, N4 (`number-model-and-runtime-plan.md`); H6.5b, the consumer suites
- JSR provenance names pre-rewrite commits (as after the first two purges)

## Read next
- `next-work.md`: the open items with their records
- `working-rules.md`: the rules and the owner's words
