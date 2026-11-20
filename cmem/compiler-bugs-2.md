# compiler-bugs — part 2 of 7

Continues [compiler-bugs.md](compiler-bugs.md) (split by size on 2026-11-20, letter H38). Sections:

- Classification tally (H12)

## Classification tally (H12)

- **SILENT-WRONG:** the defect produced a wrong result that LOOKED like success (wrong output or
  value, exit 0, a false pass, a swallowed error, dead code believed to guard something), with no
  error or abort.
- **LOUD:** the defect announced itself (compile error/abort, crash/trap, hang, failing test, non-zero exit, visible error message), even if the message was misleading.

| class | compiler-open | compiler-fixed | other-open | other-fixed |
| --- | --- | --- | --- | --- |
| SILENT-WRONG | 23 | 161 | 20 | 32 |
| LOUD | 3 | 121 | 1 | 19 |
| n/a | — | 3 | — | 3 |

Re-counted from the round-1 table's rows 2026-10-15 (the open column had drifted: it read 3 / 20
while the rows said sw26, sw30, sw31 and 18 loud). Batch 1 of the loud rows closed sw26, sw30,
sw31 and 15 loud rows, found and fixed sw72, sw73, ld39, ld40, and found sw71, ld38, ld41–ld43.
Batch 2 (the same day) closed ld10, ld14, ld37, found and fixed sw74 and ld44, and found ld45:
**all 21 loud rows of 2026-10-13 are closed.**

80 classified entries (the 77th: Phase 36 restored, LOUD; the 78th: 24 wast passes resting on V8's
own limits, SILENT-WRONG, other; the 79th: `assert_trap` passing on any trap kind, SILENT-WRONG,
other, 2026-09-30; the 80th: `modc` of a dynrt-merged library, FIXED 2026-09-30, SILENT-WRONG,
other) plus the 103 rows of the Phase 0b round-1 table (ld34–ld36 the 98th–100th, sw66–sw68 the
101st–103rd, 2026-10-13) (sw35 the 48th, sw36 the 49th, sw37–sw40 and ld15 the 50th–54th,
2026-09-30; sw41, ld16, ld17 the 55th–57th, sw42–sw44 and ld18 the 58th–61st, sw45 and ld19 the
62nd–63rd, sw46 the 64th, sw47 the 65th, sw48 and ld20–ld22 the 66th–69th, sw49 and ld23 the
70th–71st, 2026-10-06; sw50, sw51, ld24, ld25 the 72nd–75th, sw52 the 76th, sw53 the 77th, sw54–sw56
and ld26 the 78th–81st, sw57–sw60 and ld27–ld29 the 82nd–88th, sw61 and sw62 the 89th–90th, sw63,
sw64, ld30, ld31 the 91st–94th, sw65, ld32, ld33 the 95th–97th, 2026-10-09) (each row counted as one
bug; re-tallied 2026-09-28 after the typed-declaration rule landed: sw29 closed, sw30–sw32 and
ld09–ld14 added, and the new entry "Landing the typed-declaration rule" holds 2 fixed and counts
once, as SILENT-WRONG, its worst); 2 pure groupings (`### wabt-ts 1.4.0` with its blockers under
`####`, and `## FIXED — the 7 long-standing test failures`) carry a note instead and are not
counted. An entry covering several defects takes its WORST class. PARTIAL counts as open. n/a
entries have no status and sit in the -fixed column for placement only.

**2026-10-26: H12 Phase 0b audit round 3 — NOT converged** (§ "audit round 3" below: 52 silent
rows, sw141–sw192, and the loud groups ld115–ld118, all CONFIRMED BY RUNNING). Fixed the same day
(owner: "record + worst few"): sw141, sw142, sw149–sw152, sw160, sw174, sw179, sw181, and sw178 /
sw180 for `wasmbundle` (the H11 switch); found while fixing: sw193 (open) and three loud gaps.
Open now: silent 23 compiler + 20 tool.

**2026-10-26, found measuring binaryang's `wasm-bundle` against our bundling tests (letter H11):
sw139, sw140 (silent, tools), both FIXED** (merged to `main` and pushed 2026-10-26; the work
branch was deleted after the second history purge).
- **sw139** `wasmbundle` seated the synthesized shared `$__heap_ptr` at the sum of the modules'
  data extents: 0 when no module has data. wasic reserves the bytes below `DATA_BASE` (260):
  scratch slots and the zero header every EMPTY array points at (an empty array is the pointer 0).
  The first allocation overwrote that header, so two libraries' empty arrays became one: after
  `apush(10)`, `bpush(10)` returned 18 (exit 0). Now `heapBase = max(data end, DATA_BASE)`.
  binaryang's bundler (`--on-conflict=prefix`) gave 10. Untested because every bundling test had
  at most one wasic library, or one with data. Test `merge_layout_tests` (one instance, so the
  calls share the heap; fails with the fix stashed).
