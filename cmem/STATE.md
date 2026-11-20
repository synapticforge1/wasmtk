# STATE: wasmtk

Updated: 2026-11-20, at the end of the session

## Version
- Released: 3.0.0 on 2026-10-24 (JSR `@jrmarcum/wasmtk`, provenance)
- Working branch: `main` (`refactor/host-ts-2026-11-20` merged and pushed on 2026-11-20)
- Licence: MIT OR Apache-2.0 (owner, 2026-11-20); `NOTICE.md`; `deno task check-licences`
- Backend: `@jrmarcum/binaryang@4.1.1`, pinned 2026-11-20

## Now
- On `main`: H39 (`src/host.ts`, `--self-check`), binaryang 4.1.1, H38, H43, H37, the licence work
- CI's `checks` runs `is-release` only since this push: its first run is the measurement

## Review
- Run for: none in progress; the next release needs "review" (five classes)
- Position: not started under the final standard (H37); round 6 of the old one paused
- Open issues: 9 findings + test gaps from round 6, in `cmem/review-issues.md`
- Platforms passed: win-x64 (full gate 2026-11-20)

## Next
1. Read the first publish.yml run after this push (`checks` = `is-release` only, not a release)
2. A finer H38 pass: separate open and closed rows in the audit-round tables and "Open now"
3. H12 audit round 3: open silent rows (23 compiler + 20 tool, counted 2026-10-26)
4. The owner's number-type direction: measure, then a plan
5. `--self-check` on linux-x64 (WSL Ubuntu); a licence inventory gate

## Waiting on owner
- Which round-6 groups to fix (H37 (d) / (e) replaced the record parser L3 / L4 concerned)
- Decisions N1, N3, N4 (`number-model-and-runtime-plan.md`); H6.5b, the consumer suites

## Read next
- `next-work.md`: the open items with their records
- `working-rules.md`: the rules and the owner's words
