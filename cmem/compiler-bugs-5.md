# compiler-bugs — part 5 of 7

Continues [compiler-bugs.md](compiler-bugs.md) (split by size on 2026-11-20, letter H38). Sections:

- H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CO
- H12 Phase 0b, audit round 3 (2026-10-26): 29 silent compiler + 23 sile

## H12 Phase 0b, audit round 1 (2026-09-28): 28 silent-wrong + 8 loud, CONFIRMED BY RUNNING (continued, 2)

**`sw29` was settled by the owner's ruling (2026-09-28), not by an f64 default:** every
declaration states its type, and a counting-`for` counter is an integer by standard. See
design-decisions.md and the entry "Landing the typed-declaration rule" below. The "untyped number is
an f64" idea was put on hold and then superseded.

**sw30–sw32 and ld09–ld14 were found by LANDING that rule, not by the round-1 audit.** Requiring
annotations pushed every program through the typed-declaration handlers, which turned out to be
weaker than inference for arrays; the probes that showed it are filed beside the round-1 repros.

**Also from the dead-code audit (cleanup, not bugs):** every private member is reachable. Unused
exports `DATA_BASE` / `SCRATCH_SLOTS` / `ArrayLookup` (console_log.ts); the unused promise
`+28 reactions` slot; `iovBase`/`scratchBase` are constants; stale comments at console_log.ts
536-537, wasic.ts 15143-15148, 15443, 18694-18696, 1545-1547; duplicated `-Oz` code in
`watToOptimisedWasm` vs `binaryenOptimize`.

Classified 2026-09-28 from each entry's own text; re-tally whenever an entry is added or closed.


## H12 Phase 0b, audit round 3 (2026-10-26): 29 silent compiler + 23 silent tool rows, ~105 loud, CONFIRMED BY RUNNING — NOT CONVERGED

**Class:** per row · **Status:** OPEN unless struck · **Scope:** compiler and tools

Four parallel auditors over a frozen worktree of `main` (`0976c052`), as round 2: fall-throughs
(252 probes), wasic codegen (148), wasic ↔ console (461 expressions × up to 5 forms = 1,677
forms), and the other source files + CLI + dead code (~86 checks, two forks on wast.ts and on
hybrid / jstyper / tsbundler). Every row RUN: `scripts/phase0/verify_repros.ts` on
`scripts/phase0/round3/{console,codegen,fallthrough}` (repro ids `k…`, `c…`, `f…`); the tool rows
have their inputs and a `README.txt` (command, expected, observed) in `round3/tools/<id>_<name>/`.
Rows below are de-duplicated by ROOT CAUSE across auditors; the repro ids name every file. The
owner's order (2026-10-26): record everything, fix the most severe silent rows now, the rest is the
open list. The convergence bar (H12 Phase 0, "a full pass finds nothing new") is NOT met, so
Phase 1 does not start.

**Silent-wrong, compiler** (native → compiled):

(Table as a list — id · defect · repros · root cause:)

- ~~sw141~~ — defect: ✅ FIXED 2026-10-26: `new` is `(call $__new_<C> …)`, a per-class wrapper that
  mallocs, zeroes, tags and constructs; a declared class variable is a pointer local
  (design-decisions.md § "Every `new C(…)` makes a FRESH instance"). 44 goldens moved, all class
  programs; the 81 class corpus tests read as Deno. Test `9_NewMakesAFreshObject`. Was: every run of
  one `new C(…)` site is ONE object: objects made in a loop, a factory, or a method returning `new`
  alias (`0,10,20` → `20,20,20`; `1 7` → `7 7`) — repros: c111, c112, c114, c115, c132 — root cause:
  wasic ~13255 / ~16282: `allocStructData` gives each site one static block at compile time
- ~~sw142~~ — defect: ✅ FIXED 2026-10-26 with sw141 (the variable is a pointer local, so a read
  follows it). Was: a class variable reassigned (`a = b`) still reads its first object's fields (`9`
  → `1`) — repros: c131 — root cause: wasic ~12773: a field read uses `(i32.const cv.ptr)` when the
  variable had a static object
