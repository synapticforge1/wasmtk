# design-decisions — part 3 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Numeric / codegen correctness (continued)
- console.log evaluates its arguments BEFORE it builds the line (sw68, 2
- console.log's object writer prints EXACTLY what Deno prints, or refuse
- The compile-error report (owner decision D6, built 2026-10-13)

## Numeric / codegen correctness (continued, 2)

- **Every variable declaration states its type (owner ruling, 2026-09-28). BREAKING.** "We should
  require the types in all variable declarations. When for loops syntax is involved the integer
  state is observed standardly, and an error thrown if anything other than an integer is found."
  It replaced a first idea (an untyped number defaults to f64), which was put on hold and never
  implemented. The problem both address: wasic GUESSED a type for `let a = 100000` (i32), so `a * a`
  wrapped (`sw29`). Now there is no guess to get wrong.
  - **Scope (owner-confirmed):** the FIRST definition of a `let`/`const`/`var` needs the type. A
    later assignment does not (it has the first definition's). A shadowing `let` in another block
    is a new first definition. A destructuring pattern is typed on the pattern:
    `const [a, b]: [i32, i32] = t`, `const { x, y }: Vec2 = v`.
  - **Exempt, because TypeScript forbids annotating them:** `for…of` / `for…in` bindings and
    `catch` bindings. **Exempt because the type is already written (owner-confirmed 2026-09-28):**
    a function value whose parameters AND return type are all annotated
    (`const add = (a: i32, b: i32): i32 => …`); a missing parameter or return type is still an
    error.
  - **A counting-`for` counter** (`for (let i = 0; …)`) may be untyped: it is an INTEGER by
    standard, and a fractional start, a `/=` or `**=` update, or a non-integer assignment in the
    header or body is an error. A counter the user types (`let i: number = 0.5`) is theirs. The check
    is on all THREE parallel `for` emitters (multi-line, one-line braced, brace-less).
  - **Where:** `checkDeclarationTypes` / `checkForCounter` in `src/wasic.ts`, run on the source as
    written (strings and comments masked) before any rewrite. Line numbers are looked up in the
    source as given (`sourceAsGiven`), because `stripComments` drops block comments with their
    newlines.
  - **After the presence check, some annotations are DROPPED on purpose** (`stripPatternTypes`,
    `stripInferableAnnotations`): pattern types, and pointer-shaped types the declaration handlers
    cannot read when the initialiser is a call / `await` / name / member access: `Promise<…>`,
    `PromiseSettledResult<…>`, an object type literal, a tuple, an alias to a union or tuple (each
    optionally `| null`). Those declarations then compile through the inferred path exactly as
    before the rule (golden-WAT byte-identical). **A 2D array `T[][]` was on this list until
    2026-10-15 and is not now:** its annotated handler aliases a name's or a call's pointer and
    registers the result as 2D, which the inferred path never did (ld11, ld12, sw31). Scalars, 1D arrays,
    classes and interfaces keep their annotation: it carries meaning there (i32 vs f64, an upcast
    `const s: Shape = c`). Retiring the drop list means teaching the typed handlers those shapes;
    that belongs with the H12 front-end work, not here.
  - **One detector, two users:** `src/decltypes.ts` (`findUntypedDeclarations`, pure). wasic refuses
    what it finds. `hybrid --auto` keeps a signature-routable function whose BODY has an untyped
    declaration in the TS host, with a warning naming it, instead of failing the whole core compile
    (the function ran natively before and still does). An explicit `// @wasm` is still routed, and
    wasic names the declaration.
  - Gate: `tests/typed_decl_tests.ts` asserts the REASON for each refusal (message and line), and
    compiles AND runs the accepted forms; `hybrid_tests.ts` covers the `--auto` routing.
- **`Math.round` = `floor(x + 0.5)`**, NOT `f64.nearest` (which is banker's rounding and gives
  `round(2.5)=2`). Both `wasic.ts` (F64_UNARY special case) and `console_log.ts` must agree.
- **mathlib is being converted to CORRECTLY-ROUNDED double-double, function by function**
  (`src/wasm/mathlib.wat`, 2026-07-01, "full CR sweep"). DONE + committed: `sin`/`cos`/`tan`, `exp`,
  `log`/`log2`/`log10`, `cbrt`. Each returns the IEEE-754 correctly-rounded result, validated
  **bit-for-bit vs a BigInt fixed-point oracle through the full pipeline** (wat2wasm + merge +
  Binaryen `-Oz`). Shared helpers (reused by every CR function): dd ops
  `$__ts`/`$__tp`/`$__dda`/`$__ddm`/`$__ddmd`/`$__ddri`/`$__dddiv` (multi-value `(hi,lo)`);
  `$__scalbn` (musl-style, subnormal/overflow-safe); `$__cr(hi,lo,k)` = correctly-round
  `(hi+lo)·2^k` (normal via `scalbn(hi+lo,k)`; subnormal via
  round-`(hi+lo)·2^(k+1074)`-to-even-integer then `·2^-1074` — this avoids the tail double-rounding
  where `scalbn(lo,k)` lands on exactly half-ulp). `exp`: dd Cody-Waite (dd ln2) + dd Taylor +
  `$__cr`. `log`: internal `$__logdd` (mantissa/exp decomposition + dd atanh series); `log2`/`log10`
  = `round(logdd · (1/ln2|1/ln10) dd)`. REMAINING (still old ~1e-11 approx, not yet CR): `expm1`,
  `log1p`, `pow`(`**`), `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`,
  `atanh`. NOTE: CR results differ from Deno's V8 `Math.*` on the small % where V8 isn't
  correctly-rounded (intended). Regen after editing: `wasmtk convert src/wasm/mathlib.wat` then `bun
  scripts/gen_mathlib_bytes.ts`. Full historical trig detail:
- **mathlib `sin`/`cos`/`tan` are CORRECTLY-ROUNDED double-double** (`src/wasm/mathlib.wat`, 2026-07-01).
  They return the IEEE-754 correctly-rounded result — the unique, platform/version/language-independent
  value every correct libm agrees on (max accuracy AND max cross-language compatibility for the polyglot
  loader ecosystem). **Rationale over "match V8 bit-for-bit":** modern V8's `Math.sin/cos` delegate to
  LLVM-libc's `shared::sin/cos`, which are only *faithfully*-rounded (≤1 ULP, ~99.76% correctly-rounded)
  and a moving version-pinned target; every faithful libm (glibc/MSVC/Go/Rust/V8) disagrees with the
  others by ~1 ULP, but they all cluster on the correctly-rounded value, so correct rounding is the
  maximally-compatible choice. **Implementation:** double-double (dd) helpers `$__ts` (twoSum),
  `$__tp` (Veltkamp twoProduct — no FMA needed), `$__dda`/`$__ddm`/`$__ddmd`/`$__ddri`/`$__dddiv`, each
  returning `(hi, lo)` via WASM multi-value; dd Taylor kernels `$__ddsin`/`$__ddcos` (11 terms); the
  table-free Veltkamp n-split reduction `$__trig_reduce` producing a dd remainder `r` in globals
  `$__tr`/`$__trt` (survive the merge; coexist with the RNG global). `tan = dd sin(r)/cos(r)` via
  `$__dddiv` with quadrant sign. **Validated bit-for-bit vs a BigInt fixed-point correctly-rounded
  oracle** — through the FULL pipeline (wat2wasm + merge + Binaryen `-Oz`, which preserves the dd
  arithmetic): sin/cos 1032/1032 + tan 412/412, 0 off, `|x|` to 1e12; CR holds to ~1e15, ≤1 ULP beyond.
  **2026-10-09 (L3, sw61 / ld28): from |x| ≥ 2²⁸ the reduction is Payne–Hanek**
  (`$__trig_reduce_ph`, GENERATED by `scripts/math/gen_payne_hanek.ts` between BEGIN / END markers;
  never edit that region by hand): 2/π is computed exactly in BigInt (Machin) and emitted as
  `$__twoopi(j)`, an if-chain of `i64.const`s, so there is STILL no table and no linear memory; the
  53-bit mantissa times a 288-bit window of 2/π in 32-bit limbs; the fraction is centred IN THE
  INTEGERS (complemented when its top bit is set: a dd `f − 1` loses the bits when f ≈ 1), then
  times π/2 in dd. Past ~1e15 Cody–Waite gave garbage (`sin(1e18)` = 5.98e27) and past 2⁶³ trapped.
  Validated: 18,699 sin / cos / tan calls over every binade, 0 off the oracle, including Muller's
  hardest argument 6381956970095103·2⁷⁹⁷. The oracle's own reduction had to be made exact first
  (its 100-digit π is ~330 bits: wrong past 2⁶⁰).
  Pure f64 arithmetic (no Payne-Hanek table, no linear memory) so it survives the wasmmerge splice.
  Do NOT let an optimizer reassociate the dd ops (Binaryen doesn't by default; never enable `--fast-math`).
  Regression: `67_TrigCorrectlyRounded`. Supersedes the earlier fdlibm/≤1-ULP and degree-13-minimax
  versions. After editing `mathlib.wat`: `wasmtk convert src/wasm/mathlib.wat` then
  `bun scripts/gen_mathlib_bytes.ts`. NOTE: a wasic program's trig now
  differs from Deno's `Math.*` (V8) on the ~0.24% where V8 isn't correctly-rounded — this is intended
  (wasic is more correct); tests byte-comparing raw trig must use CR==V8 args or tolerances.
- **"CR, in both" (owner decision, 2026-10-09, wasMath L3).** The question: when wasMath promises
  "the same value in TypeScript and in wasm", whose `sin` is the value? Measured first: on every
  sw60 input the mathlib was correctly rounded and V8 1 ulp off. Chosen: compiled `Math` STAYS
  correctly rounded (the July choice above), and wasMath's f64 `sin` … `pow`, `cbrt` run the SAME
  mathlib in Deno (`src/wasmath.ts` instantiates `MATHLIB_BYTES` on first use; f32's are
  `fround(f64.op(fround(a)))` over them). So wasMath agrees to the bit in both; plain `Math.*` in
  Deno is V8's and may differ by 1 ulp, which the README states next to the wasMath advice.
  Rejected: porting V8's fdlibm for bit-exactness to V8 (a moving, version-pinned target, and less
  accurate). Consequence for tests: a corpus program comparing Deno and wasm uses `f64.*` for
  transcendental values, or plain `Math` only on inputs where CR == V8.
- **`$__f64_to_str` is pure Dragon4 (Burger-Dybvig free-format)** as of 2026-07-01 — hand-written
  WAT bignums (48 u32 limbs) over a lazily-`$__malloc`'d scratch region held in the `$__d4s` module
  global, then ECMAScript `Number.prototype.toString` formatting (fixed vs scientific both
  directions; sign/zero/±Inf/NaN). **100% byte-exact with V8**, incl. subnormals, max double, and
  large magnitudes the OLD formatter (×1e15 + shortening loop) either mis-rounded at ~15 sig-figs
  or TRAPPED on (`i64.trunc_f64_s` overflow) with no scientific notation. Do NOT revert to ×1e15.
  `pointPos == k` (the Dragon4 decimal exponent), which drives the fixed/scientific branch. Bignum
  helpers `$__bz/$__bset64/$__bmul_u32/$__bshl/$__bcmp/$__badd/$__bsub` must stay ≥48 limbs (covers
  the full f64 range with margin). Regression: `66_Dragon4Formatting`.
- **Type-erasure casts** `expr as unknown as T` / `expr as unknown` are stripped up front in
  `emitExpr` (before the ` as ` handler) so the inner operand keeps its real type. Without it,
  `buf as unknown as i32` cast the i32 ptr i32→f64 (mapType("unknown")→f64) → `return[0] expected
  i32, got f64`. Guard is `\b`-bounded so `canvas`/`has` aren't touched.
- **`findBinaryOp`** scans the FULL string for paren/bracket depth and only matches at valid op
  positions (`i <= maxStart`). Reverting to start-at-`maxStart` re-hides operators whose RHS ends
  in `)`. Counts `()` and `[]`.
- **`findTopLevelOp` (`console_log.ts`) has the SAME rule (fixed 2026-06-12).** It must scan the FULL
  string from the end (counting trailing `)`/`]`) and only test for an op match at `i <= maxStart`.
  It previously started at `length - op.length`, skipping the trailing chars, so any console.log
  comparison/expression whose RHS ends in `)` (a call, `.slice(…)`, etc.) drove depth negative, the
  operator was never found, and the whole expr silently fell through to the numeric/terminal path
  (wrong boolean / 0). Mirror of the `findBinaryOp` fix — do not revert either.
- **Value-fallthru rewrite** (`emitFunction` → `fixTerminalFallthru`): a value-returning function
  whose body ends in a STATEMENT-level (void) `if/else` where every path `return`s leaves an empty
  stack at the implicit function end — wabt/binaryen accept it, **V8 strict-validation rejects it**
  (`expected 1 elements on the stack for fallthru, found 0`). The terminal void `if` is rewritten
  into a value-producing `(if (result T) cond (then … X) (else … Y))` by turning each branch's
  trailing `(return X)` into a bare value `X` (recursing through nested all-returning ifs), via the
  module-level `tokenizeWat`/`parseWatNodes`/`serializeWat`/`watNodeToValue`/`watBranchToValue`
  helpers. Do NOT instead append `(unreachable)` — Binaryen `-Oz` strips it as dead code and
  re-emits the invalid void `if`. The rewrite is conservative (only when every leaf is a `return`
  or nested all-returning `if`; else body unchanged). Fixed `5e_MixedSignatures`, `19_NestedDU`,
  `19_VariantMax`. (The single-*physical-line* brace form `if (c) { return 1; } else { return -1; }`
  was a separate bug, now **fixed 2026-06-03** — see the single-line-body decision below.)
- **Single-physical-line function bodies are split into statements up front** (`parseFunctions`):
  when the whole body is one physical line (`rawLines.length === 1`), it is split via the
  **string-aware** `splitStmts` before per-line processing. Do not remove this — without it, a
  single-line body with multiple statements, or a trailing statement after a brace `if`
  (`if (c) { return 1; } return 2;`), is mangled (dropped trailing statement → V8 fallthru error; or
  jammed into one statement). `splitStmts` must stay string-aware (skip `"`/`'`/`` ` `` literals with
  `\` escapes) so a `;`/`{`/`}` inside a string is never a false statement boundary; and
  `expandInlineBraceChain` must re-emit trailing statements after the brace chain as siblings rather
  than dropping them. Multi-line bodies (single statement per line) are unaffected. Regression:
  `tests/wasi/wasm_wasi/48_SingleLineBraceIf.ts` (`// deno-fmt-ignore-file` keeps the single-line forms).
- **Greedy single-call handlers** (`charCodeAt`/`startsWith`/`endsWith`/`split`/`.slice` family, plus
  `indexOf`/`includes`/`at`/`charAt`/`replace`/`padStart`/`repeat`/`fromCharCode`/string-char-subscript/
  `isNaN` — extended 2026-06-08) must guard their greedy `(.+)` arg with `parenDepthNeverNegative(arg)`
  so a following binary operator isn't swallowed. Reserve `[^)]+` only when nesting is provably
  impossible. `console_log.ts` has its own `parenDepthNeverNegative` (mirrors wasic's) for the
  console.log-arg `at`/`isNaN` handlers.
- **Struct/class field-base sentinel: use `.ptr < 0`, not `=== -1`.** Both `structVars` (`sv`) and
  `classVars` (`cv`) field/method base computations choose `(local.get $var)` for ptr `< 0` and
  `(i32.const ptr)` for ptr `≥ 0`. `-1` = param/runtime-local, `-3` = heap-malloc'd struct literal
  (runtime fields); both must read via `local.get`. Since 2026-10-26 (sw141) every class variable
  declared with `new` is `-1`, a pointer local, so `cv` holds `-1` in practice; the `< 0` form keeps
  the two paths consistent. The array sentinel `-2` is never a struct/class `ptr`.
- 🔒 **Every `new C(…)` makes a FRESH instance on the heap (sw141, sw142, round 3, 2026-10-26).**
  `new` as a value is `(call $__new_<C> args…)`: a per-class wrapper (`emitClassNewWrappers`) that
  `$__malloc`s the instance size, ZEROES every byte (a free-list block is dirty), stores the class
  tag when the module has an inheritance header, calls `<C>_constructor`, and returns the pointer.
  Its parameters are the constructor's, so `new A(new B())` nests with no temp. A declaration
  `const c: C = new C(…)` registers `c` as a pointer local (`ptr: -1`) in BOTH pre-scans (function
  and top level) and the statement is `(local.set $c (call $__new_<C> …))`. Was: each site was ONE
  static block laid out at compile time, so objects made in a loop, a factory, or a method returning
  `new` were the same object, and a reassigned class variable kept reading its first object
  (fields were read at `(i32.const ptr)`). Do not reintroduce a static block for a `new`: only a
  literal STRUCT (no class) may be laid out statically, and only where it runs once. Test
  `9_NewMakesAFreshObject` (fails on the old compiler).
- **Brace-less single-line control flow** (`if`/`while`/`for…of`/`for(;;)` with `stmt;` and no braces)
  is handled in `emitBlock` by capturing the inline tail and `splitStmts`-ing it as the body. The
  `for…of` form was a gap (fixed 2026-06-08). NOTE: `emitBlock`'s `while (i < lines.length)` loop
  advances `i` MANUALLY — every handler that `continue`s a single consumed line MUST `i++` first, or
  it infinite-loops (heap-OOM during compile). The braced multi-line forms use `i += consumed + 1`.
- **String-literal regexes are escape-aware** `"((?:[^"\\]|\\.)*)"` at the statement/expression
  sites (`emitStringPtrLen`, `emitStringAssign`, module-const detection). `allocString` →
  `unescapeString` decodes. (The `console_log.ts` console.log-arg path is still un-escaped.)
- **`&&`/`||` SHORT-CIRCUIT** (since 2026-06-02). `emitExpr`'s binary-op loop (`src/wasic.ts`
  ~6135, mirrored in `console_log.ts` `exprToWat` ~1298) intercepts `&&`/`||` BEFORE the bitwise
  `["&&","and",…]`/`["||","or",…]` table mapping and emits `(if (result i32) lhs (then rhs)
  (else (i32.const 0)))` for `&&` / `(if (result i32) lhs (then (i32.const 1)) (else rhs))` for
  `||`, promoting the i32 0/1 result to the context type via `f64.convert_i32_s`/`i64.extend_i32_s`
  when wider. The RHS is skipped once the LHS decides — matching JS, and the reason an OOB-prone
  `charCodeAt`/array read guarded by `i < len &&` on its LHS is now SAFE (it no longer evaluates
  when out of bounds, which previously trapped after the wasmmerge splice — see compiler-bugs.md).
  Do NOT revert to `i32.and`/`i32.or` emission. The table entries stay (they drive operator
  *detection*); only emission changed. `switch` on `f64`/`number` must use `f64.eq`/`f64.const`.


## console.log evaluates its arguments BEFORE it builds the line (sw68, 2026-10-13)

The line is built in shared state: the cursor at `iovBase + 4`, `$__cbuf`, the fixed scratch,
the iov area. A nested console.log reached through an argument writes the same state. So when
any argument calls a user function or makes an indirect call, `hoistCallingArgs` evaluates every
expression argument, left to right, into a `$__clt_<type>_<n>` temporary first (a string-returning
call runs, then its `$__str_ret_*` pair is captured), and the line is built from temporaries.
Variables are not captured: a callee cannot change this function's locals. The rule is
deliberately "any user call", not "a call that prints": helpers share the scratch area too, and
`-Oz` folds the temporaries. Every function emitter must declare the temporaries it finds
(`consoleTempLocals`; `_start` does the same); a new emitter that skips it gets an invalid module.

## console.log's object writer prints EXACTLY what Deno prints, or refuses (ld45, 2026-10-24)

A whole struct, class instance or struct array as a console.log argument goes through
`inspectConsoleArg` (registered as console_log's `setObjectInspectResolver`, consulted only for a
WHOLE argument, never inside a template or a concatenation). Two halves:
- **Layout, `src/inspect_wat.ts`**: Node's `reduceToSingleString` and `groupArrayElements`, ported
  rule for rule (one line when no entry holds a newline, `currentDepth − depth < 3`, and
  `2n + indent + brace + 10 + Σwidth ≤ 80`; columns past 6 entries; 100 entries then `... N more
  items`; depth 4 then `[Object]` / `[Name]` / `[Array]`; a long string with newlines split
  `+`-joined). Node's `ctx.currentDepth` is the global `$__insp_cur`: set by a writer that FORMATS
  (non-empty, not abbreviated) before its entries, read after them. A value's indent is its
  parent's + 2 (`formatProperty`'s `indentationLvl += 2`).
- **Per-type writers, wasic `inspWriterFor`**: `(p, ind, lvl) -> (ptr, len)`, a fresh heap string,
  generated once per type; a class with subclasses dispatches on its tag to each class's own writer.
  Fields are read by their declared TS type, `StructField.tsType` (an i32 may be a number, a struct
  pointer or an enum).
- **The refusal list is load-bearing** (`inspectRefusal`): every case where the bytes cannot tell
  what Deno would print is a compile error naming the reason: a nullable field (0 is also a value),
  a function field, a tuple, a string enum, a discriminated union, a type inside itself, a class
  field its code never assigns (Deno: `undefined`), an interface whose object literals write the
  keys in another order (Deno prints the literal's order; `objectLiteralKeyOrders` scans the
  source), an array literal mixing objects and other values. Widening the writer means removing a
  refusal only once that case prints exactly.

## The compile-error report (owner decision D6, built 2026-10-13)

"We should show compile time notes when issues that stop the compile are thrown." When `wasic` or
`modc` refuses a program, `abortWithReport` (`src/wasic.ts`) prints `formatReport`
(`src/diagnostics.ts`) to stderr and returns `error` = `N error(s) in <file>; no .wasm was
written.`, which the CLI prints as its `❌` line. Invariants:
- **The compiler's diagnostics stay strings.** The report READS them: the code from the wording
  (`classify`), the location by finding the code the message QUOTES (`'…'`, or what follows
  "Unsupported …: ") in the user's ORIGINAL files (the bundler's `files`, entry first, read from
  disk), the notes from the message's own lines. So a new diagnostic should quote the user's code
  exactly as written, and may add `TypeScript: …` / `wasm: …` / `help: …` lines after its first
  line; a one-line message `… '<quote>'. <explanation>` gets its explanation as `help:`.
- **Locations come from the files as written, never from the bundled source**: the bundler drops
  and renames (a wasMath import vanished, and every line after it was reported one too early).
  `__wm_<ns>_<member>` is mapped back to `ns.member` before searching. A quote that cannot be
  found leaves the error unlocated (printed last, never dropped). Repeated quotes take successive
  occurrences; errors are printed in source order.
- **Codes** (README table): `int-division`, `float-to-int`, `untyped-declaration`,
  `loop-counter`, `bigint-in-math`, `bigint-unsigned-shift`, `undefined-name`,
  `console-argument`, `unsupported`. Only the last two (and an undefined name) are the static
  subset's limits, so only they get the `wasmtk dync` hint (`isSourceError`).
- Pure module: `src/diagnostics.ts` uses no runtime API (seam rule); the caller reads files.

