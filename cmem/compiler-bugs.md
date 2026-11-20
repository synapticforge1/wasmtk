# Compiler bug log

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 7.** The sections continue in:

- [compiler-bugs-2.md](compiler-bugs-2.md): from "Classification tally (H12)"
- [compiler-bugs-2b.md](compiler-bugs-2b.md): continued
- [compiler-bugs-3.md](compiler-bugs-3.md): from "Classification tally (H12) (continued)"
- [compiler-bugs-4.md](compiler-bugs-4.md): from "H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CONFIRMED BY"
- [compiler-bugs-4b.md](compiler-bugs-4b.md): continued
- [compiler-bugs-4c.md](compiler-bugs-4c.md): continued
- [compiler-bugs-5.md](compiler-bugs-5.md): from "H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CONFIRMED BY"
- [compiler-bugs-6.md](compiler-bugs-6.md): from "H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 10 silent t"
- [compiler-bugs-6b.md](compiler-bugs-6b.md): continued
- [compiler-bugs-7.md](compiler-bugs-7.md): from "H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 10 silent t"

> Closed sections (68) moved verbatim to [archive/compiler-bugs-to-2026-11-20.md](archive/compiler-bugs-to-2026-11-20.md) on 2026-11-20 (H38).


## Open: RH2 (review round 7, 2026-11-20), blocked on binaryang (letter C48)

A chain of dependent statements in one function (`x = x * 3 + a - 2;` ×N) is sunk by binaryang's
simplify-locals into one tree N deep: N ≥ 1000 → binaryang's named "nests deeper" refusal; N = 20000
(420 KB, under the 1 MiB source cap) → V8 out-of-memory abort, no named error. 20000 independent
statements compile. Not catchable in wasmtk (the optimizer is synchronous; V8 aborts the process).
