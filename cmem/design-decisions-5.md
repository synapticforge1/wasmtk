# design-decisions — part 5 of 9

Continues [design-decisions.md](design-decisions.md) (split by size on 2026-11-20, letter H38). Sections:

- Class / feature codegen

## Class / feature codegen

- **Construction runs as JavaScript's does (2026-10-23, sw131 / sw132; do not revert).** A class's
  OWN instance-field initialisers (`n: i32 = 7`, collected in `instanceFieldInits` by the class
  field parser) run in its constructor FIRST — after the `super(…)` line in a derived class, so the
  base's fields and constructor come first and the class's own constructor body can override them.
  A class with initialisers and no constructor gets a synthesised one; a DERIVED class with no
  constructor gets one taking the nearest ancestor's parameters and calling `super(…)` with them
  (JavaScript's implicit constructor). The pass runs after all classes are parsed, in declaration
  order, so a base's (possibly synthesised) constructor exists first. Before it, every initialiser
  was dropped (fields started at 0) and `new Derived(4)` never ran the base constructor — silently.
  A field line containing `(` is still skipped by the field parser (`= new X()`, `= Math.max(…)`),
  a pre-existing limit: such a field is unknown, which is loud.
- **An array FIELD (`items: T[]`, in a class or an interface) carries `arrayElemType`** (ld103):
  reads and push / pop / shift / unshift go through `arrayFieldRef`, and a push stores the
  possibly-reallocated pointer back into the field. A class field without it is a bare i32 and
  every array operation on it is refused.
- **Template literals are scanned WITH their holes (2026-10-23, ld107 / ld111; do not revert to
  "skip to the next backtick").** `skipTemplateLiteral` finds a template's own closing backtick
  past `${…}` holes, their strings, braces and nested templates; `splitStmts` and
  `splitTemplateLiteral` use it, and `firstCodeArrowIdx` treats a hole as code (so an arrow there
  is lifted) and a template's text as text. Each of the three once skipped to the next backtick,
  which cut a nested template and hid a hole's arrow.
- **A string built from parts that failed quietly is not a result (2026-10-23, sw133).** Under
  `quietEmit` an unsupported string becomes "" and counts in `quietStringFailures`; a resolver that
  answers for the console must reject a non-empty result whose emission raised that count (it
  printed "" for a template argument), and a helper that RECOVERS from its own quiet probe
  (`emitStringArg`) takes the count back.
- **A statement `x.push(…)` on a class or struct variable is a METHOD call, never an array push**
  (sw129): the dynamic-array statement form's i32-local fallback excludes class and struct
  variables, whose pointers are i32 locals too.
- **`instanceof` (Phase 51)** lives in `emitExpr` AFTER the binary-op loop (so `a instanceof X && …`
  splits on `&&` first). When `classHeaderSize > 0` it emits a runtime tag check
  (`tag(obj) ∈ {target + findSubclasses(target)}`, OR-folded, tag read at offset 0); when
  `classHeaderSize === 0` (no inheritance, no tag header) it folds to a compile-time const from the
  var's tracked class. The object pointer comes from `classVars`/`this`, else falls back to
  `emitExpr(lhs)` (this fallback is why the array-element / base-typed-param cases work). Narrowing
  for `if (x instanceof Sub)` reuses the Phase-34 `narrowKey` save/restore in `emitBlock`. For
  `console.log(x instanceof C)`, `console_log.ts` calls back into `emitExpr` via the
  `setInstanceofResolver` singleton (the resolver returns `undefined` for non-class RHS so
  `instanceof Error` etc. still hit their existing handlers). Result is i32 0/1, promoted to
  f64/i64 when the context type is wider (same pattern as the short-circuit `&&`/`||` handler).
- **Module-level class instances (Phase 51)** are registered in `classVars` by a `newClassPre`
  block in the `startBodyLines` pre-scan that mirrors `emitFunction`'s. SUPERSEDED 2026-10-26
  (sw141): it registers `ptr: -1` and the const-new handler sets the local from `$__new_<C>` (the
  rule above); it used to need a static ptr because the handler emitted `(i32.const ptr)`. The
  `if (cd)` guard skips TypedArrays (PascalCase but not in `classDefs`).
- **Class-instance array literals (Phase 51)** — `const a: C[] = [new C(…), …]` is desugared to
  `const a: C[] = []; a.push(new C(…));…` by `expandClassInstanceArrayLiterals()` (source pre-pass,
  after `parseClasses`, before `parseFunctions`/`parseTopLevel`). The static struct-array path can't
  run constructors (it only fills `{field:val}` literals → zeroed structs, no tag); `push(new C())`
  constructs each element. Only fires when the element type is a known class AND every element is a
  `new …(…)`. Don't move it before `parseClasses` (needs `classDefs`) or after body collection (the
  bodies must already contain the desugared lines).
