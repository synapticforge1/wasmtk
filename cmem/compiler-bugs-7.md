# compiler-bugs — part 7 of 7

Continues [compiler-bugs.md](compiler-bugs.md) (split by size on 2026-11-20, letter H38). Sections:

- H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 1

## H12 Phase 0b, audit round 2 (2026-10-15): 33 silent-wrong compiler + 10 silent tool defects, ~44 loud, CONFIRMED BY RUNNING (continued, 2)

**Loud, compiler** (`round2/loud/`): ~~ld47~~ FIXED 2026-10-19 with sw84 (the count is clamped) `splice(3, 10)` traps (count unclamped); ~~ld48~~ FIXED 2026-10-20 `pop()` of
an empty array traps (now `popn_T` / `shiftn_T`, flag-reporting, where the value is dropped or nullable; a
plain numeric use still traps, loud); ~~ld49~~ FIXED 2026-10-20 an f64 comparator in `sort` (signature
mismatch; `sortcmp_T_<result>`); ~~ld50~~ FIXED 2026-10-20 `flat()` on 1-D (a `slice(0)` copy now)
; ~~ld51~~ FIXED 2026-10-19 with sw93 `(2**32).toString(16)` traps; ~~ld52~~ FIXED 2026-10-20 `string[].sort()`
(`$__str_cmp` undefined); ~~ld53~~ FIXED 2026-10-20 `s.at(9)` (IR error: a `string | undefined` local
undeclared; and the at() itself read past the text, sw125); ~~ld54~~ FIXED 2026-10-20 a struct FIELD operand never converted
(`p.n * p.x`, `p.x > p.n`, `Math.max(p.n, p.x)`, 2-D mixed compare: invalid modules, declaration
path; emitExpr converts an i32 NUMBER to an asked-for f64, never a pointer, `isI32Number`);
~~ld55~~ FIXED 2026-10-20 console unary minus of an i32 element / a 2-D row's `.length` in a sum; ~~ld56~~ FIXED 2026-10-20 console
`ia[1] + fa[1]` (`hasFloatElem`); ~~ld57~~ FIXED 2026-10-20 a getter returning f64 compared in a method (`i32.gt_s`;
`classMemberType`); ~~ld58~~ FIXED 2026-10-19 with sw100 console
`.length` of a method result (with ld43, ld46); ~~ld59~~ FIXED 2026-10-20 console bigint operands in f64 ops; ~~ld60~~ FIXED 2026-10-20
`Number(stringVar)` (`$__str_to_number`, JavaScript's ToNumber of a string; it rides on sw122's parser);
~~ld61~~ FIXED 2026-10-20 console `reduce` returning f64; ~~ld62~~ FOUND FIXED 2026-10-20 console `s.length > 2 && arr[1] > 1`;
~~ld63~~ FIXED 2026-10-20 console `nm() < s` (bad local); ~~ld64~~ FIXED 2026-10-20 a nullable string local (`$s_ptr` unresolved;
prints `null` / its text); ~~ld65~~ FIXED 2026-10-19 with sw97 a NaN
parenthesised compare traps (sw97); ~~ld66~~ FIXED 2026-10-22 `1e-7 * 1.5` in a declaration (the `-` of the exponent
splits; `isLiteralExponentSign` in findBinaryOp); ~~ld67~~ FIXED 2026-10-22 console `n ** 2` of an
i32 (`**` makes it a float); ~~ld68~~ FIXED 2026-10-22 console `typeof b === "boolean"` (wasic's
compile-time boolean); ~~ld69~~ FIXED 2026-10-22 console
`x > 1 || s === "q"` (splits at `===` first; the string comparison waits for `&&` / `||` / `??` /
`?:`); ~~ld70~~ FIXED 2026-10-22 `users[0].name.length` in a declaration (with ld43); ~~ld71~~ FIXED
2026-10-22
`++` / `--` as a value (console and declaration; `while (m-- > 0)`; `incDecParts`: a number local or
module global, prefix `local.tee`, postfix the old value; the scanners no longer take `++` / `--` for
`+` / `-`); ~~ld72~~ FIXED 2026-10-22 compound assignment / `++`
on an array element or element field (`arr[i] += 1`, `ps[1].x += 5`; README claims support; written
out as `X = X op E`, an index with a side effect refused; a string element's store of a concatenation
goes through `emitStringFieldStore`);
~~ld73~~ FIXED 2026-10-22 one-line `do { … } while (…)` (and a brace-less `do x; while (…);`); ~~ld74~~ FIXED 2026-10-22 classes: inherited getter
(`getterFunc` walks the inheritance chain, at the expression, `this.`, classMemberType and four
console sites), `return this` (`this` is `$__self`; a chained call on a method's result types its
receiver by the method's declared return class, `classOfExpr`, in expression and statement form,
and `const again: C = c.bump()` is an instance), a method
returning string (through `$__str_ret_*`, as a function does), `super()` with no base constructor
(the nearest ancestor that has one; none: a no-op), a struct alias's field store (`const q: P = p`
is the same struct, its pointer in a local), ~~generic and~~
abstract classes (`abstract` stripped in a pre-pass, abstract members declarations only; a call
dispatches on the class tag, `emitTagDispatch`, Phase 47's array-element dispatch made general);
generic classes are ~~**ld100**~~ FIXED 2026-10-22: `class Box<T>` / `new Box<i32>(7)` is "Unsupported statement"
(classes are not monomorphized as functions are) (`expandGenericClasses`, before expandGenerics:
each `Name<args>` use is a copy `Name_args` with the parameters substituted, written where the
template stood; two parameters, a string argument, a subclass, `return this`, a parameter and a
result type; a bare `new Box(7)` is refused by name); found and FIXED with it, both the same on
main: **ld101** a class STRING field was one word (the next field sat on its length, "hihihih"),
and a string constructor / method argument, `new Item("hi", 7)`, was refused (8-byte string
fields; `this.name = …` through emitStringFieldStore; `this.name` reads; string arguments in the
two `new` handlers and the four method-call sites); **ld102** a string-returning method in
console.log, `console.log(n.label())`, was an invalid module (emitStringPtrLen calls it and reads
the return globals; console routes an instance's method call there); found 2026-10-22, ~~**ld103**~~ FIXED 2026-10-23
`this.items.push(x)` on a class's array field is "Unsupported statement"; ~~**ld104**~~ FIXED
2026-10-23 a field of a call's result, `c.bump().n`, is "Unsupported expression"; ~~**ld105**~~
FIXED 2026-10-23 `xs.filter(…).length` inside console.log is refused (and as a declaration too)
(see the 2026-10-23 entry at the top); ~~ld75~~ FIXED 2026-10-20 callbacks: a generic function's callback (`funcTypeVars` re-seeded
per function), `map((x, i) => …)` (signature mismatch; `<method>_<T>_ix` helpers for forEach, map,
filter, find, findIndex, every, some; a third parameter is refused); ~~ld76~~ FIXED 2026-10-22 destructuring from a call, a tuple holding a string
(`destructSourceDef` / `destructSource`: a struct variable or a struct- / tuple-returning call,
evaluated once into `$__destr_src`, in the three pre-scans (the start body had no object one) and
both emitters; a tuple's string element stored by emitStringFieldStore and read by
emitStringPtrLen, `isStringExpr`, `inferExprType` and console.log); ~~ld77~~ FIXED 2026-10-22 a string literal in
expression position (`"abc" > "ab"`: a literal LEFT side compares as a string; nested string
ternary: emitStringAssign split at the LAST `?`, now splitTernaryTop; object with a string and a
function field: the lifting guard refused every arrow after a `:` on a declaration line, now only
the annotation's own colon, and a declared literal of an interface with function fields builds
closure factories as a returned one does, dispatched through `interfaceOf`); ~~ld78~~ FIXED 2026-10-22 ~~a default parameter using an earlier one~~ (FIXED 2026-10-22, `bindDefaultParam`: the
earlier arguments substituted at the call site, a side-effecting one refused), ~~`for (let i = 0, j =
10; …)`~~ (FIXED 2026-10-22: `splitForInit` in both pre-scans and all three `for` emitters, a comma
list of updates in `emitUpdate`, each declarator counter-checked), ~~chained
`filter().map().reduce()`~~ (FIXED 2026-10-22: a non-chain method on a chained receiver evaluates
it once into `$__chain_arr`, registered as a dynamic array of the chain's type, and goes through
the one-array path; reduce, find, at, indexOf, lastIndexOf, includes, every, some, findIndex),
~~a function array called through a local~~ (FIXED 2026-10-22: the top-level arrow pass stripped
the annotation of `const f: () => i32 = fns[i]`, now only of an arrow initialiser; a
function-type alias on a local (`const f: Fn`) and an empty alias array (`const fns: Fn[] = []`)
expand to the inline forms in a pre-pass; a function-array element is a valid initialiser); ~~ld79~~ FIXED 2026-10-22 `for…of` over class /
struct arrays (documented limit; virtual dispatch inside it) (`registerForOfInstance`: the item is
a class or struct instance in both pre-scans; a call on an instance held in a local, a parameter,
a `for…of` item or a method result, dispatches on its tag when a subclass overrides the method, a
static `new X` instance stays a direct call);
**sw126** FIXED 2026-10-22 (found with ld79; the same on main): a base method calling an
overridden one through `this` (`describe() { return this.area() + 1 }`), or a call on a base-typed
PARAMETER (`function areaOf(s: Shape) { return s.area() }`), ran the BASE's version: "1 0" for
JavaScript's "10 9" (`needsTagDispatch` / `emitTagDispatch`; one golden moved,
`16_DeepGenericConstraintResolution`, its parameter call now dispatches, the same output); ~~ld80~~ FIXED 2026-10-22 missing methods: `substring`
(`$__str_substring`, clamped and swapped), `lastIndexOf` (string `$__str_lastindexof`, array
`lastindexof_T` with `from`), `splice` as a value (the removed elements via the slice helper from
the normalised start and clamped count, a side-effecting start / count refused),
`(e as Error).message` (a cast of a name to a capitalised type before a member access is stripped
in a pre-pass), ~~`string[].join` into a
declaration (README says assignable)~~ (done 2026-10-19 with sw76).
Found 2026-10-20 (all the same on main): ~~ld91~~ FIXED 2026-10-22 a MULTI-LINE arrow callback at top level,
`xs.forEach((x) => {` … `});`, is "Unsupported statement: });" (`joinMultiLineArrowArgs` joins a
block-bodied arrow argument into one line, in function bodies and at top level, adding the `;` a
body line lacks); ~~ld92~~ FIXED 2026-10-22 an expression-bodied arrow
whose body is `console.log(…)` is "Unsupported expression" (an annotated `: void`, or a `console.*`
body, is no result to infer); ~~ld93~~ FIXED 2026-10-22 `for (const s of xs)` over a
`string[]` at top level leaves `$s_ptr` unresolved (an IR error) (a string-array LITERAL has
`elemType: "string"` without `isStringArr`; the `for…of` emitter and both pre-scans take either).
Found and FIXED with ld78, 2026-10-22 (all the same on main): ~~ld97~~ an untyped callback over an
`f64[]` took i32 parameters, "function signature mismatch" at run time (the lifter reads the
receiver's declared element type, a chain's from its base); ~~ld98~~ an f64 call through a
function variable in console.log was typed i32, an invalid module (`watResultType` reads a
`call_indirect`'s table type, and both console fallback resolvers use it); ~~ld99~~ array methods on
a numeric array PARAMETER (`v.reduce(…)`, `v.forEach(…)`) were refused (a parameter is not
dynamic so that a push cannot move it under the caller; the non-growing methods accept it).
Found 2026-10-22 (all the same on main), OPEN: ld95 a LITERAL array of functions,
`const ops: Op[] = [add, mul]`, is not a function array (`const f: Op = ops[i]` is "Unsupported
function-typed initialiser", `console.log(ops[0](1, 2))` a console refusal; `Array<Op> = []` and
`push` work); ~~ld95~~ FIXED 2026-10-22 (see its row); ~~ld96~~ FIXED 2026-10-22 an array-method callback that CAPTURES a local (`v.forEach((x) => { n += x; })`
in a function, or a top-level `let` the lifter treats as captured) was an invalid module, now
refused with a message (the helpers call a bare table index; a closure needs its environment).
A `string[]` callback (`names.forEach((s) => …)`) is refused likewise (no helper passes a
(ptr, len) element; it was refused before as well). Fixed: a `<key>_cl` helper is the base
helper with its call_indirect made a trampoline call through `$fn`, the closure (`cbArgWat`
passes the factory call; `cbHelperKey`, the reduce / reduce1 / sortcmp / flatMap keys and a
chain's map / filter take `_cl`); a function local an inline arrow MUTATES is boxed (Phase 5h's
`sharedMutableCaptures` saw only a returned object literal's arrows); a top-level number /
boolean literal is not captured but read as the module global it becomes. forEach / some / every /
findIndex over a `string[]` pass each (ptr, len) element (an untyped `s` is a string); a closure
over a `string[]` or capturing a string is refused (a trampoline passes one word per
parameter). **sw128** FIXED 2026-10-22 (found with ld96; the same on main): an inline array
literal for an `f64[]` (or `i64[]`) parameter was built of i32 words, `first([1, 2, 3])` read
`4.24e-314` (`literalArgType` at both plain call sites; console hands such a call to wasic).

**Loud, tools** (`round2/tools/`): ~~ld81~~ FIXED 2026-10-22 `wasmbundle` ignores `hasMutableGlobals` (a cursor moved
to 131072 in a 1-page bundle: out of bounds) (the bundle keeps the largest memory a module
declared, and wasic's 3-page floor for a module with mutable globals); ~~ld82~~ FIXED 2026-10-22 `bindgen` host imports with a camelCase method
never link (`display_show_value` vs `display_showValue`) (a WIT name is lower-kebab, so the module's
spelling is lost; the binding's `env` is a Proxy that finds an import by its name with case, `_`
and `-` ignored); ~~ld83~~ FIXED 2026-10-22 the deno binding cannot load a
relative path (`fetch(String(source))`), and a typed-array view ignores byteOffset (a path or a
`file:` URL is read from disk, only http / data / blob URLs fetched; a view is passed to
`instantiate` as given, in all three runtimes, since a Node `readFileSync` Buffer's `.buffer` is
the shared pool too; `tests/tool_rows_tests.ts` drives the Deno binding, and the node / bun
bindings were run under Bun by hand); 8 bindgen fixtures regenerated; ~~ld84~~ FIXED 2026-10-22 the bundler
handles neither `export class` nor `export { name }` (`class` / `abstract class` joined the
named-export rename, with a CAPITALISED prefix, `Shapes_Box`, since wasic reads `new X` by its
capital; a local `export { a, b as c };` renames each declaration and maps the exported name);
~~ld85~~ FIXED 2026-10-22 two imports with the same basename
collide (`duplicate func $util_add`) (`uniquePrefix`: the second file named `util` gets
`util_2`); both in `tests/merge_layout_tests.ts`; ~~ld86~~ FIXED 2026-10-19 (`extractForms` skips string
literals; `tests/merge_layout_tests.ts`) the merge scanners count `(` `)` inside data strings;
~~ld87~~ FIXED 2026-10-22 `mod` cannot call an i64 function (`exportCallArgs` reads the export's
parameter types: an i64 takes a BigInt, a fraction for one is refused; and main.ts keeps each
positional argument AS TYPED, since parseArgs made `9007199254740993` a Number, 2^53;
`tests/tool_rows_tests.ts`); ~~ld88~~ FIXED 2026-10-19 (the owner's rule 3: `src/wast_known_unbuilt.ts` holds each vendored
corpus file's unbuilt-module CEILING, 21 files / 94 modules, all engine / proposal gaps; a run
above a ceiling, with an unlisted unbuilt file, or with 0 files exits 1 and the summary says ❌;
`tests/wast_cli_tests.ts`) `wast` exits 0 with ✅ when modules are not built (or
on an empty directory) — **owner 2026-10-19: exit 1 unless the unbuilt module is on a known
list; 0 files always fails**; ~~ld89~~ FIXED 2026-10-22 `dync` leaves `<name>.__dync.ts` on
failure and prints errors twice (it exited inside the `try`, before the `finally` removed the
scaffold; `compileWasiTs` / `compileLibTs` printed the error and so did every caller, `wasic`
included: they now return it, the WAT's path in the message, and the caller prints it once);
~~ld90~~ FIXED 2026-10-22 bad flag values silently become defaults (`--runtime`,
`--any-policy`, `--on-conflict`, `--go-runtime`, `--go-target`), `-o` ignored by `run` / `info` /
`mod`, a missing target prints help and exits 0 (main.ts: `FLAG_CHOICES` checked after parsing,
exit 1 naming the values; `-o` refused where nothing is written, `run` of a Go / Zig / Rust
source still builds to it; a command without its target exits 1, `--help` and a bare `wasmtk`
exit 0). Both in `tests/tool_rows_tests.ts` (30).

**sw119, i32 overflow — ✅ FIXED 2026-10-24, on by default (see the 2026-10-24 entry at the top).**
(`65536 * 65536` → 0, Deno 4294967296): first "not counted" as the
declared-type contract; **owner 2026-10-19: the operator gives JavaScript's result, and storing a
value that does not fit an `i32` slot throws** (design-decisions.md § "Owner's rulings of
2026-10-19", rule 4). Silent today. **MEASURED 2026-10-19, built behind a switch on branch
`feat/i32-overflow-check` (commit 643a33c, NOT merged; off = byte-identical):** `--i32-check` /
`setI32OverflowCheck(true)` computes `+ - *` of i32s in f64, keeps a chain exact, and checks only
the store into an i32 slot (`$__i32_fit_<op>` throws a RangeError naming the operator; the host
prints it as `Error:`); `x += e` desugars. On the 461 corpus programs that compare with Deno: 460
identical, 1 throws (`45_random-numbers`, an LCG relying on i32 wrapping: it would need wasMath's
`i32.add` / `i32.mul`); size +2.8% (about 150 B fixed per small module, +130% on the tiniest);
an arithmetic-heavy loop about 2.3× slower end to end, no change on the corpus's run time. NOT
covered yet (they still wrap with the switch on): console.log's own operator path, template
parts, `++` / `--`. Waiting on the owner: finish those and turn it on by default? **Dead code / stale, verified by grep** (cleanup, not bugs): main.ts:418-421
(`wast`'s unreachable `!target`); utils.ts:232-249 (Javy interception), :256-264 (`console.log`
UTF-16 shim), :292-307 (library-call branch: REACHABLE since sw115's fix, 2026-10-19); unused
`getImportInfo`, `v128`, `funcref`, `externref`, `applyNames` (utils.ts:33, :49-56); utils.ts:168
`fd_stat_put` is not a WASI function; stale comments wasmmerge.ts:138 (`DATA_PTR_THRESHOLD`),
wasmbundle.ts:136-142, wasic.ts:23106, modc.ts:6-10, wasic.ts:23184; orphaned doc comments
~~witgen.ts:35~~ (removed 2026-10-19), zigwasic.ts:204; main.ts:127 / :194 compute the same value.