- sw143 — defect: an overridden getter / setter called through a base-typed parameter or `this` in a
  base method runs the BASE accessor (`20` → `10`, `300` → `3`) — repros: c86, c109, c110, f131,
  f177, f248 — root cause: wasic ~12728, ~12779: accessors called statically (sw126 dispatched
  methods only)
- sw144 — defect: an optional parameter / field (`b?: i32`) has no `undefined`: 0 passed reads as
  undefined, omitted reads as 0 (`b ?? 100` → 0, prints `0` for `undefined`) — repros: c45, c89,
  c90, f43, f66, f67, f70, f84, f106, f250 — root cause: wasic ~3770: `defaultValue: "0"`, no flag
- sw145 — defect: float `%` by `x - trunc(x/y)*y`: `5 % Infinity` NaN (5), `-10 % 5` `0` (`-0`),
  `1e17 % 7` `0` (5) — repros: c06, c21, c22, c135 — root cause: wasic ~14280 (and `%=` ~16493),
  console_log ~3695
- sw146 — defect: (2026-10-26: NO ruling needed — under the owner's plain-numbers direction `%` is
  f64, and the repros still print `0` only because of sw145's float formula; fix sw145 and this
  closes; number-model-and-runtime-plan.md) i32 `%` giving JavaScript's `-0` (`-6 % 3`, `b % 3` with
  b = -3) prints `0` in an f64 / console context — **owner ruling needed** (rule 4 names `+ - *`) —
  repros: c94, k08 — root cause: `i32.rem_s` in both emitters
- sw147 — defect: `replace` / `replaceAll` copy `$&`, `$$`, `` $` ``, `$'` literally | c56 | wasic
  `$__str_replace` ~23244, `$__str_replace_all`
- sw148 — defect: `trim*` keep `\v` and `\f` — repros: c57 — root cause: wasic ~23065: only 0x20,
  0x09, 0x0a, 0x0d
- ~~sw149~~ — defect: ✅ FIXED 2026-10-26: cases stay in SOURCE order; the tests run in order and
  `br` goes to wherever `default` is. No existing switch's golden moved. Test
  `48_SwitchOrderNestingAndCaseValues`. Was: `switch`: a `default` that is not last is MOVED last,
  so fall-through order changes (`1 2 11` → `1 2 9`) — repros: f02, f32, f247 — root cause: wasic
  ~19855
- ~~sw150~~ — defect: ✅ FIXED 2026-10-26: `case` / `default` and the switch's own `}` only at the
  switch's depth (`braceDepthOf`), and a case's own `break`s only at ITS depth (the outer case had
  taken the inner `break`s and dropped the inner `}`). Test `48_SwitchOrderNestingAndCaseValues`.
  Was: a nested `switch`: the inner one's `case` lines become the outer's cases — repros: f115, f224
  — root cause: wasic ~19786: the case parser ignores depth
- ~~sw151~~ — defect: ✅ FIXED 2026-10-26: only a quoted case is laid out as data; any other is a
  string expression (`emitStringPtrLen`). Test `48_SwitchOrderNestingAndCaseValues`. Was: `case
  RED:` with `RED` a const string compares the TEXT "RED" — repros: f102 — root cause: wasic ~19884:
  quotes stripped by regex
- ~~sw152~~ — defect: ✅ FIXED 2026-10-26: a non-identifier switch expression takes `inferExprType`'s
  type (f64 compares as f64). Test `48_SwitchOrderNestingAndCaseValues`. Was: `switch` on a float
  EXPRESSION truncates it (1.2 matches `case 1`) — repros: f122, f123 — root cause: wasic ~19813:
  the type comes from a bare identifier only
- sw153 — defect: string search with a position (`startsWith("a", 3)`, `includes`, `endsWith`), a
  template needle, `indexOf(x, from)` on an f64 array, `"abc".indexOf("", 10)`: wrong results in
  console (`1 1 1`) — repros: f23, f34, f62, f71, f72, f230 — root cause: the argument list reaches
  `emitStringPtrLen` as one expression; the console resolvers (~17943, ~18458) accept the `""` /
  stub sentinel
- sw154 — defect: an escaped `\${` in a template is substituted — repros: f45, f65 — root cause:
  wasic `splitTemplateLiteral` ~10053
