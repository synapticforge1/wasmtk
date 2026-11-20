# Load-bearing design decisions

> **Split by size on 2026-11-20 (letter H38): this file is part 1 of 9.** The sections continue in:

- [design-decisions-2.md](design-decisions-2.md): from "Nullable FIELDS carry a flag word, like nullable locals (owner, 2026-1"
- [design-decisions-3.md](design-decisions-3.md): from "Numeric / codegen correctness (continued)"
- [design-decisions-4.md](design-decisions-4.md): from "Merge (wasmmerge) invariants"
- [design-decisions-5.md](design-decisions-5.md): from "Class / feature codegen"
- [design-decisions-6.md](design-decisions-6.md): from "Async / Promise (#13, 2026-06-15) — load-bearing invariants"
- [design-decisions-7.md](design-decisions-7.md): from "Tooling"
- [design-decisions-8.md](design-decisions-8.md): from "Tooling (continued)"
- [design-decisions-9.md](design-decisions-9.md): from "Tooling (continued)"

Invariants and codegen rules that are easy to break in a refactor and must NOT be silently
reverted. The exhaustive list (with line numbers) is in the legacy `CLAUDE.md`; this is the
high-value subset.

## 🔒 Licence: MIT OR Apache-2.0, dependencies inventoried (owner, 2026-11-20)

- "We need to be compliant with licensing with dependencies, with wasmtk specifically we are dual
  licenced as APACHE and MIT." `deno.json` had said `MIT` alone while `LICENSE-APACHE` shipped.
- Third-party code copied INTO wasmtk keeps its notice in `NOTICE.md` (fdlibm today); a dependency
  resolved from a registry carries its own; `deno task check-licences` holds the inventory.
- Round 6's findings, already in GitHub history (`8e627039`): left as they are (owner: "Leave it").

## 🔒 How the review and release rules changed on 2026-11-20 (H37, H38)

- **The review words:** until 2026-11-20 three — "review" (a targeted code review in rounds),
  "security review" (seven surfaces), "hardening review" (seven axes), with a security and a
  hardening review REQUIRED before a release (H35). Now the final standard's five classes and seven
  words (working-rules.md § Owner commands).
