# compiler-bugs — part 6 of 7

Continues [compiler-bugs.md](compiler-bugs.md) (split by size on 2026-11-20, letter H38). Sections:

- H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 1

## H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 10 silent tool defects, ~44 loud, CONFIRMED BY RUNNING

**Class:** SILENT-WRONG / LOUD per row · **Status:** OPEN · **Scope:** compiler and tools

Four parallel read-only auditors (owner: item 2 of 2026-10-15's list): fall-throughs / silent stubs
(87 probes), codegen in wasic (144), wasic ↔ console divergence (303 variants), and the other
source files + the CLI + dead code. Every row was RUN: `scripts/phase0/verify_repros.ts` on the
copied repros reads 50 / 50 DIFFER in `scripts/phase0/round2/silent-wrong/` and 63 / 63
COMPILE- or RUN-FAIL in `round2/loud/` (files named `<row>_<probe>.ts`); the tool rows have
their inputs in `round2/tools/` (`.wat` / `.wit` there are inputs, force-added past .gitignore).
De-duplicated across auditors. Fix order: silent first (owner's standing order), the tool rows that
overwrite user files (sw113) at the top.

**Silent-wrong, compiler** (native → compiled):

(Table as a list — id · defect · root cause:)

- ~~sw76~~ — defect: ✅ FIXED 2026-10-19: a string-element join writer
  (`$__dynarr_join_to_scratch_str`, sized exactly by `$__strarr_join_size`), used by the console
  (`$__cbuf_join_str`, both paths) and by wasic's join VALUE (`$__dynarr_join_str_str`, which also
  closes ld80's "`string[].join` into a declaration"). Test `28_StringArrayJoinSearch`. Was:
  `string[].join(sep)` and a string array in a template print pointer and length (`a-b` → `260-1`) —
  root cause: console `joinarr` segment never checks `isStringArr` (console_log ~1500)
- ~~sw77~~ — defect: ✅ FIXED 2026-10-19 (with sw78, sw79): `emitSpreadArrayInit` starts EMPTY and
  takes every part in order: `...x` is a concat (a copy), a plain part a push (strings by (ptr,
  len), struct literals as push does); `spreadLiteralDecl` parses the literal bracket- and
  quote-aware at all three sites (`[b[0], ...a]` was cut at the first `]` and missed). A spread of
  anything but an array variable, an i64 spread, or a literal not the whole initializer is refused
  (`28_SpreadOfExpressionRefused`; a spread of a call was already an unclear compile failure). Test
  `28_SpreadLiterals`. Was: a spread literal drops its plain elements (`[...a, ...b, 5]`, `[0, ...a,
  7]`) — root cause: wasic ~13172 keeps only `...` parts
- ~~sw78~~ — defect: ✅ FIXED 2026-10-19 with sw77 (`13_RestAndSpread`'s golden shows it: `merged` /
  `abc` were `local.set` to `a`). Was: `[...a]` aliases `a` (a push / store through the copy changes
  `a`) — root cause: `emitSpreadArrayInit` ~7038 `local.set` of the first spread
- ~~sw79~~ — defect: ✅ FIXED 2026-10-19 with sw77 (8-byte `concat_f64` for string arrays, a
  module-global string array's `isStringArr` honoured). Was: a spread of string arrays copies 4-byte
  slots, not (ptr, len) pairs — root cause: ~7023 picks `concat_i32`
- ~~sw80~~ — defect: ✅ FIXED 2026-10-19: one normalisation, `relIndexWat` (negative counts from the
  end, then clamp to [0, len]), in the numeric and string-array slice helpers. Test
  `28_RelativeIndexMethods`. Was: array `slice` with a negative index clamps to 0 (`slice(-2)` is
  the whole array) — root cause: `$__dynarr_slice_*` ~18159, string-array slice ~18193
- ~~sw81~~ — defect: ✅ FIXED 2026-10-19: `$__str_slice` normalises as JavaScript (no other caller
  relied on substring's clamping; the console hands `.slice` to wasic). Test
  `28_RelativeIndexMethods`. Was: string `slice` with a negative index (`"hello world".slice(-5)` is
  the whole string; `slice(1,-1)` is `""`) — root cause: `$__str_slice` ~19009 has substring
  semantics
- ~~sw82~~ — defect: ✅ FIXED 2026-10-19 with sw80 (`relIndexWat`). Was: array `fill` with a negative
  start / end clamps to 0 — root cause: ~18502
- ~~sw83~~ — defect: ✅ FIXED 2026-10-19 with sw80 (`relIndexWat`; the helper had no clamping at
  all). Was: typed-array `fill` with a negative start does nothing — root cause: `$__ta_fill_*`
  ~17848
- ~~sw84~~ — defect: ✅ FIXED 2026-10-19: splice is ONE helper per slot width (4 / 8 bytes): it
  normalises idx and count, moves the tail to open a gap of N slots (growing the array), leaves idx
  in `$__splice_at`, and returns the array pointer (re-stored, as push does); the caller stores the
  items there (scalars, strings, struct literals). A missing count removes to the end. An item that
  READS the spliced array is refused (it would read it changed): test
  `28_SpliceItemReadsArrayRefused`. Test `28_RelativeIndexMethods`. Was: `splice` drops insertion
  arguments; a one-argument `splice(i)` removes one element — root cause: ~13960: only args 0 and 1,
  count defaults to 1
- ~~sw85~~ — defect: ✅ FIXED 2026-10-19 with sw84 (with ld47). Was: `splice` with a negative index
  removes the last element — root cause: `$__dynarr_splice_*` ~18775 (no normalisation; ld47 is its
  trap)
- ~~sw86~~ — defect: ✅ FIXED 2026-10-19 in an f64 context (a `select` maps the helper's -1 to NaN);
  an `i32` slot keeps -1 until the owner's sw119 store rule is built (NaN does not fit an i32). Test
  `28_MethodEdgeCases`. Was: `charCodeAt` out of range gives -1, not NaN (`isNaN(s.charCodeAt(9))`
  false) — root cause: ~19222
- ~~sw87~~ — defect: ✅ FIXED 2026-10-19 (the owner's rule 2): `sort_T` (a bare sort of an i32 / f64
  / f32 / bool array) compares `String(a)` with `String(b)` (`$__numstr_gt_T`, two 32-byte buffers
  per call), as JavaScript; a comparator still decides. dynrt keeps its own documented numeric
  default (a separate runtime, not wasic). Test `28_SortDefaultStringOrder`. Was: a bare numeric
  `sort()` sorts numerically; JavaScript sorts as strings (`1,10,100,9`). **Owner 2026-10-19: follow
  JavaScript** (a JS function does what JS intends) — root cause: `sort_<T>` ~10191 / ~14152 (dynrt
  documents the deviation, wasic does not)
- ~~sw88~~ — defect: ✅ FIXED 2026-10-19: one part per byte (`"".split("")` is `[]`; a multi-byte
  character splits, as everywhere the helpers index bytes). Test `28_MethodEdgeCases`. Was:
  `split("")` gives the whole string as one part — root cause: ~19550 "treat as no-split"
- ~~sw89~~ — defect: ✅ FIXED 2026-10-19: `reduce1_T` (expression and statement forms) starts from
  element 0 and folds from 1; an empty array traps (JavaScript throws). Test `28_MethodEdgeCases`.
  Was: `reduce` with no initial value starts the accumulator at 0 (a product is 0) — root cause:
  ~10234 `zeroOf`
- ~~sw90~~ — defect: ✅ FIXED 2026-10-19: `find_T` sets `$__nullable_ret_flag` (1 found, 0 not); a
  nullable declaration / reassignment from `x.find(…)` reads it into its `__null`, and console's
  "undefined" print tests that flag. A NON-nullable `const f: i32 = xs.find(…)` (a TypeScript type
  error) keeps the sentinel. Test `28_MethodEdgeCases`. Was: `find` returns a sentinel: a found -1
  reads as undefined, a miss is not `=== undefined` — root cause: ~18299
- ~~sw91~~ — defect: ✅ FIXED 2026-10-19: the empty-match step copies the byte it steps past
  (`-a-b-c-`); bytes, not UTF-16 units. Test `28_RelativeIndexMethods`. Was: `replaceAll("", x)`
  loses the original characters (`abc` → `----`) — root cause: ~19415 skips the byte
- ~~sw92~~ — defect: ✅ FIXED 2026-10-19: an empty pad returns the string unchanged (a missing pad is
  still a space, from the call site). Test `28_RelativeIndexMethods`. Was: `padStart` / `padEnd`
  with an empty pad pads with memory bytes — root cause: ~19451, ~19492 force `padlen` 1
- ~~sw93~~ — defect: ✅ FIXED 2026-10-19 (with ld51): `$__f64_to_str_radix`, a port of V8's
  DoubleToRadixCString (fraction digits to the half-ulp, round-half-even with carry, zeros past
  2^53, exact i64 remainders below), emitted only when used; NaN / ±Infinity texts. Matches Deno on
  12 values × 4 radixes. Test `28_MethodEdgeCases`. Was: `x.toString(radix)` of an f64 truncates to
  i32 (`255.5` → `ff`) — root cause: ~7742 (ld51 is its trap)
- ~~sw94~~ — defect: ✅ FIXED 2026-10-19: `includes` on a float array uses `sameval_T` (equal, or
  both NaN); `indexOf(NaN)` stays -1 (`===`). Test `28_MethodEdgeCases`. Was: `includes(NaN)` false
  on an f64 array (SameValueZero) — root cause: ~10110 = `indexOf != -1`
- ~~sw95~~ — defect: ✅ FIXED 2026-10-19 (the owner's rule 1): `arrOobTestWat` is the out-of-range
  test (`index >= length`, unsigned; `at()` normalises a negative index first; a literal index into
  a STATIC array is decided at compile time), used by `nullTestWat`, so `a[i] === undefined`, `a[i]
  ?? d`, a `T \| undefined` declaration / return from `a[i]` all see it; console.log prints
  `undefined` through the null printer (a float element keeps its `-0`; not for i64, whose template
  drops the `n`, nor f32, whose template is not built: the first try broke `9_F32Containers`). A
  plain numeric READ out of range (`a[9] + 1`) still reads past the array: no `undefined` value
  exists in an i32 / f64 (sw119's store rule is the place for it). Found with it: `inferExprType`
  typed `a.at(i)` as f64 (an i32[]'s `${a.at(1)}` was an invalid module). Test
  `9c_ArrayOutOfRangeUndefined`. Was: an out-of-range array read / `at()` is never `undefined`
  (`a[5] === undefined` false). **Owner 2026-10-19: give `undefined`, as for strings; a float array
  index keeps D3's conversion** — root cause: design-decisions.md § "Owner's rulings of 2026-10-19"
- ~~sw96~~ — defect: ✅ FIXED 2026-10-19: console `!` / `~` apply only with no top-level binary
  operator (`hasTopLevelBinaryOp`, as unary minus). Test `7i_ConsoleUnaryBoolStringFields`. Was:
  console: `!` and `~` take the whole binary expression (`!a && b` is `!(a && b)`, `~n + 1` is `~(n
  + 1)`), also in templates / concats — root cause: console_log ~3010, ~3027 lack unary minus's
  `!hasTopLevelBinaryOp` guard
- ~~sw97~~ — defect: ✅ FIXED 2026-10-19 (with ld65): a parenthesised left operand is f64 / i64 when
  its contents hold a KNOWN float / bigint (a float literal, a name declared f64 / f32 / i64); not
  inferExprType's f64 fallback, which turned `((z + 5) % 7) + 6` of i32s into float arithmetic (the
  date bundle's golden caught it). Test `4k_LastSilentRows`. Was: a declaration comparing
  parenthesised floats truncates both to i32 (`(z / 2) === (z / 2.5)` true) — root cause: wasic
  ~11636 `lhsType` falls back to `defaultType` for a `(` lead (ld65: NaN traps)
- ~~sw98~~ — defect: ✅ FIXED 2026-10-19: a string struct field (`p.s`, `ps[i].s`) is a string to the
  console's string ternary and to wasic's `isStringExpr`; `emitStringPtrLen` builds a string ternary
  and a string `a ?? b` (by the value's null flag); a template part that is a string ternary is one
  multi-value. So the ternary prints its text in console.log, in templates and in declarations
  (refused before). `??` on a `string \| null` FIELD is REFUSED (`7i_NullishStringFieldRefused`):
  such a field has no null representation (sw120). Test `7i_ConsoleUnaryBoolStringFields`. Was:
  console prints a string POINTER for a string `??` or ternary over struct string fields (`q.s ??
  "none"` → `268`) — root cause: console numeric path
- ~~sw99~~ — defect: ✅ FIXED 2026-10-19: before `?.` is stripped, `rewriteOptChainNullish` turns
  `a?.b ?? d` (the chain the whole left operand, `d` simple) into `(a === null ? d : a.b ?? d)`, one
  null test per `?.`; inferExprType types a conditional by both branches and the console types a
  parenthesised numeric conditional through wasic. A bare `a?.b` as a VALUE still reads through (no
  `undefined` to give). Test `4k_LastSilentRows`. Was: `a?.b ?? d` with `a` null reads through the
  null pointer: `0`, not `d` — root cause: wasic ~21749 rewrites `?.` to `.` (README documents it;
  the result is silent)
- ~~sw100~~ — defect: ✅ FIXED 2026-10-19 (with ld58): wasic's emitExpr takes `<string-valued
  call>.length` from the call's (ptr, len) through `$__str_op_*`; the declaration was refused and
  the console sum printed 2. Test `4k_LastSilentRows`. Was: console `s.toUpperCase().length +
  t.length` is `2` — root cause: console
- ~~sw101~~ — defect: ✅ FIXED 2026-10-19: `rhsKnownFloat` also takes a declared float ELEMENT
  (typed-array / f64[]) or FIELD. Test `4k_LastSilentRows`. Was: an `Int32Array` element plus a
  `Float64Array` element truncates the float (declaration) — root cause: wasic `rhsKnownFloat`
  ~11733 (ld56 is the console's)
- ~~sw102~~ — defect: ✅ FIXED 2026-10-19: the console's dot-call path prints a top-level comparison
  as a boolean (`isTopLevelComparison`); `inferExprType` types a top-level comparison `bool`
  whatever leads it (`ps[0].x > 1` took the array's element type). Found with it and fixed: a string
  compared through any string method or against a string LITERAL (`s.toLowerCase() < "b"`) compared
  numbers in the console and was refused in a declaration. Test `7i_ConsoleUnaryBoolStringFields`.
  Was: console prints booleans as `0` / `1`: `s.toUpperCase() !== "ABD"`, `a.slice(0,2) ===
  b.slice(0,2)`, `ps[1].ok \|\| ps[0].x > 1` (sw75's class) — root cause: console boolean detection
- ~~sw103~~ — defect: ✅ FIXED 2026-10-19: after a leading `-` / `~` / `(`, a `struct.field` lead
  takes the field's type (i64 → the bigint printer). Test `7i_ConsoleUnaryBoolStringFields`. Was:
  console `-h.big` (a bigint field) prints without `n` — root cause: console i64 lead detection
- ~~sw104~~ — defect: ✅ FIXED 2026-10-19: `parseModuleGlobals` and the module-array pass take only
  depth-0 declarations (`braceDepthOf`); a block's declaration stays a `_start` statement, re-run
  each pass. Shadowing: with sw105. Test `5e_BlockScopedDeclarations`. Was: a top-level `let` /
  `const` inside a block becomes a module GLOBAL and its declaration is dropped: not re-initialised
  per loop pass; an inner block's `const x` overwrites the outer `x` — root cause:
  `parseModuleGlobals` ~3991 has no brace-depth check
- ~~sw105~~ — defect: ✅ FIXED 2026-10-19: `renameShadowingDecls` (before parseModuleGlobals, per
  function with its params, and on the top level) renames a `const` / `let` that shadows an
  enclosing scope's name to `x__blkN` for its block's extent; references are rewritten outside
  strings (template `${}` included), skipping members, object keys and break / continue labels, and
  expanding shorthand (`{ x }` → `{ x: x__blk1 }`). Code that does not shadow is unchanged (no
  golden moved). Not covered: destructuring declarations, `var`, catch variables (catchVarShadows
  has its own path); a bare `{ … }` block is still refused (loud). Test
  `5e_BlockScopedDeclarations`. Was: inside a function, a block's `const x` overwrites the outer `x`
  (`1 50` → `50 50`) — root cause: function locals are flat by name
- ~~sw106~~ — defect: ✅ FIXED 2026-10-19: finally is emitted FIRST and kept on `finallyStack` (with
  the controlStack depth at its try) while the try and catch bodies are emitted. A `return` runs
  every enclosing finally after its value is evaluated (`(return (block (result T) X FIN))`,
  emitStatement); a `break` / `continue` (labeled too) runs the ones entered after its target loop,
  innermost first; the catch body sits in its own `try_table (catch_all_ref …)`, so a throw from it
  runs finally and re-throws. Refused: a string return through a finally that calls a
  string-returning function (the `$__str_ret_*` globals would be overwritten;
  `15_FinallyStringReturnRefused`, which the old compiler built). The same day (owner: "I do want
  the one finally case fixed"): a throw FROM finally leaves the whole try statement. The
  fall-through copy moved after the `try_table` (it was inside, so the try's own catch caught it);
  each copy run by a return / break / continue is in a `try_table (catch_all_ref $__fin_escN)`
  branching to an escape block around the statement that re-throws outward (emitted only when an
  exit used it). Was "3 1013" for "3 11": the inner catch ran, then finally again. Test
  `15_FinallyOnEveryExit`. Was: `finally` is skipped when try / catch leaves by `return`, `break` /
  `continue`, or a throw from `catch` — root cause: try emission ~16920 inlines finally on
  fall-through only
- ~~sw107~~ — defect: ✅ FIXED 2026-10-19: `$__dynarr_indexof_string` compares text (`$__str_cmp`); a
  needle that is not a string variable or literal is refused. Test `28_StringArrayJoinSearch`. Was:
  `string[].indexOf` / `includes` return wrong indices — root cause: ~10104 has no string-array path
- ~~sw120~~ — defect: ✅ FIXED 2026-10-19: a null string field is the 0 pointer, the pointer-field
  convention (sw51): the static layout stores (0, 0) for `null` / `undefined`;
  `emitStringFieldStore` stores a string into a field (assignment, run-time literal, `fieldStore`),
  `null` as (0, 0) and anything else built as a string (concatenations through emitStringAssign);
  `nullTestWat` tests a string field's pointer, so `=== null`, `??` (no longer refused) and a
  nullable ternary branch work; console.log prints `null`. Found with it and fixed: ANY string field
  assignment (`p.s = "x"`) and a string field in a run-time struct literal were refused (emitted as
  numbers). `7i_NullishStringFieldRefused` replaced by `24_NullableStringFields`. Was: FOUND
  2026-10-19 with sw98: a `string \| null` FIELD has no null representation: `{ s: null }` stores
  the TEXT "null", so `r.s === null` is `false` and `${r.s}` prints `null` by accident. `??` on such
  a field is refused meanwhile. The nullable gaps (next-work item 5) — root cause: struct literal /
  field init stores `null` through emitStringPtrLen
- ~~sw121~~ — defect: ✅ FIXED 2026-10-19 (the same day): `allocStructArrayElems` lays out a STATIC
  struct variable element as its address (JavaScript's same object: `p.n = 9` shows through
  `ps[0]`); a run-time one is refused, pointing at push. Test `4k_LastSilentRows`. Was: FOUND
  2026-10-19 with sw98: a struct VARIABLE as an element of a struct-array literal loses its string
  fields (`const ps: P[] = [p, …]`: `ps[0].s` is ""; a literal element is right) — root cause:
  static struct-array literal layout
- ~~sw108~~ — defect: ✅ FIXED 2026-10-19: parseModuleGlobals registers a promoted string-enum-typed
  module variable in stringEnumVars (the _start pre-scan never saw the dropped line). Test
  `4k_LastSilentRows`. Was: a top-level string-enum-typed variable prints its tag (`1` for `DOWN`);
  in a function it is right — root cause: top-level `stringEnumVars` registration

**Silent, tools** (all exit 0):

(Table as a list — id · defect · where:)

- ~~sw109~~ — defect: ✅ FIXED 2026-10-19: `wasmmerge.dataExtent`, THE one data-extent reader (any
  offset bracketing, every string piece, named escapes counted once), replaces wasmbundle's own
  regex. Test `tests/merge_layout_tests.ts`. Was: `wasmbundle` seats every module's data at the same
  address (the second library's bytes read from the first's address) — where: `getDataMaxEnd`
  ~wasmbundle.ts:143 misses binaryang's `(offset (i32.const N))` form
- ~~sw110~~ — defect: ✅ FIXED 2026-10-19: the next base is the HIGHEST of the library's data end
  (`dataExtent`), its exported `__heap_ptr`, and (as before) a mutable i32 global 0, 8-aligned; no
  260 fallback. 46 pipeline goldens moved, each ONLY `$__heap_ptr`'s initial value, up 2–4 bytes
  (the alignment). Test `tests/merge_layout_tests.ts`. Was: a wasic merge seats the heap INSIDE a
  merged library's data (`79 79 200` → `79 7 200`) — where: wasic.ts ~23103 advances by global 0's
  init, not the data extent
- ~~sw111~~ — defect: ✅ FIXED 2026-10-19: `exportFuncMap` holds EVERY name of an index; the first
  names the function, each other name is a forwarder (`call` of the first), and every name maps to
  it. Bundle and wasic merge both. Test `tests/tool_rows_tests.ts`. Was: a function exported under
  two names keeps only the last — where: `exportFuncMap` by index, wasmmerge.ts ~457
- ~~sw112~~ — defect: ✅ FIXED 2026-10-19 as a REFUSAL: two files of one program declaring the same
  top-level value name (`function` / `const` / `let` / `var` / `class` / `enum`) stop with "the
  top-level name 'x' is declared in both …" (tsbundler step 6). Prefixing private names safely needs
  a parser (object keys, interface fields, shorthand share the spelling); `type` / `interface`
  repeats are allowed (`type i32 = number` everywhere). wasic no longer words every bundler error
  "Cannot read". Test `tests/merge_layout_tests.ts`. Was: the bundler does not prefix a file's
  PRIVATE top-level names, so they collide with the entry's (`6 100` → `200 100`) — where:
  tsbundler.ts ~661 renames exports only
- ~~sw113~~ — defect: ✅ FIXED 2026-10-19: one helper, `src/outpath.ts` (`defaultOutPath` replaces a
  known extension in any case, else APPENDS the new one; `assertNotInput` / `samePath` refuse any
  write that resolves to the input, an explicit `-o` included, case-insensitively on Windows), used
  by convert, wasm2js, tsbundle, bindgen, jstyper (its `.d.ts` path too) and wasic's `.ts` / `.wat`
  / library compiles and their sidecar `.wat` / `.wit`. Test `tests/outpath_tests.ts` (12 cases; all
  12 fail on the old code, 10 of them destroying the input). Was: **default output paths can
  overwrite the INPUT** (`convert lib.bin`, `wasm2js`, `tsbundle entry.mts`, `bindgen H2.WIT`,
  `jstyper calc.mjs` empties the source) — where: unanchored / case-sensitive extension replaces:
  utils.ts:531, :503, main.ts:428, bindgen.ts:649, jstyper.ts:345, :370, :333
- ~~sw114~~ — defect: ✅ FIXED 2026-10-19 with sw113: `compileWasi` checks `compileWat`'s result and
  exits 1. Test `tests/outpath_tests.ts`. Was: `wasmtk wasic broken.wat` exits 0 after "unknown
  operator" — where: `compileWasi` ignores `compileWat`'s result, wasic.ts ~23333
- ~~sw115~~ — defect: ✅ FIXED 2026-10-19: `run` passes the arguments after the target; `args_get` /
  `args_sizes_get` give `[basename, …args]` (UTF-8, NUL-terminated); the library-call branch (`run
  lib.wasm fn 1`) is reachable. Test `tests/tool_rows_tests.ts`. Was: `wasmtk run x.ts one two`
  drops the arguments; WASI `args_sizes_get` is 0; the library-call branch is unreachable — where:
  main.ts:390 passes `[]`; utils.ts:146
- ~~sw116~~ — defect: ✅ FIXED 2026-10-19: a non-numeric argument exits 1 with "'abc' is not a
  number", in `mod` and `run`'s library call. Test `tests/tool_rows_tests.ts`. Was: `mod lib.wasm
  add abc 5` turns `abc` into 0 — where: utils.ts:437 (also `runWasi` :299)
- ~~sw117~~ — defect: ✅ FIXED 2026-10-19: the output path is resolved against the working directory
  before the toolchain runs (`cwd: baseDir`), and `report()` checks the artifact as zigwasic's does
  (missing or empty: `success: false`). Test `tests/tool_rows_tests.ts` (needs TinyGo; skipped and
  said so without it). Was: Go `build -o out/x.wasm` (relative) writes beside the SOURCE and reports
  success at the given path — where: gowasic.ts ~203/241/426 unresolved; `report()` ~573 unchecked
  (Zig's was fixed 2026-08-24)
- ~~sw118~~ — defect: ✅ FIXED 2026-10-19: the first export keeps a WIT name, a later one kebabing to
  it is listed as `// skipped export foo_bar: its WIT name 'foo-bar' is already fooBar's`;
  `witPackageName` makes the package a WIT identifier (`2048` → `m2048`). The orphaned doc comment
  at witgen.ts:35 went with it. Test `tests/tool_rows_tests.ts`. Was: `witgen` writes duplicate
  exports (`fooBar`, `foo_bar` → `foo-bar` twice); package names unchecked (`local:2048`) — where:
  witgen.ts ~98, ~86
- ~~sw122~~ — defect: ✅ FIXED 2026-10-21: `$__dec_to_f64` converts a decimal literal CORRECTLY
  ROUNDED, for `parseFloat`, `Number(string)` and `parseInt` (radix 10): an exact fast path (≤ 19
  significant digits in w, no nonzero digit dropped, w ≤ 2^53, \|e\| ≤ 22: one multiply / divide by
  an exact 10^\|e\|), out-of-range straight to ±Infinity / ±0, else exact big-integer division over
  every digit (u32 limbs in a `$__malloc` block: N / T scaled to a 54–55-bit quotient, the remainder
  as the sticky bit, ties to even, subnormals shifted first). parseFloat also takes `[+-]Infinity`

> Continues in [compiler-bugs-6b.md](compiler-bugs-6b.md).
