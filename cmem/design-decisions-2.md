# design-decisions — part 2 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Nullable FIELDS carry a flag word, like nullable locals (owner, 2026-1
- Scanners / parsing correctness
- Numeric / codegen correctness

## Nullable FIELDS carry a flag word, like nullable locals (owner, 2026-10-09, sw51 option A)

**Ruling.** One model of null for every nullable value that is not a pointer: a flag beside the
value, 1 = null. A local has `$x__null`; a `number | null` / `boolean | null` element of a tuple,
or field of an interface or class, has a 4-byte flag word in the record. Considered and not taken:
a rarer sentinel (still inexact, and a second null model), a boxed value behind a pointer (a heap
allocation per value), refusing the type (left as the fallback), keeping "0 is null" (silent).

- **Layout.** `placeNullFlags` puts the flag words AFTER the last field (`StructField.nullFlagOffset`),
  so no user field moves and `fields[]` keeps only user fields (about 20 sites index it by position
  or detect tuples by `_N` names). `totalSize` includes them. A string / struct / array / embedded
  tuple field gets none: 0 is already its null. A nullable element changes a tuple's NAME
  (`__Tuple_i32N_f64`), or `[i32 | null, f64]` and `[i32, f64]` share one cached def. The class
  tag shift moves `nullFlagOffset` with `offset`.
- **One read path.** `nullFlagLoad` derives the flag's load from the field's own emitted value
  load, moved by `nullFlagOffset − offset`, so every access form (`x.f`, `this.f`, `arr[i].f`,
  `t[N]`, `a.b.f`) and every offset already folded in (class tag, embedded tuple) works without
  re-deriving addresses. `nullTestWat` is the one is-null test (nullable local / global, flagged
  field, literal); `??`, `=== null`, nullable `let` / assignment, `return` from a `T | null`
  function and the printers all use it.
- **Every write writes the flag.** A store into a flagged field (`emitStatement`'s intercept,
  which the desugared `+=` / `++` also pass through) writes 1 for null (value 0), the source's own
  flag for a nullable source, else 0. Every constructor writes every flag: `__malloc` reuses freed
  blocks WITHOUT zeroing them, so a constructor that writes only the given fields starts all flags
  at 1 (`nullFlagDefaults`; an omitted field is undefined). Static data is zero-filled, so
  `allocStructData` sets only the null ones.
- **Destructuring makes a nullable local.** A flagged element binds `$v` and `$v__null` (declared
  by `collectDestructureLocals`), and `v` is then an ordinary nullable local.
- **Printing.** A null value prints `null` everywhere it is converted to text (console arguments
  through `setNullPrintResolver`, templates, concat, `String(x)`). A null-valued `-0` is not
  distinguished: such a value prints `0` there, as `${x}` does.
- **Not covered (no corpus use):** a class-embedded tuple destructured with its own handler
  (`[a, b] = obj.f`), a discriminated-union variant field, `Record<K, V | null>`, nullable
  function PARAMETERS (no flag at all yet), `p.x ??= v`.

## Scanners / parsing correctness