- **The release gate 0g:** until 2026-11-20 it read two record paragraphs in the release's entry in
  `cmem/release.md`, in a strict form (`**Security review (vX.Y.Z):** <scope>; rounds <n>; ended by
  an empty round (round <n>, <date>).`), and refused any line of release.md that could hide text
  (a code fence, a line starting with `<`, 4-space or tab indentation, a setext line, a lone CR, a
  line of non-space whitespace) — rounds 1–5 of the release-tooling review hardened that parser.
  CI repeated it on the bump commit (`release.ts --verify-commit`, round 2's R2-B). Now 0g reads
  `Review complete: <commit>` in the gitignored issues file (`scripts/review-gate.ts`), CI runs no
  check at all (owner, 2026-11-17), and the parser, its plain-Markdown rule and `--verify-commit`
  are deleted. **Why:** the issues may not be tracked (§ 10), so CI cannot read the review's
  result; the record lived in a tracked file only because the old standard required it.
- **What that gives up, knowingly:** a bump pushed by hand is no longer refused by CI; the rule
  "a version change reaches main only through `deno task release`" (working-rules.md) replaces the
  check. Review round 6's CI findings (R6-A1–A4) concern jobs that still exist; its local findings
  L3 / L4 concerned the deleted parser.
- **The memory layout (H38):** the INDEX was a 36 KB table of per-file status lines; it is a router
  now, the rules moved to working-rules.md, the old INDEX is in `archive/INDEX-to-2026-11-20.md`.

## 🔒 Every system call is in `src/host.ts` (H39, owner 2026-11-19; built 2026-11-20)

- **`src/host.ts` is the ONLY file of the product (`main.ts`, `src/`) that touches the system**:
  files, folders, temp folders, paths (`basename` / `dirname` / `join` / `resolve` are re-exported
  from it), the environment, the arguments, the streams, exit, starting programs, the OS / CPU.
  `deno task check-host` fails otherwise (R1 imports, R2 `Deno` / `Bun` / `process` / `require`,
  R3 `host.build` branches, R0 unreadable file). A new need is a new `host` function, never an
  exemption. The compiler core may not use `host` at all (wasic_seam_tests).
- **Writes are atomic**: a temporary file beside the target, then a rename (with the os error 32
  retry); a failed write leaves the old file. A DEVICE (`NUL`, `CON`, … on Windows with any
  extension; `/dev/…`, `/proc/self/fd/…`) is written in place — on Deno + Windows through its
  `\\.\` name (ld136) — and gets no `.wit` beside it (ld137).
- **`wasmtk --self-check`** tries every `host` operation on the machine it runs on; it runs only
  when asked, alone (other arguments are refused), and removes its temp folder. When a `host`
  function is added, add its step.
- **`host.exit` is a METHOD with `never` written out**, and `host` is declared with an explicit type:
  otherwise TypeScript does not end the code path after `host.exit(…)` (TS2534 / narrowing lost).

## A discriminated-union field shared by several variants is RESOLVED, never skipped (added 2026-07-30)

- **The union super-struct has ONE slot per field name, and its type must hold EVERY variant's
  value.** `buildDuSuperStructFields` resolves each unique name across all variants first, then
  lays out offsets from the resolved types. Do not go back to
  `if (seen.has(f.name)) continue` — that silently gave the slot the FIRST variant's type, storing
  `25.5` as the i32 `25` and emitting `i32.load` where an f64 was required. See compiler-bugs.md.
- **Widening is only legal between numeric scalars** (`widenDuFieldType`: i32/f32 → f64, i32 → i64).
  It is correct precisely because `i32`/`f64` are `number` aliases, so TypeScript sees one field
  type and no conflict — wasic must not be narrower than the source language here. `i64` vs `f64`
  does NOT widen: neither represents the other without loss.
- **Any other collision throws from the PARSER, not via `diagnostics`.** Diagnostics are reported
  only after a successful transpile, so a conflicting layout crashes downstream first and the
  user sees `Offset is outside the bounds of the DataView`. The parser is the only place that can
  name the union, the field, and both types.
- **The layout code is shared by both union parser passes** — inline `{…} | {…}` blocks and
  `type X = A | B` named variants. They were duplicated and had already drifted (only the named
  pass set `structType`). Keep them on the one helper; this is the same parallel-code-path trap as
  the binary-op loops below. Regression: `19_UnionSharedFieldWidening`.

## Namespace member references are rewritten inside the body (added 2026-07-30)

- **`expandNamespaces` must rewrite BOTH the declarations and the bare references.** Renaming
  `export const GRAVITY` → `PhysicsEngine_GRAVITY` without touching `return mass * GRAVITY` inside
  the same namespace leaves the body pointing at a name that no longer exists. Collect the member
  names BEFORE renaming, then substitute bare occurrences in the transformed body.
- **Three guards are load-bearing** and must not be dropped: skip occurrences inside a
  string/template literal (`buildStringLiteralMask` — otherwise a member name mentioned in a
  message gets mangled), after a `.` (a struct FIELD may share the member's name), and after `_`
  (the token is already prefixed, e.g. `Cfg_LIMIT`).
- **QUALIFIED uses are rewritten too: `Ns.member` → `Ns_member`.** This is what makes a namespace
  member an ORDINARY top-level symbol, so every existing path (string consts, the string-return
  side-channel, concat, comparison, arrays, structs) handles it without a per-type special case.
  Resolving qualified uses ad hoc at each site is what left `string` members broken — a
  `export const NAME: string` read as `0` and a string-returning namespace function failed to
  instantiate, because the numeric-constant and dot-call branches didn't know the string ptr/len
  ABI. Do NOT reintroduce per-site resolution; extend the rewrite instead.
- **The qualified rewrite matches only exact (namespace, member) pairs** collected during
  expansion, so an unrelated `obj.member` is never touched, and literal content is skipped by the
  same mask. Regression: `30_NamespaceStringMembers`.

## Narrowing must resolve to a REAL registered layout, never a synthesised one (added 2026-07-30)

- **A type predicate's target is only usable for narrowing if it names a layout that actually
  exists.** `emitBlock`'s predicate handler swaps the variable's `structVars` def for the target's;
  the pointer is unchanged, so the new def must describe the memory that pointer already refers to.
- **Never build a `StructDef` from an inline object type just to have something to narrow to.** Its
  offsets would be computed independently of the allocation the pointer refers to: it would agree
  with a matching declared type only by coincidence, and disagree with a DU super-struct by
  construction. `resolveInlineStructTarget` therefore MATCHES the inline shape to an existing
  registered def (exact field-name set + mapped WAT type) and returns `null` rather than inventing
  one.
- **Skipping narrowing is safe only when the variable's own def already covers every field the
  target names.** That is exactly the discriminated-union case — the Phase 32 flat super-struct
  carries all variants' fields at their real offsets — and it is why an inline DU predicate works
  with no narrowing at all. When a named field is NOT on the current def, there is no layout to read
  against and the compile aborts; do not downgrade that to a warning, because the read that follows
  is a plausible-looking wrong number (it printed `0` where TS printed `5`). Regressions:
  `34_InlinePredicateTargetNarrowing`, `34_InlinePredicateUnresolvable`.
- **The function-header return-annotation regex is a parse gate for the WHOLE function, not just the
  return type.** A shape it fails to match hits `continue // malformed header — skip`, so the
  function silently disappears from the module and its call sites report "Unknown function" — a
  diagnostic that blames the caller for a problem in the declaration. When adding a return-type form,
  remember failure mode is *function vanishes*, not *return type defaults*.

## A struct parameter's layout must be a PREFIX of the argument's (added 2026-07-30)

- **Structs are passed by pointer and the callee reads fields at ITS OWN parameter type's offsets.**
  Passing a different struct type therefore only works when the parameter type is a byte-exact
  layout prefix of the argument type (same field name, offset, WAT type and size). This has always
  been the model — Phase 33's README row states it — but until 2026-07-30 nothing enforced it, so
  `type Sprite = Renderable & Transform` passed to `(t: Transform)` silently read `alpha`/`scaleX`
  as `scaleX`/`scaleY` (printed `1.6`, expected `6`).
- **`checkStructArgLayouts` is a hard abort, not a warning.** Do not downgrade it. The program is
  valid TypeScript, so there is no downstream trap to catch it — the alternative is wrong numbers.
- **It runs at THREE call-emission sites**: the expression and statement forms in `wasic.ts`, plus
  `console_log.ts` via the injected `setStructArgLayoutChecker` hook (a call nested in a
  `console.log` argument never reaches `wasic.ts`'s emitters — this exact gap made the first version
  of the fix look like a no-op). Any new call-emission path needs the check too.
- **Intersection field order is therefore load-bearing.** `parseIntersectionTypes` merges
  constituents in declaration order, so `type T = A & B` is prefix-compatible with `A` and NOT with
  `B`. Do not "normalise" that order (alphabetically, by size, or to pack tighter) — it would break
  every base-typed parameter that compiles today. Regressions: `33_IntersectionBasePrefixGuard`
  (rejected shape), `33_IntersectionPrefixOk` (the four shapes that must keep compiling).

## Same-precedence operator groups split at the RIGHTMOST operator (added 2026-07-29)

- **`*`, `/` and `%` are ONE left-associative precedence group.** Both binary-op loops iterate an
  operator TABLE and split at the first match, so a group member appearing earlier in the table
  wins even when another member sits further right — that parsed `a * b / c` as `a * (b / c)`, i.e.
  right-associative, giving `180 * 5 / 9 = 0` and `180 * 5 % 9 = 900`. The `MUL_GROUP` guard skips a
  candidate when another member occurs further right. Do not remove it, and do not "simplify" it by
  reordering the table — no fixed order fixes both `a * b / c` and `a / b * c`.
- **The guard MUST exist in BOTH loops** — `emitExpr` (`wasic.ts`) and `exprToWat`
  (`console_log.ts`). Fixing only one left `console.log("x:", a * 5 % 9)` emitting
  `(i32.mul … (f64.rem …))`. These two loops are permanent parallel code paths: any operator
  precedence/associativity change belongs in both.
- 🔒 **`console_log.ts` reports through `setConsoleDiagnosticSink` (2026-09-29, H12 sw02).** Until
  then it had NO error path: every argument it could not emit became `""` or a `0` in the output,
  which is the shared root of most console silent-wrong rows. wasic sets the sink around both
  `parseConsoleLogArgs` calls and drops messages inside a `quietEmit` probe. **A new console
  fallback reports through the sink; it never returns a stub silently.** Wired into `exprToWat`'s
  terminal fallback 2026-09-30: an expression it has no handler for goes first to wasic's
  `emitExpr` (`setExprFallbackResolver`: a speculative probe, diagnostics rolled back, a stub or
  `unreachable` in its output is a refusal, a STRING is never returned as a number), accepted only if
  it WIDENS to the expected type without loss (`widenNumeric`: a float into an integer, or i64 into
  i32, is refused, because it means the console path guessed the type wrong); otherwise the sink
  reports `cannot emit the expression …` and the compile aborts. Do not reintroduce a silent
  `(;? … ;) 0`: 0 of the corpus's 489 golden outputs reached it, and 9 round-1 bugs did.
- **The conditional operator is RIGHT-associative; binary operators are left.** `findTopLevelOp`
  returns the LAST match, which is right for `a - b - c` and wrong for `a ? b : c ? d : e`. Split a
  ternary with `splitTernary` (first `?`, then the `:` that matches it), never with
  `findTopLevelOp(…, "?")`. wasic's own numeric ternary still has the wrong grouping (sw12).
- **A ternary evaluates ONE branch.** `select` evaluates both; use it only when both operands are
  side-effect-free AND share no temp local. The console string ternary is an `if` for that reason.
- **`+`/`-` intentionally have no guard.** `a + (b - c)` equals `(a + b) - c` in exact arithmetic, so
  there is no integer bug; they CAN differ in f64 rounding, which is a known, accepted nuance (the
  `+` path also carries string-concat logic, so changing it is higher-risk than the payoff).

## console.log operand typing: a literal or paren LHS has no type (added 2026-07-29)

- **The operand type is taken from the LHS lead atom, which an integer literal and a parenthesised
  group both lack** — so `console.log("x:", 1 + n)` and `console.log("x:", (n + 0) * 5)` emitted
  f64 ops over i32 operands and failed to instantiate, while `n + 1` worked. Both now fall back to
  the first TYPED atom: the RHS for an integer-literal LHS, inside the group for a parenthesised one.
- **The fallback must be applied in BOTH decisions** — `parseSingleArg` (which picks the segment
  KIND, `i32expr` vs `f64expr`) and `exprToWat` (which picks the WAT OPS). Fixing only one yields
  `$__i32_to_str` wrapped around f64 arithmetic.
- **A FLOAT literal LHS keeps f64** (`1.5 + n` is genuinely f64), and the fallback is deliberately
  NOT applied to a call LHS — scanning there would take an argument's type instead of the return
  type. Keep it narrow to those two shapes.

## String enums carry BOTH a tag and a text (added 2026-07-29)

- **Every string enum member gets a synthetic i32 tag, pure or heterogeneous.** Gating tag
  assignment on `hasString && hasNumeric` left a PURE string enum with no `enumValues` entry, so
  `const a: LogLevel = LogLevel.Error` and `a === LogLevel.Error` aborted as unsupported. The tag is
  the runtime representation; `enumStringValues` holds the display text.
- **Printing a string-enum VARIABLE needs the runtime ladder `$__enum_str_<Enum>`** — the variable
  holds the tag, not the text. `stringEnumVars` (populated from params and both pre-scans) drives
  `setEnumStrVarResolver`, which must be consulted BEFORE console_log's simple-identifier handler or
  the raw tag is printed. Member access (`LogLevel.Info`) stays a compile-time lookup.
- **The `$__str_op_ptr`/`$__str_op_len` prologue must cover it** — the ladder returns multi-value
  (ptr,len) captured into that pair; without the extra condition the WAT references undeclared
  locals.

## `console_log.ts` scanners must skip string literals too (added 2026-07-28)

- **`findTopLevelOp` in `console_log.ts` masks string literals via the local `literalMask()`.** It
  counts `()`/`[]` for depth; without the mask a closing `]`/`)` INSIDE a literal drove depth above
  0 and hid the top-level operator, so `console.log(w + "]")` silently printed `0`. This is the same
  bug class as the wasic-side scanners below — the console_log twin was simply never done. Do not
  remove the `if (inStr[i]) continue;` guard.
- **`literalMask()` is a deliberate DUPLICATE of `wasic.ts`'s `buildStringLiteralMask`.**
  `console_log.ts` is imported BY `wasic.ts`, so it cannot import back without a cycle. Keep the two
  implementations in sync; if one gains escape/template handling, mirror it.
- **Parity rule for join-like features:** `console_log.ts` may implement a fast path (e.g. the
  `joinarr` segment writing into the gather scratch buffer), but the feature must ALSO have a
  string-VALUE form reachable from `emitStringPtrLen`, or it works only inside `console.log`.
  `$__dynarr_join_str_i32`/`_f64` wrap the scratch writer to supply that value form.

## String methods: `emitStringPtrLen` must stay at PARITY with `emitStringAssign` (added 2026-07-28)

- **Every string-producing method must be implemented in BOTH entry points.** `emitStringAssign`
  handles the RHS of a string assignment; `emitStringPtrLen` handles a string used as a
  console.log argument, a comparison operand, or a call argument. A method present in only the
  first works when assigned to a variable and **silently emits `0`** when used inline — the
  compiler's worst failure mode, and exactly what happened to `trim`/`charAt`/`repeat`/`replace`/
  `replaceAll` from Phase 27 until 2026-07-28. When adding a string method, add it to both.
- **Resolve the receiver by recursing through `emitStringPtrLen`, never by gating on
  `locals.get(recv) === "string"`.** The recursion is what makes a variable, a string LITERAL, a
  string-array element, and a string-returning call all work with one handler (this is the
  long-standing `padStart` pattern). The `locals` gate silently rejects literal receivers.
- **`stringReceiverParts()` exists for the cases that need ptr and len SEPARATELY** — `slice`'s
  defaulted `end` and `.at`'s negative-index normalization can't use the multi-value pair. It
  returns null for unrecognized receivers so callers fall through to their existing paths; keep
  that null-return contract.
- **Gate on arity before emitting.** The generic Phase 27 block checks the arg count per method
  (0 for the trim family, 1 for `charAt`/`repeat`, 2 for `replace`/`replaceAll`) and falls through
  on a mismatch, rather than emitting a call with a mismatched signature.

## Struct-type detection uses the REGISTRY, not capitalization (added 2026-07-28)

- **Never gate a struct/class type annotation on `/^[A-Z]/`.** The authoritative test is
  `structDefs.has(name)` / `classDefs.has(name)`; the PascalCase spelling test is only a proxy and
  it is WRONG for `tsbundler` output — imported types are prefixed with the module's (lower-case)
  filename, so `Vec2` in `vec.ts` becomes `vec_Vec2`. That broke every multi-file struct import
  (`bundle_tests.ts` StructImport) and any hand-written lower-case interface. The eight
  struct-annotation regexes therefore match `(\w+)` and rely on the registry lookup that
  immediately follows; do not "tighten" them back to `([A-Z]\w*)`.
- **Ordering that makes this safe:** `parseStructs()` (18579) and `parseClasses()` (18580) both run
  before `parseFunctions()` (18606), so a registry lookup inside `parseFunctions` is populated. If
  a pass is ever reordered ahead of `parseStructs`, its struct-type lookups become empty.
- **The function-param `structType` gate is additive on purpose** — PascalCase OR a registered
  struct/class name. It has no registry guard downstream (unlike the other sites), so narrowing it
  to registry-only would drop TypedArray/DU/tuple-alias params that rely on the capitalization arm.
- **Do NOT "fix" this in the bundler** by capitalizing the mangled prefix: it hides the same bug for
  hand-written lower-case type names and breaks tsbundler's documented invariant that the canonical
  name is always `<module>_<original>`.

## Nullable (`T | null`) + cast invariants (added 2026-07-28)

- **Each `for…of` loop needs its OWN cursor local.** `forOfIdxLocal()` returns `__forof_idx` at
  depth 0 and `__forof_idx<N>` deeper; `forOfDepth` is incremented around the loop-body emission in
  BOTH for-of emitters (the `isStringArr` one and the general one). Do NOT collapse these back to a
  single shared `$__forof_idx` — the inner loop then clobbers the outer cursor and the outer loop
  runs exactly one iteration (silently wrong: a 3×2 matrix summed to 3 instead of 21). Depth 0 keeps
  the unsuffixed name deliberately, so non-nested loops emit byte-identical WAT. Both pre-scans
  declare one cursor per `for…of` statement (an upper bound on nesting depth), so any name
  `forOfIdxLocal()` can return is always declared.
- **A nullable annotation must NEVER fall through to the plain-module-global path.** In
  `parseModuleGlobals` the annotation group accepts `T | null`; when the nullable branch declines to
  promote, it MUST `remaining.push(line); continue;`. Letting it reach the ordinary global path
  registers a global with no `__null` companion while every reference site still emits
  `local.get $x__null` (this exact regression broke `24_NullUndefined` + `25_NullishOps`).
- **Module-level nullables are promoted to globals ONLY when a non-`_start` function references
  them.** A nullable used purely at top level stays in `startBodyLines` and becomes a `_start` local
  with its `$x__null` companion local — which is what every existing nullable reference site emits.
- **`moduleNullableGlobals` is persistent; `nullableVarInnerType` is per-function.** Re-seed the
  latter from the former after BOTH resets (`emitFunction` and the `_start` pre-scan), or `g ??= v`
  stops resolving inside function bodies.
- **Set `needsNullableResultFlag` at the site that REFERENCES `$__nullable_ret_flag`** (the
  nullable-return branch), not only where nullable variables are declared — a caller relying on
  inference (`const n = maybeGet()`) otherwise leaves the global undeclared.
- **A `T | null` function returning an aggregate literal must delegate to the aggregate-return
  emitters.** The nullable-return branch short-circuits with a plain `emitExpr`; for `[…]`/`{…}`
  whose return type resolves to a `StructDef`, hand off to the struct/tuple paths instead, or the
  generic array-literal emitter assumes uniform elements and emits `(i32.const 3.14159)` for an f64
  tuple field. Keep the `StructDef` guard so plain `i32[] | null` returns keep their own path.
- **`expr as T` must not assume an `i32` source for compound expressions.**
  `compoundExprIsAlwaysF64()` types the two forms that `emitExpr` emits as f64 regardless of the
  requested `defaultType`: a depth-0 `**` (always `$mathlib_pow`) and a whole-expression
  `Math.fn(...)` whose `fn` is not in `MATH_I32_AWARE` (`abs`/`min`/`max`/`imul`/`clz32` — the only
  handlers that branch on `defaultType`). Keep it whole-expression-only: a merely f64-*containing*
  expression must keep the i32 default. Do NOT replace it with a blanket `inferExprType` fallback —
  `inferInitType` returns "f64" for anything parenthesized, which breaks parenthesized i32
  arithmetic cast to f64.
- **`??` inside `console.log`/`console.error` args routes through `setNullishResolver`.**
  `console_log.ts` has no view of the nullable tables, so it delegates to `emitExpr`. The check must
  sit BEFORE the boolexpr and ternary blocks in `parseSingleArg` — the `_hasTernary` probe matches
  the leading `?` of `??` and otherwise swallows it. (Same singleton pattern as
  `_instanceofResolver`; set and cleared around each `parseConsoleLogArgs` call at BOTH sites.)
