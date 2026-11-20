# STATE: wasmtk

Updated: 2026-11-20, at the end of the session

## Version
- Released: 3.0.0 on 2026-10-24 (JSR `@jrmarcum/wasmtk`, provenance)
- Working branch: `refactor/host-ts-2026-11-20` (local); `origin/main` = `8e627039` (binaryang 4.0.0)
- Backend: `@jrmarcum/binaryang@4.1.1`, pinned 2026-11-20

## Now
- Committed on the branch: H39 (`src/host.ts`, `--self-check`, check-host), binaryang 4.1.1
- Committed on the branch: H38 (memory guide, all seven steps), H43 (scratch rule), H37 (review standard)
- CI's `checks` now runs `is-release` only; unmeasured on GitHub until the next push

## Review
- Run for: none in progress; the next release needs "review" (five classes)
- Position: not started under the final standard (H37); round 6 of the old one paused
- Open issues: 9 findings + test gaps from round 6, in `cmem/review-issues.md`
- Platforms passed: win-x64 (full gate 2026-11-20)

## Next
1. "push" when the owner says so (the branch merges into `main`); then CI's `checks` is measured
2. A finer H38 pass: separate open and closed rows in the audit-round tables and "Open now"
3. H12 audit round 3: open silent rows (23 compiler + 20 tool, counted 2026-10-26)
4. The owner's number-type direction: measure, then a plan
5. `--self-check` on linux-x64 (WSL Ubuntu); a licence inventory gate

## Waiting on owner
- Round 6's findings are already on GitHub in `8e627039`: leave them, or purge history?
- Which round-6 groups to fix (H37 (d) / (e) replaced the record parser L3 / L4 concerned)
- Decisions N1, N3, N4 (`number-model-and-runtime-plan.md`); H6.5b, the consumer suites

## Read next
- `next-work.md`: the open items with their records
- `working-rules.md`: the rules and the owner's words