- **Bracket/paren/operator scanners MUST skip string & template literals.** `findBinaryOp` and the
  `parseFunctions` multi-line array-literal body-joiner count `()`/`[]`/`{}` for depth; without masking
  literal content, a literal containing `]` `)` `}` `[` `(` `{` corrupts depth — e.g. `s + "]"` failed
  to find the top-level `+` (string concat → empty), and `let s = "["` looked like an unclosed array
  (the next statement got joined onto it). Use module-level `buildStringLiteralMask(s)` (marks every
  index inside a `"`/`'`/`` ` `` literal, escape-aware) and `netSquareBracketDepth(s)`. When adding or
  refactoring ANY depth/operator scanner over user expressions, mask literals first. (Known still-latent:
  the single-line-body `splitStmts` `;`-splitter has the same gap — fix if it ever surfaces.)
- **The test runner compares OUTPUT, not just exit codes (2026-06-07).** See testing.md. A codegen
  change can compile + run (exit 0) yet emit wrong output; the hardened `wasi_tests.ts` catches this.
  Do NOT add `// @allow-output-diff` to silence a real mismatch — it's only for genuine wasic-vs-native
  semantic divergences (float precision, zero-sentinel defaults).

## Numeric / codegen correctness

- **A literal's value is laid out at compile time ONLY when it is an exact literal of its slot's
  type; everything else is evaluated at run time (sw69, 2026-10-13).** `plainArrayLiteral(e, t)`
  is the one gate (decimal, hex / binary / octal, bigint with `n`, `true` / `false`), used by
  `allocArrayData`, `allocStructData`, `arrayElemWat` and `isStaticFieldValue`. Never write
  `parseFloat(raw) || 0` / `parseInt(raw, 10) || 0` on source text: it turns a name, an
  expression, `NaN`, `-0` or `0x10` into 0 with no error, which is how every array and struct
  literal layout was silently wrong. A value that must be static and is not plain is a
  diagnostic, never a 0. In an integer context a float literal is D3's refusal; `1e3` is 1000.
- **Operator grouping follows JavaScript's precedence table, in BOTH emitters (2026-10-06,
  sw10–sw17).** The ternary splits at the FIRST top-level `?` and its own `:` (right-assoc);
  unary `- ! ~` and `**` apply only when no binary operator is at top level; every
  same-precedence group (equality, relational, shift, additive, multiplicative) splits at its
  RIGHTMOST member (left-assoc); `**` at its leftmost (right-assoc). An operator table in
  precedence order is not enough on its own: table order inside a group is NOT precedence.
- **A code-shape decision never rests on a type FALLBACK (2026-10-06).** `inferExprType`
  defaults to f64 for what it does not know. sw15 widens an i32 op to f64 only for a KNOWN float
  (a float literal, a variable declared f64 / f32); sw16's truthiness test fires only when the
  EMITTED WAT truncated a float (`i32.trunc_f64_s`). Both first cuts trusted the inference and
  built invalid WAT; golden-WAT caught them before the gate.

- **A thrown value carries its KIND (owner-approved design change, 2026-10-06, sw44).** The
  exception payload stays `(ptr, len)` (`$__exn_tag`'s signature, which `utils.ts` reads for an
  uncaught throw, is unchanged). Beside it: `$__exn_kind` (0 = string / number / boolean, 1–7 =
  `EXN_KINDS`, Error … URIError) set before every `throw`; a catch copies it into
  `$<var>__kind` at once (a throw inside the catch body must not change it); `throw e` of a catch
  variable passes its own kind; a rejected promise stores it at +12 and the await re-throw
  restores it. Consumers: `String(e)` / `${e}` / `"x" + e` via `$__exn_str`, and
  `e instanceof <Error family>` as a run-time test (`instanceof Error` = any kind ≥ 1). A catch
  variable without a declared `__kind` local (`hasExnKind`) keeps the old behaviour, so a scope
  the pre-scans miss can never produce an invalid module. `e.message` is still the stored text
  for every kind (JavaScript would give `undefined` for a thrown string).