- sw155 — defect: a `readonly f64[]` / `Array<f64>` / `ReadonlyArray<f64>` parameter reads its
  elements as i32 (`3.5` → `1072693248`) — repros: f146, f161, f162 — root cause: wasic ~3734:
  `arrElemMatch` takes only `\w+[]`
- sw156 — defect: a `type Flag = boolean` value prints `1` — repros: f171 — root cause: not traced
- sw157 — defect: a struct / instance in a template or concat prints its ADDRESS (`[object Object]`
  → `260`); a user `toString()` there prints the address too — repros: k12, f190, f191, f192, f195,
  f252 — root cause: wasic ~9645 / ~9808: typed i32
- sw158 — defect: a string-enum value in a concat prints its tag (`d=UP` → `d=0`) — repros: f200,
  f251 — root cause: wasic ~9808
- sw159 — defect: `join` / template of a `boolean[]`, a `bigint[]`, a 2-D array: `1\|0`, `1,0`, row
  addresses — repros: k13, f197 — root cause: console_log `cbufJoinHelper` ~5471 sends every non-f64
  / non-string element to `$__cbuf_join_i32`
- ~~sw160~~ — defect: ✅ FIXED 2026-10-26 as a REFUSAL (rule 4 at compile time): `integer literal N
  does not fit i32` (`i32LiteralRangeDiagnostic`), in wasic (`i32Literal`, decimal and hex) and
  console_log (its own literal path); an operand of `\| & ^ << >> >>>` (`emitToInt32`,
  `toInt32Depth`) and an integer typed-array element store wrap, as JavaScript does;
  `7d_ConsoleArrays`'s `u32[0] = 4000000000` now spelled as its wrapped constant (same bits). Tests:
  typed_decl (3 refusals, 1 accepted set). BREAKING for a program that relied on the wrap. Was: an
  i32 literal outside i32 (`3000000000`, an argument `2147483648`, `0xFFFFFFFF` declared i32) WRAPS:
  owner rule 4 says a store that does not fit throws (the `x & 0xFFFFFFFF` mask idiom must keep
  wrapping) — repros: f235, f236, f245 — root cause: wasic ~11829, ~11843: no range check
- sw161 — defect: console `p.s + 1` (a struct / class string field) adds to the POINTER (`pq1` →
  `277`) — repros: k01 — root cause: console_log ~879 `isConcatString`, ~825 `looksLikeString`
- sw162 — defect: `const v: f64 = a + hf(1)` (i32 left, float call / paren / product right) adds as
  i32 (`7.5` → `7`) — repros: k02 — root cause: wasic ~14261 `rhsKnownFloat`
- sw163 — defect: in a function, `String(a + x)` / `` `${a + x}` `` truncates (`9.5` → `9`) —
  repros: k03 — root cause: wasic ~10731: `inferExprType` by the left i32 local
- sw164 — defect: console `s.charCodeAt(0) + x` / `indexOf` / a method result plus a float truncates
  — repros: k04 — root cause: wasic ~17761 `dotCallLookupFn` emits at i32
- sw165 — defect: console `ss[1].length + 1` concatenates (`3` → `21`) — repros: k05 — root cause:
  console_log ~833 `looksLikeString` takes `ss[` as a string
- sw166 — defect: console `e \|\| s` / `s && e` of strings prints `1` — repros: k06 — root cause:
  wasic ~14529, ~1270: no string case
- sw167 — defect: `b >>> 0` prints SIGNED in console / template / String (`4294967293` → `-3`) —
  repros: k07 — root cause: console_log ~2357; wasic ~14343 converts unsigned only in f64 context
- sw168 — defect: console format specifiers (`%d %s %i %f %o %%`) are not substituted — repros: k09
  — root cause: console_log ~3978 `parseConsoleLogArgs`
- sw169 — defect: `console.log` of an array LITERAL, an element struct (`ps[1]`), a nested field
  struct, or an array-valued call (`xs.slice(1)`) prints an address — repros: k10, k11, k14 — root
  cause: wasic ~7233 `inspectConsoleArg`, ~7167 `inspectTarget` (names and calls only)

**Silent-wrong, tools** (all exit 0):

(Table as a list — id · defect · repro · root cause:)