- **Single-physical-line class/constructor bodies (Phase 51)** — `parseClasses` field parsing iterates
  `splitClassMemberLines(classBody)` (depth/string-aware: splits at depth-0 `;`, depth-0 `\n`, and
  after a depth-0 `}`), NOT raw `classBody.split("\n")` — otherwise a field sharing a physical line
  with the constructor is skipped (the field loop skips any line containing `(`). And a method/ctor
  `rawBody` that is a single physical line is split via `splitStmts` so multi-statement single-line
  bodies (`super(k); this.v = v;`) aren't mangled into one stub. Relies on comments being stripped
  before `parseClasses` (they are — `stripComments` runs at the top of `transpile`).
- **Object spread `{ ...src, k: v }` (Phase 51.2)** — both struct-let pre-scans register the spread
  var with **`ptr:-1`** (NOT `-3`). The 17 struct field-access sites only special-case `ptr === -1`
  → `(local.get $var)`; a `-3` (heap) sentinel would make every read compute `(i32.const -3)`. The
  spread var IS an i32 local holding the malloc'd pointer (same shape as a function-returned struct),
  so `-1` is correct. The `structSpreadMatch` emit branch (in `emitStatement`, BEFORE the static
  `structLetMatch`) owns the `local.set`, so it does not consult `sv.ptr`. `emitSpreadStructLiteral`
  copies base fields BY NAME using the base's own offset/type (string fields copy ptr+len both words);
  unset fields rely on zeroed bump-allocated memory. `parseStructLiteralWithSpread` excludes the
  `...tok` from the override map so the shorthand-detection regex can't misfire on the spread source.
  Single-physical-line literals only; string-field *overrides* are ptr-only (pre-existing
  `emitRuntimeStructLiteral` limit — copies are fine).
- **Param destructuring `f({x,y}: Vec2)` (Phase 51.3)** — `expandParamDestructuring()` is a source
  pre-pass (runs BEFORE `parseFunctions`, after `parseStructs`/`parseClasses`) that rewrites a
  destructuring param to a synthetic `__pd_N: Type` and injects `const { … } = __pd_N;` /
  `const [ … ] = __pd_N;` as the FIRST body statement(s) — deliberately reusing the existing
  struct-param registration + flat-destructure handlers, so there is NO new emit path. Two
  load-bearing details: (1) injected bindings MUST be newline-separated (function bodies are split
  per newline; space-joining collapses multiple bindings into one unmatched stub); (2) `parseParams`'
  param comma-split tracks `()`+`[]`+`{}` (NOT paren-only) — otherwise a tuple-type param
  `__pd_N: [i32, i32]` splits at the inner comma into two broken params. Only named `function NAME(...)`
  declarations are rewritten (arrow/method params are a follow-up). Inline tuple-literal *args*
  (`f([1,2])`) are a separate pre-existing gap; struct-literal args work.