- **Wasm types in TypeScript: the user's declared type decides, not TypeScript's `number` (owner
  ruling, 2026-09-30).** "It isn't a compiler issue. It is a typescript issue. And is based on
  what the user can ultimately expect to see in typescript versus wasm." TypeScript has no `i32`,
  `u32` or `f32`: `type i32 = number` is erased, and Deno runs it as an f64. wasic honours the
  declared type, so a Deno run is NOT the reference for those types, and a difference there is
  not a compiler bug by itself.
  - **SUPERSEDED 2026-10-09 — `/` between integers is a COMPILE ERROR (owner decision).** "The
    division decision was meant to be solved by our wasMath.ts standard math libraries[:] throw an
    intentional error when being compiled to wasm. They remain unchanged if run in typescript."
    Scope chosen by the owner: EVERY integer `/` (i32 operands, after the existing operand
    typing), wherever it appears: `console.log(a / b)`, `const r: f64 = m / n` (was sw36),
    `Math.floor(a / b)` (was sw37), a return, `a /= b`, and `(a / b) | 0` too (it differs from
    wasm at `b = 0`: 0 in TypeScript, a trap in wasm). The diagnostic
    (`intDivisionDiagnostic`, `src/wasmath_lower.ts`) names `i32.div(a, b)` (truncated, throws
    where wasm traps) and `f64.div(a, b)` (the fraction). Raised in wasic's emitExpr (where the
    `div_s` suffix is chosen) and its `/=` path, and in console_log's exprToWat. NOT refused:
    f64 / f32 division, and bigint division (truncates in both; division by zero stops both).
    This replaces the D1 question of wasm-math-plan.md Phase 2 (which destinations count as
    explicit): no destination makes integer division mean anything; the program says it.
    Was (2026-09-30): `i32 / i32` is `i32.div_s`; an explicitly declared float destination makes
    it a float division; a `Math` argument is an f64 context.
  - **A `Math` result in an integer or f32 context is converted like any f64 there** (2026-10-06):
    `trunc_f64_s` into i32 / i64 (it traps out of range or on NaN), `demote` into f32. One
    convention for every site; changing it is decision D3 in wasm-math-plan.md.
  - **D3, BUILT 2026-10-13 (owner's scope, measured first): a float STORED into a declared
    integer is a compile error** naming wasMath's `f64.toI32` (truncate; stops on NaN / out of
    range) / `toI32Sat` (clamps) / `toI32Wrap` (wraps; `x | 0` is the same and stays allowed).
    Stores: a declaration, an assignment, an argument to an integer parameter (a user function
    or a wasMath `i32.*` / `i64.*` function), a `return` from an integer function, a field or
    element store. **Also refused: `x as i32` / `as i64` on a float, and on an `any`** (unbox
    with `as f64`, then convert): `as` names the type, not the conversion. **Kept (owner): a float
    used as an INDEX or POSITION** (`arr[i]`, `s[i]`, `s.indexOf(x, pos)`, `splice(i, 1)` with
    `i: number`), which JavaScript converts itself; 115 such conversions in 26 corpus programs.
    How: `checkImplicitTrunc` reads each statement's WAT after emission (`emitStatement` wraps
    `emitStatementCore`, subtracting nested statements' WAT, already checked) and refuses a
    `trunc_f32_s` / `trunc_f64_s` that is the stored VALUE of `local.set` / `local.tee` /
    `global.set` of a user variable, of a memory store, of a `return`, or a direct argument of a
    user or wasMath call; wasic's own `$__…` helpers (positions, counts) are exempt. The cast
    sites refuse `as` directly. The console twin, `intArgWat`, refuses a float argument to an
    integer parameter (it passed the f64 RAW before: ld35). One message for all,
    `implicitTruncDiagnostic` (`src/wasmath_lower.ts`). The trunc convention above remains for the
    kept cases only.
  - **A STRING index is an integer (owner, 2026-10-15; narrows D3's "kept" list for `s[i]`).**
    `s[pos]` with a float `pos` is a compile error, `error[float-index]`
    (`floatStringIndexDiagnostic`, naming `f64.toI32(pos)` or an `i32` index): JavaScript gives
    `undefined` for a fractional index and wasm would truncate it, and a run-time value cannot be
    told fractional at compile time, so the owner chose "refuse float index" over a run-time check.
    Judged by the EMITTED index (`checkStringIndex`: truncated at i32 = a float), at every string
    subscript (declaration, value, concat, the `s[i] === "c"` fast path). Array indices, `charAt`,
    `indexOf(x, pos)`, `splice` keep D3's conversion. **An out-of-range `s[i]` is `undefined`**, as
    JavaScript: `$__str_index` returns a static "undefined" text (printed / concatenated as
    JavaScript does), and a string compared with `undefined` / `null` calls `$__str_is_nullish`
    (no text, or that marker). Edges kept, documented in sw71: `.length` of it is 9, and it equals
    the string "undefined". `charAt` out of range stays `""`. 3 corpus programs migrated.
  - **Owner's rulings of 2026-10-19 (rules 1, 2 and 3 BUILT 2026-10-19 — rule 2's open case was
    sw87, a bare `sort()` now in string order; rule 3's known list is
    `src/wast_known_unbuilt.ts`, per-file ceilings; rule 4 MEASURED, on branch
    `feat/i32-overflow-check` behind `--i32-check`, not merged: compiler-bugs.md § sw119):**
    1. **An out-of-range ARRAY read gives `undefined`, as for strings (sw95).** Only that half
       of the string rule: a FLOAT array index keeps D3's conversion (asked: "out-of-range
       only"; about 26 corpus programs index arrays with a `number`). Shape: mirror sw71, a
       marker the element read returns out of range, printing `undefined`, `=== undefined` true.
       **As built:** a number slot has no spare value, so the marker is a TEST, `index >= length`
       (`arrOobTestWat`), at every place `undefined` is observable: `=== / !== undefined`, `??`,
       a `T | undefined` declaration or return, console.log (prints `undefined`), and `at()`. A
       numeric read used in arithmetic out of range is unchanged (no `undefined` number exists).
    2. **Semantics follow the function's ORIGIN.** A JavaScript / TypeScript function, method or
       operator does what JavaScript intends (a bare numeric `sort()` sorts as strings, sw87; the
       round-2 method edge cases follow JavaScript); a WASM-specific function (wasMath's `i32.*`,
       `f64.*` …) does what the wasm instruction intends.
    3. **`wasmtk wast` exits 1 on an unbuilt module that is not on a known-unbuilt list, and on
       a run that finds 0 files** (ld88; option C of those discussed: the gate's "fails only
       when a count moves" rule, applied to the user-facing command).
    4. **i32 overflow (sw119).** JavaScript has no `i32`; it is wasMath's alias for `number`, so
       under Deno `m * m` of two "i32" 65536 is 4294967296 and never errors. By rule 2 the
       OPERATOR is JavaScript's and gives JavaScript's result; the 32-bit limit is the wasMath
       TYPE's. So `+` `-` `*` on i32 values compute as JavaScript (f64, which IS JavaScript's
       arithmetic), and **storing a value that does not fit a slot declared `i32` throws a
       run-time error naming the operator and the type** (recorded as run time, raised only on
       an actual overflow; the owner was asked to say if compile-time refusal was meant).
       Deliberate wrapping is wasMath's `i32.add` / `i32.mul` / `f64.toI32Wrap`. Bitwise ops keep
       ToInt32 (JavaScript's own wrap, ld29); integer `/` stays refused. This replaces "the
       declared type decides" (2026-09-30) for `+` `-` `*`. Before building: measure how many
       corpus programs store an out-of-range value (hashes, mulberry32 will move to wasMath) and
       the cost to integer-heavy code (a range check at every i32 store; later, skip provably
       safe ones such as `i++` bounded by a length).
  - **Owner's decisions of 2026-10-19, end of day (NOT BUILT):** "i32 overflow check should be
    on by default. we will retire the u32 and u64 types now. yes bindgen check at the boundary
    and return of any issues is desired."
    1. **Rule 4 (sw119) is the default**, not an opt-in (**BUILT 2026-10-24**; the `--i32-check`
       flag REMOVED, owner 2026-10-23; compiler-bugs.md, the 2026-10-24 sw119 entry, has the
       shape: exact where printed / compared / kept in a number, ToInt32 wraps JavaScript's value,
       a store into an i32 slot is checked, `++` / `--` test the limit). **How a store that does
       not fit fails (owner, 2026-10-24): a program with no exception handling of its own prints
       "RangeError: …" to stderr and traps (its module needs no exception handling: wazero at its
       defaults refuses one with a tag); a program with a try / throw, and a library, throw the
       catchable RangeError.** `+ - *` of i32s give JavaScript's
       result and a store that does not fit an `i32` slot throws (measured: 1 of 461 corpus
       programs, `45_random-numbers`, relies on wrapping and moves to wasMath; +2.8% size; an
       arithmetic-heavy loop ~2.3× slower).
    2. **`u32` and `u64` are retired as TYPES.** wasm has no unsigned type, only `_u`
       operations; wasic stored a `u32` as an f64 (documentation only) and a `u64` only changed
       printing. The unsigned OPERATIONS (`u32.*`, `u64.*`) stay. wasMath is unreleased, so this
       breaks no published API.
    3. **bindgen checks values at the boundary and reports every issue:** an i32 argument must
       be an integer in range, i64 takes a bigint (or a safe-integer number), f32 rounds (its
       meaning), f64 passes as is; an issue throws a RangeError / TypeError naming the function,
       the parameter and the type; unsigned results come back unsigned.
  - 🔒 **Direction of 2026-10-26 (owner; DECIDED IN PRINCIPLE, NOT BUILT, measure first): no type
    hints, no wasMath — plain TypeScript numbers.** Owner: "I am more and more inclined to leave
    out the type hints and stick to normal javascript and typescript number types and not use the
    wasMath module at all. That would necessitate the need for the wasic compiler to translate
    the numbers to correct application in wasm. 'number' would be 'f64' in wasm and 'BigInt'
    would be 'i64' in wasm. loop numbers and index numbers would necessarily be integer based in
    wasm." And: "I understand this will change the examples again also. But I think this is a
    good project base change that simplifies things for the user and the wasm compiler in the
    long run." This goes further than the 2026-10-19 direction below (which kept `i32` / `f32` /
    `i64` as opt-in hints): the hints go. Consequences to scope before building (not decided yet):
    (a) the compiler INFERS an integer only where it can prove one (a loop counter, an index, a
    length, `| 0` / `>>>` results) and is f64 everywhere else, so every result is JavaScript's;
    (b) retired with the hints: D3, integer `/` refused, rule 4 (sw119, `$__i32_fit`), and the
    i32-typing bug classes (much of round 3: sw146, sw160, sw162–sw164, sw167); (c) `./wasMath`
    is a PUBLISHED entrypoint (3.0.0): Rule 4 needs a release that deprecates it before removal;
    (d) the corpus and examples are written with `type i32 = number`: migrated, or the aliases
    read as `number` during a transition; (e) cost: speed and size wherever the integer proof
    fails. First step (proposed): measure the corpus compiled with every `number` f64 and
    integer inference for counters / indices only: size, speed, and which silent rows vanish.
    **MEASURED 2026-10-26** (owner: "proceed"): [number-model-and-runtime-plan.md](number-model-and-runtime-plan.md)
    — on today's compiler the plain-number corpus compiles 413 / 443 and matches Deno on 371
    (typed: 437 / 449), +16 % size; the gap is the f64 path's immaturity (27 invalid modules
    reported as success), not the model. Scoped together with the Bun transition; decisions N1–N4
    are the owner's. 🔒 **Decided the same day — parity on the wasm side:** wasm arithmetic is
    IEEE-exact and compiled `Math` runs wasmtk's correctly rounded mathlib inside the module, so the
    module is the same on every engine (gated); a program is compared with an ENGINE only where
    ECMAScript is exact (arithmetic, conversions, number printing / parsing); transcendental `Math`
    is checked against a correctly rounded ORACLE, and an engine disagreeing there is an engine
    ulp, not a wasmtk bug. Bun stays the TypeScript reference (M2); M4 is replaced by this rule.
  - **Direction of 2026-10-19: untyped is JavaScript's number; JavaScript and npm through the
    bundle (owner, after reviewing the number model; NOT BUILT, measure first).** The owner: "I
    might have over thought this a bit, and should have kept the value inference intact that we
    originally had, with the type definition helpers for the compiler as an option." Discussed and
    agreed in shape:
    1. **Inference returns, but an untyped number is JavaScript's `number` (f64), not an i32.**
       The pre-2.0.3 inference guessed i32 from an integer literal (`let a = 100000; a * a`
       wrapped); that guess, not inference, was the flaw 2.0.3 fixed by requiring types. Untyped
       code then computes what Deno computes; `i32` / `f32` / `i64` annotations become opt-in
       hints with wasm semantics (wasMath, D3, rule 4). Additive: every annotated program keeps
       its meaning. Cost: speed of untyped integer code (later: infer i32 where provably exact).
    2. **The boundary model:** `number` carries f64, f32 and i32 / u32 (all exact in an f64),
       `bigint` carries i64 / u64 — the WebAssembly JS API's own convention and wasMath's aliases,
       so a compiled function takes the same arguments as the same TypeScript run natively. (The
       owner's alternative, bigint for i32 too, was weighed: it makes `result + 1` throw in
       JavaScript and changes the call convention between native and compiled.) Only f64 and
       in-range i64 pass the JS API as is in both directions; i32 / f32 arguments are converted
       (ToInt32 wraps, f32 rounds); u32 / u64 results come back signed.
    3. **u32 / u64 are the outliers:** wasm has no unsigned type, only `_u` operations. wasic's
       `u32` is stored as an f64 (documentation only); `u64` only changes printing. The `u32.*` /
       `u64.*` operations stay; retiring the two TYPE annotations is an open question (wasMath
       is unreleased: added 2026-10-09, after v2.0.3).
    4. **JavaScript and npm come in through the bundle:** jstyper runs on a `.js` import inside
       the tsbundle step (it is a separate manual command today, needs a hand-written `.d.ts`, and
       the bundler does not follow `.js` imports); jstyper infers types when there is no `.d.ts`;
       an npm package is resolved, **converted from CommonJS by esbuild (owner's choice,
       2026-10-19)**, then goes the same way. esbuild's output wraps CJS in `__commonJS` /
       `__toESM` shims (dynamic), so jstyper must unwrap that fixed pattern or the package goes to
       `dync`. Packages that need host APIs (fs, network, process) stay in JavaScript on the host
       and are called as imports (bindgen already wires those).
  - **An f32 is converted at every f32 boundary, by ONE rule** (2026-10-06, ld18 / sw43):
    `emitExpr` wraps the emitter, reads the emitted WAT's result type from its outermost form
    (`watResultType`) and converts when exactly one side is f32. A new leaf path need not know
    about f32. Memory access goes through `memLoadOp` / `memStoreOp` (console_log has a local
    twin): an inline `=== "f64" ? … : "i32.load"` chain is how f32 got lost 64 times.
  - **Console formatting is not string conversion** (2026-10-06, sw41): a WHOLE numeric
    `console.log` argument prints −0 as `-0` (`$__f64_to_str_console`); a template, a top-level
    string concatenation and `String(x)` are string conversion and print `0`, as JavaScript does.
    An f32 reaches either printer promoted (`promoteF32`, ld17).
  - **`Math` functions return JavaScript's exact result where wasm and JS are both f64**
    (2026-10-06): `sign`, `round`, `hypot` are helpers shared by wasic and the console path
    (`setMathHelperNeededCallback`; a console path that writes `call $__x` must REQUEST `$__x`).
  - Functions that TypeScript's `Math` lacks, for the wasm operations with no JS spelling, are
    being scoped. The plan, open questions and bugs: [wasm-math-plan.md](wasm-math-plan.md).
  - D3 corpus consequence (2026-10-13): `38_MathExactSemantics` (`f64.toI32(Math.floor(y))` ×7),
    `9_F32Containers`, `18_Multi-Scope…` and the `dynrt_any` bundle (`f64.toI32(num as f64)`)
    say `f64.toI32`; the SHIPPED dynrt library's 14 float positions and counts say
    `f64.toI32Sat` (NaN → 0, ±Infinity clamped, as JavaScript's ToIntegerOrInfinity), and the
    six embedded capability libraries (`src/wasm/caps_bytes.ts`) were rebuilt with the current
    compiler (they dated from the `pow` CR commit).
  - Test corpus consequence (2026-10-09): an integer quotient is written `i32.div(a, b)`, a
    fraction `f64.div(a, b)` or f64 operands. The 10 corpus programs that divided i32s were
    rewritten that way, printing what wasm printed before (golden: only those entries changed).

