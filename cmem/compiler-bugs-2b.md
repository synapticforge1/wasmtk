# compiler-bugs-2b — continues [compiler-bugs-2.md](compiler-bugs-2.md)

(Split by size on 2026-11-20, letter H38.)

all found that day: ld38 `toFixed`, ld41, ld42, ld43, ld45, ld46). Before that, **1** (2026-10-15:
sw71, an out-of-range string index gives `""` for `undefined`, found fixing ld34; sw72, sw73, sw74
found and fixed the same day; the 21 loud rows of 2026-10-13 closed). Before that, **0** (2026-10-13, latest: sw68 fixed, a nested console.log in an
argument overwrote the outer line: 1 → 0 silent, 21 loud). Before that, **1** (2026-10-13: sw70
fixed, a local array named like a module array initialized the module's: 2 → 1). Before that, **2**
(2026-10-13: sw69 fixed, broader than recorded:
every compile-time layout of an array or struct literal, and the run-time array init, read values
with `parseFloat || 0`; with it, a boolean element's printing, an invalid console comparison and a
float literal into an integer (now D3's report): 3 → 2 silent (sw68, sw70), 21 loud). Before that,
**3** (2026-10-13: sw66 and sw67 fixed together
(an array prints as Deno prints it); found with them sw69 (a static array literal's non-numeric
elements become 0) and sw70 (a local array named like a module array initializes the module's),
and opened loud ld37 (a whole string / boolean / bigint array is refused): 3 → 3 silent (sw68,
sw69, sw70), 20 → 21 loud). Before that, **3** (2026-10-13, sw62 fixed, broader than recorded: any
console line over 128 bytes corrupted memory; found with it sw66 (an array variable prints its
address), sw67 (a long array's layout) and sw68 (a nested console.log in an argument): 1 → 3). Before that, **1** (2026-10-13, later: building the owner's D3 found two
loud ones and fixed one documented gap: ld34 open (console `s[pos]` with a float index), ld35
fixed (console call argument passed an f64 raw), ld36 fixed (`(x as f64) === lit` compared as
i32): 19 → 20 open loud). Before that, **1** (2026-10-13, wasMath L4: sw64 fixed, loud ld29, ld30,
ld31 fixed, and a u64 of 2⁶³ or more prints unsigned: 2 → 1 silent (sw62, console), 22 → 19
loud). Before that, **2** (2026-10-09, the owner's division decision: a plain `/`
between integers is a compile error pointing at wasMath; sw36 and sw37 closed: 4 → 2, sw62 and
sw64 left, both console). Before that, **4** (2026-10-09, wasMath L3, the math library: sw57, sw58,
sw59, sw61, sw63 fixed and sw60 closed by the owner's decision "CR, in both"; loud ld27, ld28,
ld33 fixed: 10 → 4 silent (sw36, sw37 on wasm-math D1; sw62, sw64 console), 25 → 22 loud).
Before that, **10** (2026-10-09, wasMath L2 and the corpus program found
and fixed sw65 (the bundler renamed inside string literals) and loud ld32 (`NaN` / `Infinity`
into an f32), and found loud ld33 (`Math.atan2` with a subnormal hangs): still 10 silent, 24 → 25
loud). Before that, **10** (2026-10-09, a bigint probe: sw63 (`Math` accepts a
bigint), sw64 (`-a` prints without `n`), loud ld30 (`**`), ld31 (bitwise / shifts invalid):
8 → 10 silent, 22 → 24 loud). Before that, **8** (2026-10-09, the per-call Math table,
`scripts/math/math_table.ts`: sw61 (`sin(1e18)`) and sw62 (console line corruption) found, ld28
corrected: 6 → 8). Before that, **6** (2026-10-09, scoping the wasm number types: a scan of
every `Math` member against Deno (`scripts/math/scan_math.ts`, wasm-number-types.md) found sw57–sw60
and loud ld27–ld29, all the same on main: 2 → 6 silent, 19 → 22 loud). Before that, **2**
(2026-10-09, late: sw51 fixed by the owner's option A,
nullable fields carry a flag word; sw54–sw56 and loud ld26 found and fixed with it: 3 → 2, still
19 loud; the two left, sw36 and sw37, wait on wasm-math D1). Before that, **3** (2026-10-09,
night: sw53 fixed: 4 → 3; the three
left wait on the owner: sw36 and sw37 on wasm-math D1, sw51 on the tuple layout). Before that,
**4** (2026-10-09, evening: sw52 fixed, sw53 split from it
and open: still 4; loud ld21 fixed with it: 20 → 19). Before that, **4** (2026-10-09, later: sw48
and sw49 fixed; sw52 found: 5 → 4, still 20 loud). Before that, **5** (2026-10-09: string conversions and two value-typing
slips, sw06–sw09, sw19, sw28, fixed; sw50 found and fixed with them; sw51 found, open; loud ld24 and
ld25 found and fixed: 10 → 5 silent, still 20 loud). Before that, **10** (2026-10-06, evening:
wasic's operator rows sw10–sw17
fixed in BOTH paths; sw49 and loud ld23 found: 17 → 10 silent, 19 → 20 loud). Before that, **17**
(2026-10-06, later: the console rows sw20, sw24, sw25
and sw32 (a closure bug, not a console one) fixed, loud ld02 too; sw48 and loud ld20–ld22 found:
20 → 17 silent, 17 → 19 loud). Before that, **20** (2026-10-06, late: sw46 fixed, top-level code beside
a `main` function; sw47 found and fixed with it: 21 → 20). Before that, **21** (2026-10-06,
night: sw44 fixed, the thrown kind now
tracked; sw46, every top-level statement beside an async `main()` dropped, found: still 21).
Before that, **21** (2026-10-06, evening: f32 in containers fixed, sw43
and loud ld18; sw45, a for-of over any array parameter, found and fixed; loud ld19 found: 22 →
21 silent, 17 loud). Before that, **22** (2026-10-06, later: the Phase 1 finds fixed, sw41
and loud ld16, ld17; fixing them found sw42 (fixed), sw43 and sw44 (open), and loud ld18: 21 →
22 silent, 18 → 17 loud). Before that, **21** (2026-10-06, wasm-math-plan.md Phase 1: sw38, sw39,
sw40 fixed, sw41 found, 23 → 21; loud ld15 and ld04 fixed, ld16 and ld17 found, still 18).
Before that, **23** (2026-09-30, night: scoping the division ruling
found sw37–sw40 in the `Math` dispatch, 19 → 23, and ld15, loud 17 → 18; sw36 narrowed by the
ruling, still open. See wasm-math-plan.md). Before that, **19** (2026-09-30, evening: sw18, sw22, sw23 fixed, all
three loud, so open loud 20 → 17; sw36 FOUND, the i32 division, pending a ruling: 18 → 19).
Before that, **18** (2026-09-30, later: sw05 fixed, and sw35 found and
fixed with it; sw21, loud since the morning, fixed too, so open loud 21 → 20). Before that, **19**
(2026-09-30, which is H12/I11 bar (c): the console
fallback now delegates to wasic's `emitExpr` and otherwise ABORTS, so sw04 and sw27 are fixed and
7 rows (sw18, sw21, sw22, sw23, sw26, sw30, sw31) turned LOUD: still open, now loud, 14 → 21. The
corpus reached the stub nowhere (0 of 489 golden WAT outputs held one), so no existing program
changed, bar one intentionally failing test that now names a second cause. Before that, **28**
(2026-09-29: sw01 fixed, and
sw33 found and fixed with it; then sw02 fixed and sw34 found with it; then sw03 and sw34 fixed.
The round-1 table has 47 rows. 31 on 2026-09-28: 29 after
round 1, −1 sw29 closed by the typed-declaration rule, +3 found while landing it). It read 0 earlier the
same day, after the first tally's 2 were fixed, and that 0 carried the warning below; the Phase 0b
audit then CONFIRMED 28 more by running them (table below). The count is only as good as the
entries: a silent-wrong bug nobody has found is not in it.