- **sw140** a negative number argument was read as a FLAG: Deno's `parseArgs` takes `-5` for a
  short flag, so its positional list was shorter than main.ts's own scan, and the guard
  `raw.length === args._.length` kept parseArgs' list. `mod lib.wasm inc -5` called `inc()` and
  printed 1 (exit 0); `run lib.wasm inc -5` the same; `add64 -3 1` lost both (`-3` took `1` as its
  value: a loud BigInt error). A negative number now selects the scan's list. Test `tool_rows_tests`
  (three rows; fail with the fix stashed).
- Also: witgen now replaces a `.wit` that binaryang generated (its header names binaryang), as
  binaryang already replaces ours; it was kept as if hand-written (`witgen_tests`).
- Seen in the same probes, a LOUD compiler gap, handed to audit round 3: `modc` refuses `tag.length`
  where `tag` is a top-level `const` string read inside an exported function ("Unsupported
  expression: tag.length").

**sw119 FIXED 2026-10-24 (the owner's rule 4, ON by default, the `--i32-check` flag removed);
sw137, sw138 (silent) and ld114 found and fixed** (open: silent 0, loud 0).
- **sw119** `+ - *` of i32s give JavaScript's result, computed in f64; a store into an i32 slot
  (declaration, field, argument, return, `x op= e`) that does not fit throws a RangeError naming
  the operator (`$__i32_fit_<op>`); `++` / `--` test the limit (`$__i32_inc` / `$__i32_dec`, no
  f64). **How it fails (owner, 2026-10-24):** a program with exception handling of its own (a
  try / throw) throws the catchable RangeError; one WITHOUT writes "RangeError: …" to stderr and
  traps (no tag: as first built, 157 corpus programs wazero ran at its defaults were refused,
  "tag section not supported as feature exception-handling is disabled"); a library always throws. Ported from branch `feat/i32-overflow-check` (643a33c, 2026-10-19) and finished: printed,
  compared or kept in a number the value is exact, in BOTH emitters (console_log's `exprToWat`, its
  i32 classification, `toInt32Wat`; a new resolver `setI32SlotResolver` for an i32 slot there);
  a comparison with a chain on either side compares in f64 (`big + 1 > big` is true); ToInt32
  (`(h * 31 + c) | 0`, `>>> 0`) wraps JavaScript's value, never the checked store (it would throw
  where JavaScript wraps). `45_random-numbers` (mulberry32, all `number`) needed no move to wasMath:
  it passes. Measured: a dynrt program +10% size, no measurable run-time change (process start
  dominates).
- **sw137 (silent, found with sw119; the same on main, measured)** wasmmerge "relocated" the f64
  exponent bias of the number printer, `(i32.sub (local.get $e) (i32.const 1075))`, once a merged
  library's data reached byte 1075: every number it printed was wrong (`"" + 7` was
  `2.84e-114`; with sw119's message text dynrt's data passed it, and `main_arraymethods` HUNG — the
  wasi suite has no per-test timeout). A constant that is the RIGHT operand of `i32.sub` is never a
  pointer (flat: the constant before `i32.sub`; folded: the sub's last child). Test
  `18i_RelocArithmeticConstant` extended (fails with `main`'s compiler).
- **sw138 (silent, found with sw119)** a library that had NO data (Date) got a data range from the
  checked store's message text, and the merge relocated the in-range constants it cannot tell from
  pointers (`365` in `i32.div(…, 365)`, and in `(f64.convert_i32_s (i32.const 365))`). A library now
  BUILDS that message when it throws (`i32FitThrowWat`: fresh memory, no data segment); a float
  conversion's operand is never a pointer (ARITH_NEVER_PTR); an integer literal in a checked chain
  is an `f64.const`.
- **ld114 (loud, found with sw119)** a library that throws or catches, merged into a program: its
  `throw 0` named the PROGRAM's tag 0, which exists only when the program has a `try` / `throw` of
  its own (else "tag variable out of range", an invalid module), and its `$__exn_kind` was a private
  copy (a caught error's kind wrong). wasmmerge maps the library's exported `__exn_tag` and
  `__exn_kind` (a library now exports it) onto the program's, declares them when the program had
  none (`usesExnTag`; wasmbundle too), and refuses any other tag.
Tests `30_I32ArithmeticIsJavaScripts` (compared with Deno), `30_I32OverflowThrows` and
`30_I32OverflowTrapsWithoutTry` (`@expect-fail: run-wasm`), `18zz_LibraryRangeErrorCaught`, `18i`
extended.

**ld45 FIXED 2026-10-24 (the object writer); ld113 and sw134–sw136 (silent) found and fixed**
(open: silent 1, sw119; loud 0).
- **ld45** a whole struct, class instance or struct array as a console.log ARGUMENT (a name, a call
  returning one, or an array literal of such names, `[a, b]`) prints as Deno prints it:
  `src/inspect_wat.ts` lays it out (util.inspect's `reduceToSingleString`, `groupArrayElements`,
  `formatPrimitive`'s split of a long string with newlines, depth 4 then `[Object]` / `[Name]` /
  `[Array]`, Node's `currentDepth` as `$__insp_cur`); wasic generates one writer per type
  (`inspWriterFor`, a class with subclasses dispatching on its tag). What it cannot print exactly is
  refused with the reason (`inspectRefusal`): a nullable, function or tuple field, a string enum, a
  discriminated union, a type inside itself, a class field its code never assigns (Deno prints
  `undefined`), an object literal whose keys are not in the interface's declared order (Deno prints
  the literal's order), an array literal mixing objects and other values, an f32 array field.
  Inside a template or a concatenation an object is untouched (string conversion). The Phase 13b
  printer of a call's struct result is gone (it printed a string field's pointer and a boolean as
  1). Measured against Deno: the 1st and 2nd references (scratch), the edge set, the refusals.
- **ld113 (found and fixed; the same on main)** a struct literal pushed onto an array DECLARED
  EMPTY (`out.push({ x: i, y: 1 })`, in a function or at top level) used `$__rt_struct_ptr`, which
  only an array literal with elements declared: an invalid module. Now declared by use (the
  post-emit scans).
- **sw134 (silent, found and fixed; the same on main, measured)** an array declared from a call,
  `const pts: Pt[] = two()`, forgot its element struct: `pts[0].x` was refused and
  `console.log(pts)` printed `[ 260, 268 ]`. Both `arrCallPre` scans record `structTypeName`.
- **sw135 (silent, found and fixed; the same on main, measured)** a top-level object literal over
  several lines, `const d: Doc = {` with a field per line, was registered EMPTY and its field lines
  emitted as stub comments: `d.title, d.n` printed ` 0`. `joinMultilineArrayLiterals` joins an
  object literal's lines too (a declaration whose value starts with `{`).
- **sw136 (silent, found and fixed; the same on main, measured)** the same join collapsed every run
  of whitespace in the joined text, a string literal's too: `["x  y"]` over two lines printed
  `x y`. Each line is trimmed instead.
Tests `7j_ConsoleObjectWriter` (fails with `main`'s compiler), `7i_ConsoleWholeStructRefused` (now
the nullable-field refusal).

**ld106–ld109 FIXED 2026-10-23 (the owner: "fix the items left open"); ld111, ld112 and sw133
(silent) found and fixed** (open: silent 1, sw119; loud 1, ld45).
- **ld106** a template or concatenation as a METHOD's, `new`'s or `super`'s string argument: one
  helper, `emitStringArg`, at all 16 sites (it was `emitStringPtrLen`, which builds neither): a
  directly readable string as before, else built into the `$__str_arg` pair; the probe's failure
  count is taken back once the build handles it.
- **ld107** an arrow inside a template's `${…}`: `firstCodeArrowIdx` now scans holes as code (a
  mode stack: template text, holes with brace depth, strings), so the arrow is lifted; `=>` in a
  template's text, in a string in a hole, and after a `//` inside a template stay text.
- **ld108** an array FIELD's other methods (join, indexOf, includes, reduce, sort, reverse,
  splice, filter…): the field is loaded into a fresh alias `$__fa_N`, registered as a dynamic array,
  and the expression rewritten onto it (expression, string and statement forms; a statement stores
  the pointer back, a splice may move it). With it: an array's `includes` / `some` / `every` are
  typed `bool` by inferExprType (through the alias a `true` printed `1`).
- **ld109** a diagnostic located INSIDE A COMMENT that quoted the failing code: the locator now
  prefers a match in code (`commentRanges`, string-aware), a comment match only as a fallback.
  Test in `typed_decl_tests` ("located past a comment"), inverted.
- **ld111 (found and fixed)** a template nested in a hole, `${\`inner ${n}\`}`, was "Unsupported
  expression": built first into its own numbered pair `$__str_nest_N` (not the pair the outer
  template is being built into). With it, `splitStmts` skipped a template to the NEXT backtick, so
  a one-statement body `return \`r${\`q${who}\`}\`;` was cut at the inner one; `skipTemplateLiteral`
  now skips to the template's own closing backtick (and `splitTemplateLiteral` past a nested one).