- sw170 — defect: WIT keywords (`list`, `type`, `from`, …) written unescaped in export / param /
  package names (an invalid `.wit`); bindgen's name regex then drops a `%`-escaped name: fix the
  three together — repro: t01, t02, t09 — root cause: witgen.ts:33; wasic `generateWit` ~25422;
  bindgen.ts:146
- sw171 — defect: `run lib.wasm addd 1 2` (a typo) prints nothing, exit 0 — repro: t03 — root cause:
  utils.ts:313 falls through to `_initialize` / `_start`
- sw172 — defect: `mod` never checks the argument COUNT (`add 5` → 5) — repro: t04 — root cause:
  utils.ts ~490
- sw173 — defect: `mod` takes `1.5` / `Infinity` / `4294967297` for an i32 parameter (ToInt32) —
  repro: t05 — root cause: utils.ts ~509: only i64 is checked
- ~~sw174~~ — defect: ✅ FIXED 2026-10-26: `assertNotInput(path, wasmOut, "dync")` first. Test
  `outpath_tests` (2 rows). Was: `dync prog.ts -o prog.ts` writes the module OVER its source —
  repro: t06 — root cause: dync.ts:47, :80: no `assertNotInput` (sw113's list missed dync)
- sw175 — defect: an unknown flag (`--on-conflit=prefix`, `--outdir`, `--lang=pyhton`) is ignored
  (loud by ld90's precedent) — repro: t07 — root cause: main.ts:93: no unknown-flag check; `lang`
  missing from `FLAG_CHOICES`
- sw176 — defect: bindgen maps `u32` / `u64` to signed (`4294967295` → `-1`) — repro: t08 — root
  cause: bindgen.ts:67
- sw177 — defect: bindgen passes an imported `string` parameter to the host as a number — repro: t10
  — root cause: bindgen.ts:315: import marshalling handles bool only
- sw178 — defect: ✅ FIXED for `wasmbundle` 2026-10-26 (binaryang's `bundle()` keeps start functions,
  H11); STILL OPEN for the wasic merge (`import … from "x.wasm"`), which keeps wasmmerge. Test
  `merge_layout_tests`. Was: `wasmbundle` drops a module's `(start)` function — repro: t12 — root
  cause: wasmmerge.ts:1109 (the wasic merge path shares it)
- ~~sw179~~ — defect: ✅ FIXED 2026-10-26 by the switch (every export kind kept). Test
  `merge_layout_tests`. Was: `wasmbundle` drops non-function exports (a global) without a notice —
  repro: t13 — root cause: wasmmerge.ts:205, :976
- sw180 — defect: ✅ FIXED for `wasmbundle` 2026-10-26 (only the linker's address globals move);
  STILL OPEN for the wasic merge. Test `merge_layout_tests`. Was: `wasmbundle` sets EVERY `(mut
  i32)` global of a non-wasic module to 131072 (a counter starts at 131072) — repro: t14 — root
  cause: wasmmerge.ts:1087
- ~~sw181~~ — defect: ✅ FIXED 2026-10-26 (`samePath` check before anything is read). Test
  `merge_layout_tests`. Was: `wasmbundle a.wasm b.wasm -o a.wasm` overwrites its input — repro: t15
  — root cause: wasmbundle.ts: no same-file check (sw113's list missed it)
- sw193 — defect: found 2026-10-26 fixing sw160: a `Uint32Array` element reads back SIGNED
  (`4000000000` → `-294967296`) in a declaration and in `console.log`; the store is right — repro:
  (typed_decl note) — root cause: the typed-array load is `i32.load` read as signed; no unsigned
  view
- sw182 — defect: `modc main.zig` exports only the root file's `export fn`s — repro: t16 — root
  cause: zigwasic.ts:96 scans the root only; `--export=` instead of `-rdynamic`
- sw183 — defect: `run x.zig -o rel/x.wasm` reports and runs a STALE module (sw117, fixed for Go
  only) — repro: t17 — root cause: zigwasic.ts:144, :166
- sw184 — defect: `wast`: an sNaN result checked against `nan:arithmetic` passes (wasmtime fails it)
  — repro: t30 — root cause: wast.ts:611: only `nan:0x…` uses the trampoline
- sw185 — defect: `wast` of a USER file named like a corpus file skips its unbuilt module as "known"
  (✅, exit 0) — repro: t31 — root cause: wast.ts:1932: `KNOWN_UNBUILT` by basename
- sw186 — defect: `tsbundle` renames an import's OBJECT KEY / interface field, not its uses
  (`undefined`) — repro: t40 — root cause: tsbundler.ts:204 `applyRenames`
- sw187 — defect: `tsbundle` drops an unresolvable import (`./util.js`, a typo) — repro: t41 — root
  cause: tsbundler.ts:345, :360, :581
- sw188 — defect: `jstyper` drops a function whose body has a comment with an apostrophe — repro:
  t43 — root cause: jstyper.ts:59
- sw189 — defect: `jstyper` drops arrow / `function*` / function-expression exports without a
  warning — repro: t44 — root cause: jstyper.ts:97, :111
- sw190 — defect: `jstyper` discards a parameter's default (`add(5)` → 5, not 15) — repro: t45 —
  root cause: jstyper.ts:248
- sw191 — defect: `hybrid --auto` on a function without a return annotation returns `undefined` —
  repro: t46 — root cause: hybrid.ts:100 (and wasic's void result)
- sw192 — defect: `hybrid`: an `@wasm` function's default parameter is lost — repro: t47 — root
  cause: hybrid.ts:388

**Loud** (invalid modules, traps where JavaScript has a value, refusals of ordinary TypeScript, misleading messages):

- **Found measuring plain numbers, 2026-10-26 (number-model-and-runtime-plan.md):** wasic
  REPORTS SUCCESS for an INVALID module (it never validates its output): 27 corpus programs
  rewritten to plain `number` compiled "✅" and failed only when a runtime compiled the module
  (i32 / f64 mismatches). Not seen on the typed corpus, so filed with the plan (work item 2:
  validate before reporting success) rather than as a typed-corpus row. Also: a struct field
  typed `number` is i32 while an array of `number` is f64 (`[95, 88, 72]` read as denormals).
- **Found fixing, 2026-10-26 (loud):** the console path has NO hex literal (`console.log(x ^ 0xFF)`:
  "cannot emit the expression"); a field of a chained call result in console.log (`new V(7).add(new
  V(8)).x`); a declaration `const v: V = new V(7).add(…)` is matched as a plain `new` declaration
  and its arguments mis-cut ("Unsupported expression: 7).add(new V(8").
- **ld115 console** (`round3/console/`): k15 `console.log(["a","b"])` invalid module; k16
  `indexOf(4) + x` into f64; k17 `s.length * 0.5` in a function; k18 `!s` / `!x` (f64); k20 `c.k +
  c.half()`; k21 `c.tag() + a`; k22 `p.s < s`; k23 `` `${-a}` `` in a function; k24 `Boolean(a)`.
- **ld116 codegen** (`round3/codegen/`): c93 i32 `% 0` traps (NaN in JavaScript); invalid modules
  c61, c62, c83, c108, c88, c136; refusals c10, c37, c13, c19, c26, c27, c36, c42, c44, c46, c47,
  c48, c53, c55, c66, c67, c72, c75, c96, c98, c101, c124, c133.
- **ld117 fall-throughs** (`round3/fallthrough/`, every COMPILE-FAIL / RUN-FAIL file): invalid
  modules f12, f50, f85, f98, f121, f124, f140, f175, f203; misleading messages f249, f163, f164,
  f172, f104, f166, f170, f173, f134; gaps (numeric literal forms, built-in method arities,
  `#private`, static `this`, IIFE, `for…in`, comma operator, `void`, braced `case` bodies, switch on
  strings from fields / calls, …) in the remaining files.
- **ld118 tools** (`round3/tools/`): t11 bindgen binds a commented-out `.wit` export; t18 `mod` /
  `run` print `[object WebAssembly.Exception]` for a wasic throw; t19 `mod missing.wasm` prints "✅
  Module loaded" first; t32 `wast` false fail on `get` of a NaN global; t42 `export default`; t48
  `hybrid -o` runner imports.
- **Dead** (t20): `rt.env.set`, `rt.stderr.write` have no caller; round 2's dead / stale items are all still present (listed in t20's README).

Noted, not rows: `const v: i32 = -z` printing `0` follows the declared type; boolean arithmetic is
not TypeScript; UTF-8 byte `.length` is documented; `wast` reports ✅ for an empty file (a policy
question).