- **Nested object destructuring `const { a: { b }, c } = obj` (Phase 51.3)** — the object-destructure
  emit handler + pre-scan use **balanced-brace detection** (`findMatchingBracketAware`, NOT `\{([^}]+)\}`
  which can't match nested `}`) and delegate to recursive helpers `emitDestructurePattern` /
  `collectDestructureLocals`. A binding whose value is a `{…}`/`[…]` pattern recurses into the nested
  field: pointer fields (`structType`, Phase 42) load the stored ptr as the new base; inline-tuple
  fields (`tupleTypeName`, Phase 21) use the field *address* — `nestedFieldBaseWat` encodes this. No
  temps (nested loads inline). Two load-bearing details when refactoring: (1) object *shorthand with
  default* `{ x = 1.0 }` (no colon) must strip the `= default` BEFORE the field-name lookup — else
  `def.fields.find("x = 1.0")` misses and the whole compile aborts (the binding emits a stub); the
  `valuePart` still carries `x = 1.0` so the flat-bind branch extracts local `x` + default `1.0`.
  (2) `emitDestructurePattern` and `collectDestructureLocals` MUST stay structurally identical (same
  field/valuePart parsing) so the pre-scan declares exactly the locals the emit sets. (3) Both use
  `splitBraceAwareCommasKeepEmpty` (NOT `splitBraceAwareCommas`, which drops empties) so positional
  **gaps** `[a, , c]` keep index alignment — see the gap-collapse bug in compiler-bugs.md.
- **Nested tuple/array `const [[a, b], c] = t` (Phase 51.3)** — tuples are structs, so once the tuple
  *type* parser is bracket-aware the recursive destructure/spread machinery handles nesting for free.
  `tupleTypeName` + `makeTupleStructDef` split elements with `splitBraceAwareCommas` and, for a nested
  tuple element, **embed it INLINE** (a `tupleTypeName` field, natural-aligned via `tupleFieldAlign`,
  `size = nested.totalSize`) — same shape as a Phase-21 embedded tuple, NOT a heap pointer. So
  `nestedFieldBaseWat` uses the field *address* for these. Value construction
  (`const t: [[i32,i32],i32] = [[1,2],3]`) recurses via `emitTupleLiteralStores`, storing each nested
  element at `baseOffset + field.offset` (a compile-time-constant WAT store offset). All tuple
  literal/destructure regexes were widened from `\[[^\]]+\]` (stops at first `]`) to a one-level-nesting
  bracket class or balanced detection (`findMatchingBracketAware`). **Determinism check:** the rewritten
  flat-tuple path emits byte-identical WAT to the pre-rewrite code (verified: zero tracked-`.wat`
  content changes), so only genuinely-new nested cases produce new bytes.

- **Utility types (Phase 51.4)** — two source-level passes, NOT a new emit path. `expandUtilityTypes`
  (BEFORE parseStructs) unwraps pass-through wrappers `Partial`/`Readonly`/`Required`/`NonNullable` →
  inner type (balanced `<…>` via `matchAngleBracket`, loops for nesting). `expandStructUtilityTypes`
  (AFTER parseStructs, needs the base def; BEFORE parseFunctions) synthesizes `Pick`/`Omit`/`Record`
  structs. Load-bearing: (1) the inline synthetic name is `${Kind}_${args}` — MUST start with the
  uppercase Kind letter, because struct-type detection everywhere keys on `[A-Z]\w*` (a `__`-prefixed
  name silently fails to register/allocate → fields read 0). (2) `Pick`/`Omit` copy base StructFields
  PRESERVING offsets + totalSize (so a base value is layout-compatible with the subset), `Record` packs
  fresh. (3) `Record<string,V>` / non-literal keys → unresolved (dynamic map, out of scope). Pick/Omit
  as interface *field* types aren't supported (parseStructs runs first); var/param/return/`type Alias`
  positions are.
- **Phase 52 leaf conveniences (2026-06-11)** — five small features; the load-bearing invariants:
  (1) **`void expr;`** + **chained assignment `a = b = c = 0`** handlers sit at the TOP of
  `emitStatement`, BEFORE the `return` handler and BEFORE the simple-assignment matchers (which would
  otherwise grab `a = (b = c = 0)`). The chain detector counts top-level plain `=` (skipping
  `==`/`===`/`=>`/`!=`/`<=`/`>=`/compound via a prev/next-char check, string/template-aware), requires
  EVERY target to be an assignable lvalue (`\w+` / `\w+.\w+` member / `\w+[…]` element — extended
  2026-06-12 from bare-identifier-only so `p.x = z = 5` and `arr[i] = w = 9` work), and lowers to
  `c=0; b=c; a=b` (rightmost first) reusing the normal assignment emitter — do NOT special-case
  types/strings/globals here, the reuse handles them. Declaration-form chains (`let a = b = 0`)
  intentionally bail (target `let a` isn't an lvalue). (2) **`"field" in obj`** and
  **`Array.isArray(x)`** are closed-world COMPILE-TIME constants resolved in `emitExpr` (NOT
  `console_log.ts` — direct `console.log("x" in o)` / `console.log(Array.isArray(a))` are not wired;
  route via a `boolean` local or an `if` condition, both of which go through `emitExpr`). `in` uses
  `findDepth0Keyword(" in ")` + `structHasField` (structVars→def.fields, classVars→classDefs.struct.fields;
  returns null → fall through when unknown). (3) **`Array.from([…])` / `Array.of(…)`** are a SOURCE
  pre-pass (`expandArrayFromOf`, string-aware balanced scan) that MUST run AFTER the
  `Array.from({length:N}, () => [])` 2D sentinel rewrite (so the `{length}` form is consumed first);
  it rewrites only a literal-array argument (non-literal `Array.from(iterable)` is left untouched) and
  recurses into the rewritten arg for nesting. (4) **`String.fromCodePoint(...)`** — constant args go
  through `allocStringDecoded` (NOT `allocString`): the produced characters are already final and must
  NOT be re-run through `unescapeString` (a produced `\`/quote would be misread). `constCodePoint`
  validates decimal/hex in the 0..0x10FFFF range; out-of-range/runtime falls to the
  `$__str_from_codepoint` WAT helper (1–4 byte UTF-8, multi-value ptr,len, gated by
  `needsStringExtHelpers`). Wired in `emitStringAssign`, the concat `appendConcatPart` path,
  `isStringExpr`, and BOTH `$__str_op` prologue temp-pair detectors (function + startBodyLines).
  (5) **console_log.ts `dotLenMatch` now resolves STRING `.length`** (UTF-8 byte length) for local
  strings (`local.get $x_len`), module string consts (`i32.const <len>`), and string globals
  (`global.get $g_len`) — it previously only handled array `.length` (so `console.log("s.length:",
  s.length)` printed 0 for any string var, `fromCharCode` included). NOTE multi-byte: wasic `.length`
  is the UTF-8 BYTE count, TS `.length` is UTF-16 units — only ASCII results are `.length`-comparable.
- **Else chains after a single-line `if` (2026-06-12, `emitBlock`)** — a single-line `if` (brace-less
  `inlineBody` OR single-line-braced `singleLineBlock`) followed by a self-contained `else`/`else if`
  chain on the NEXT lines used to DROP every branch after the first (the else-detection only matched a
  few braced multi-line forms). FIX, placed BEFORE the inlineBody/singleLineBlock branching: if
  `WasicTranspiler.isSelfContainedElse(lines[i+1])`, assemble the if-body + the whole chain into one
  inline string (`braceifyElseLine` braces brace-less bodies), feed to `expandInlineBraceChain` →
  canonical braced multi-line form, splice + `continue`. `isSelfContainedElse` returns FALSE for an OPEN
  braced `else {` (body continues on later lines) so the existing multi-line machinery still owns those.
  Do NOT remove this — the brace-less and single-line-braced else forms silently miscompile without it
  (regression `15_ElseChainForms`). `instanceof` with a non-user-class (built-in) RHS resolves at
  compile time: Error-family → 1 (wasic models caught exceptions as strings, so `e instanceof Error`
  catch-narrowing is true), other built-ins → 0.
- **Terminal emit diagnostics (silent-fall-through hardening, 2026-06-12)** — the four terminal
  "give-up" fallbacks (`emitExpr` unsupported expr, `emitStatement` unsupported stmt, `emitStringAssign`
  unsupported string assign, `emitStringPtrLen` unsupported string expr → its `(i32.const 0) (i32.const
  0)` sentinel) now `this.diagnostics.push(...)`, which ABORTS the compile (the `warnings` gate in
  `compileWasiTs`/`compileLibTs`) instead of silently emitting `0` / the empty string. **Invariant:**
  SPECULATIVE / guarded probe sites that recover gracefully when they get a stub/sentinel MUST wrap the
  call in `quietEmit(() => …)` (a depth counter `emitDiagSuppressDepth`; the terminal push is skipped
  while > 0). There are ~13 such wrapped sites (10 sentinel-guarded `emitStringPtrLen` callers + 3
  `emitExpr` probes that inspect the result for `(;?`/`(unreachable)`); every OTHER caller passes the
  stub straight through and so DOES get the hard error. The `emitStatement` diagnostic additionally
  skips clearly-non-statement fragments of multi-line constructs parsed elsewhere (lines starting with
  `|` = DU type-alias union continuations; element fragments ending in `,`; bare object-literal /
  numeric / string element lines). When adding a new caller of `emitExpr`/`emitStringPtrLen` that probes
  for failure, wrap it in `quietEmit`; when adding a new terminal fallback, decide whether silent-wrong
  or a diagnostic is correct (default: diagnostic).
- **console.log binary-op operand type from the LHS leading atom (`console_log.ts` `exprToWat`)** —
  the `+`/`-`/… operand type is inferred from the LHS's leading atom: plain local, `var.field` (type via
  `structLookup().type`), `.length` (→i32), OR — for an array-element-led operand `arr[…]` — the
  array's ELEMENT type via `arrayLookup` (the lead atom `arr` is an i32 pointer, so the element type
  is what matters; keying on the lead atom covers compound LHS like `arr[0] + arr[1]` too). Without
  LHS-typing, i32 struct-field arithmetic compiled to `f64.add` of i32 loads. **FIXED 2026-06-08:**
  `console.log("x:", arr[i] + arr[j])` (array-element arithmetic) — previously the greedy `arr[idx]`
  regex captured `0] + arr[1` and emitted one mangled access (dropping terms). Now the bracket index
  is `parenDepthNeverNegative`-guarded in BOTH `parseSingleArg` and `exprToWat`, so the expression
  falls through to the binary-op loop, which infers the op type from the array element type
  (i32[]→`i32.add`, f64[]→`f64.add`). Regression: `6d_ConsoleLogArrayArith`.
- **console.log string comparison non-trivial operands (`console_log.ts`, 2026-06-12)** — `getStrPL`
  (string `===`/`!==`) and the string-ternary `getStrPtrLen` resolve fn-call / struct-field / slice /
  method operands via the `_stringExprResolver` bridge → wasic `emitStringPtrLen` (captures len into
  `$__str_op_len`). Without it those operands silently compared against `""`. The resolver-temp is
  declared by broadening the `$__str_op_ptr/len` prologue trigger to a `console.*` line with a
  string-equality op. **String `!==` is `(i32.ne cmp 0)`** (`$__str_cmp` returns 0 for equal) — the old
  `(i32.ne (i32.eqz cmp) 0)` was inverted. String `.length` as an OPERAND is handled in `exprToWat`'s
  `dotLenM` (not just `parseSingleArg`), plus a general `<stringExpr>.length` via the resolver's len
  word. Regression: `27_ConsoleLogStringCompare`. KNOWN LIMIT: 5th+ numeric arg in per-iov mode prints
  `"?"` (SCRATCH_SLOTS=4; raising it shifts `DATA_BASE`/260 = wasmmerge `DATA_PTR_THRESHOLD`).
- **A console line that can exceed the 128-byte scratch is built in `$__cbuf`** (sw62,
  2026-10-13). The scratch at SCRATCH_BASE is 128 bytes and the data section starts right after
  it (260), so a longer gathered line overwrote program data. A gathered line of literals and
  numbers whose WORST case fits (literal bytes + 32 per number + the newline ≤ 128) keeps the
  fixed scratch, its code as before and no allocator; any other gathered line (strings,
  booleans, arrays, joins, or too many numbers), and per-iov array / join printing, writes into
  `$__cbuf`, a heap buffer that grows: every write first ensures room (`$__cbuf_need(total)`;
  literals their length, a number 32, strings and booleans through `$__cbuf_put`, arrays and
  joins through wrappers that read the length ONCE and ensure the worst case). Anything new that
  writes a console line must ensure first.
- **iov pointers are stored AFTER the values they describe** (sw62). A value can run a nested
  `console.log` (an argument that is a call to a function that prints), which rewrites the iov
  region and the cursor at iovBase+4; a pointer stored before it was stale. Gather mode stores
  iov[0].ptr just before `fd_write`; per-iov numerics store the length (the call) first.
  Still open as sw68: a nested console.log inside a GATHERED line's argument shares the cursor at
  iovBase+4 and the buffer, so the outer line's bytes before that argument are lost.
- **`wasmbundle` cannot bundle a wasic module that prints a string, boolean or array**: those
  lines use `$__malloc`, whose executable form calls `memory.grow`, which `wasmmerge`'s
  foreign-runtime guard refuses. binaryang's `wasm-bundle` is to replace `wasmbundle`
  (next-work.md); a number-and-literal line stays bundleable.
- **Greedy `dotCallExprMatch` / `newMatch` / `superDotExprMatch` in `emitExpr` are guarded** (FIXED
  2026-06-08). `a.method() + b.method()`, `new A(x) OP new B(y)`, `super.m() OP x` — the greedy
  `([\s\S]*)` args capture used to consume across the operator (e.g. `a.unwrap() + b.unwrap()` →
  receiver `a`, args `) + b.unwrap(`), so tests had to hoist `const av = a.unwrap()` temporaries
  (16_NestedMonomorphization). Now each carries a `parenDepthNeverNegative(args)` guard so the
  compound expression falls through to the binary-op loop. Regression: `16_MethodCallBinaryOp`.
  (Still-open, narrower: chained `new X(...).method()` inside a binary op has no handler; and a
  module-level multi-statement single physical line `const a = ...; const b = ...;` isn't split —
  both rare.)