- **ld112 (found and fixed)** in console.log, a string method whose argument held a `(` even in a
  string (`p.join("(", x)`) fell to the i32 path: its void call stored as a value, an invalid
  module (ld102's receiver regex `[^()]*`; now any `recv.method(…)`, the resolver decides).
- **sw133 (silent, found and fixed; the same on main, measured)** a string method in console.log
  with a TEMPLATE argument printed "" for it: `p.join(\`[${k}]\`)` printed `A` for `[4]A`. The
  string resolver ran under quietEmit and used a result that stood on a quietly failed argument;
  it now rejects one (the `quietStringFailures` rule dotCallLookup already had, sw08), so such a
  case is loud, and with ld106 it is built.
Tests `29_StringArgumentsAndFieldMethods`, `28_TemplateHoles` (each fails with `main`'s compiler),
the typed_decl case.

**ld103–ld105 FIXED 2026-10-23; sw129–sw132 (silent) and ld110 found and fixed; ld106–ld109
found, OPEN** (all four FIXED later the same day, above) (open: silent 1, sw119; loud 5, ld45 and ld106–ld109). ⚠️ First, a measuring trap
that hid all of this for a while: **`wasmtk run x.ts` runs the `.ts` under DENO and never
compiles it** (it is the corpus's reference run, `src/utils.ts` `runWasi`), so a probe compared that
way compares Deno with Deno. Probe the compiler with `wasmtk wasic x.ts -o x.wasm` then
`wasmtk run x.wasm`. An earlier note in this session's work that ld103–ld105 "did not reproduce"
came from exactly that, and was wrong.
- **ld103** an ARRAY field through `this` or a class instance (`this.items.push(x)`, `.length`,
  `[i]`; `b.items…`): the class field parser recorded `items: T[]` as a plain i32 (no
  `arrayElemType`), and the read handlers knew only struct variables; `push` was refused through a
  struct too. Now `arrayFieldRef` (this / class instance / struct; local, global, static) serves
  the `.length` and `[i]` reads, a new push / pop / shift / unshift statement form stores the
  (possibly reallocated) pointer back into the field, `inferExprType` knows the element type, and
  the console types `b.vals[0]` through wasic (by its lead it was an i32: an f64 was refused).
- **ld104** a field of a call's result, `c.bump().n`, chained, from a function (`make().w`), in
  console.log: `callResultField` (the result's class from `classOfExpr`, which now also resolves a
  plain function returning a class, so `make().bump()` works too; a struct-returning function).
  Two console paths took the METHOD's result type for the token: a boolean field printed `1`, an
  f64 one built an invalid module; `dotCallLookup` (both copies) and the expression fallback now
  report the field's type, and the fallback resolver reports `bool` as bool (widening reads it as
  an i32, so its other callers are unchanged).
- **ld105** `.length` of an array method's new array (`xs.filter(f).length`, `map`, `slice`, …),
  as a declaration AND in console.log (the record said a declaration worked: it did not): the new
  array's header word, on a known array receiver only (`s.slice(1).length` of a string is not taken).
- **sw129 (silent)** a class method named `push` called as a statement, `s.push(7)`, was compiled
  as an ARRAY push onto the object's memory: the statement form's Phase 12 fallback took any i32
  local for an array pointer, and an instance pointer is one. Printed `0 0` for `9 2`. Now a class
  or struct variable never takes that fallback. (`pop` / `shift` / `unshift` / `splice` methods
  were correct: only `push` had the fallback.)
- **sw130 (silent)** `unshift` on a string array APPENDED (`a,b,c` printed `b,c,a`): both string
  paths called `$__dynarr_push_string`. New helper `$__dynarr_unshift_string`.
- **sw131 (silent)** a class's instance-field INITIALISERS were dropped: `n: i32 = 7`, `w: f64 =
  0.5`, `s: string = "hi"` all started at 0 / "" / false, with or without a constructor, at module
  level and in functions. No corpus test had one (every initialiser in the corpus was `static`).
  Now they run in the constructor, first (after `super(…)` in a derived class); a class with
  initialisers and no constructor gets one. A probe's `items: i32[] = []` + `push` had "worked" by
  pushing onto address 0.
- **sw132 (silent)** a DERIVED class without a constructor never ran its base's (`new D(4).x` was
  0, not 40): it now gets one that passes its arguments to the nearest ancestor's (JavaScript's
  implicit constructor).
- **ld110** `super(name)` with a STRING argument passed one word (an invalid module): it is its
  (ptr, len) pair now, as in the `new` and method-call sites (ld101).
- Found, OPEN (loud, each refused with a message): **ld106** a template literal as a method's
  string argument, `ns.add(\`${who}!\`)` ("Unsupported string expression"); **ld107** an inline arrow
  inside a template's `${…}` is never lifted (`\`${xs.filter((x) => x > 2).length}\``): templates are
  opaque to the arrow lifter; **ld108** an array FIELD's other methods, `b.list.join("|")`
  (push / pop / shift / unshift / `.length` / `[i]` are supported); **ld109** a diagnostic's
  location can point INTO A COMMENT that quotes the failing code (the D6 locator matched the
  first occurrence of the text).
Tests `29_FieldArraysAndCallResults`, `29_FieldInitializersAndImplicitConstructors`,
`28_ArrayNamedMethodsAndStringUnshift`, each proved to fail with `main`'s compiler.

**ld100 FIXED 2026-10-22, ld101 and ld102 found and fixed; ld103–ld105 found, OPEN:** generic
classes; a class's string fields and string arguments; a string method in console.log; open loud 4
compiler (ld45, ld103–ld105), silent 1 (sw119); test `29_GenericAndStringClasses`.
**ld96 FIXED 2026-10-22, sw128 found and fixed:** capturing array-method callbacks; an inline array
literal for an `f64[]` parameter (silent); open loud 2 compiler (ld45, ld100), silent 1 (sw119);
tests `5h_CapturingCallbacks`, `9_ArrayLiteralArguments`.
**ld94, ld95 FIXED 2026-10-22:** `string[][]`, a literal array of functions; open loud 3 compiler
(ld45, ld96, ld100); tests `63_StringMatrix`, `44_FunctionArrayLiterals`.
**sw123 FIXED 2026-10-22** (owner: "fix the compiler issues first"): null and undefined are told
apart; open silent 1 (sw119, the owner's decision); test `24_NullVersusUndefined`.
**Loud tool rows, group 3 FIXED 2026-10-22:** ld81 (`wasmbundle` memory), ld82 (bindgen camelCase
import), ld83 (deno binding: a relative path, a view's offset); **all loud tool rows closed**; open
loud 5 compiler + 0 tool (the ld83 pair counts twice in the "other" column).
**Loud tool rows, group 2 FIXED 2026-10-22:** ld84 (bundler exports), ld85 (one basename twice),
ld87 (`mod` i64); open loud 5 compiler + 4 tool.
**Loud tool rows, group 1 FIXED 2026-10-22:** ld89 (`dync` scaffold and doubled errors), ld90 (flag
values, a stray `-o`, a missing target); open loud 5 compiler + 7 tool; `tests/tool_rows_tests.ts`.
**sw127 FIXED (refused) 2026-10-22**, found looking at ld45: `console.log(p)` of a whole struct or
class instance printed its address; refused now, ld45 (the object writer) stays open; test
`7i_ConsoleWholeStructRefused` (expect-fail).
**Loud refusals, group 6 (classes) FIXED 2026-10-22:** ld74 (but generic classes, now ld100, open),
ld79; found and fixed **sw126** (silent: a base method calling an overridden one through `this`,
or a call on a base-typed parameter, ran the base's version); open loud 5 compiler + 9 tool; test
`29_ClassDispatchAndChaining`.
**Loud refusals, group 5 (callbacks and loops) FIXED 2026-10-22:** ld78 (its last two forms), ld91,
ld92, ld93; found and fixed ld97, ld98, ld99; found ld95, ld96 (open); open loud 6 compiler + 9
tool; test `5h_CallbacksChainsAndLoops`.
**Loud refusals, group 4 (module globals) FIXED 2026-10-22:** ld41, ld42; found ld94 (`string[][]`
refused everywhere, open); open loud 8 compiler + 9 tool; test `63_ModuleGlobals2DAndBoolean`.
**Loud refusals, group 3 (strings, tuples, objects) FIXED 2026-10-22:** ld76, ld77, ld80; open loud
9 compiler + 9 tool; test `28_StringsTuplesAndObjects`.
**Loud refusals, group 2 (statements) FIXED 2026-10-22:** ld71, ld72, ld73, and ld78's default-from-
an-earlier-parameter and two-declaration `for` (ld78 stays open for its callback forms); open loud
12 compiler + 9 tool; tests `5f_IncrementsAndCompoundForms`, `5f_CompoundIndexSideEffectRefused`.
**Loud refusals, group 1 (expressions) FIXED 2026-10-22:** ld38, ld43, ld66–ld70; open loud 15
compiler + 9 tool; test `4m_ExpressionGaps`.
**Open silent-wrong in the compiler: 2; in the tools: 0** (2026-10-21: sw122 fixed, parseFloat /
Number / parseInt correctly rounded, `53_NumberParseRounding`; left sw119, owner-ruled on a branch,
and sw123 with the nullable gaps). Before that, 3 (2026-10-20, the loud rows' invalid-module
group: 16 loud rows fixed (ld48–ld50, ld52–ld57, ld59–ld61, ld63, ld64, ld75) and ld46, ld62 found
already passing, 22 loud open; tests `4l_MixedOperandTypes`, `28_ArrayCallbackEdges`. Found on the
way: sw122 and sw123 OPEN, sw124 and sw125 FIXED; loud ld91–ld93 open). Before that, 1 (2026-10-19, latest: sw120 fixed, a null
string field is the 0 pointer, `24_NullableStringFields`; left only sw119, measured on a branch,
the owner's decision pending). Before that, 2 (2026-10-19, later: sw87 built, the
owner's rule 2, `28_SortDefaultStringOrder`; left sw119, sw120). Before that, 3 (2026-10-19, later: sw95 built, the
owner's rule 1, `9c_ArrayOutOfRangeUndefined`; left sw87, sw119, sw120). Before that, 4 (2026-10-19, later: sw97, sw99, sw100,
sw101, sw108, sw121 fixed, with loud ld58, ld65; `4k_LastSilentRows`. Left: the owner-ruled sw87,
sw95, sw119, and sw120 with the nullable gaps). Before that, 10 (2026-10-19, later: the method edge
cases sw86, sw88, sw89, sw90, sw93, sw94 fixed, with loud ld51; `28_MethodEdgeCases`). Before
that, 16 (2026-10-19, later: the console
printing group sw96, sw98, sw102, sw103 fixed, sw75 with them; sw120, sw121 found; tests
`7i_ConsoleUnaryBoolStringFields`, `7i_NullishStringFieldRefused`). Before that, 19 (2026-10-19, later: block scoping
sw104, sw105 fixed, `5e_BlockScopedDeclarations`). Before that, 21 (2026-10-19, later: sw106 `finally` on
every exit fixed, `15_FinallyOnEveryExit`). Before that, 22 (2026-10-19, later: spread sw77–sw79
and the string-array paths sw76, sw107 fixed; tests `28_SpreadLiterals`, `28_StringArrayJoinSearch`,
`28_SpreadOfExpressionRefused`). Before that, 27 (2026-10-19, later: the index-
normalisation group sw80–sw85, sw91, sw92 fixed, with loud ld47; tests `28_RelativeIndexMethods`,
`28_SpliceItemReadsArrayRefused`). Before that, 35 compiler, 0 tools (2026-10-19, later: the last tool rows
sw111, sw115–sw118 fixed, `tests/tool_rows_tests.ts`; all ten round-2 tool rows are closed).
Before that, 35 (2026-10-19: sw119, i32 overflow, opened by the owner's
ruling; the owner also decided sw87, sw95 and ld88, design-decisions.md § "Owner's rulings of
2026-10-19"). Before that, **34** (2026-10-15, audit round 2: sw76–sw108 found, and sw75;
plus 10 silent TOOL defects sw109–sw118; loud 40 in the compiler (ld47–ld80 found) and 11 in the
tools; the round-2 section below). Before that, **1** (2026-10-15, later: sw71 fixed under the owner's
string-index ruling; sw75 found with it, `console.log(s.charAt(i) === "")` prints `1`. Open loud: 6,

> Continues in [compiler-bugs-2b.md](compiler-bugs-2b.md).
