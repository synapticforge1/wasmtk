/**
 * @module console_log
 * @description Converts TypeScript console.log(...) calls into WASI fd_write WAT instructions.
 *
 * Handles all common argument patterns:
 *   - String literals:       console.log("hello")
 *   - Numeric variables:     console.log(x)          [i32 or f64]
 *   - Multiple arguments:    console.log("x =", x)   [space-separated]
 *   - Concatenation:         console.log("val: " + x)
 *   - Template literals:     console.log(`val: ${x}`)
 *
 * Each argument segment becomes one iovec entry, allowing fd_write to output all
 * parts in a single syscall with no intermediate string buffer needed.
 *
 * Memory layout (first 260 bytes — wasic.ts must reserve this region):
 *
 *   Offset     Size    Purpose
 *   ──────────────────────────────────────────────────────────────────
 *   0          128     iovec array  (up to 16 entries × 8 bytes each)
 *   128        4       nwritten result for fd_write
 *   132        128     numeric-to-string scratch  (4 slots × 32 bytes)
 *   260        …       string data section (managed by DataAllocator)
 *
 * Helper functions emitted into the WAT module (only when numeric args appear):
 *   $__i32_to_str  (param $val i32) (param $buf i32) (result i32)
 *   $__f64_to_str  (param $val f64) (param $buf i32) (result i32)
 *     → Both write a decimal string at $buf and return the byte length written.
 *     → f64 outputs the integer part followed by up to 6 significant decimal digits
 *       (trailing zeros stripped). Precision beyond 6 digits is truncated.
 */

import { implicitTruncDiagnostic, intDivisionDiagnostic } from "./wasmath_lower.ts";

// ---------------------------------------------------------------------------
// Memory layout constants
// ---------------------------------------------------------------------------

/** Base of the iovec scratch array. Each iovec is 8 bytes: [ptr: i32, len: i32]. */
export const IOV_BASE = 0;

/** Offset of the 4-byte nwritten result written by fd_write. */
export const NWRITTEN_OFFSET = 128;

/** Base of the numeric-to-string scratch area. */
export const SCRATCH_BASE = 132;

/** Number of scratch slots (32 bytes each). Limits numeric args per console.log call. */
export const SCRATCH_SLOTS = 4;

/** First byte available for static string data. */
export const DATA_BASE: number = SCRATCH_BASE + SCRATCH_SLOTS * 32; // 260

// ---------------------------------------------------------------------------
// Escape-sequence processing
// ---------------------------------------------------------------------------

/**
 * Converts TypeScript/JavaScript escape sequences in a raw source string
 * (the content between the surrounding quote characters) to their actual
 * character values. The surrounding quotes must NOT be included.
 *
 * Supported sequences:
 *   \n \r \t \b \f \v \0  \\ \' \" \`
 *   \xHH          (hex byte, exactly 2 hex digits)
 *   \uHHHH        (Unicode code point, exactly 4 hex digits, UTF-8 encoded)
 *   \u{H…}        (Unicode code point, variable hex digits, UTF-8 encoded)
 *
 * Malformed sequences (e.g. \x with fewer than 2 hex digits) are passed
 * through unchanged so the compiler never silently loses source content.
 */
export function unescapeString(raw: string): string {
  if (!raw.includes("\\")) return raw; // fast path: no escapes present
  let result = "";
  let i = 0;
  while (i < raw.length) {
    if (raw[i] !== "\\") {
      result += raw[i++];
      continue;
    }
    i++; // skip the backslash
    if (i >= raw.length) {
      result += "\\";
      break;
    }
    const ch = raw[i];
    switch (ch) {
      case "n":
        result += "\n";
        i++;
        break;
      case "r":
        result += "\r";
        i++;
        break;
      case "t":
        result += "\t";
        i++;
        break;
      case "b":
        result += "\b";
        i++;
        break;
      case "f":
        result += "\f";
        i++;
        break;
      case "v":
        result += "\v";
        i++;
        break;
      case "0":
        result += "\0";
        i++;
        break;
      case "\\":
        result += "\\";
        i++;
        break;
      case "'":
        result += "'";
        i++;
        break;
      case '"':
        result += '"';
        i++;
        break;
      case "`":
        result += "`";
        i++;
        break;
      case "x": {
        const hex = raw.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          result += String.fromCharCode(parseInt(hex, 16));
          i += 3; // skip 'x' + 2 hex digits
        } else {
          result += "\\x";
          i++; // malformed — pass through
        }
        break;
      }
      case "u": {
        if (raw[i + 1] === "{") {
          // \u{H…} variable-length code point
          const end = raw.indexOf("}", i + 2);
          if (end !== -1 && end > i + 2) {
            const hex = raw.slice(i + 2, end);
            if (/^[0-9a-fA-F]+$/.test(hex)) {
              result += String.fromCodePoint(parseInt(hex, 16));
              i = end + 1;
            } else {
              result += "\\u{";
              i++;
            }
          } else {
            result += "\\u{";
            i++;
          }
        } else {
          // \uHHHH exactly 4 hex digits
          const hex = raw.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result += String.fromCodePoint(parseInt(hex, 16));
            i += 5; // skip 'u' + 4 hex digits
          } else {
            result += "\\u";
            i++;
          }
        }
        break;
      }
      default:
        result += ch;
        i++; // unknown escape → pass the character through
        break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Segment types
// ---------------------------------------------------------------------------

/**
 * Callback for looking up a function's parameter types by name.
 * Return `undefined` if the function is unknown; parameter types default to "i32".
 */
export type FuncLookup = (name: string) => {
  params: Array<{ type: string; defaultValue?: string; structType?: string }>;
  result?: string | null;
  closureCaptures?: string[];
  /** Phase 5f: true if this function returns a heap-allocated closure (closure factory). */
  isClosureFactory?: boolean;
  /** Original TypeScript return type annotation (e.g. "i32[]", "MatrixManager"). */
  resultTsName?: string;
} | undefined;

/**
 * Callback type: allocates a static string in the WASM data section and returns
 * its [memoryOffset, byteLength]. Identical strings should return the same offset.
 */
export type DataAllocator = (text: string) => [offset: number, byteLen: number];

/**
 * Module-level string-array allocator: set by wasic.ts before calling parseConsoleLogArgs,
 * cleared afterward. Compilation is synchronous so no concurrency risk.
 */
let _strArrAlloc: ((elements: string[]) => number) | undefined = undefined;
/**
 * Inject the callback that allocates an inline string-array literal into the WASM data section
 * and returns its base pointer, used when emitting `console.log` of a string array. Pass
 * `undefined` to clear it.
 */
export function setStringArrayAllocator(fn: ((elements: string[]) => number) | undefined): void {
  _strArrAlloc = fn;
}

let _structLiteralAlloc:
  | ((structName: string, initFields: Record<string, string>) => number)
  | undefined = undefined;
/**
 * Inject the callback that allocates an inline struct literal (by struct name + field values) into
 * the WASM data section and returns its base pointer, used when a struct literal appears as a
 * `console.log` argument. Pass `undefined` to clear it.
 */
export function setStructLiteralAllocator(
  fn: ((structName: string, initFields: Record<string, string>) => number) | undefined,
): void {
  _structLiteralAlloc = fn;
}

let _structArgLayoutCheck: ((callee: string, argList: string[]) => void) | undefined = undefined;
/**
 * Inject the callback that validates struct-pointer arguments of a direct call against the
 * parameter types they bind to (Phase 33 layout-prefix guard). This module knows the call's
 * argument TEXT but not the struct layouts, so wasic.ts owns the check; without this hook a
 * `console.log(f(x))`-nested call would bypass it entirely. Pass `undefined` to clear it.
 */
export function setStructArgLayoutChecker(
  fn: ((callee: string, argList: string[]) => void) | undefined,
): void {
  _structArgLayoutCheck = fn;
}

/** Called when exprToWat emits a $__str_cmp call so wasic can enable the helper. */
let _strCmpNeeded: (() => void) | undefined = undefined;
/**
 * Inject the callback invoked when this module emits a `$__str_cmp` call, signaling wasic to emit
 * the string-comparison helper. Pass `undefined` to clear it.
 */
export function setStrCmpNeededCallback(fn: (() => void) | undefined): void {
  _strCmpNeeded = fn;
}

/** Requests one of wasic's math helpers by name (`i32_abs`, `f64_sign`, `f64_hypot3`, …). Set by
 *  wasic.ts around parseConsoleLogArgs. Added 2026-10-06: before it, a console `Math.max` in an i32
 *  context called `$__i32_max` that nothing emitted (ld04). */
let _mathHelperNeeded: ((name: string) => void) | undefined = undefined;
/**
 * Inject the callback that asks the compiler to emit a math helper the console path calls. Pass
 * `undefined` to clear it.
 */
export function setMathHelperNeededCallback(fn: ((name: string) => void) | undefined): void {
  _mathHelperNeeded = fn;
}

/** Callback to get the function table index for a named function. Set by wasic.ts around parseConsoleLogArgs. */
let _funcTableLookup: ((name: string) => number | undefined) | undefined = undefined;
/**
 * Inject the callback that resolves a named function to its function-table index (returns
 * `undefined` for unknown names), used when a function reference is passed as a `console.log`
 * argument. Pass `undefined` to clear it.
 */
export function setFuncTableLookup(fn: ((name: string) => number | undefined) | undefined): void {
  _funcTableLookup = fn;
}

/** Phase 51: resolve `x instanceof ClassName` to a WAT i32 bool via wasic's emitExpr (which owns
 *  the class tag / inheritance tables). Set by wasic.ts around parseConsoleLogArgs. */
let _instanceofResolver:
  | ((token: string, locals: Map<string, string>) => string | undefined)
  | undefined = undefined;
/**
 * Inject the callback that resolves an `x instanceof ClassName` token to a WAT i32 bool expression
 * via wasic's emitExpr (which owns the class tag / inheritance tables); returns `undefined` when
 * the token isn't an instanceof check. Pass `undefined` to clear it.
 */
export function setInstanceofResolver(
  fn: ((token: string, locals: Map<string, string>) => string | undefined) | undefined,
): void {
  _instanceofResolver = fn;
}

/** Resolve a bare identifier that holds a STRING-ENUM value to a ptr/len pair. Such a variable's
 *  WAT value is the member's synthetic i32 tag, so printing it needs a runtime tag→string mapping
 *  (`$__enum_str_<Enum>`); without this it printed the raw tag. Returns undefined for every other
 *  identifier. Set by wasic.ts around parseConsoleLogArgs. */
let _enumStrVarResolver:
  | ((token: string) => { ptrWat: string; lenWat: string } | undefined)
  | undefined = undefined;
/**
 * Inject the callback that maps a string-enum-typed variable to its member text at runtime.
 * Pass `undefined` to clear it.
 */
export function setEnumStrVarResolver(
  fn: ((token: string) => { ptrWat: string; lenWat: string } | undefined) | undefined,
): void {
  _enumStrVarResolver = fn;
}

/** Resolve a nullish-coalescing token (`a ?? b`) to a WAT expression plus its result type via
 *  wasic's emitExpr, which owns the Phase 24 nullable-variable tables (`$x__null` companions)
 *  this module has no view of. Set by wasic.ts around parseConsoleLogArgs. Returns undefined
 *  when the token has no depth-0 `??`. */
let _nullishResolver:
  | ((
    token: string,
    locals: Map<string, string>,
  ) => { wat: string; type: string } | undefined)
  | undefined = undefined;
/**
 * Inject the callback that resolves an `a ?? b` token to a WAT expression via wasic's emitExpr;
 * returns `undefined` when the token isn't a nullish coalesce. Pass `undefined` to clear it.
 */
export function setNullishResolver(
  fn:
    | ((token: string, locals: Map<string, string>) => { wat: string; type: string } | undefined)
    | undefined,
): void {
  _nullishResolver = fn;
}

/** Resolve `a && b` / `a || b` (sw49): JavaScript gives an OPERAND, not a boolean. wasic answers
 *  `{ wat, type }` for two numbers (the operand form), `{ rewrite }` for a boolean mixed with
 *  another type (a string conditional that prints what JavaScript prints), or undefined (two
 *  booleans, or not a logical expression: the boolean segment below is right). */
let _logicalResolver:
  | ((
    token: string,
    locals: Map<string, string>,
  ) => { wat: string; type: string } | { rewrite: string } | undefined)
  | undefined = undefined;
/** A value that can be null without being a pointer (a nullable local, a flagged struct / tuple
 *  field): wasic answers a rewrite that prints `null` for it, else undefined. A nullable local
 *  printed `null` only as the single argument (sw51, 2026-10-09). `_inNullPrint` keeps the
 *  rewrite's own `${x}` from being rewritten again. */
let _nullPrintResolver:
  | ((token: string, locals: Map<string, string>) => string | undefined)
  | undefined = undefined;
let _inNullPrint = false;
/** True when an expression is a wasMath `u64` (an i64 whose bits print unsigned); wasic owns the
 *  declared types (wasMath L4, 2026-10-13). */
let _u64Resolver: ((expr: string, locals: Map<string, string>) => boolean) | undefined = undefined;
/** Inject the `u64` resolver. Pass `undefined` to clear it. */
export function setU64Resolver(fn: typeof _u64Resolver): void {
  _u64Resolver = fn;
}
/** Marks the i64 segment of a `u64` expression `unsigned` (printed by `$__u64_to_str`). */
function markU64(segs: LogSegment[], token: string, locals: Map<string, string>): LogSegment[] {
  const only = segs.length === 1 ? segs[0] : undefined;
  if (only && (only.kind === "i64var" || only.kind === "i64expr") && _u64Resolver?.(token, locals)) {
    only.unsigned = true;
    _mathHelperNeeded?.("u64_to_str");
  }
  return segs;
}

/** Inject the null-printing resolver (sw51). Pass `undefined` to clear it. */
export function setNullPrintResolver(fn: typeof _nullPrintResolver): void {
  _nullPrintResolver = fn;
}

/** Inject the `&&` / `||` resolver (sw49). Pass `undefined` to clear it. */
export function setLogicalResolver(fn: typeof _logicalResolver): void {
  _logicalResolver = fn;
}

/** Resolve a string-producing expression (e.g. `s.toUpperCase()`, `arr[i].toUpperCase()`) to a
 *  ptr/len WAT pair via wasic's emitStringPtrLen (captured into temp locals). Set by wasic.ts
 *  around parseConsoleLogArgs. Returns undefined when the token isn't a handled string expr. */
let _stringExprResolver:
  | ((token: string, locals: Map<string, string>) => { ptrWat: string; lenWat: string } | undefined)
  | undefined = undefined;
/**
 * Inject the callback that resolves a string-producing expression (e.g. `s.toUpperCase()`,
 * `arr[i].toUpperCase()`) to a ptr/len WAT pair via wasic's emitStringPtrLen; returns `undefined`
 * when the token isn't a handled string expression. Pass `undefined` to clear it.
 */
export function setStringExprResolver(
  fn:
    | ((
      token: string,
      locals: Map<string, string>,
    ) => { ptrWat: string; lenWat: string } | undefined)
    | undefined,
): void {
  _stringExprResolver = fn;
}

/** Delegates an expression `exprToWat` cannot emit to wasic's `emitExpr`, the more complete of the
 *  two parallel expression emitters (a speculative probe on wasic's side: no diagnostic survives
 *  it). Returns the WAT and its numeric type, or undefined. Set by wasic.ts around
 *  parseConsoleLogArgs. Added 2026-09-30 (H12): it runs only where `exprToWat` would otherwise emit
 *  its silent `(;? … ;) 0` stub. */
let _exprFallbackResolver:
  | ((token: string, locals: Map<string, string>) => { wat: string; type: string } | undefined)
  | undefined = undefined;
/**
 * Inject the callback `exprToWat` asks, as a last resort, to emit an expression it has no handler
 * for; it returns `{ wat, type }` or `undefined`. Pass `undefined` to clear it.
 */
export function setExprFallbackResolver(
  fn:
    | ((token: string, locals: Map<string, string>) => { wat: string; type: string } | undefined)
    | undefined,
): void {
  _exprFallbackResolver = fn;
}

/** Widen `wat` from numeric type `from` to `to`, or null when that would lose information (a float
 *  into an integer, i64 into i32). A lossy request means the console path guessed the argument's
 *  type wrong, which must be reported, not truncated. */
function widenNumeric(wat: string, from: string, to: string): string | null {
  const f = from === "bool" ? "i32" : from;
  if (f === to) return wat;
  if (f === "i32" && to === "i64") return `(i64.extend_i32_s ${wat})`;
  if (f === "i32" && (to === "f64" || to === "f32")) return `(${to}.convert_i32_s ${wat})`;
  if (f === "i64" && (to === "f64" || to === "f32")) return `(${to}.convert_i64_s ${wat})`;
  if (f === "f32" && to === "f64") return `(f64.promote_f32 ${wat})`;
  return null;
}

/** Reports an argument this module cannot emit correctly. Set by wasic.ts around
 *  parseConsoleLogArgs; wasic turns it into a compile-aborting diagnostic (unless it is inside a
 *  speculative quietEmit probe). Added 2026-09-29 (H12 sw02): before it, this module had NO error
 *  path, so every unhandled argument became an empty string or a 0 in the output. */
let _diagnosticSink: ((msg: string) => void) | undefined = undefined;
/**
 * Inject the callback that records a console-argument emission this module cannot do correctly;
 * the compiler turns it into an aborting diagnostic. Pass `undefined` to clear it.
 */
export function setConsoleDiagnosticSink(fn: ((msg: string) => void) | undefined): void {
  _diagnosticSink = fn;
}

/**
 * The element layout `$__arr_inspect` reads for an `arrptr` segment's elemType: an array's element
 * type name (as written: `i32`, `f64`, `number`...) or a typed array's name. undefined = no writer
 * (strings, booleans, bigints, structs): the caller refuses it rather than print element bits as
 * numbers (sw66, 2026-10-13). Unannotated numeric names map to f64, as wasic's mapType does.
 */
export function arrInspectKind(elemType: string): number | undefined {
  const typed: Record<string, number> = {
    Int32Array: 0,
    Float64Array: 1,
    Int8Array: 2,
    Uint8Array: 3,
    Uint8ClampedArray: 3,
    Int16Array: 4,
    Uint16Array: 5,
    Uint32Array: 6,
    Float32Array: 7,
  };
  if (elemType in typed) return typed[elemType];
  const t = elemType.trim().toLowerCase();
  if (t === "i32" || t === "int") return 0;
  if (t === "f64" || t === "number" || t === "u32") return 1;
  // ld37 (2026-10-15): booleans, bigints and strings have writers too
  if (t === "bool" || t === "boolean") return 8;
  if (t === "i64" || t === "bigint") return 9;
  if (t === "string") return 10;
  return undefined;
}

/** A call that may print: a user function (helpers are `$__…`) or any indirect call. */
const USER_CALL = /\(call \$(?!__)|\(call_indirect\b/;

/**
 * sw68: when an argument calls a user function, every expression argument is evaluated, in order,
 * into a `$__clt_<type>_<n>` temporary BEFORE the line is built (`pre`), and its segment reads the
 * temporary. Variable segments are locals of this function, which a callee cannot change.
 * The emitting function declares the temporaries it finds (consoleTempLocals).
 */
function hoistCallingArgs(segments: LogSegment[]): { segments: LogSegment[]; pre: string[] } {
  const wats = (s: LogSegment): string[] =>
    "wat" in s ? [s.wat] : s.kind === "joinarr" ? [s.arrWat] : s.kind === "strcall"
      ? [s.callWat]
      : s.kind === "strexpr"
      ? [s.ptrWat, s.lenWat]
      : [];
  if (!segments.some((s) => wats(s).some((w) => USER_CALL.test(w)))) return { segments, pre: [] };
  const pre: string[] = [];
  let n = 0;
  const tmp = (t: "i32" | "i64" | "f64", w: string): string => {
    const name = `$__clt_${t}_${n++}`;
    pre.push(`(local.set ${name} ${w})`);
    return `(local.get ${name})`;
  };
  const out = segments.map((s): LogSegment => {
    switch (s.kind) {
      case "i32expr":
      case "boolexpr":
      case "arrptr":
        return { ...s, wat: tmp("i32", s.wat) };
      case "i64expr":
        return { ...s, wat: tmp("i64", s.wat) };
      case "f64expr":
        return { ...s, wat: tmp("f64", s.wat) };
      case "joinarr":
        return { ...s, arrWat: tmp("i32", s.arrWat) };
      case "strcall":
        pre.push(s.callWat);
        return {
          kind: "strexpr",
          ptrWat: tmp("i32", "(global.get $__str_ret_ptr)"),
          lenWat: tmp("i32", "(global.get $__str_ret_len)"),
        };
      case "strexpr":
        return { kind: "strexpr", ptrWat: tmp("i32", s.ptrWat), lenWat: tmp("i32", s.lenWat) };
      default:
        return s;
    }
  });
  return { segments: out, pre };
}

/** The `$__clt_*` temporaries a function body uses (sw68), as `(local …)` declarations. */
export function consoleTempLocals(body: string, declared: { has(name: string): boolean }): string[] {
  const names = new Set<string>();
  for (const m of body.matchAll(/\$(__clt_(i32|i64|f64)_\d+)\b/g)) {
    if (!declared.has(m[1])) names.add(m[1]);
  }
  return [...names].sort().map((n) => `    (local $${n} ${n.split("_")[3]})`);
}

/** The `$__arr_inspect` call for an `arrptr` segment, appending at the cursor stored at `cursorWat`. */
function arrInspectCall(seg: { wat: string; elemType: string; nameLen?: number }, cursorWat: string): string {
  const kind = arrInspectKind(seg.elemType);
  if (kind === undefined) {
    // parseSingleArg refuses these before emission; reaching here is a compiler bug, never output
    throw new Error(`console.log: no array writer for elements of type '${seg.elemType}'`);
  }
  return `(call $__arr_inspect ${seg.wat} (i32.const ${kind}) (i32.const ${seg.nameLen ?? 0}) ${cursorWat})`;
}

/** Callback to resolve an array variable by name: returns its element type, base ptr, and length.
 *  ptr=-1 means runtime local (param). ptr=-2 means dynamic heap array (local with 8-byte header).
 *  dynamic=true means the array has a [length, capacity] header at its pointer. */
export type ArrayLookup = (name: string) => {
  elemType: string;
  ptr: number;
  length: number;
  dynamic?: boolean;
  /** Phase 31: override shift for sub-word TypedArrays (0=byte, 1=halfword, 2=word, 3=dword) */
  shift?: number;
  /** Phase 31: override load instruction for sub-word TypedArrays */
  customLoadOp?: string;
  /** True when the array is a module-level global (use global.get instead of local.get). */
  isGlobal?: boolean;
  /** True when this is a string array (8-byte elements: [ptr i32, len i32]). */
  isStringArr?: boolean;
  /** Phase 6d: true when this is a 2D array (outer stores i32 row pointers). */
  is2D?: boolean;
  /** The element struct of a struct array: its elements are pointers, never printed as numbers. */
  structTypeName?: string;
} | undefined;

/**
 * Callback to resolve a struct field access `varName.fieldName`.
 * Returns the field's WAT type string and the WAT load expression, or undefined if not a struct field.
 */
export type StructFieldLookup = (
  varName: string,
  fieldName: string,
) => { type: string; watLoad: string; watLoadLen?: string } | undefined;

/**
 * Callback to resolve a dot-call expression like `receiver.method(args)`.
 * Returns the WAT expression and return type, or undefined if not handled.
 * Used by console_log to support class instance/static method calls in argument position.
 */
export type DotCallLookup = (token: string) => { type: string; wat: string } | undefined;

/**
 * Callback to resolve a closure-typed variable call like `varName(args)`.
 * Returns the trampoline funcType string, params, and result, or undefined if not a closure var.
 */
export type ClosureVarLookup = (name: string) => {
  params: string[];
  result: string | null;
  funcType: string; // e.g. "$ftype_i32_r_f64"
} | undefined;

/** True if `e` is KNOWN to be a float: a float literal (`2.5`, `1e3`) or a variable declared
 *  f64 / f32. (sw15's console twin, 2026-10-06.) */
function isKnownFloat(
  e: string,
  locals: Map<string, string>,
  globals?: Map<string, string>,
): boolean {
  const t = e.trim();
  if (/^-?\d+\.\d*([eE][+-]?\d+)?$|^-?\d+[eE][+-]?\d+$/.test(t)) return true;
  if (!/^\w+$/.test(t)) return false;
  const ty = locals.get(t) ?? globals?.get(t);
  return ty === "f64" || ty === "f32";
}

/** A condition by JavaScript truthiness (sw16's console twin, 2026-10-06): a KNOWN float is true
 *  when `|x| > 0` (nonzero, not NaN); anything else is exprToWat at i32, as before. A float
 *  condition used to reach an `if` raw, an invalid module. */
function condToWat(
  cond: string,
  locals: Map<string, string>,
  funcLookup?: FuncLookup,
  allocString?: DataAllocator,
  arrayLookup?: ArrayLookup,
  structLookup?: StructFieldLookup,
  globals?: Map<string, string>,
): string {
  if (isKnownFloat(cond, locals, globals)) {
    const w = exprToWat(
      cond,
      locals,
      "f64",
      funcLookup,
      allocString,
      arrayLookup,
      structLookup,
      globals,
    );
    return `(f64.gt (f64.abs ${w}) (f64.const 0))`;
  }
  return exprToWat(
    cond,
    locals,
    "i32",
    funcLookup,
    allocString,
    arrayLookup,
    structLookup,
    globals,
  );
}

/** Allocates ALREADY-DECODED text (a literal segment's `text`). The DataAllocator unescapes its
 *  input, as source text needs; decoded text was unescaped a second time, so `"C:\\tmp"` printed
 *  `C:<TAB>mp` (sw24, 2026-10-06). Re-escaping the backslashes makes that unescape the identity. */
function allocDecoded(allocString: DataAllocator, text: string): [number, number] {
  return allocString(text.replace(/\\/g, "\\\\"));
}

/** The memory load for a value of WAT type `t`: a local twin of wasic.ts's memLoadOp (this module
 *  is imported BY wasic.ts, so it cannot import back). f32 went to `i32.load` and printed bit
 *  patterns (`xs[1]` → 1075838976; sw43, 2026-10-06). */
function memLoadOp(t: string | undefined | null): string {
  return t === "f64"
    ? "f64.load"
    : t === "i64"
    ? "i64.load"
    : t === "f32"
    ? "f32.load"
    : "i32.load";
}

/** An f32 value at a non-f32 expected type (exprToWat's raw element / field loads): promoted to
 *  f64, or truncated to an integer (sw43 / ld18, 2026-10-06). Anything else is returned as is. */
function f32AsExpected(wat: string, from: string | undefined, to: string): string {
  if (from !== "f32" || to === "f32") return wat;
  if (to === "i32") return `(i32.trunc_f32_s ${wat})`;
  if (to === "i64") return `(i64.trunc_f32_s ${wat})`;
  return `(f64.promote_f32 ${wat})`;
}

/** A struct FIELD's load at the type asked: f32 as `f32AsExpected`, and a lossless widening
 *  (`t.a` of an i32 field in an f64 sum, `t.a + t.b`, was a raw i32 under f64.add: found with
 *  ld10, 2026-10-15). A lossy request keeps the raw load, as before. */
function fieldAsExpected(wat: string, from: string | undefined, to: string): string {
  if (from === "f32") return f32AsExpected(wat, from, to);
  return (from && widenNumeric(wat, from, to)) ?? wat;
}

/** An f32 value at the f64 printer: promoted. Every producer of an `f64expr` segment whose
 *  source type may be f32 goes through this; the raw f32 was an invalid module (ld17,
 *  2026-10-06). */
function promoteF32(wat: string, type: string | null | undefined): string {
  return type === "f32" ? `(f64.promote_f32 ${wat})` : wat;
}

/** A parsed fragment of a console.log argument list. */
export type LogSegment =
  | { kind: "literal"; text: string } // static string (embedded in data section)
  | { kind: "i32var"; name: string } // local i32 variable
  // `strConv`: the i64 is inside a template or concatenation, string conversion, so `12` not
  // console.log's `12n` (sw50, 2026-10-09). Set by parseConsoleLogArgs.
  | { kind: "i64var"; name: string; strConv?: boolean; unsigned?: boolean } // local i64 variable
  // `console`: a WHOLE console argument, printed with console.log's formatting (−0 as `-0`), not
  // string conversion (`${-0}` is `0`). Set by parseConsoleLogArgs only (sw41, 2026-10-06).
  | { kind: "f64var"; name: string; console?: boolean } // local f64 variable
  | { kind: "i32expr"; wat: string } // arbitrary WAT expression yielding i32
  | { kind: "i64expr"; wat: string; strConv?: boolean; unsigned?: boolean } // arbitrary WAT expression yielding i64 (`unsigned`: a wasMath u64, printed unsigned)
  | { kind: "f64expr"; wat: string; console?: boolean } // arbitrary WAT expression yielding f64
  | { kind: "strvar"; ptrLocal: string; lenLocal: string } // string variable (ptr + len i32 locals)
  | { kind: "boolvar"; name: string } // bool-typed local (i32, 0=false 1=true)
  | { kind: "boolexpr"; wat: string } // arbitrary WAT expression yielding bool i32
  // WAT expression yielding an array ptr; nameLen: a typed array's name length (its "Int32Array(n) "
  // prefix is a literal segment before this one, and the layout counts it: sw67)
  | { kind: "arrptr"; wat: string; elemType: string; nameLen?: number }
  | { kind: "joinarr"; arrWat: string; sepPtr: number; sepLen: number; elemType: string } // arr.join(sep)
  | { kind: "strcall"; callWat: string } // void WAT call that sets $__str_ret_ptr/$__str_ret_len
  | { kind: "strexpr"; ptrWat: string; lenWat: string }; // arbitrary WAT expressions yielding string ptr+len

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

/** Splits a top-level comma-separated argument list, respecting nested parens and all string quotes. */
function splitTopLevelArgs(raw: string): string[] {
  const args: string[] = [];
  let depth = 0, inTemplate = false, inDouble = false, inSingle = false, start = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    // Skip escaped characters inside strings
    if ((inDouble || inSingle || inTemplate) && ch === "\\") {
      i++;
      continue;
    }
    if (ch === "`" && !inDouble && !inSingle) {
      inTemplate = !inTemplate;
      continue;
    }
    if (ch === '"' && !inTemplate && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === "'" && !inTemplate && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (!inTemplate && !inDouble && !inSingle) {
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === "," && depth === 0) {
        args.push(raw.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  args.push(raw.slice(start).trim());
  return args.filter((a) => a.length > 0);
}

/**
 * Phase 5f: paren-aware extraction of `factoryFn(outerArgs)(innerArgs)`.
 * Returns { outerRaw, innerRaw } if the pattern is present, otherwise null.
 */
function extractChainedCallParts(expr: string): { outerRaw: string; innerRaw: string } | null {
  const firstParen = expr.indexOf("(");
  if (firstParen === -1) return null;
  let depth = 0, i = firstParen;
  while (i < expr.length) {
    if (expr[i] === "(") depth++;
    else if (expr[i] === ")") {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  const outerRaw = expr.slice(firstParen + 1, i);
  const rest = expr.slice(i + 1).trimStart();
  if (!rest.startsWith("(")) return null;
  let depth2 = 0, j = 0;
  while (j < rest.length) {
    if (rest[j] === "(") depth2++;
    else if (rest[j] === ")") {
      depth2--;
      if (depth2 === 0) break;
    }
    j++;
  }
  return { outerRaw, innerRaw: rest.slice(1, j) };
}

/** Returns true if expr looks like a string-typed expression (literal, string local, or string array element). */
function looksLikeString(
  expr: string,
  locals: Map<string, string>,
  arrayLookup?: ArrayLookup,
): boolean {
  const t = expr.trim();
  if (/^["']/.test(t)) return true; // string literal
  if (/^\w+$/.test(t) && locals.get(t) === "string") return true; // string variable
  const bm = t.match(/^(\w+)\[/);
  if (bm && arrayLookup) {
    const ai = arrayLookup(bm[1]);
    if (ai?.elemType === "string") return true; // string array element
  }
  return false;
}

/** Does `s` read an f64 / f32 struct FIELD (`t.b`, `qs[i].x`)? Such a field makes an i32-led sum a
 *  float, as a float variable does (sw15): `t.a + t.b` was `i32.add` over an f64 (found with
 *  ld10, 2026-10-15). */
function hasFloatField(s: string, structLookup?: StructFieldLookup): boolean {
  if (!structLookup) return false;
  for (const m of s.matchAll(/(?<![\w.])(\w+(?:\[[^\]]*\])?)\.(\w+)\b(?!\s*\()/g)) {
    const t = structLookup(m[1]!, m[2]!)?.type;
    if (t === "f64" || t === "f32") return true;
  }
  return false;
}

/** Is `s` a boolean: `true` / `false`, a boolean variable, `!x`, or a top-level comparison? */
function isBoolOperand(
  s: string,
  locals: Map<string, string>,
  globals?: Map<string, string>,
): boolean {
  const t = s.trim();
  if (t === "true" || t === "false") return true;
  if (/^\w+$/.test(t)) return (locals.get(t) ?? globals?.get(t)) === "bool";
  if (t.startsWith("!") && !t.startsWith("!=")) return true;
  return ["===", "!==", "==", "!=", "<=", ">=", "<", ">"].some((o) => findTopLevelOp(t, o) > 0);
}

/** Is `p`, one side of a top-level `+`, a string, so that the `+` is a concatenation? A literal or
 *  template, a string local, global or array element, a call to a string-returning function, a
 *  string method of a string, `String(…)`, or itself a `+` with a string side (`+` groups from the
 *  left, so `s + n + 1` is `(s + n) + 1`). It knew only literals and string locals: `tag() + 7`
 *  was added as numbers, a stack mismatch (ld05, 2026-10-15). */
function isConcatString(
  p: string,
  locals: Map<string, string>,
  arrayLookup?: ArrayLookup,
  funcLookup?: FuncLookup,
  globals?: Map<string, string>,
): boolean {
  const t = p.trim();
  if (/^["'`]/.test(t) || looksLikeString(t, locals, arrayLookup)) return true;
  if (/^\w+$/.test(t)) {
    const g = globals?.get(t);
    return g === "string" || !!g?.startsWith("string:");
  }
  if (/^String\s*\(/.test(t)) return true;
  const cm = t.match(/^(\w+)\s*\(([\s\S]*)\)$/);
  if (cm && parenDepthNeverNegative(cm[2]!) && funcLookup?.(cm[1]!)?.result === "string") return true;
  const mm = t.match(
    /^(.+?)\.(toUpperCase|toLowerCase|trim|trimStart|trimEnd|slice|charAt|substring|substr|replace|replaceAll|padStart|padEnd|repeat|join|toFixed|toString)\s*\(.*\)$/,
  );
  if (mm && (/^(join|toFixed|toString)$/.test(mm[2]!) || isConcatString(mm[1]!, locals, arrayLookup, funcLookup, globals))) {
    return true;
  }
  const i = findTopLevelOp(t, "+");
  return i > 0 &&
    (isConcatString(t.slice(0, i), locals, arrayLookup, funcLookup, globals) ||
      isConcatString(t.slice(i + 1), locals, arrayLookup, funcLookup, globals));
}

/** Parses a single argument token into LogSegments. */
function parseSingleArg(
  token: string,
  locals: Map<string, string>,
  funcLookup?: FuncLookup,
  allocString?: DataAllocator,
  enumLookup?: (key: string) => number | undefined,
  arrayLookup?: ArrayLookup,
  structLookup?: StructFieldLookup,
  dotCallLookup?: DotCallLookup,
  globals?: Map<string, string>,
  enumStringLookup?: (key: string) => string | undefined,
  closureVarLookup?: ClosureVarLookup,
): LogSegment[] {
  token = token.trim();

  // ── A value that can be null (sw51): `null`, else its value. First, before the handlers that
  // take a plain name or a field access as a number.
  if (_nullPrintResolver && !_inNullPrint) {
    const rw = _nullPrintResolver(token, locals);
    if (rw !== undefined) {
      _inNullPrint = true;
      try {
        return parseSingleArg(
          rw,
          locals,
          funcLookup,
          allocString,
          enumLookup,
          arrayLookup,
          structLookup,
          dotCallLookup,
          globals,
          enumStringLookup,
          closureVarLookup,
        );
      } finally {
        _inNullPrint = false;
      }
    }
  }

  // ── Template literal: `text ${expr} text ...`
  if (token.startsWith("`") && token.endsWith("`")) {
    return parseTemplateLiteral(
      token.slice(1, -1),
      locals,
      funcLookup,
      allocString,
      enumLookup,
      arrayLookup,
      structLookup,
      dotCallLookup,
      globals,
      enumStringLookup,
      closureVarLookup,
    );
  }

  // ── Double-quoted string literal (must be ONE complete literal, not `"a" + "b"`)
  if (isWholeStringLiteral(token, '"')) {
    return [{ kind: "literal", text: unescapeString(token.slice(1, -1)) }];
  }

  // ── Single-quoted string literal
  if (isWholeStringLiteral(token, "'")) {
    return [{ kind: "literal", text: unescapeString(token.slice(1, -1)) }];
  }

  // ── (N).toString(radix) on a literal number → constant-fold to the radix string (e.g.
  // (14).toString(2) → "1110"). Runtime-value radix conversion is not yet supported.
  const toStrRadixLit = token.match(/^\(?\s*(-?\d+)\s*\)?\s*\.toString\s*\(\s*(\d+)\s*\)$/);
  if (toStrRadixLit) {
    const radix = parseInt(toStrRadixLit[2]!, 10);
    if (radix >= 2 && radix <= 36) {
      return [{ kind: "literal", text: parseInt(toStrRadixLit[1]!, 10).toString(radix) }];
    }
  }

  // ── Numeric literal (compile-time constant → embed as string)
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) {
    return [{ kind: "literal", text: String(Number(token)) }];
  }

  // ── Phase 24: null / undefined literals
  if (token === "null") return [{ kind: "literal", text: "null" }];
  if (token === "undefined") return [{ kind: "literal", text: "undefined" }];

  // ── A parenthesised argument or concat operand is its inside, when the outer pair matches
  // (`(a+1)*(a+2)` is a product, sw21). Without it `"x" + (a < b ? "lo" : "hi")` sent the
  // parenthesised ternary down the numeric path, which refused its string branch (sw26).
  if (token.startsWith("(") && token.endsWith(")") && parenDepthNeverNegative(token.slice(1, -1))) {
    return parseSingleArg(
      token.slice(1, -1).trim(),
      locals,
      funcLookup,
      allocString,
      enumLookup,
      arrayLookup,
      structLookup,
      dotCallLookup,
      globals,
      enumStringLookup,
      closureVarLookup,
    );
  }

  // ── String ternary: cond ? strExpr : strExpr → one strexpr (an `if`, one branch evaluated).
  // H12 sw03 (2026-09-29): decided BEFORE every operator handler below. The conditional binds
  // looser than any of them, so the `+` split used to cut `ok ? "pass" : "fail: " + msg` at the
  // `+` INSIDE the else branch and printed `passboom`.
  {
    const tern = splitTernary(token);
    if (tern) {
      const [condPart, thenPart, elsePart] = tern;
      // H12 sw02 (2026-09-29): looksLikeString knows literals, string vars and string-array
      // elements only, so a ternary whose branches were templates, string-method calls or
      // string-returning calls took the NUMERIC path: `flag ? s.toUpperCase() : s.slice(1)`
      // printed `0`, and `n > 3 ? tag(1) : tag(-1)` built an invalid module. Widened HERE only:
      // looksLikeString's other caller (string comparison) is a separate decision.
      const isStringBranch = (b: string): boolean => {
        if (looksLikeString(b, locals, arrayLookup) || b.startsWith("`")) return true;
        if (/\.(toString|toFixed)\s*\(.*\)$/.test(b)) return true;
        const mm = b.match(
          /^(.+?)\.(toUpperCase|toLowerCase|trim|trimStart|trimEnd|slice|charAt|substring|substr|replace|replaceAll|padStart|padEnd|repeat)\s*\(.*\)$/,
        );
        if (mm && looksLikeString(mm[1]!, locals, arrayLookup)) return true;
        const cm = b.match(/^(\w+)\s*\(.*\)$/);
        return !!cm && funcLookup?.(cm[1]!)?.result === "string";
      };
      if (isStringBranch(thenPart) || isStringBranch(elsePart)) {
        // By truthiness: a float condition (`half ? "t" : "f"`) reached the `if` raw (sw16 twin).
        const condWat = condToWat(
          condPart,
          locals,
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        );
        // Recursively parse branches to get strvar/strexpr segments for ptr+len.
        // sw02 (H12, 2026-09-29): a branch that parses to MORE than one segment (a template
        // `` `n=${n}` ``, a concat) used to keep only segs[0] and print `n=`. Such a branch, and
        // any single non-string segment, is now built whole by the string-expression resolver
        // (wasic's emitStringPtrLen), and a branch nothing can build is a diagnostic, not "".
        const getStrPtrLen = (part: string): [string, string] => {
          const segs = parseSingleArg(
            part,
            locals,
            funcLookup,
            allocString,
            enumLookup,
            arrayLookup,
            structLookup,
            dotCallLookup,
            globals,
            enumStringLookup,
            closureVarLookup,
          );
          const s = segs.length === 1 ? segs[0] : undefined;
          if (s?.kind === "strvar") {
            return [`(local.get $${s.ptrLocal})`, `(local.get $${s.lenLocal})`];
          }
          if (s?.kind === "strexpr") return [s.ptrWat, s.lenWat];
          if (s?.kind === "literal" && allocString) {
            const [p, l] = allocDecoded(allocString, s.text);
            return [`(i32.const ${p})`, `(i32.const ${l})`];
          }
          // Anything else (several segments, a slice / method / call that parseSingleArg did not
          // surface as a strvar/strexpr): build the whole branch via emitStringPtrLen.
          const r = _stringExprResolver?.(part.trim(), locals);
          if (r) return [r.ptrWat, r.lenWat];
          _diagnosticSink?.(
            `console argument: cannot build the string ternary branch '${
              part.trim().slice(0, 60)
            }'.`,
          );
          return ["(i32.const 0)", "(i32.const 0)"];
        };
        const [thenPtr, thenLen] = getStrPtrLen(thenPart);
        const [elsePtr, elseLen] = getStrPtrLen(elsePart);
        // sw02: `if`, not `select`. `select` evaluates BOTH branches, so the branch not taken
        // still ran its calls and allocations, and when both branches captured their length in
        // the resolver's shared `$__str_op_len`, the ELSE branch's length always won. Only the
        // chosen branch runs here, and it leaves its own length in `$__str_op_len` (each ptr is
        // evaluated before its len, which is what the resolver's pairs require). Consumers
        // evaluate ptrWat before lenWat.
        return [{
          kind: "strexpr" as const,
          ptrWat: `(if (result i32) ${condWat} ` +
            `(then ${thenPtr} (local.set $__str_op_len ${thenLen})) ` +
            `(else ${elsePtr} (local.set $__str_op_len ${elseLen})))`,
          lenWat: `(local.get $__str_op_len)`,
        }];
      }
      // Both branches BOOLEAN: the result prints `true` / `false`, not `1` / `0` (sw25,
      // 2026-10-06: `n > 0 ? true : false` printed 1). A branch is boolean when it is a boolean
      // literal, a comparison or a negation, or a boolean variable / call.
      const isBoolBranch = (b: string): boolean => {
        const t = b.trim();
        if (t === "true" || t === "false") return true;
        if (/^!(?!=)/.test(t)) return true;
        if (
          ["===", "!==", "==", "!=", "<=", ">=", "<", ">"].some((o) => findTopLevelOp(t, o) > 0)
        ) {
          return true;
        }
        if (/^\w+$/.test(t)) return (locals.get(t) ?? globals?.get(t)) === "bool";
        const cm = t.match(/^(\w+)\s*\(.*\)$/);
        return !!cm && funcLookup?.(cm[1]!)?.resultTsName === "boolean";
      };
      if (isBoolBranch(thenPart) && isBoolBranch(elsePart)) {
        const wat = exprToWat(
          token,
          locals,
          "i32",
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        );
        return [{ kind: "boolexpr", wat }];
      }
    }
  }

  // ── String concatenation: only split on + when at least one side is a string literal
  // or a string-typed local. If both sides are non-strings the + is arithmetic —
  // fall through to the expr handler.
  const concatIdx = findTopLevelOp(token, "+");
  if (concatIdx !== -1) {
    const lhs = token.slice(0, concatIdx).trim();
    const rhs = token.slice(concatIdx + 1).trim();
    const lhsIsStr = isConcatString(lhs, locals, arrayLookup, funcLookup, globals);
    const rhsIsStr = isConcatString(rhs, locals, arrayLookup, funcLookup, globals);
    if (lhsIsStr || rhsIsStr) {
      // An array operand of a string concat is string conversion, `.join(",")` (sw09).
      const asJoined = (p: string) => /^\w+$/.test(p) && arrayLookup?.(p) ? `${p}.join(",")` : p;
      return [
        ...markU64(
          parseSingleArg(
            asJoined(lhs),
            locals,
            funcLookup,
            allocString,
            enumLookup,
            arrayLookup,
            structLookup,
            dotCallLookup,
            globals,
            enumStringLookup,
            closureVarLookup,
          ),
          lhs,
          locals,
        ),
        ...markU64(
          parseSingleArg(
            asJoined(rhs),
            locals,
            funcLookup,
            allocString,
            enumLookup,
            arrayLookup,
            structLookup,
            dotCallLookup,
            globals,
            enumStringLookup,
            closureVarLookup,
          ),
          rhs,
          locals,
        ),
      ];
    }
    // Arithmetic + — fall through to the expression handler below
  }

  // ── Boolean literals
  if (token === "true") return [{ kind: "boolexpr", wat: "(i32.const 1)" }];
  if (token === "false") return [{ kind: "boolexpr", wat: "(i32.const 0)" }];

  // ── Bigint literal: 42n → i64 constant (must come before identifier check since /^\w+$/ matches "1n")
  if (/^-?\d+n$/.test(token)) {
    const n = token.slice(0, -1);
    return [{ kind: "i64expr", wat: `(i64.const ${n})` }];
  }

  // ── Phase 29: an identifier holding a STRING-ENUM value prints its member TEXT, not the
  // synthetic i32 tag it is stored as. Must precede the simple-identifier handler below, which
  // would emit it as a plain i32 (that is what printed `0` / `2` instead of `INFO` / `ERROR`).
  if (_enumStrVarResolver && /^\w+$/.test(token)) {
    const es = _enumStrVarResolver(token);
    if (es) return [{ kind: "strexpr" as const, ptrWat: es.ptrWat, lenWat: es.lenWat }];
  }

  // ── Simple identifier
  if (/^\w+$/.test(token)) {
    // An ARRAY variable prints its elements as Deno does, not its address (sw66, 2026-10-13).
    // Every array has the [length, capacity] header; its pointer is built as `arr.join` builds it.
    const arrInfo = arrayLookup?.(token);
    if (arrInfo) {
      // A string array's elements are [ptr, len] pairs: the string writer (ld37, 2026-10-15).
      const elemName = arrInfo.isStringArr ? "string" : arrInfo.elemType;
      const shown = elemName === "i64" ? "bigint" : elemName === "bool" ? "boolean" : elemName;
      const what = arrInfo.is2D
        ? "2D array"
        : arrInfo.customLoadOp
        ? "typed array beside other arguments"
        : arrInfo.structTypeName
        ? "struct array" // its elements are pointers: printed as numbers they would be addresses
        : arrInspectKind(elemName) === undefined
        ? `${shown}[] array`
        : undefined;
      if (what) {
        _diagnosticSink?.(
          `console argument: printing a whole ${what} is not supported yet; print its elements (${token})`,
        );
        return [{ kind: "literal", text: "" }];
      }
      const wat = arrInfo.isGlobal
        ? `(global.get $${token})`
        : (arrInfo.ptr === -1 || arrInfo.ptr === -2 || arrInfo.dynamic)
        ? `(local.get $${token})`
        : `(i32.const ${arrInfo.ptr})`;
      return [{ kind: "arrptr" as const, wat, elemType: elemName }];
    }
    // Module-level globals: emit global.get instead of local.get
    if (globals?.has(token)) {
      const gType = globals.get(token)!;
      // Module-level string constant encoded as "string:offset:len"
      if (gType.startsWith("string:")) {
        const parts = gType.split(":");
        const offset = Number(parts[1]);
        const len = Number(parts[2]);
        return [{
          kind: "strvar" as const,
          ptrLocal: `__strconst_ptr_${offset}`,
          lenLocal: `__strconst_len_${len}`,
        }];
      }
      // Mutable module-level string global encoded as "strglobal:name" → read the ptr/len pair
      if (gType.startsWith("strglobal:")) {
        const gname = gType.slice("strglobal:".length);
        return [{
          kind: "strexpr" as const,
          ptrWat: `(global.get $${gname}_ptr)`,
          lenWat: `(global.get $${gname}_len)`,
        }];
      }
      const wat = `(global.get $${token})`;
      if (gType === "i64") return [{ kind: "i64expr", wat }];
      if (gType === "f64") return [{ kind: "f64expr", wat }];
      // An f32 reaches the f64 printer PROMOTED: the raw f32 was an invalid module (ld17).
      if (gType === "f32") return [{ kind: "f64expr", wat: `(f64.promote_f32 ${wat})` }];
      return [{ kind: "i32expr", wat }];
    }
    const wtype = locals.get(token);
    // A CATCH variable (wasic declared its `__kind` local) prints by what was thrown: a caught
    // Error is `Error: msg` in a template or concat, as String(e) is (sw44, 2026-10-06).
    if (wtype === "string" && locals.has(`${token}__kind`) && _stringExprResolver) {
      const r = _stringExprResolver(`String(${token})`, locals);
      if (r) return [{ kind: "strexpr" as const, ptrWat: r.ptrWat, lenWat: r.lenWat }];
    }
    if (wtype === "string") {
      return [{ kind: "strvar", ptrLocal: `${token}_ptr`, lenLocal: `${token}_len` }];
    }
    if (wtype === "i64") return [{ kind: "i64var", name: token }];
    if (wtype === "i32") return [{ kind: "i32var", name: token }];
    if (wtype === "bool") return [{ kind: "boolvar", name: token }];
    if (wtype === "f64") return [{ kind: "f64var", name: token }];
    // ld17 (2026-10-06): an f32 local was printed as an f64var, `$__f64_to_str` of an f32.
    if (wtype === "f32") {
      return [{ kind: "f64expr", wat: `(f64.promote_f32 (local.get $${token}))` }];
    }
    // Unknown type — treat as i32 (safest default for integer expressions)
    return [{ kind: "i32var", name: token }];
  }

  // ── varName.message — Error catch variable; .message is the string itself
  const errMsgMatch = token.match(/^(\w+)\.message$/);
  if (errMsgMatch && locals.get(errMsgMatch[1]) === "string") {
    return [{
      kind: "strvar",
      ptrLocal: `${errMsgMatch[1]}_ptr`,
      lenLocal: `${errMsgMatch[1]}_len`,
    }];
  }

  // ── Enum member access: EnumName.MemberName → i32 constant or string literal
  // Check enumStringLookup FIRST so heterogeneous enums (string + numeric members
  // in the same enum, where string members also have synthetic i32 tags) still
  // print the string value in display contexts.
  const enumMatch = token.match(/^(\w+)\.(\w+)$/);
  if (enumMatch) {
    const key = `${enumMatch[1]}.${enumMatch[2]}`;
    if (enumStringLookup) {
      const strVal = enumStringLookup(key);
      if (strVal !== undefined) return [{ kind: "literal", text: strVal }];
    }
    if (enumLookup) {
      const val = enumLookup(key);
      if (val !== undefined) return [{ kind: "i32expr", wat: `(i32.const ${val})` }];
    }
  }

  // ── Struct field access: p.field
  const sfDotMatch = token.match(/^(\w+)\.(\w+)$/);
  if (sfDotMatch && structLookup) {
    const fi = structLookup(sfDotMatch[1], sfDotMatch[2]);
    if (fi) {
      if (fi.type === "string" && fi.watLoadLen) {
        return [{ kind: "strexpr" as const, ptrWat: fi.watLoad, lenWat: fi.watLoadLen }];
      }
      const kind = fi.type === "f64" || fi.type === "f32"
        ? "f64expr" as const
        : fi.type === "i64"
        ? "i64expr" as const
        : fi.type === "bool"
        ? "boolexpr" as const
        : "i32expr" as const;
      return [{ kind, wat: promoteF32(fi.watLoad, fi.type) }];
    }
  }

  // Array element struct field access: arr[idx].field
  // Pass "arr[idx]" as virtual varName to structLookup; structLookupFn handles the bracket form.
  const arrElemDotMatch = token.match(/^(\w+)\[([^\]]*)\]\.(\w+)$/);
  if (arrElemDotMatch && structLookup) {
    const fi = structLookup(`${arrElemDotMatch[1]}[${arrElemDotMatch[2]}]`, arrElemDotMatch[3]);
    if (fi) {
      if (fi.type === "string" && fi.watLoadLen) {
        return [{ kind: "strexpr" as const, ptrWat: fi.watLoad, lenWat: fi.watLoadLen }];
      }
      const kind = fi.type === "f64" || fi.type === "f32"
        ? "f64expr" as const
        : fi.type === "i64"
        ? "i64expr" as const
        : fi.type === "bool"
        ? "boolexpr" as const
        : "i32expr" as const;
      return [{ kind, wat: promoteF32(fi.watLoad, fi.type) }];
    }
  }

  // Phase 42: three-part chained struct field access: a.b.c
  // Pass "a.b" as virtual varName to structLookup so it resolves nested struct pointer
  const sfChainedDotMatch = token.match(/^(\w+)\.(\w+)\.(\w+)$/);
  if (sfChainedDotMatch && structLookup) {
    const fi = structLookup(
      `${sfChainedDotMatch[1]}.${sfChainedDotMatch[2]}`,
      sfChainedDotMatch[3],
    );
    if (fi) {
      if (fi.type === "string" && fi.watLoadLen) {
        return [{ kind: "strexpr" as const, ptrWat: fi.watLoad, lenWat: fi.watLoadLen }];
      }
      const kind = fi.type === "f64" || fi.type === "f32"
        ? "f64expr" as const
        : fi.type === "i64"
        ? "i64expr" as const
        : fi.type === "bool"
        ? "boolexpr" as const
        : "i32expr" as const;
      return [{ kind, wat: promoteF32(fi.watLoad, fi.type) }];
    }
  }

  // ── String-producing method call: receiver.toUpperCase()/toLowerCase()/trim()/slice()/...
  // (receiver may be a plain string var OR a string-array element arr[i]). Routed through wasic's
  // emitStringPtrLen via the resolver, which captures the ptr/len into temp locals.
  // Receiver may be a var, string literal ("12".padStart), or a call (toFixed(..).padStart) — the
  // resolver delegates to emitStringPtrLen and returns undefined for anything it can't resolve, so a
  // permissive receiver pattern is safe (non-string tokens fall through to the handlers below).
  if (
    _stringExprResolver &&
    /^.+\.(toUpperCase|toLowerCase|trim|trimStart|trimEnd|trimLeft|trimRight|slice|charAt|substring|substr|replace|replaceAll|padStart|padEnd|repeat|toString)\s*\(/
      .test(token)
  ) {
    const r = _stringExprResolver(token, locals);
    if (r) return [{ kind: "strexpr" as const, ptrWat: r.ptrWat, lenWat: r.lenWat }];
  }

  // ── `String(x)`: wasic's string conversion (emitStringPtrLen / emitStringAssign own it). The
  // generic call path below took it for a user function and emitted `call $String`, an undefined
  // function (ld16, 2026-10-06). What the resolver cannot build is a diagnostic, never `""`.
  {
    const strM = token.match(/^String\s*\(([\s\S]*)\)$/);
    // Every String(x), a string local included: wasic copies a plain string as is (sw42) and
    // stringifies a CATCH variable by what was thrown (sw44: `custom` vs `Error: custom`).
    if (strM && parenDepthNeverNegative(strM[1])) {
      const r = _stringExprResolver?.(token, locals);
      if (r) return [{ kind: "strexpr" as const, ptrWat: r.ptrWat, lenWat: r.lenWat }];
      _diagnosticSink?.(`console argument: cannot convert '${token.slice(0, 60)}' to a string.`);
      return [{ kind: "literal", text: "" }];
    }
  }

  // ── Chained `new ClassName(...).method(...)` (possibly inside a binary op): route through
  // dotCallLookup, which delegates to wasic's emitExpr (it owns the new+method-chain handler and the
  // binary-op loop). Returns undefined for anything emitExpr can't resolve, so it's safe.
  if (dotCallLookup && /^new\s+[A-Z]\w*\s*\(/.test(token)) {
    const r = dotCallLookup(token);
    if (r) {
      const k = r.type === "f64" || r.type === "f32"
        ? "f64expr" as const
        : r.type === "i64"
        ? "i64expr" as const
        : r.type === "bool"
        ? "boolexpr" as const
        : "i32expr" as const;
      return [{ kind: k, wat: promoteF32(r.wat, r.type) }];
    }
  }

  // ── Dot-call expression: receiver.method(args) or this.method(args) — class/static calls
  // Skip Math.* and Number.* tokens — they have their own dedicated handlers below.
  if (
    dotCallLookup && !token.startsWith("Math.") && !token.startsWith("Number.") &&
    /^(?:this|\w+(?:\[[^\]]*\])?)\.(\w+)\s*\(/.test(token)
  ) {
    const result = dotCallLookup(token);
    if (result) {
      const kind = result.type === "f64" || result.type === "f32"
        ? "f64expr" as const
        : result.type === "i64"
        ? "i64expr" as const
        : result.type === "bool"
        ? "boolexpr" as const
        : "i32expr" as const;
      return [{ kind, wat: promoteF32(result.wat, result.type) }];
    }
  }

  // ── Phase 5f: chained call — factoryFn(outerArgs)(innerArgs) closure factory
  {
    const factoryHead = token.match(/^(\w+)\s*\(/)?.[1];
    if (factoryHead) {
      const factorySig = funcLookup?.(factoryHead);
      if (factorySig?.isClosureFactory) {
        const parts = extractChainedCallParts(token);
        if (parts) {
          const outerArgList = parts.outerRaw ? splitTopLevelArgs(parts.outerRaw) : [];
          const outerWat = outerArgList.map((a, i) => {
            const ptype = factorySig.params[i]?.type ?? "i32";
            return exprToWat(
              a.trim(),
              locals,
              ptype,
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            );
          }).join(" ");
          const innerSig = funcLookup?.(`${factoryHead}__inner`);
          const captureCount = innerSig?.closureCaptures?.length ?? 0;
          const innerCallParams = innerSig
            ? innerSig.params.slice(0, innerSig.params.length - captureCount)
            : [];
          const innerArgList = parts.innerRaw ? splitTopLevelArgs(parts.innerRaw) : [];
          const innerWat = innerArgList.map((a, i) => {
            const ptype = innerCallParams[i]?.type ?? "i32";
            return exprToWat(
              a.trim(),
              locals,
              ptype,
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            );
          }).join(" ");
          const wat =
            `(call $${factoryHead}__trampoline (call $${factoryHead} ${outerWat}) ${innerWat})`
              .trim();
          const innerResult = innerSig?.result;
          const kind = innerResult === "f64" || innerResult === "f32"
            ? "f64expr" as const
            : innerResult === "i64"
            ? "i64expr" as const
            : "i32expr" as const;
          return [{ kind, wat: promoteF32(wat, innerResult) }];
        }
      }
    }
  }

  // ── String(varName) where varName is a string local → pass through as strvar
  const stringCastMatch = token.match(/^String\s*\(\s*(\w+)\s*\)$/);
  if (stringCastMatch && locals.get(stringCastMatch[1]) === "string") {
    const v = stringCastMatch[1];
    return [{ kind: "strvar", ptrLocal: `${v}_ptr`, lenLocal: `${v}_len` }];
  }

  // ── VAR instanceof Error ? VAR.message : String(VAR) — caught exception is always a string
  const instanceofTernaryMatch = token.match(
    /^(\w+)\s+instanceof\s+Error\s*\?\s*\1\.message\s*:\s*String\s*\(\s*\1\s*\)$/,
  );
  if (instanceofTernaryMatch && locals.get(instanceofTernaryMatch[1]) === "string") {
    const v = instanceofTernaryMatch[1];
    return [{ kind: "strvar", ptrLocal: `${v}_ptr`, lenLocal: `${v}_len` }];
  }

  // ── Phase 49: str.at(n) — character at index, supporting negative indices
  const strAtConsoleM = token.match(/^(\w+)\.at\s*\((.+)\)$/);
  if (
    strAtConsoleM && locals.get(strAtConsoleM[1]) === "string" &&
    parenDepthNeverNegative(strAtConsoleM[2])
  ) {
    const strName = strAtConsoleM[1];
    const rawN = strAtConsoleM[2].trim();
    const nNum = /^-?\d+$/.test(rawN) ? parseInt(rawN, 10) : null;
    const nWat = nNum !== null
      ? "(i32.const " + nNum + ")"
      : exprToWat(rawN, locals, "i32", funcLookup, allocString, arrayLookup, structLookup, globals);
    const ptrW = "(local.get $" + strName + "_ptr)";
    const lenW = "(local.get $" + strName + "_len)";
    const normIdx = "(select " + nWat + " (i32.add " + lenW + " " + nWat + ") (i32.ge_s " + nWat +
      " (i32.const 0)))";
    const ptrWat = "(i32.add " + ptrW + " " + normIdx + ")";
    return [{ kind: "strexpr" as const, ptrWat, lenWat: "(i32.const 1)" }];
  }

  // ── String literal method: "TEXT".toLowerCase() / "TEXT".toUpperCase() → pre-computed literal
  const strLitMethodMatch = token.match(/^(["'])(.*?)\1\.(toLowerCase|toUpperCase)\s*\(\s*\)$/);
  if (strLitMethodMatch) {
    const str = strLitMethodMatch[2];
    const text = strLitMethodMatch[3] === "toLowerCase" ? str.toLowerCase() : str.toUpperCase();
    return [{ kind: "literal", text }];
  }

  // ── Phase 28: arr.join(sep) — write joined string to gather scratch
  const joinMatch = token.match(
    /^(\w+)\.join\(("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)?\)$/,
  );
  if (joinMatch && allocString) {
    const arrName = joinMatch[1];
    const arrInfo = arrayLookup?.(arrName);
    if (arrInfo && !arrInfo.customLoadOp) {
      const sepRaw = joinMatch[2];
      const sep = sepRaw ? sepRaw.slice(1, -1) : ",";
      const [sepPtr, sepLen] = allocString(sep);
      // Every array has the [length, capacity] header, so a STATIC array (its address a
      // constant) and a module array (a global) join the same way as a dynamic one, which was
      // the only kind accepted (sw09, 2026-10-09).
      const arrWat = arrInfo.isGlobal
        ? `(global.get $${arrName})`
        : (arrInfo.ptr === -1 || arrInfo.ptr === -2 || arrInfo.dynamic)
        ? `(local.get $${arrName})`
        : `(i32.const ${arrInfo.ptr})`;
      return [{ kind: "joinarr", arrWat, sepPtr, sepLen, elemType: arrInfo.elemType }];
    }
  }

  // ── Phase 35: typeof x → compile-time type-name string literal
  const typeofPSAMatch = token.match(/^typeof\s+(\w+)$/);
  if (typeofPSAMatch) {
    const vn = typeofPSAMatch[1]!;
    const t = locals.get(vn) ?? globals?.get(vn);
    let typeStr: string;
    if (t === "string") typeStr = "string";
    else if (t === "bool") typeStr = "boolean";
    else if (t === "f64" || t === "f32") typeStr = "number";
    else if (t === "i64") typeStr = "bigint";
    else if (t === "i32") {
      const arrInfo = arrayLookup?.(vn);
      typeStr = arrInfo ? "object" : "number";
    } else typeStr = "undefined";
    return [{ kind: "literal", text: typeStr }];
  }

  // ── Global isNaN(x) — must precede callMatch to avoid (call $isNaN ...)
  {
    const gIsNaNM = token.match(/^isNaN\s*\((.+)\)$/);
    if (gIsNaNM && parenDepthNeverNegative(gIsNaNM[1])) {
      const aW = exprToWat(
        gIsNaNM[1].trim(),
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      return [{ kind: "boolexpr", wat: `(f64.ne ${aW} ${aW})` }];
    }
  }

  // ── Function call: name(arg, arg, ...)
  // Look up the callee's parameter types so each argument gets the correct const kind.
  // The `(` must close at the END: `f(a) + f(b)` is not one call with the argument `a) + f(b`
  // (H12, found with sw05, 2026-09-30).
  const callMatch = token.match(/^(\w+)\s*\((.*)?\)$/);
  if (callMatch && parenDepthNeverNegative(callMatch[2] ?? "")) {
    const callee = callMatch[1];
    const rawArgs = callMatch[2]?.trim() ?? "";
    const argList = rawArgs ? splitTopLevelArgs(rawArgs) : [];
    // Phase 5g: closure-typed variable dispatch via trampoline (call_indirect)
    const closureSig = closureVarLookup?.(callee);
    if (closureSig) {
      const watArgsList = argList.map((a, idx) => {
        const pt = (closureSig.params[idx] ?? "i32") as string;
        return intArgWat(
          exprToWat(a.trim(), locals, pt, funcLookup, allocString, arrayLookup, structLookup, globals),
          a,
          callee,
          pt,
          locals,
          globals,
        );
      });
      const argsPart = watArgsList.length > 0 ? ` ${watArgsList.join(" ")}` : "";
      const wat =
        `(call_indirect (type ${closureSig.funcType}) (local.get $${callee})${argsPart} (i32.load (local.get $${callee})))`;
      const result = closureSig.result;
      if (result === "f64") return [{ kind: "f64expr", wat }];
      if (result === "f32") return [{ kind: "f64expr", wat: `(f64.promote_f32 ${wat})` }]; // ld17
      if (result === "i64") return [{ kind: "i64expr", wat }];
      if (result === "bool") return [{ kind: "boolexpr", wat }];
      if (result === "string") return [{ kind: "strcall" as const, callWat: wat }];
      return [{ kind: "i32expr", wat }];
    }
    const sig = funcLookup?.(callee);
    // Not a function: a function-typed VARIABLE (`const op: (x: i32) => i32 = …`), which wasic
    // calls through call_indirect. A direct `call $op` was an undefined function (ld01).
    if (!sig && _exprFallbackResolver) {
      const r = _exprFallbackResolver(token, locals);
      if (r) {
        const kind = r.type === "f64" ? "f64expr" as const : r.type === "i64" ? "i64expr" as const : "i32expr" as const;
        return [{ kind, wat: r.wat }];
      }
    }
    // Phase 33 guard: struct args must be layout-compatible with the params they bind to
    _structArgLayoutCheck?.(callee, argList);
    // String params expand to two stack values (ptr + len); use allocString if available.
    const watArgsList = argList.flatMap((a, i) => {
      const ptype = sig?.params[i]?.type ?? "i32";
      if (ptype === "string") {
        return [
          exprToWat(
            a.trim(),
            locals,
            "string",
            funcLookup,
            allocString,
            arrayLookup,
            structLookup,
            globals,
          ),
        ];
      }
      // Inline struct literal arg: { key: val } for a struct param
      const aTrimmed = a.trim();
      if (
        ptype === "i32" && aTrimmed.startsWith("{") && _structLiteralAlloc &&
        sig?.params[i]?.structType
      ) {
        const structName = sig.params[i].structType!;
        const braceContent = aTrimmed.slice(1, aTrimmed.lastIndexOf("}")).trim();
        const initFields: Record<string, string> = {};
        const pairs = splitTopLevelArgs(braceContent);
        for (const pair of pairs) {
          const ci = pair.indexOf(":");
          const key = ci !== -1 ? pair.slice(0, ci).trim() : pair.trim();
          const val = ci !== -1 ? pair.slice(ci + 1).trim() : key;
          if (key) initFields[key] = val;
        }
        return [`(i32.const ${_structLiteralAlloc(structName, initFields)})`];
      }
      return [
        intArgWat(
          exprToWat(a.trim(), locals, ptype, funcLookup, allocString, arrayLookup, structLookup, globals),
          a,
          callee,
          ptype,
          locals,
          globals,
        ),
      ];
    });
    // Fill in default values for omitted trailing params
    if (sig) {
      const baseParamCount = sig.params.length - (sig.closureCaptures?.length ?? 0);
      for (let i = argList.length; i < baseParamCount; i++) {
        const param = sig.params[i];
        if (param.defaultValue !== undefined) {
          watArgsList.push(
            exprToWat(
              param.defaultValue,
              locals,
              param.type,
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            ),
          );
        }
      }
    }
    const wat = watArgsList.length > 0
      ? `(call $${callee} ${watArgsList.join(" ")})`
      : `(call $${callee})`;
    // Return type of the call: check resultTsName first (preserves array/interface annotation),
    // then fall back to the normalized WatType.
    const retTsName = sig?.resultTsName;
    if (retTsName && /\[\]$/.test(retTsName)) {
      const elemType = retTsName.replace(/\[\]$/, "");
      // only numeric elements have a writer; the rest printed their bits as i32 (sw66)
      if (arrInspectKind(elemType) === undefined) {
        _diagnosticSink?.(
          `console argument: printing a whole ${elemType}[] array is not supported yet; print its elements (${callee}(...))`,
        );
        return [{ kind: "literal", text: "" }];
      }
      return [{ kind: "arrptr" as const, wat, elemType }];
    }
    const retType = (sig as { result?: string } | undefined)?.result;
    if (retType === "bool") return [{ kind: "boolexpr", wat }];
    if (retType === "i64") return [{ kind: "i64expr", wat }];
    if (retType === "f64") return [{ kind: "f64expr", wat }];
    if (retType === "f32") return [{ kind: "f64expr", wat: `(f64.promote_f32 ${wat})` }]; // ld17
    if (retType === "string") return [{ kind: "strcall" as const, callWat: wat }];
    return [{ kind: "i32expr", wat }];
  }

  // ── Array element access: arr[idx]
  // Guard the greedy index capture: `arr[0] + arr[1]` would match as index `0] + arr[1` (unbalanced
  // brackets), and the branches below would emit a single mangled access — dropping the `+ arr[1]`.
  // Nullify on an unbalanced index so the whole expression falls through to the binary-op-aware
  // exprToWat routing below (which handles array-element arithmetic correctly).
  // Bug fix 2026-06-30: 2D dynamic-array element `arr[i][j]` directly in console.log. The 1D bracket
  // regex below rejects it (its index `i][j` fails parenDepthNeverNegative), so it used to fall to the
  // terminal `(i32.const 0)` stub. Load the row pointer (outer stores i32 row ptrs, shift=2), then the
  // element from the row (elemType shift/loadOp).
  const twoDMatch = token.match(/^(\w+)\[([^\]]+)\]\[([^\]]+)\]$/);
  if (twoDMatch && arrayLookup) {
    const a2 = arrayLookup(twoDMatch[1]);
    if (a2 && a2.is2D) {
      const base = a2.isGlobal
        ? `(global.get $${twoDMatch[1]})`
        : (a2.ptr === -1 || a2.ptr === -2 || a2.dynamic)
        ? `(local.get $${twoDMatch[1]})`
        : `(i32.const ${a2.ptr})`;
      const rowIdx = exprToWat(
        twoDMatch[2],
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      const colIdx = exprToWat(
        twoDMatch[3],
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      const rowPtr =
        `(i32.load (i32.add (i32.add ${base} (i32.const 8)) (i32.shl ${rowIdx} (i32.const 2))))`;
      const eShift = (a2.elemType === "f64" || a2.elemType === "i64") ? 3 : 2;
      const eLoad = memLoadOp(a2.elemType);
      const wat =
        `(${eLoad} (i32.add (i32.add ${rowPtr} (i32.const 8)) (i32.shl ${colIdx} (i32.const ${eShift}))))`;
      if (a2.elemType === "bool") return [{ kind: "boolexpr", wat }]; // true / false, not 1 / 0
      const kind = a2.elemType === "f64" || a2.elemType === "f32"
        ? "f64expr" as const
        : a2.elemType === "i64"
        ? "i64expr" as const
        : "i32expr" as const;
      return [{ kind, wat: promoteF32(wat, a2.elemType) }];
    }
  }
  let bracketMatch = token.match(/^(\w+)\[(.+)\]$/);
  if (bracketMatch && !parenDepthNeverNegative(bracketMatch[2])) bracketMatch = null;
  // A STRING indexed, `s[i]`: one character, built by wasic's string resolver (the path
  // `const ch: string = s[i]` takes), whatever the index's type. The array handlers below never
  // matched a string, so every `s[i]` here was refused, an f64 index (ld34) and an i32 one alike.
  if (
    bracketMatch && _stringExprResolver &&
    (locals.get(bracketMatch[1]) ?? globals?.get(bracketMatch[1])) === "string"
  ) {
    const r = _stringExprResolver(token, locals);
    if (r) return [{ kind: "strexpr" as const, ptrWat: r.ptrWat, lenWat: r.lenWat }];
    _diagnosticSink?.(`console argument: cannot index the string '${token.slice(0, 60)}'.`);
    return [{ kind: "literal", text: "" }];
  }
  // Phase 23: tuple element access t[N] where N is a numeric index → struct field _N
  if (bracketMatch && structLookup && /^\d+$/.test(bracketMatch[2])) {
    const fi = structLookup(bracketMatch[1], `_${bracketMatch[2]}`);
    if (fi) {
      const kind = fi.type === "f64" || fi.type === "f32"
        ? "f64expr" as const
        : fi.type === "i64"
        ? "i64expr" as const
        : "i32expr" as const;
      return [{ kind, wat: promoteF32(fi.watLoad, fi.type) }];
    }
  }
  if (bracketMatch && arrayLookup) {
    const arrInfo = arrayLookup(bracketMatch[1]);
    if (arrInfo) {
      // String array element access: arr[idx] — load ptr+len pair (8-byte elements)
      if ((arrInfo as { isStringArr?: boolean }).isStringArr || arrInfo.elemType === "string") {
        let idxWat = exprToWat(
          bracketMatch[2],
          locals,
          "i32",
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        );
        if (/^\w+$/.test(bracketMatch[2].trim())) {
          const idxT = locals.get(bracketMatch[2].trim()) ?? globals?.get(bracketMatch[2].trim());
          if (idxT === "f64" || idxT === "f32") idxWat = `(i32.trunc_f64_s ${idxWat})`;
        }
        const getOp = arrInfo.isGlobal
          ? `(global.get $${bracketMatch[1]})`
          : `(local.get $${bracketMatch[1]})`;
        const baseWat = (arrInfo.ptr === -1 || arrInfo.dynamic)
          ? getOp
          : `(i32.const ${arrInfo.ptr})`;
        const elemAddrWat =
          `(i32.add (i32.add ${baseWat} (i32.const 8)) (i32.shl ${idxWat} (i32.const 3)))`;
        return [{
          kind: "strexpr" as const,
          ptrWat: `(i32.load ${elemAddrWat})`,
          lenWat: `(i32.load offset=4 ${elemAddrWat})`,
        }];
      }
      // Phase 31: respect custom shift/loadOp for sub-word TypedArrays (Uint8Array, Int16Array, etc.)
      const loadOp = arrInfo.customLoadOp ??
        (memLoadOp(arrInfo.elemType));
      const shift = arrInfo.shift !== undefined
        ? arrInfo.shift
        : (arrInfo.elemType === "f64" || arrInfo.elemType === "i64")
        ? 3
        : 2;
      let idxWat = exprToWat(
        bracketMatch[2],
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      if (/^\w+$/.test(bracketMatch[2].trim())) {
        const idxT = locals.get(bracketMatch[2].trim()) ?? globals?.get(bracketMatch[2].trim());
        if (idxT === "f64" || idxT === "f32") idxWat = `(i32.trunc_f64_s ${idxWat})`;
      }
      // All arrays use an 8-byte [length, capacity] header; data starts at +8.
      const getOp2 = arrInfo.isGlobal
        ? `(global.get $${bracketMatch[1]})`
        : `(local.get $${bracketMatch[1]})`;
      const baseWat = (arrInfo.ptr === -1 || arrInfo.dynamic)
        ? getOp2
        : `(i32.const ${arrInfo.ptr})`;
      const dataBase = `(i32.add ${baseWat} (i32.const 8))`;
      const addrWat = shift === 0
        ? `(i32.add ${dataBase} ${idxWat})`
        : `(i32.add ${dataBase} (i32.shl ${idxWat} (i32.const ${shift})))`;
      const wat = `(${loadOp} ${addrWat})`;
      // An f32 element prints as a number (it was an i32expr: its bit pattern; sw43).
      // A boolean element prints true / false (it printed 1 / 0; found with sw69).
      if (arrInfo.elemType === "bool" && !arrInfo.customLoadOp) return [{ kind: "boolexpr", wat }];
      const kind = arrInfo.elemType === "f64" || arrInfo.elemType === "f32"
        ? "f64expr" as const
        : arrInfo.elemType === "i64"
        ? "i64expr" as const
        : "i32expr" as const;
      return [{ kind, wat: arrInfo.customLoadOp ? wat : promoteF32(wat, arrInfo.elemType) }];
    }
  }
  // Phase 12/5h: fallback — i32 local holding a dynamic i32[] array pointer (captured or method-returned)
  if (bracketMatch && locals.get(bracketMatch[1]) === "i32") {
    let idxWat = exprToWat(
      bracketMatch[2],
      locals,
      "i32",
      funcLookup,
      allocString,
      arrayLookup,
      structLookup,
      globals,
    );
    if (/^\w+$/.test(bracketMatch[2].trim())) {
      const idxT = locals.get(bracketMatch[2].trim()) ?? globals?.get(bracketMatch[2].trim());
      if (idxT === "f64" || idxT === "f32") idxWat = `(i32.trunc_f64_s ${idxWat})`;
    }
    return [{
      kind: "i32expr" as const,
      wat: `(i32.load (i32.add (i32.add (local.get $${
        bracketMatch[1]
      }) (i32.const 8)) (i32.shl ${idxWat} (i32.const 2))))`,
    }];
  }

  // ── Array .length: dynamic → runtime i32 load from header; static → compile-time constant
  const dotLenMatch = token.match(/^(\w+)\.length$/);
  if (dotLenMatch) {
    const lenName = dotLenMatch[1];
    const arrInfo = arrayLookup?.(lenName);
    if (arrInfo) {
      const getOp = arrInfo.isGlobal ? `(global.get $${lenName})` : `(local.get $${lenName})`;
      const wat = arrInfo.dynamic ? `(i32.load ${getOp})` : `(i32.const ${arrInfo.length})`;
      return [{ kind: "i32expr", wat }];
    }
    // String .length (UTF-8 byte length): local string, module string const, or string global.
    if (locals.get(lenName) === "string") {
      return [{ kind: "i32expr", wat: `(local.get $${lenName}_len)` }];
    }
    const gt = globals?.get(lenName);
    if (gt?.startsWith("string:")) {
      return [{ kind: "i32expr", wat: `(i32.const ${Number(gt.split(":")[2])})` }];
    }
    if (gt?.startsWith("strglobal:")) {
      const gn = gt.slice("strglobal:".length);
      return [{ kind: "i32expr", wat: `(global.get $${gn}_len)` }];
    }
    // Phase 12: i32 local holding a dynamic array pointer — load length from header
    if (locals.get(lenName) === "i32") {
      return [{ kind: "i32expr", wat: `(i32.load (local.get $${lenName}))` }];
    }
  }

  // ── Phase 51: x instanceof ClassName → boolexpr via wasic's emitExpr (owns the tag tables)
  if (_instanceofResolver && /^\w+\s+instanceof\s+\w+$/.test(token)) {
    const iw = _instanceofResolver(token, locals);
    if (iw !== undefined) return [{ kind: "boolexpr", wat: iw }];
  }

  // ── Phase 25: nullish coalescing `a ?? b` → delegate to wasic's emitExpr, which owns the
  // nullable-variable tables. MUST run before the boolexpr and ternary blocks below: the
  // `_hasTernary` probe matches the leading `?` of `??`, so `val ?? -1` would otherwise be
  // mis-parsed as a ternary and fall through to the comment-stub fallback.
  if (_nullishResolver && findTopLevelOp(token, "??") !== -1) {
    const nw = _nullishResolver(token, locals);
    if (nw !== undefined) {
      return [{
        kind: nw.type === "f64" || nw.type === "f32"
          ? "f64expr"
          : nw.type === "bool"
          ? "boolexpr"
          : "i32expr",
        wat: promoteF32(nw.wat, nw.type),
      }];
    }
  }

  // ── `a && b` / `a || b` prints an OPERAND (sw49): `x || 7` is 7, `!a && b` is b's value when
  // `!a` is true. Only two booleans fall through to the boolean segment below.
  if (
    _logicalResolver &&
    (findTopLevelOp(token, "&&") !== -1 || findTopLevelOp(token, "||") !== -1)
  ) {
    const lr = _logicalResolver(token, locals);
    if (lr && "rewrite" in lr) {
      return parseSingleArg(
        lr.rewrite,
        locals,
        funcLookup,
        allocString,
        enumLookup,
        arrayLookup,
        structLookup,
        dotCallLookup,
        globals,
        enumStringLookup,
        closureVarLookup,
      );
    }
    if (lr) {
      const kind = lr.type === "f64" ? "f64expr" : lr.type === "i64" ? "i64expr" : "i32expr";
      return [{ kind, wat: lr.wat } as LogSegment];
    }
  }

  // ── Boolean expression: &&, ||, !, comparisons → boolexpr (prints "true"/"false")
  // Must run BEFORE Number.*/Math.* so that "Number.MAX_SAFE_INTEGER > 1e16" is caught here,
  // not misidentified as an f64 constant by the Number.* handler.
  // BUT: if there's a top-level ternary ? the whole expr is a ternary, not a bool.
  const _hasTernary = findTopLevelOp(token, "?") !== -1;
  if (
    !_hasTernary && (token.startsWith("!") ||
      findTopLevelOp(token, "&&") !== -1 ||
      findTopLevelOp(token, "||") !== -1 ||
      /===|!==/.test(token) ||
      // LOOSE equality belongs here too. `wasic.ts` handles `a == b` / `a != b` everywhere else
      // (`if (a == b)`, `const c: boolean = a != b`), but this list omitted them, so
      // `console.log(a == b)` was not recognised as a boolean, fell through to the numeric path,
      // and emitted an i32 comparison where an f64 was expected. wasic reported SUCCESS and wrote
      // a module that would not instantiate: "expected type f64, found f64.eq of type i32".
      // Exactly the parallel-code-path divergence cmem/design-decisions.md warns about.
      // (`==` also matches inside `===`, which is harmless — both classify as boolexpr.)
      findTopLevelOp(token, "==") !== -1 ||
      findTopLevelOp(token, "!=") !== -1 ||
      findTopLevelOp(token, ">=") !== -1 ||
      findTopLevelOp(token, "<=") !== -1 ||
      findTopLevelOp(token, ">") !== -1 ||
      findTopLevelOp(token, "<") !== -1)
  ) {
    return [{
      kind: "boolexpr",
      wat: exprToWat(
        token,
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      ),
    }];
  }

  // ── Phase 48: Number.* — constants produce f64, predicates produce boolexpr
  if (token.startsWith("Number.")) {
    const numPredCallM = token.match(/^Number\.(isNaN|isFinite|isInteger)\(/);
    if (numPredCallM) {
      return [{
        kind: "boolexpr",
        wat: exprToWat(
          token,
          locals,
          "i32",
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        ),
      }];
    }
    // Constants (Number.NaN, Number.POSITIVE_INFINITY, etc.) → f64
    return [{
      kind: "f64expr",
      wat: exprToWat(
        token,
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      ),
    }];
  }

  // ── Math.* — route to correct kind based on return type
  if (token.startsWith("Math.")) {
    const mathCallM = token.match(/^Math\.(\w+)\(/);
    const mathFn = mathCallM?.[1];
    if (mathFn === "clz32" || mathFn === "imul") {
      return [{
        kind: "i32expr",
        wat: exprToWat(
          token,
          locals,
          "i32",
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        ),
      }];
    }
    // All other Math functions produce f64
    return [{
      kind: "f64expr",
      wat: exprToWat(
        token,
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      ),
    }];
  }

  // ── Arithmetic / numeric expression
  // Phase 42: if expression starts with a struct field access, infer type from the field.
  // This handles cases like `a.x + b.x` where `a` is an i32 pointer but `a.x` is f64.
  // A struct-array element's field leads the same way, `qs[0].x + qs[1].x` (ld19, 2026-10-15):
  // its lead atom `qs` is the array, whose element type is not the field's.
  const leadDotM = token.match(/^(\w+)\.(\w+)\b/);
  const leadElemDotM = token.match(/^(\w+)\[([^\]]*)\]\.(\w+)\b/);
  const leadFi = !structLookup
    ? undefined
    : leadDotM
    ? structLookup(leadDotM[1], leadDotM[2])
    : leadElemDotM
    ? structLookup(`${leadElemDotM[1]}[${leadElemDotM[2]}]`, leadElemDotM[3]!)
    : undefined;
  {
    if (leadFi) {
      if (leadFi.type === "f64" || leadFi.type === "f32") {
        return [{
          kind: "f64expr",
          wat: exprToWat(
            token,
            locals,
            "f64",
            funcLookup,
            allocString,
            arrayLookup,
            structLookup,
            globals,
          ),
        }];
      }
      if (leadFi.type === "i64") {
        return [{
          kind: "i64expr",
          wat: exprToWat(
            token,
            locals,
            "i64",
            funcLookup,
            allocString,
            arrayLookup,
            structLookup,
            globals,
          ),
        }];
      }
    }
  }
  // Infer i64 / i32 / f64 from the leading identifier's declared type. For a compound expression
  // led by an ARRAY variable (e.g. `arr[0] + arr[1]`), `locals.get(arr)` is the i32 POINTER type, not
  // the element type — so consult arrayLookup and route by the ELEMENT type (an f64[] element sum is
  // an f64 expression, not i32). Plain (non-array) leads keep their declared local type.
  const leadId = token.match(/^(\w+)/)?.[1];
  const leadArr = leadId ? arrayLookup?.(leadId) : undefined;
  // A lead atom may be a function-local OR a module GLOBAL (e.g. `const a: i32 = 1` at module scope
  // → `console.log(a + b)`); consult both, else `a + b` of i32 globals would default to f64.add.
  let leadType = leadElemDotM && leadFi
    ? leadFi.type
    : leadArr
    ? leadArr.elemType
    : (leadId ? (locals.get(leadId) ?? globals?.get(leadId)) : undefined);
  // A leading INTEGER LITERAL or a leading PARENTHESIS has no declared type, so the expression was
  // classified f64 while its operands stayed i32 — `console.log("x:", 1 + n)` and
  // `console.log("x:", (n + 0) * 5)` emitted an f64 segment over i32 arithmetic and failed to
  // instantiate, even though `n + 1` worked. Take the type from the first TYPED atom instead. A
  // leading FLOAT literal (`1.5 + n`) genuinely means f64, so it is skipped. String/bool/ternary
  // forms are all handled by earlier branches, so only numeric expressions reach here.
  if (
    leadType === undefined &&
    (/^-?\d+\s*[-+*/%]/.test(token) || (token.startsWith("(") && /[-+*/%]/.test(token)))
  ) {
    for (const m of token.matchAll(/\b([A-Za-z_]\w*)\b/g)) {
      const a = arrayLookup?.(m[1]);
      const t = a ? a.elemType : (locals.get(m[1]) ?? globals?.get(m[1]));
      if (t !== undefined) {
        leadType = t;
        break;
      }
    }
  }
  // A bigint led by a unary minus or a parenthesis (`-a`, sw64), or by a bigint LITERAL
  // (`3n ** 20n`, ld30), had no typed lead atom: it printed through the f64 printer, without its
  // `n` (2026-10-13).
  if (leadType === undefined) {
    const lead2 = token.replace(/^[-~(\s]+/, "").match(/^(\w+)/)?.[1];
    if (lead2 && (/^\d+n$/.test(lead2) || (locals.get(lead2) ?? globals?.get(lead2)) === "i64")) {
      leadType = "i64";
    }
  }
  if (leadType === "i64") {
    return [{
      kind: "i64expr",
      wat: exprToWat(
        token,
        locals,
        "i64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      ),
    }];
  }
  // An i32-led expression with a KNOWN float in it (`i + f`, `i * 0.5`) is a float (sw15's console
  // twin, 2026-10-06); printing an integral value as f64 gives the same text, so this is safe.
  const hasKnownFloat = [...token.matchAll(/(?<![\w.])(-?\d+\.\d*(?:[eE][+-]?\d+)?|[A-Za-z_]\w*)/g)]
    .some((m) => isKnownFloat(m[1]!, locals, globals)) || hasFloatField(token, structLookup);
  if ((leadType === "i32" || leadType === "bool") && !hasKnownFloat) {
    return [{
      kind: "i32expr",
      wat: exprToWat(
        token,
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      ),
    }];
  }
  return [{
    kind: "f64expr",
    wat: exprToWat(
      token,
      locals,
      "f64",
      funcLookup,
      allocString,
      arrayLookup,
      structLookup,
      globals,
    ),
  }];
}

/** Parses a template literal body (contents between backticks) into segments. */
function parseTemplateLiteral(
  body: string,
  locals: Map<string, string>,
  funcLookup?: FuncLookup,
  allocString?: DataAllocator,
  enumLookup?: (key: string) => number | undefined,
  arrayLookup?: ArrayLookup,
  structLookup?: StructFieldLookup,
  dotCallLookup?: DotCallLookup,
  globals?: Map<string, string>,
  enumStringLookup?: (key: string) => string | undefined,
  closureVarLookup?: ClosureVarLookup,
): LogSegment[] {
  const segments: LogSegment[] = [];
  let i = 0;
  let textStart = 0;

  while (i < body.length) {
    if (body[i] === "$" && body[i + 1] === "{") {
      // Flush preceding text (unescape escape sequences in the static text)
      if (i > textStart) {
        segments.push({ kind: "literal", text: unescapeString(body.slice(textStart, i)) });
      }
      // Find closing }
      let depth = 1;
      let j = i + 2;
      while (j < body.length && depth > 0) {
        if (body[j] === "{") depth++;
        else if (body[j] === "}") depth--;
        j++;
      }
      const rawExpr = body.slice(i + 2, j - 1).trim();
      // An ARRAY in a template is string conversion: `${nums}` is `nums.join(",")` ("1,2,3"),
      // not the array's address (sw09, 2026-10-09).
      const expr = /^\w+$/.test(rawExpr) && arrayLookup?.(rawExpr)
        ? `${rawExpr}.join(",")`
        : rawExpr;
      segments.push(
        ...markU64(
          parseSingleArg(
            expr,
            locals,
            funcLookup,
            allocString,
            enumLookup,
            arrayLookup,
            structLookup,
            dotCallLookup,
            globals,
            enumStringLookup,
            closureVarLookup,
          ),
          expr,
          locals,
        ),
      );
      i = j;
      textStart = j;
    } else {
      i++;
    }
  }
  if (textStart < body.length) {
    segments.push({ kind: "literal", text: unescapeString(body.slice(textStart)) });
  }
  return segments;
}

/**
 * Converts a simple TypeScript expression to a WAT expression of `expectedType`.
 * Handles: numeric literals, identifiers, nested function calls, and parens.
 * The `expectedType` is used to emit the correct const instruction for literals
 * and to choose the right conversion when calling a function.
 */
/**
 * An operand as JavaScript's ToInt32 sees it, the twin of wasic's `emitToInt32`: for `Math.clz32` /
 * `Math.imul` (ld27) and the bitwise operators (ld29, 2026-10-13). A literal folds; an i32 value is
 * untouched; an f64 / f32 value (read from the emitted WAT's outermost form), or a float wrapped in
 * a TRAPPING `trunc_f64_s`, goes through `$__i32_toint32`. A bigint is left as is.
 */
/** The numeric type of emitted WAT, read from its outermost form (wasic's `watResultType` twin),
 *  or undefined when it cannot be told. */
function watOuterType(
  w: string,
  locals: Map<string, string>,
  globals?: Map<string, string>,
): string | undefined {
  const m = w.trimStart().match(/^\(([\w.]+)(?:\s+\$([\w.$]+))?/);
  const typed = m?.[1].match(/^(i32|i64|f32|f64)\.(\w+)/);
  return typed
    ? (/^(eqz?|ne|lt|gt|le|ge)(_[su])?$/.test(typed[2]) ? "i32" : typed[1])
    : m?.[1] === "local.get" && m[2]
    ? locals.get(m[2])
    : m?.[1] === "global.get" && m[2]
    ? globals?.get(m[2])
    : undefined;
}

/** An argument for an integer parameter: a float there is the owner's D3 refusal (2026-10-13), the
 *  console twin of wasic's checkImplicitTrunc (it passed the f64 raw, an invalid module). */
function intArgWat(w: string, arg: string, callee: string, ptype: string, locals: Map<string, string>, globals?: Map<string, string>): string {
  const t = watOuterType(w, locals, globals);
  const isInt = ptype === "i32" || ptype === "i64";
  if (isInt && (t === "f64" || t === "f32" || /^\((i32|i64)\.trunc_f(32|64)_s /.test(w.trimStart()))) {
    _diagnosticSink?.(implicitTruncDiagnostic(`${callee}(… ${arg.trim().slice(0, 30)} …)`, `passed to '${callee}'`));
  }
  return w;
}

function toInt32Wat(
  e: string,
  locals: Map<string, string>,
  funcLookup?: FuncLookup,
  allocString?: DataAllocator,
  arrayLookup?: ArrayLookup,
  structLookup?: StructFieldLookup,
  globals?: Map<string, string>,
): string {
  const lit = e.trim();
  if (/^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(lit)) return `(i32.const ${Number(lit) | 0})`;
  const w = exprToWat(e, locals, "i32", funcLookup, allocString, arrayLookup, structLookup, globals);
  const have = watOuterType(w, locals, globals);
  if (have === "i64") return w;
  const truncated = /^\(i32\.trunc_f(32|64)_s /.test(w.trimStart());
  if (have !== "f64" && have !== "f32" && !truncated) return w;
  _mathHelperNeeded?.("i32_toint32");
  return `(call $__i32_toint32 ${
    exprToWat(e, locals, "f64", funcLookup, allocString, arrayLookup, structLookup, globals)
  })`;
}

function exprToWat(
  expr: string,
  locals: Map<string, string>,
  expectedType: string = "i32",
  funcLookup?: FuncLookup,
  allocString?: DataAllocator,
  arrayLookup?: ArrayLookup,
  structLookup?: StructFieldLookup,
  globals?: Map<string, string>,
): string {
  expr = expr.trim();

  // String type: emit ptr+len pair (two stack values joined by a space)
  if (expectedType === "string") {
    // String variable → use its ptr/len locals
    if (/^\w+$/.test(expr) && locals.get(expr) === "string") {
      return `(local.get $${expr}_ptr) (local.get $${expr}_len)`;
    }
    // String literal → allocate in data section if allocator provided. ESCAPE-AWARE, like wasic's
    // emitStringPtrLen: `[^"]*` stopped at the first `\"`, the match failed, and the literal fell to
    // the null-string fallback below, so `len("a\"b")` inside console.log(...) passed "" (0 bytes),
    // silently. The raw body goes to allocString, which unescapes it. (The 2026-05-31 JSON-work
    // residual, confirmed and fixed 2026-09-28.)
    const litMatch = expr.match(/^"((?:[^"\\]|\\.)*)"$/) ?? expr.match(/^'((?:[^'\\]|\\.)*)'$/);
    if (litMatch && allocString) {
      const [offset, len] = allocString(litMatch[1]);
      return `(i32.const ${offset}) (i32.const ${len})`;
    }
    // `null` / `undefined` for a `string | null` parameter: the null string, ptr 0 and len 0.
    if (expr === "null" || expr === "undefined") return `(i32.const 0) (i32.const 0)`;
    // Any other string-valued form (`names[1]`, `obj.f`, `s.slice(1)`, a string-returning call):
    // wasic's emitStringPtrLen, via the resolver. H12 sw05, 2026-09-30: this fell straight to a
    // null string, so `count(names[1])` passed "" and printed 0, silently.
    const resolved = expr ? _stringExprResolver?.(expr, locals) : undefined;
    if (resolved) return `${resolved.ptrWat} ${resolved.lenWat}`;
    _diagnosticSink?.(
      `console argument: cannot emit the string expression '${expr.slice(0, 60) || "(empty)"}'.`,
    );
    return `(i32.const 0) (i32.const 0)`;
  }

  // Float literal — always use the expected type's const
  if (/^-?\d+\.\d+$/.test(expr)) {
    return `(${
      expectedType === "i32" || expectedType === "i64" ? "f64" : expectedType
    }.const ${expr})`;
  }

  // Integer literal — emit const for the expected type
  if (/^-?\d+$/.test(expr)) {
    const t = (expectedType === "f32" || expectedType === "f64")
      ? expectedType
      : expectedType === "i64"
      ? "i64"
      : "i32";
    return `(${t}.const ${expr})`;
  }

  // Scientific notation literal (e.g. 1e16, 3.5e-4, -1e10) — always f64
  if (/^-?\d+(\.\d+)?[eE][+-]?\d+$/.test(expr)) {
    return `(f64.const ${expr})`;
  }

  // Special constants — must be checked before the identifier fallback
  // NaN / Infinity follow an f32 request: an f64.const handed to an f32 parameter built an invalid
  // module (ld32, 2026-10-09; wasic's emitExpr twin is fixed the same way).
  const CONSTANTS: Record<string, string> = {
    NaN: expectedType === "f32" ? "(f32.const nan)" : "(f64.const nan)",
    Infinity: expectedType === "f32" ? "(f32.const inf)" : "(f64.const inf)",
    true: "(i32.const 1)",
    false: "(i32.const 0)",
    null: "(i32.const 0)",
    undefined: "(i32.const 0)",
  };
  if (Object.prototype.hasOwnProperty.call(CONSTANTS, expr)) return CONSTANTS[expr];

  // Bigint literal: 5n → (i64.const 5)  (must come before identifier check: /^\w+$/ matches "5n")
  if (/^-?\d+n$/.test(expr)) return `(i64.const ${expr.slice(0, -1)})`;

  // Inline string array literal: ["a", "b"] → allocate in data section, return i32 pointer
  if (expr.startsWith("[") && expr.endsWith("]") && _strArrAlloc) {
    const inner = expr.slice(1, -1).trim();
    const elems = inner ? splitTopLevelArgs(inner) : [];
    const allStrLits = elems.length > 0 && elems.every((e) => {
      const t = e.trim();
      return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
    });
    if (allStrLits) {
      return `(i32.const ${_strArrAlloc(elems)})`;
    }
  }

  // Array .length: dynamic → runtime i32 load from header; static → compile-time constant
  const dotLenM = expr.match(/^(\w+)\.length$/);
  if (dotLenM) {
    const ai = arrayLookup?.(dotLenM[1]);
    if (ai) {
      const getOp2 = ai.isGlobal ? `(global.get $${dotLenM[1]})` : `(local.get $${dotLenM[1]})`;
      return ai.dynamic ? `(i32.load ${getOp2})` : `(i32.const ${ai.length})`;
    }
    // String .length (UTF-8 byte length): local string, module string const, or string global.
    // Without this, a string `.length` used as a comparison/arithmetic operand (it reaches exprToWat,
    // not parseSingleArg) fell through to the terminal stub → 0.
    if (locals.get(dotLenM[1]) === "string") return `(local.get $${dotLenM[1]}_len)`;
    const glt = globals?.get(dotLenM[1]);
    if (glt?.startsWith("string:")) return `(i32.const ${Number(glt.split(":")[2])})`;
    if (glt?.startsWith("strglobal:")) {
      return `(global.get $${glt.slice("strglobal:".length)}_len)`;
    }
    // Phase 12: i32 local holding a dynamic array pointer
    if (locals.get(dotLenM[1]) === "i32") return `(i32.load (local.get $${dotLenM[1]}))`;
  }

  // `<stringExpr>.length` where the receiver is a non-trivial string expression — a string-returning
  // call `getName().length`, a slice `s.slice(0,3).length`, a method result, etc. Resolve the
  // receiver via the string-expr resolver and take the length word (run the ptr side so it captures
  // len into $__str_op_len, drop the ptr, then read len). Only fires when the receiver resolves to a
  // string; numeric/other receivers fall through.
  const exprLenM = expr.match(/^(.+)\.length$/);
  if (exprLenM && !/^\w+$/.test(exprLenM[1].trim())) {
    const r = _stringExprResolver?.(exprLenM[1].trim(), locals);
    if (r) return `(block (result i32) (drop ${r.ptrWat}) ${r.lenWat})`;
  }

  // Bug fix 2026-06-30: 2D dynamic-array element `arr[i][j]` as an OPERAND (e.g. `arr[0][0] + arr[0][1]`).
  // The recursive per-operand exprToWat call lands here; without this it fell to the terminal 0 stub.
  const twoDM = expr.match(/^(\w+)\[([^\]]+)\]\[([^\]]+)\]$/);
  if (twoDM && arrayLookup) {
    const a2 = arrayLookup(twoDM[1]);
    if (a2 && a2.is2D) {
      const base = a2.isGlobal
        ? `(global.get $${twoDM[1]})`
        : (a2.ptr === -1 || a2.ptr === -2 || a2.dynamic)
        ? `(local.get $${twoDM[1]})`
        : `(i32.const ${a2.ptr})`;
      const rowIdx = exprToWat(
        twoDM[2],
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      const colIdx = exprToWat(
        twoDM[3],
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      const rowPtr =
        `(i32.load (i32.add (i32.add ${base} (i32.const 8)) (i32.shl ${rowIdx} (i32.const 2))))`;
      const eShift = (a2.elemType === "f64" || a2.elemType === "i64") ? 3 : 2;
      const eLoad = memLoadOp(a2.elemType);
      return f32AsExpected(
        `(${eLoad} (i32.add (i32.add ${rowPtr} (i32.const 8)) (i32.shl ${colIdx} (i32.const ${eShift}))))`,
        a2.elemType,
        expectedType,
      );
    }
  }
  // Array element read: arr[idx]. Guard the greedy index capture so `arr[0] + arr[1]` (index would
  // capture `0] + arr[1`) falls through to the binary-op loop below instead of emitting one mangled
  // access (mirrors emitExpr in wasic.ts, which already guards this).
  let bracketM = expr.match(/^(\w+)\[(.+)\]$/);
  if (bracketM && !parenDepthNeverNegative(bracketM[2])) bracketM = null;
  // Phase 23: tuple element access t[N] → struct field _N
  if (bracketM && structLookup && /^\d+$/.test(bracketM[2])) {
    const fi = structLookup(bracketM[1], `_${bracketM[2]}`);
    if (fi) return fieldAsExpected(fi.watLoad, fi.type, expectedType);
  }
  if (bracketM && arrayLookup) {
    const ai = arrayLookup(bracketM[1]);
    if (ai) {
      // String arrays: each element is 8 bytes [ptr i32, len i32]; load the ptr here.
      if (ai.isStringArr || ai.elemType === "string") {
        const base = (ai.ptr === -1 || ai.dynamic)
          ? `(local.get $${bracketM[1]})`
          : `(i32.const ${ai.ptr})`;
        const idxW = exprToWat(
          bracketM[2],
          locals,
          "i32",
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        );
        const addr = `(i32.add (i32.add ${base} (i32.const 8)) (i32.shl ${idxW} (i32.const 3)))`;
        return `(i32.load ${addr})`;
      }
      // Phase 31: respect custom shift/loadOp for sub-word TypedArrays
      const loadOp = ai.customLoadOp ??
        (memLoadOp(ai.elemType));
      const shift = ai.shift !== undefined
        ? ai.shift
        : (ai.elemType === "f64" || ai.elemType === "i64")
        ? 3
        : 2;
      let idxWat = exprToWat(
        bracketM[2],
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      // If index is an f64 local/global, wrap with trunc to get i32
      if (/^\w+$/.test(bracketM[2].trim())) {
        const idxT = locals.get(bracketM[2].trim()) ?? globals?.get(bracketM[2].trim());
        if (idxT === "f64" || idxT === "f32") idxWat = `(i32.trunc_f64_s ${idxWat})`;
      }
      // All arrays use an 8-byte [length, capacity] header; data starts at ptr+8.
      const baseWat = (ai.ptr === -1 || ai.dynamic)
        ? `(local.get $${bracketM[1]})`
        : `(i32.const ${ai.ptr})`;
      const dataBase = `(i32.add ${baseWat} (i32.const 8))`;
      const addrWat = shift === 0
        ? `(i32.add ${dataBase} ${idxWat})`
        : `(i32.add ${dataBase} (i32.shl ${idxWat} (i32.const ${shift})))`;
      const elemWat = `(${loadOp} ${addrWat})`;
      return ai.customLoadOp ? elemWat : f32AsExpected(elemWat, ai.elemType, expectedType);
    }
  }

  // Struct field access: p.field
  const sfDotM = expr.match(/^(\w+)\.(\w+)$/);
  if (sfDotM && structLookup) {
    const fi = structLookup(sfDotM[1], sfDotM[2]);
    if (fi) return fieldAsExpected(fi.watLoad, fi.type, expectedType); // ld18: f32 fields
  }

  // Phase 42: three-part chained struct field access: a.b.c
  const sfChainedDotM = expr.match(/^(\w+)\.(\w+)\.(\w+)$/);
  if (sfChainedDotM && structLookup) {
    const fi = structLookup(`${sfChainedDotM[1]}.${sfChainedDotM[2]}`, sfChainedDotM[3]);
    if (fi) return fieldAsExpected(fi.watLoad, fi.type, expectedType);
  }

  // Global isNaN(x) → f64.ne x x
  {
    const globalIsNaNEWat = expr.match(/^isNaN\s*\((.+)\)$/);
    if (globalIsNaNEWat && parenDepthNeverNegative(globalIsNaNEWat[1])) {
      const argWat = exprToWat(
        globalIsNaNEWat[1].trim(),
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      return `(f64.ne ${argWat} ${argWat})`;
    }
  }

  // Phase 48: Number.* constants and predicates
  if (expr.startsWith("Number.")) {
    const NUMBER_CONSTS: Record<string, string> = {
      NaN: "nan",
      POSITIVE_INFINITY: "inf",
      NEGATIVE_INFINITY: "-inf",
      EPSILON: "2.220446049250313e-16",
      MAX_SAFE_INTEGER: "9007199254740991",
      MIN_SAFE_INTEGER: "-9007199254740991",
      MAX_VALUE: "1.7976931348623157e+308",
      MIN_VALUE: "5e-324",
    };
    const numConstM = expr.match(/^Number\.(\w+)$/);
    if (numConstM && NUMBER_CONSTS[numConstM[1]] !== undefined) {
      return `(f64.const ${NUMBER_CONSTS[numConstM[1]]})`;
    }
    const numPredM = expr.match(/^Number\.(isNaN|isFinite|isInteger)\(([\s\S]*)\)$/);
    let _numPredCLOk = false;
    if (numPredM) {
      let _d = 0;
      _numPredCLOk = true;
      for (const _c of numPredM[2]) {
        if (_c === "(") _d++;
        else if (_c === ")") {
          if (_d === 0) {
            _numPredCLOk = false;
            break;
          }
          _d--;
        }
      }
    }
    if (numPredM && _numPredCLOk) {
      const predFn = numPredM[1];
      const argExpr = numPredM[2].trim();
      const argWat = exprToWat(
        argExpr,
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      if (predFn === "isNaN") return `(f64.ne ${argWat} ${argWat})`;
      if (predFn === "isFinite") {
        return `(i32.and (f64.lt ${argWat} (f64.const inf)) (f64.gt ${argWat} (f64.const -inf)))`;
      }
      if (predFn === "isInteger") return `(f64.eq (f64.floor ${argWat}) ${argWat})`;
    }
  }

  // Math.* constants and functions
  if (expr.startsWith("Math.")) {
    const MATH_CONSTS: Record<string, string> = {
      PI: "3.141592653589793",
      E: "2.718281828459045",
      LN2: "0.6931471805599453",
      LN10: "2.302585092994046",
      LOG2E: "1.4426950408889634",
      LOG10E: "0.4342944819032518",
      SQRT2: "1.4142135623730951",
      SQRT1_2: "0.7071067811865476",
    };
    const mathConstM = expr.match(/^Math\.(\w+)$/);
    if (mathConstM && MATH_CONSTS[mathConstM[1]] !== undefined) {
      return `(f64.const ${MATH_CONSTS[mathConstM[1]]})`;
    }
    const mathCallM = expr.match(/^Math\.(\w+)\(([\s\S]*)\)$/);
    let _mathCLOk = false;
    if (mathCallM) {
      let _d = 0;
      _mathCLOk = true;
      for (const _c of mathCallM[2]) {
        if (_c === "(") _d++;
        else if (_c === ")") {
          if (_d === 0) {
            _mathCLOk = false;
            break;
          }
          _d--;
        }
      }
    }
    if (mathCallM && _mathCLOk) {
      const fn = mathCallM[1];
      const aStr = mathCallM[2].trim();
      const a = aStr ? splitTopLevelArgs(aStr) : [];
      // `Math` is f64-only: a bigint argument is a TypeError in JavaScript (sw63, 2026-10-09).
      for (const e of a) {
        const t = e.trim();
        if (/^-?\d+n$/.test(t) || (/^\w+$/.test(t) && (locals.get(t) ?? globals?.get(t)) === "i64")) {
          _diagnosticSink?.(`Math.${fn}: a bigint argument is a TypeError in JavaScript (${t.slice(0, 40)}); use wasMath's i64 / u64`);
        }
      }
      const arg0 = exprToWat(
        a[0] ?? "0",
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      const arg1 = exprToWat(
        a[1] ?? "0",
        locals,
        "f64",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      // An f64-valued Math result at the expected type, as wasic's emitExpr does (ld15,
      // 2026-10-06): `trunc_f64_s` into an integer, demote into f32.
      const asExpected = (w: string): string =>
        expectedType === "i32"
          ? `(i32.trunc_f64_s ${w})`
          : expectedType === "i64"
          ? `(i64.trunc_f64_s ${w})`
          : expectedType === "f32"
          ? `(f32.demote_f64 ${w})`
          : w;
      if (expectedType === "i32" && (fn === "abs" || fn === "min" || fn === "max")) {
        _mathHelperNeeded?.(`i32_${fn}`);
      }
      // clz32 / imul: ToInt32 on each argument, as wasic's emitExpr does (ld27, 2026-10-09): a
      // literal folds; an f64 / f32 value (read from the emitted WAT's outermost form) goes
      // through `$__i32_toint32`; a bigint is a TypeError in JavaScript, so a diagnostic.
      const toInt32 = (e: string): string =>
        toInt32Wat(e, locals, funcLookup, allocString, arrayLookup, structLookup, globals);
      if (fn === "clz32") {
        return `(i32.clz ${toInt32(a[0] ?? "0")})`;
      }
      if (fn === "imul") {
        return `(i32.mul ${toInt32(a[0] ?? "0")} ${toInt32(a[1] ?? "0")})`;
      }
      if (fn === "abs") {
        return expectedType === "i32"
          ? `(call $__i32_abs ${
            exprToWat(
              a[0] ?? "0",
              locals,
              "i32",
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            )
          })`
          : asExpected(`(f64.abs ${arg0})`);
      }
      if (fn === "min" || fn === "max") {
        // N-ary, folded left, as wasic's emitExpr (sw28, 2026-10-09): only two arguments were
        // read. One argument is itself; none is ±Infinity. Two emit exactly what they did.
        if (a.length === 0) return asExpected(`(f64.const ${fn === "max" ? "-inf" : "inf"})`);
        const isI32 = expectedType === "i32";
        const ws = isI32
          ? a.map((x) =>
            exprToWat(x, locals, "i32", funcLookup, allocString, arrayLookup, structLookup, globals)
          )
          : [
            arg0,
            ...a.slice(1).map((x, k) =>
              k === 0 ? arg1 : exprToWat(
                x,
                locals,
                "f64",
                funcLookup,
                allocString,
                arrayLookup,
                structLookup,
                globals,
              )
            ),
          ];
        const folded = ws.slice(1).reduce(
          (acc, w) => isI32 ? `(call $__i32_${fn} ${acc} ${w})` : `(f64.${fn} ${acc} ${w})`,
          ws[0],
        );
        return isI32 ? folded : asExpected(folded);
      }
      if (fn === "sqrt") return asExpected(`(f64.sqrt ${arg0})`);
      if (fn === "floor") return asExpected(`(f64.floor ${arg0})`);
      if (fn === "ceil") return asExpected(`(f64.ceil ${arg0})`);
      if (fn === "trunc") return asExpected(`(f64.trunc ${arg0})`);
      // round / sign / hypot: wasic's exact helpers (sw38–sw40, 2026-10-06); see emitMathHelpers.
      if (fn === "round") {
        _mathHelperNeeded?.("f64_round");
        return asExpected(`(call $__math_round ${arg0})`);
      }
      if (fn === "pow") return asExpected(`(call $mathlib_pow ${arg0} ${arg1})`);
      if (fn === "sign") {
        _mathHelperNeeded?.("f64_sign");
        return asExpected(`(call $__math_sign ${arg0})`);
      }
      if (fn === "hypot") {
        if (a.length === 0) return asExpected(`(f64.const 0)`);
        _mathHelperNeeded?.(`f64_hypot${a.length}`);
        const hArgs = a.map((x) =>
          exprToWat(x, locals, "f64", funcLookup, allocString, arrayLookup, structLookup, globals)
        );
        return asExpected(`(call $__math_hypot${a.length} ${hArgs.join(" ")})`);
      }
      if (fn === "fround") return asExpected(`(f64.promote_f32 (f32.demote_f64 ${arg0}))`);
      // Phase 38: extended math library functions
      const MATH38_UNARY = [
        "sin",
        "cos",
        "tan",
        "asin",
        "acos",
        "atan",
        "log",
        "log2",
        "log10",
        "exp",
        "expm1",
        "log1p",
        "cbrt",
        "sinh",
        "cosh",
        "tanh",
        "asinh",
        "acosh",
        "atanh",
      ];
      if (MATH38_UNARY.includes(fn)) return asExpected(`(call $mathlib_${fn} ${arg0})`);
      if (fn === "atan2") return asExpected(`(call $mathlib_atan2 ${arg0} ${arg1})`);
      if (fn === "random") return asExpected(`(call $mathlib_random)`);
    }
  }

  // Simple identifier — check locals first, then module globals, then function table
  if (/^\w+$/.test(expr)) {
    // At the expected type when the widening is lossless: `-n` of an i32 `n` in an f64 sum was
    // `f64.neg` of an i32, an invalid module (H12, found with sw23, 2026-09-30). A mismatch here
    // always produced an invalid module, so no valid output changes.
    const asExpected = (wat: string, t: string | undefined): string =>
      t !== undefined && t !== expectedType &&
        ["i32", "i64", "f32", "f64"].includes(t) && // never a `bool`: it would print 1 for true
        ["i32", "i64", "f32", "f64"].includes(expectedType)
        ? (widenNumeric(wat, t, expectedType) ?? wat)
        : wat;
    if (locals.has(expr)) return asExpected(`(local.get $${expr})`, locals.get(expr));
    if (globals?.has(expr)) return asExpected(`(global.get $${expr})`, globals.get(expr));
    // Function reference passed as a callback argument
    const funcIdx = _funcTableLookup?.(expr);
    if (funcIdx !== undefined) return `(i32.const ${funcIdx})`;
  }

  // Phase 5f: chained call — factoryFn(outerArgs)(innerArgs) closure factory
  {
    const factoryHead = expr.match(/^(\w+)\s*\(/)?.[1];
    if (factoryHead) {
      const factorySig = funcLookup?.(factoryHead);
      if (factorySig?.isClosureFactory) {
        const parts = extractChainedCallParts(expr);
        if (parts) {
          const outerArgList = parts.outerRaw ? splitTopLevelArgs(parts.outerRaw) : [];
          const outerWat = outerArgList.map((a, i) => {
            const ptype = factorySig.params[i]?.type ?? "i32";
            return exprToWat(
              a.trim(),
              locals,
              ptype,
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            );
          }).join(" ");
          const innerSig = funcLookup?.(`${factoryHead}__inner`);
          const captureCount = innerSig?.closureCaptures?.length ?? 0;
          const innerCallParams = innerSig
            ? innerSig.params.slice(0, innerSig.params.length - captureCount)
            : [];
          const innerArgList = parts.innerRaw ? splitTopLevelArgs(parts.innerRaw) : [];
          const innerWat = innerArgList.map((a, i) => {
            const ptype = innerCallParams[i]?.type ?? "i32";
            return exprToWat(
              a.trim(),
              locals,
              ptype,
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            );
          }).join(" ");
          return `(call $${factoryHead}__trampoline (call $${factoryHead} ${outerWat}) ${innerWat})`
            .trim();
        }
      }
    }
  }

  // Nested function call: name(args)
  // Only a WHOLE call: `f(a) + f(b)` falls through to the operators (see parseSingleArg).
  const callMatch = expr.match(/^(\w+)\s*\((.*)?\)$/);
  if (callMatch && parenDepthNeverNegative(callMatch[2] ?? "")) {
    const callee = callMatch[1];
    const rawArgs = callMatch[2]?.trim() ?? "";
    const argList = rawArgs ? splitTopLevelArgs(rawArgs) : [];
    const sig = funcLookup?.(callee);
    // Not a function: a function-typed variable, called through call_indirect (ld01; the twin
    // in parseSingleArg).
    if (!sig && _exprFallbackResolver) {
      const r = _exprFallbackResolver(expr, locals);
      const widened = r ? widenNumeric(r.wat, r.type, expectedType) : null;
      if (widened !== null) return widened;
    }
    // Phase 33 guard: struct args must be layout-compatible with the params they bind to
    _structArgLayoutCheck?.(callee, argList);
    // String params expand to two stack values
    const watArgsList = argList.flatMap((a, i) => {
      const ptype = sig?.params[i]?.type ?? "i32";
      const aTrimmed2 = a.trim();
      if (
        ptype === "i32" && aTrimmed2.startsWith("{") && _structLiteralAlloc &&
        sig?.params[i]?.structType
      ) {
        const structName2 = sig.params[i].structType!;
        const braceContent2 = aTrimmed2.slice(1, aTrimmed2.lastIndexOf("}")).trim();
        const initFields2: Record<string, string> = {};
        const pairs2 = splitTopLevelArgs(braceContent2);
        for (const pair of pairs2) {
          const ci = pair.indexOf(":");
          const key = ci !== -1 ? pair.slice(0, ci).trim() : pair.trim();
          const val = ci !== -1 ? pair.slice(ci + 1).trim() : key;
          if (key) initFields2[key] = val;
        }
        return [`(i32.const ${_structLiteralAlloc(structName2, initFields2)})`];
      }
      return [
        intArgWat(
          exprToWat(a.trim(), locals, ptype, funcLookup, allocString, arrayLookup, structLookup, globals),
          a,
          callee,
          ptype,
          locals,
          globals,
        ),
      ];
    });
    // Fill in default values for omitted trailing params
    if (sig) {
      const baseParamCount = sig.params.length - (sig.closureCaptures?.length ?? 0);
      for (let i = argList.length; i < baseParamCount; i++) {
        const param = sig.params[i];
        if (param.defaultValue !== undefined) {
          watArgsList.push(
            exprToWat(
              param.defaultValue,
              locals,
              param.type,
              funcLookup,
              allocString,
              arrayLookup,
              structLookup,
              globals,
            ),
          );
        }
      }
    }
    const callWat = watArgsList.length > 0
      ? `(call $${callee} ${watArgsList.join(" ")})`
      : `(call $${callee})`;
    // The result at the type the caller expects: `count(a) + count(b)` in an f64 sum was an i32
    // on an f64 stack, an invalid module (sw35, H12 2026-09-30). A `boolean` result is never
    // widened: as a number it would print `1` for `true`.
    const numeric = ["i32", "i64", "f32", "f64"];
    const res = sig?.result;
    if (
      res && res !== expectedType && numeric.includes(res) && numeric.includes(expectedType) &&
      sig?.resultTsName !== "boolean"
    ) {
      const widened = widenNumeric(callWat, res, expectedType);
      if (widened !== null) return widened;
      _diagnosticSink?.(
        `console argument: '${callee}(…)' returns ${res}, which does not fit ${expectedType} here.`,
      );
    }
    return callWat;
  }

  // Parenthesised sub-expression — unwrap and recurse, only when the outer pair matches:
  // `(a+1)*(a+2)` is a product, not `a+1)*(a+2` (sw21, H12 2026-09-30).
  if (expr.startsWith("(") && expr.endsWith(")") && parenDepthNeverNegative(expr.slice(1, -1))) {
    return exprToWat(
      expr.slice(1, -1),
      locals,
      expectedType,
      funcLookup,
      allocString,
      arrayLookup,
      structLookup,
      globals,
    );
  }

  const isFloat = expectedType === "f64" || expectedType === "f32";
  // i64 is preserved; otherwise default numeric to f64
  const numType = isFloat ? (expectedType as string) : expectedType === "i64" ? "i64" : "f64";

  // Unary ! — logical not → i32.eqz
  if (expr.startsWith("!") && !expr.startsWith("!=")) {
    return `(i32.eqz ${
      exprToWat(
        expr.slice(1).trim(),
        locals,
        "i32",
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      )
    })`;
  }

  // Unary ~ — bitwise not → i32.xor with -1
  // (2026-10-13: at i64 a bigint `i64.xor`; otherwise the operand is ToInt32'd, as for `|`.)
  if (expr.startsWith("~")) {
    const inner = expr.slice(1).trim();
    if (expectedType === "i64") {
      return `(i64.xor ${
        exprToWat(inner, locals, "i64", funcLookup, allocString, arrayLookup, structLookup, globals)
      } (i64.const -1))`;
    }
    const xw = `(i32.xor ${
      toInt32Wat(inner, locals, funcLookup, allocString, arrayLookup, structLookup, globals)
    } (i32.const -1))`;
    // an i32 result where a float is expected (`console.log(~f)` of an f64 f) is widened
    return isFloat ? `(${expectedType}.convert_i32_s ${xw})` : xw;
  }

  // Unary - on a non-literal (e.g. -x, -(a+b)). Unary minus binds tighter than every binary
  // operator, so it applies only when none sits at top level: `-n + m` is `(-n) + m`, not
  // `-(n + m)` (an invalid module: `f64.neg` of an i32 sum; H12, found with sw23, 2026-09-30).
  if (expr.startsWith("-") && !/^-\d/.test(expr) && !hasTopLevelBinaryOp(expr)) {
    const inner = expr.slice(1).trim();
    if (isFloat) {
      return `(${expectedType}.neg ${
        exprToWat(
          inner,
          locals,
          numType,
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        )
      })`;
    }
    // a bigint (the i64 segment of `console.log(-a)`, sw64, 2026-10-13)
    if (expectedType === "i64") {
      return `(i64.sub (i64.const 0) ${
        exprToWat(inner, locals, "i64", funcLookup, allocString, arrayLookup, structLookup, globals)
      })`;
    }
    return `(i32.sub (i32.const 0) ${
      exprToWat(inner, locals, "i32", funcLookup, allocString, arrayLookup, structLookup, globals)
    })`;
  }

  // Ternary: cond ? then : else
  // The FIRST top-level `?` and its own `:` (splitTernary): `c1 ? A : c2 ? B : C` grouped from the
  // LAST `?` printed 1 for -5 (sw12's console half, 2026-10-06).
  const ternSplit = splitTernary(expr);
  if (ternSplit) {
    {
      const [cond, thenPart, elsePart] = ternSplit;
      const resType = isFloat ? expectedType : "i32";
      return `(if (result ${resType}) ${
        condToWat(cond, locals, funcLookup, allocString, arrayLookup, structLookup, globals)
      } (then ${
        exprToWat(
          thenPart,
          locals,
          resType,
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        )
      }) (else ${
        exprToWat(
          elsePart,
          locals,
          resType,
          funcLookup,
          allocString,
          arrayLookup,
          structLookup,
          globals,
        )
      }))`;
    }
  }

  // String comparison: arr[i] === "str", str === arr[i], arr[i] === arr[j]
  // Must be checked before the generic binOps loop to avoid f64.eq on i32 string pointers.
  // Equality first (it binds looser), then the relational operators, which compare two STRINGS by
  // code unit; with a number on either side JavaScript compares numbers, so both must be strings.
  // `a < b` of two strings reached the numeric table and read `$a` as a number (ld03, 2026-10-15).
  const STR_CMP_OPS = ["===", "!==", "==", "!=", "<=", ">=", "<", ">"];
  for (const strOp of STR_CMP_OPS) {
    const strOpIdx = findTopLevelOp(expr, strOp);
    if (strOpIdx === -1) continue;
    const strLhs = expr.slice(0, strOpIdx).trim();
    const strRhs = expr.slice(strOpIdx + strOp.length).trim();
    const lStr = looksLikeString(strLhs, locals, arrayLookup);
    const rStr = looksLikeString(strRhs, locals, arrayLookup);
    const isEquality = !/^[<>]/.test(strOp);
    if (isEquality ? !lStr && !rStr : !(lStr && rStr)) break;
    // Helper: get ptr+len WAT for a string expression
    const getStrPL = (e: string): [string, string] => {
      if (/^\w+$/.test(e) && locals.get(e) === "string") {
        return [`(local.get $${e}_ptr)`, `(local.get $${e}_len)`];
      }
      const litM = e.match(/^["'](.*)["']$/);
      if (litM && allocString) {
        const [p, l] = allocString(litM[1]);
        return [`(i32.const ${p})`, `(i32.const ${l})`];
      }
      const bM = e.match(/^(\w+)\[([^\]]+)\]$/);
      if (bM && arrayLookup) {
        const ai = arrayLookup(bM[1]);
        if (ai && (ai.isStringArr || ai.elemType === "string")) {
          const base = (ai.ptr === -1 || ai.dynamic)
            ? `(local.get $${bM[1]})`
            : `(i32.const ${ai.ptr})`;
          const idxW = exprToWat(
            bM[2],
            locals,
            "i32",
            funcLookup,
            allocString,
            arrayLookup,
            structLookup,
            globals,
          );
          const addr = `(i32.add (i32.add ${base} (i32.const 8)) (i32.shl ${idxW} (i32.const 3)))`;
          return [`(i32.load ${addr})`, `(i32.load offset=4 ${addr})`];
        }
      }
      // Any other string-valued form (string-returning call `fn()`, struct field `obj.f`,
      // `s.slice(...)`, `s.toUpperCase()`, …): delegate to wasic's emitStringPtrLen via the resolver.
      // Without this, such operands silently compared against the empty string → wrong boolean
      // (e.g. `a === getName()` printed false when true). The resolver captures len into
      // $__str_op_len, so a console.* line with a string-equality op pre-declares that temp.
      const resolved = _stringExprResolver?.(e, locals);
      if (resolved) return [resolved.ptrWat, resolved.lenWat];
      if (e === "null" || e === "undefined") return [`(i32.const 0)`, `(i32.const 0)`];
      // Comparing against "" instead would print a wrong boolean with no error (H12, found with
      // sw05, 2026-09-30).
      _diagnosticSink?.(
        `console argument: cannot emit the string operand '${e.slice(0, 60) || "(empty)"}'.`,
      );
      return [`(i32.const 0)`, `(i32.const 0)`];
    };
    const [lPtr, lLen] = getStrPL(strLhs);
    const [rPtr, rLen] = getStrPL(strRhs);
    _strCmpNeeded?.();
    // $__str_cmp returns 0 when the strings are equal (strcmp semantics). `===`/`==` → 1 iff equal
    // (i32.eqz); `!==`/`!=` → 1 iff NOT equal (cmp ≠ 0). The old `!==` form was inverted — it
    // returned true for EQUAL strings.
    const cmpCall = `(call $__str_cmp ${lPtr} ${lLen} ${rPtr} ${rLen})`;
    if (strOp === "===" || strOp === "==") return `(i32.eqz ${cmpCall})`;
    if (strOp === "!==" || strOp === "!=") return `(i32.ne ${cmpCall} (i32.const 0))`;
    // negative / zero / positive, as wasic's STR_CMP table reads it
    const rel = { "<": "lt_s", "<=": "le_s", ">": "gt_s", ">=": "ge_s" }[strOp]!;
    return `(i32.${rel} ${cmpCall} (i32.const 0))`;
  }

  // Binary operators — ascending precedence order (lowest first = outermost grouping).
  // [op, f64-watop, i32-watop, requiresPositiveIdx, alwaysI32]
  const binOps: Array<[string, string, string, boolean, boolean]> = [
    ["||", "i32.or", "i32.or", false, true], // logical OR
    ["&&", "i32.and", "i32.and", false, true], // logical AND
    ["|", "i32.or", "i32.or", false, true], // bitwise OR
    ["^", "i32.xor", "i32.xor", false, true], // bitwise XOR
    ["&", "i32.and", "i32.and", false, true], // bitwise AND
    ["===", "f64.eq", "i32.eq", false, false],
    ["!==", "f64.ne", "i32.ne", false, false],
    ["==", "f64.eq", "i32.eq", false, false], // non-strict equality
    ["!=", "f64.ne", "i32.ne", false, false], // non-strict inequality
    ["<=", "f64.le", "i32.le_s", false, false],
    [">=", "f64.ge", "i32.ge_s", false, false],
    ["<", "f64.lt", "i32.lt_s", false, false],
    [">", "f64.gt", "i32.gt_s", false, false],
    [">>>", "i32.shr_u", "i32.shr_u", false, true], // unsigned shift
    [">>", "i32.shr_s", "i32.shr_s", false, true], // signed shift
    ["<<", "i32.shl", "i32.shl", false, true], // left shift
    ["+", "f64.add", "i32.add", false, false],
    ["-", "f64.sub", "i32.sub", true, false], // positiveIdx: skip unary minus
    ["*", "f64.mul", "i32.mul", false, false],
    ["/", "f64.div", "i32.div_s", false, false],
    // Signed remainder, the sign of the dividend, as JavaScript's `%` (and wasic's emitExpr):
    // `rem_u` printed `-7 % 4` as 1 (sw20). There is no `f64.rem`; see the float case below (ld02).
    ["%", "f64.rem", "i32.rem_s", false, false],
  ];
  // `*`, `/` and `%` share ONE precedence level and are LEFT-associative, but this loop splits at
  // the first operator in table order, where `*` precedes `/` and `%`. `a * b / c` therefore
  // matched `*` and produced `a * (b / c)` — right-associative and silently wrong for integer
  // division/remainder. Skip a candidate when another member of its group sits further right, so
  // the later entry splits at the RIGHTMOST operator. This mirrors the identical guard in wasic.ts's
  // emitExpr; the two binary-op loops are parallel code paths and must be fixed together.
  // Every same-precedence group splits at its rightmost member, as in wasic.ts's emitExpr (the
  // parallel path; sw17, 2026-10-06): `a >> 2 << 1` split at `>>` and printed 4 instead of 32.
  const SAME_PREC = [
    ["===", "!==", "==", "!="],
    ["<=", ">=", "<", ">"],
    [">>>", ">>", "<<"],
    ["+", "-"],
    ["*", "/", "%"],
  ];
  const rightmostOf = new Map<string, number>();
  for (const grp of SAME_PREC) {
    const r = Math.max(...grp.map((o) => findTopLevelOp(expr, o)));
    for (const o of grp) rightmostOf.set(o, r);
  }
  for (const [op, f64op, i32op, positiveIdx, alwaysI32] of binOps) {
    const idx = findTopLevelOp(expr, op);
    if (idx === -1) continue;
    if (idx < (rightmostOf.get(op) ?? -1)) continue;
    if (positiveIdx && idx === 0) continue;
    const lhs = expr.slice(0, idx).trim();
    const rhs = expr.slice(idx + op.length).trim();
    // `x === null` (`!==`, `==`, `!=`, or `undefined`): wasic owns what null IS for x (a nullable
    // local's `__null` flag, a field's flag word, a null pointer). Compared here as a value, a
    // nullable local holding 0 printed `true` for `v === null` (2026-10-09, with sw51).
    if (
      (op === "===" || op === "!==" || op === "==" || op === "!=") &&
      [lhs, rhs].some((s) => s === "null" || s === "undefined") && _exprFallbackResolver
    ) {
      const r = _exprFallbackResolver(expr, locals);
      const widened = r ? widenNumeric(r.wat, r.type, expectedType) : null;
      if (widened !== null) return widened;
    }
    // Logical && / || — emit SHORT-CIRCUIT (if/result) form, matching emitExpr in wasic.ts, so
    // a guarded RHS side effect (e.g. `i < len && s.charCodeAt(i) === c`) does not run when the
    // LHS already decides the result. Avoids OOB access and the wasmmerge call-in-i32.and trap.
    if (op === "&&" || op === "||") {
      // Two numbers: the operand, from wasic (sw49); widened to the type asked.
      const lr = _logicalResolver?.(expr, locals);
      if (lr && "wat" in lr) {
        const widened = widenNumeric(lr.wat, lr.type, expectedType);
        if (widened !== null) return widened;
      }
      // A boolean mixed with a number, as a NUMBER (a sum, a string piece): what it is depends
      // on the run, and a boolean here printed `true` / built an invalid module. Refused.
      if (lr && "rewrite" in lr && expectedType !== "i32") {
        _diagnosticSink?.(
          `console argument: '${expr.slice(0, 60)}' mixes a boolean and a number inside a larger ` +
            `expression; give it its own console.log argument or a variable`,
        );
      }
      // Operands by truthiness (sw16's console twin): a float operand reached the `if` raw.
      const lWat = condToWat(
        lhs,
        locals,
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      const rWat = condToWat(
        rhs,
        locals,
        funcLookup,
        allocString,
        arrayLookup,
        structLookup,
        globals,
      );
      return op === "&&"
        ? `(if (result i32) ${lWat} (then ${rWat}) (else (i32.const 0)))`
        : `(if (result i32) ${lWat} (then (i32.const 1)) (else ${rWat}))`;
    }
    // Infer the operand type from the LEADING atom of the LHS so i32/i64 arithmetic isn't cast to
    // f64. Handles a plain local, `.length` (always i32), a struct/tuple field access `var.field`
    // (type via structLookup), AND a compound LHS like `a.i + b.i + c.i` (whose leading atom drives
    // the type). Without this, `console.log("x:", a.i + b.i)` on i32 struct fields emitted
    // `f64.add` of i32 loads and failed to compile (pre-existing bug). The leading atom is only used
    // when it's a simple var or var.field — `arr[i]` / `fn(...)` / `a.b.c` fall back to the numeric
    // default so f64 array elements / call results aren't mis-typed as i32.
    const leadM = lhs.match(/^(\w+)(?:\.(\w+))?/);
    const restAfterLead = leadM ? lhs.slice(leadM[0].length).trimStart() : "";
    const leadIsSimpleAtom = leadM !== null &&
      (restAfterLead === "" || !/^[.[(]/.test(restAfterLead));
    // Array-element operand led by `arr[…]`: the type follows the array's ELEMENT type (the lead
    // atom `arr` itself is an i32 pointer, so the generic lead-atom path below would mis-type it).
    // Keying on the lead atom (not the whole LHS) also covers a COMPOUND left operand like
    // `arr[0] + arr[1]` (3-term sums), where the LHS isn't a single bracket access. This makes
    // `console.log("x:", arr[0] + arr[1])` emit `i32.add` for an i32[] / `f64.add` for an f64[]
    // instead of defaulting to f64 (which produced wrong output or a type error).
    const leadArrElem = (leadM && leadM[2] === undefined && restAfterLead.startsWith("["))
      ? arrayLookup?.(leadM[1])?.elemType
      : undefined;
    // A boolean element is an i32 (`flags[0] === false` was f64.eq over an i32 load: an invalid
    // module; found with sw69).
    // A struct-array element's FIELD, `qs[0].x + …`: the field's type. The lead atom `qs` is an
    // i32 pointer, so an f64 field was asked for as i32 and refused (ld19, 2026-10-15).
    const leadElemField = lhs.match(/^(\w+)\[([^\]]*)\]\.(\w+)(?![\w.([])/);
    const leadFieldType = leadElemField && structLookup
      ? structLookup(`${leadElemField[1]}[${leadElemField[2]}]`, leadElemField[3]!)?.type
      : undefined;
    const leadNum = (t: string | undefined) =>
      t === "i32" || t === "i64" || t === "f64" || t === "f32" || t === "bool" ? t : undefined;
    const lhsArrNumType = leadElemField ? leadNum(leadFieldType) : leadNum(leadArrElem);
    const lhsLocalType = lhsArrNumType
      ? lhsArrNumType
      : !leadIsSimpleAtom || !leadM
      ? undefined
      : leadM[2] === "length"
      ? "i32" as const
      : leadM[2]
      ? (structLookup ? structLookup(leadM[1], leadM[2])?.type : undefined)
      // plain lead atom: a function-local OR a module global (`a + b` of i32 globals must be i32.add).
      : (locals.get(leadM[1]) ?? globals?.get(leadM[1]));
    // A plain INTEGER-literal LHS carries no type of its own, so opType fell back to f64 while an
    // i32 RHS stayed i32 — `console.log("x:", 1 + n)` emitted `f64.add` over an `i32` operand and
    // failed to instantiate (`a + 1` worked, `1 + a` did not). Take the type from the RHS lead atom
    // in that case. A FLOAT literal (`1.5 + n`) genuinely means f64, so it keeps the default.
    let effLhsType = lhsLocalType;
    // A left operand that is a whole CALL has its result's type: a function's, or (a function-
    // typed variable, `fa(2) + op(1)`) what wasic emits it as. It defaulted to f64 over two i32
    // results (found with ld01, 2026-10-15).
    const lhsCall = lhs.trim().match(/^(\w+)\s*\(([\s\S]*)\)$/);
    if (effLhsType === undefined && lhsCall && parenDepthNeverNegative(lhsCall[2]!)) {
      const fr = funcLookup?.(lhsCall[1]!)?.result;
      effLhsType = fr === "i32" || fr === "i64" || fr === "f64" || fr === "f32" || fr === "bool"
        ? fr
        : !funcLookup?.(lhsCall[1]!)
        ? _exprFallbackResolver?.(lhs.trim(), locals)?.type
        : undefined;
    }
    if (effLhsType === undefined) {
      // First typed atom in `s`, or undefined. Deliberately used ONLY for the two operand shapes
      // that carry no type of their own (below) — applying it to e.g. a call LHS would wrongly
      // take the type of an argument instead of the return type.
      const firstTypedAtom = (s: string): string | undefined => {
        for (const m of s.matchAll(/\b([A-Za-z_]\w*)\b/g)) {
          const arr = arrayLookup?.(m[1]);
          const t = arr ? arr.elemType : (locals.get(m[1]) ?? globals?.get(m[1]));
          if (t !== undefined) return t;
        }
        return undefined;
      };
      const lhsTrim = lhs.trim();
      if (lhsTrim.startsWith("(")) {
        // Parenthesised LHS: `(n + 0) * 5` — the group has no lead atom, so the operand type
        // defaulted to f64 over i32 arithmetic and failed to instantiate.
        effLhsType = firstTypedAtom(lhsTrim);
      } else if (/^-?\d+$/.test(lhsTrim)) {
        // Integer-literal LHS: `1 + n`. Take the type from the RHS. A FLOAT literal (`1.5 + n`)
        // genuinely means f64 and is intentionally not matched here.
        effLhsType = firstTypedAtom(rhs);
      }
    }
    // An i32 left operand meeting a KNOWN float right one computes in f64 (sw15's console twin,
    // 2026-10-06): `i + f` was `i32.add` over an f64 global, an invalid module.
    // bigint `&` `|` `^` `<<` `>>` (ld31, 2026-10-13): wasic's emitExpr owns the i64 forms (and the
    // shift helpers); handing i32.and an i64 was an invalid module.
    if (alwaysI32 && _exprFallbackResolver) {
      const isBig = (s: string) => {
        const t = s.trim();
        if (/^-?\d+n$/.test(t)) return true;
        const lead = t.match(/^(\w+)(?![\w.([])/)?.[1];
        return lead !== undefined && (locals.get(lead) ?? globals?.get(lead)) === "i64";
      };
      if (isBig(lhs) || isBig(rhs)) {
        const r = _exprFallbackResolver(expr, locals);
        const widened = r ? widenNumeric(r.wat, r.type, expectedType) : null;
        if (widened !== null) return widened;
      }
    }
    // An equality between BOOLEANS (a comparison, `!x`, `true` / `false`, a boolean variable) is
    // an i32 compare: `2 < 3 === true` took f64 from its literal-led left side over two i32
    // results, an invalid module (ld23, 2026-10-15).
    const boolEquality = (op === "===" || op === "!==" || op === "==" || op === "!=") &&
      (isBoolOperand(lhs, locals, globals) || isBoolOperand(rhs, locals, globals));
    const opType = alwaysI32 || boolEquality
      ? "i32"
      : effLhsType === "i64"
      ? "i64"
      : (effLhsType === "i32" || effLhsType === "bool") && !isKnownFloat(rhs, locals, globals) &&
          !hasFloatField(rhs, structLookup)
      ? "i32"
      : (effLhsType === "i32" || effLhsType === "bool")
      ? "f64"
      : numType;
    const watOp = (opType === "f64" || opType === "f32")
      ? f64op
      : opType === "i64"
      ? i32op.replace(/^i32\./, "i64.")
      : i32op;
    // `/` between integers: refused, as in wasic's emitExpr (owner, 2026-10-09).
    if (watOp === "i32.div_s") _diagnosticSink?.(intDivisionDiagnostic(expr));
    // The bitwise / shift operators apply ToInt32 to each operand (ld29, 2026-10-13).
    const operand = (s: string) =>
      alwaysI32
        ? toInt32Wat(s, locals, funcLookup, allocString, arrayLookup, structLookup, globals)
        : exprToWat(s, locals, opType, funcLookup, allocString, arrayLookup, structLookup, globals);
    const lW = operand(lhs);
    const rW = operand(rhs);
    // A float `%`: WebAssembly has no `f64.rem` (an invalid module, ld02). The same formula as
    // wasic's emitExpr, x - trunc(x / y) * y, so the two paths agree.
    const opWat = op === "%" && (opType === "f64" || opType === "f32")
      ? `(${opType}.sub ${lW} (${opType}.mul (${opType}.trunc (${opType}.div ${lW} ${rW})) ${rW}))`
      : `(${watOp} ${lW} ${rW})`;
    // The result at the type the caller expects. A comparison yields i32 whatever its operands;
    // `1 << n` is i32 even where the caller asked for f64 (a literal-led print, a concat operand),
    // and returning it unconverted put an i32 on an f64 stack, an invalid module (H12, found with
    // sw18, 2026-09-30). Only a lossless widening is applied; anything else is left as it was.
    // A comparison's i32 is a BOOLEAN and is never widened: into a number it prints `1` for `true`
    // (`"ok: " + (a > b)` → `ok: 1`, ld06), so it stays the loud type mismatch it was.
    const isComparison = /^[if](32|64)\.(eq|ne|[lg][te])/.test(watOp);
    if (
      !isComparison && opType !== expectedType &&
      ["i32", "i64", "f32", "f64"].includes(expectedType)
    ) {
      const widened = widenNumeric(opWat, opType, expectedType);
      if (widened !== null) return widened;
    }
    return opWat;
  }

  // `x instanceof Y` inside an expression (a ternary condition, an && operand). wasic owns the
  // class table and the Error family. H12 sw34, 2026-09-29: this reached the stub below, so
  // `e instanceof Error ? … : …` always took the else branch.
  if (_instanceofResolver && /^\w+\s+instanceof\s+\w+$/.test(expr.trim())) {
    const iw = _instanceofResolver(expr.trim(), locals);
    if (iw) {
      return isFloat
        ? `(${expectedType}.convert_i32_s ${iw})`
        : expectedType === "i64"
        ? `(i64.extend_i32_s ${iw})`
        : iw;
    }
  }

  // Last resort before the stub (H12, 2026-09-30): wasic's emitExpr, when it can emit the expression
  // at a type that widens to the one expected here without loss.
  const leftover = expr.trim();
  if (leftover && _exprFallbackResolver) {
    const r = _exprFallbackResolver(leftover, locals);
    const widened = r ? widenNumeric(r.wat, r.type, expectedType) : null;
    if (widened !== null) return widened;
  }
  // Nothing can emit it. This used to be SILENT: a `(;? … ;)` comment and a 0, so the program
  // printed a wrong number with no error (the root of most console rows in H12's round-1 table).
  // It is now a diagnostic, which aborts the compile. The stub is still returned so emission can
  // finish and report every such argument in one pass.
  _diagnosticSink?.(
    `console argument: cannot emit the expression '${leftover.slice(0, 60) || "(empty)"}'` +
      ` as ${expectedType}.`,
  );

  // Fallback: emit a comment and a zero of the expected type
  const zeroType = isFloat ? expectedType : expectedType === "i64" ? "i64" : "i32";
  const safeExpr = expr.replace(/\(;/g, "( ;").replace(/;\)/g, "; )") + " ";
  return `(;? ${safeExpr};) (${zeroType}.const 0)`;
}

/**
 * Returns the index of the rightmost top-level occurrence of `op` in `expr`, or -1.
 * Scanning right-to-left ensures left-associative grouping (a-b-c → (a-b)-c).
 * Guards prevent shorter operators matching inside longer ones (e.g. & inside &&).
 */
/** True if `token` is exactly ONE quoted string literal delimited by `q`, i.e. the closing
 *  quote is the final character with no earlier *unescaped* `q` in between. So `"abc"` →
 *  true, but `"a" + "b"` → false (an earlier closing quote), routing it to the concat path. */
function isWholeStringLiteral(token: string, q: string): boolean {
  if (token.length < 2 || token[0] !== q || token[token.length - 1] !== q) return false;
  for (let i = 1; i < token.length - 1; i++) {
    if (token[i] === "\\") {
      i++;
      continue;
    }
    if (token[i] === q) return false;
  }
  return true;
}

/** The f64 printer for a numeric segment: `$__f64_to_str_console` (−0 as `-0`, wasic's
 *  emitMathHelpers) for a whole console argument, else `$__f64_to_str` (string conversion). */
function f64Printer(seg: LogSegment): string {
  return "console" in seg && seg.console ? "$__f64_to_str_console" : "$__f64_to_str";
}

/** The i64 printer for a numeric segment: `$__u64_to_str` for a wasMath `u64` (its bits read
 *  unsigned, wasMath L4), else `$__i64_to_str`. Both end in `n`. */
function i64Printer(seg: LogSegment): string {
  if (!("unsigned" in seg && seg.unsigned)) return "$__i64_to_str";
  _mathHelperNeeded?.("u64_to_str");
  return "$__u64_to_str";
}

/** True if `s` has a string or template literal at top level (outside brackets): `"x" + n` does,
 *  `f("x")` does not. Used to tell a string concatenation from a numeric argument (sw41). */
function hasTopLevelQuote(s: string): boolean {
  const inStr = literalMask(s);
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (inStr[i]) {
      if (depth === 0) return true;
      continue; // literal content counts toward neither depth nor a match
    }
    const ch = s[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
  }
  return false;
}

/** True if scanning `s` never drives `()`/`[]` depth below zero — i.e. a greedy `(.+)` arg capture
 *  didn't swallow a following `)`/`]`. Mirrors wasic.ts's guard so method handlers can fall through
 *  on an over-greedy match (e.g. `s.at(i) === t.at(j)`) instead of mis-emitting. Skips string
 *  literals (2026-09-30), so a `)` inside `")"` is not counted. */
function parenDepthNeverNegative(s: string): boolean {
  const inStr = literalMask(s);
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    if (inStr[i]) continue;
    const ch = s[i];
    if (ch === "(" || ch === "[") d++;
    else if (ch === ")" || ch === "]") {
      if (--d < 0) return false;
    }
  }
  return true;
}

/** Marks every index of `s` that lies inside a string/template literal (quotes included), so the
 *  depth scanner below skips literal content. A local twin of `wasic.ts`'s `buildStringLiteralMask`
 *  — this module is imported BY wasic.ts, so it cannot import back without a cycle. Keep the two in
 *  sync; see design-decisions.md § "Bracket/paren/operator scanners MUST skip string literals". */
function literalMask(s: string): boolean[] {
  const mask = new Array<boolean>(s.length).fill(false);
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q !== null) {
      mask[i] = true;
      if (c === "\\") {
        if (i + 1 < s.length) mask[i + 1] = true;
        i++;
        continue;
      }
      if (c === q) q = null;
    } else if (c === '"' || c === "'" || c === "`") {
      q = c;
      mask[i] = true;
    }
  }
  return mask;
}

/**
 * Splits a top-level conditional `c ? a : b` into `[c, a, b]`, or null. The conditional operator
 * is RIGHT-associative: `c1 ? A : c2 ? B : C` is `c1 ? A : (c2 ? B : C)`, so the split is at the
 * FIRST top-level `?` and at the `:` that matches it (a nested `?` claims the next `:`). H12 sw02 /
 * sw12, 2026-09-29: the string ternary used findTopLevelOp, which returns the LAST `?`, making
 * `n > 4 ? "gt4" : n > 1` the condition; it also took the `?` of `??`.
 */
function splitTernary(expr: string): [string, string, string] | null {
  const inStr = literalMask(expr);
  let depth = 0, q = -1, nested = 0;
  for (let i = 0; i < expr.length; i++) {
    if (inStr[i]) continue;
    const ch = expr[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (depth === 0 && ch === "?") {
      if (expr[i + 1] === "." || expr[i + 1] === "?" || expr[i - 1] === "?") continue;
      if (q === -1) q = i;
      else nested++;
    } else if (depth === 0 && ch === ":" && q !== -1) {
      if (nested > 0) nested--;
      else {
        return [expr.slice(0, q).trim(), expr.slice(q + 1, i).trim(), expr.slice(i + 1).trim()];
      }
    }
  }
  return null;
}

/** Every binary operator exprToWat splits on (its binOps table), for the unary-operator guard. */
const TOP_LEVEL_BINARY_OPS = [
  "||",
  "&&",
  "|",
  "^",
  "&",
  "===",
  "!==",
  "==",
  "!=",
  "<=",
  ">=",
  "<",
  ">",
  ">>>",
  ">>",
  "<<",
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
];

/** True if `expr` has a binary operator at top level (outside brackets and string literals).
 *  findTopLevelOp does not match a unary `+` / `-`, so `-n` alone is false and `-n + m` true. */
function hasTopLevelBinaryOp(expr: string): boolean {
  return TOP_LEVEL_BINARY_OPS.some((op) => findTopLevelOp(expr, op) > 0);
}

function findTopLevelOp(expr: string, op: string): number {
  let depth = 0;
  // Brackets INSIDE a string literal must not count toward depth, and an operator inside one is
  // not a top-level operator. Without this, `w + "]"` drove depth to 1 at the literal's `]`, so the
  // top-level `+` was never seen at depth 0 and the whole concat silently fell through to the
  // numeric path printing `0`. (`"{" + w + "}"` worked only because braces aren't counted.)
  const inStr = literalMask(expr);
  // Scan the FULL string from the end so trailing ) / ] (e.g. a RHS ending in a call or
  // `.slice(…)`) are counted toward depth; only test for an op match at valid start positions
  // (i <= maxStart). Starting at `length - op.length` skipped those trailing chars, so an
  // expression like `a === s.slice(0, 3)` drove depth negative and the `===` was never found
  // at depth 0 → the comparison silently fell through to the numeric/terminal path.
  const maxStart = expr.length - op.length;
  for (let i = expr.length - 1; i >= 0; i--) {
    if (inStr[i]) continue; // literal content: neither depth nor a match site
    const ch = expr[i];
    if (ch === ")" || ch === "]") depth++;
    else if (ch === "(" || ch === "[") depth--;
    if (depth === 0 && i <= maxStart && expr.slice(i, i + op.length) === op) {
      const after = expr[i + op.length] ?? "";
      const before = i > 0 ? expr[i - 1] : "";
      // `<` inside `<<` from EITHER side: the scan runs right to left, so the second `<` of `n << 2`
      // is met first, and `n <` / `2` became a comparison with an empty operand (sw18, H12).
      if (op === "<" && (after === "=" || after === "<" || before === "<")) continue;
      // `*` inside `**` (sw22): `a ** 2` split into `a *` and `2`. `**` is not in the console table;
      // it reaches wasic's emitExpr through the fallback resolver.
      if (op === "*" && (after === "*" || before === "*")) continue;
      // A UNARY `-` / `+` is not a binary operator: `n * -2` split at the `-` into `n *` and `2`
      // (sw23). Unary when nothing, or another operator or an opening bracket, precedes it, or
      // when it is the sign of an exponent (`1e-5`).
      if (op === "-" || op === "+") {
        const prev = expr.slice(0, i).trimEnd();
        if (prev === "" || /[-+*/%<>=!&|^~?:(,[]$/.test(prev) || /\d[eE]$/.test(prev)) continue;
      }
      if (op === ">" && (after === "=" || after === ">" || before === ">")) continue;
      if (op === "=" && after === "=") continue;
      if (op === "!" && after === "=") continue;
      // avoid matching inside `===` and `!==` (see wasic.ts's findBinaryOp)
      if (op === "==" && (after === "=" || before === "=" || before === "!")) continue;
      if (op === "!=" && after === "=") continue; // avoid !==
      if (op === "&" && (after === "&" || before === "&")) continue;
      if (op === "|" && (after === "|" || before === "|")) continue;
      if (op === ">>" && (after === ">" || before === ">")) continue;
      if (op === "?" && after === ".") continue;
      return i;
    }
  }
  return -1;
}

/**
 * Parses the full argument list from a `console.log(...)` call into an ordered
 * array of LogSegments, ready for WAT emission.
 *
 * @param argsStr    - Raw text of the arguments (everything between the outer parens).
 * @param locals     - Map of local variable names to their WAT type strings.
 * @param funcLookup - Optional callback to resolve a callee's parameter/result types.
 *                     When provided, integer/float literals inside function call
 *                     arguments are emitted with the correct WAT const instruction.
 */
export function parseConsoleLogArgs(
  argsStr: string,
  locals: Map<string, string>,
  funcLookup?: FuncLookup,
  allocString?: DataAllocator,
  enumLookup?: (key: string) => number | undefined,
  arrayLookup?: ArrayLookup,
  structLookup?: StructFieldLookup,
  dotCallLookup?: DotCallLookup,
  globals?: Map<string, string>,
  enumStringLookup?: (key: string) => string | undefined,
  closureVarLookup?: ClosureVarLookup,
): LogSegment[] {
  const args = splitTopLevelArgs(argsStr);
  const segments: LogSegment[] = [];

  for (let i = 0; i < args.length; i++) {
    if (i > 0) segments.push({ kind: "literal", text: " " }); // space between args
    const argSegs = parseSingleArg(
      args[i],
      locals,
      funcLookup,
      allocString,
      enumLookup,
      arrayLookup,
      structLookup,
      dotCallLookup,
      globals,
      enumStringLookup,
      closureVarLookup,
    );
    markU64(argSegs, args[i], locals);
    // A whole numeric argument prints with console.log's formatting: −0 as `-0` (sw41). A
    // template or a top-level string concatenation is string conversion, where −0 is `0`.
    const only = argSegs.length === 1 ? argSegs[0] : undefined;
    if (
      only && (only.kind === "f64var" || only.kind === "f64expr") &&
      !args[i].trim().startsWith("`") && !hasTopLevelQuote(args[i])
    ) {
      only.console = true;
      _mathHelperNeeded?.("f64_to_str_console");
    }
    // An i64 inside a template or a concatenation is string conversion: no `n` (sw50).
    if (args[i].trim().startsWith("`") || hasTopLevelQuote(args[i]) || argSegs.length > 1) {
      for (const sg of argSegs) {
        if (sg.kind === "i64var" || sg.kind === "i64expr") sg.strConv = true;
      }
    }
    // A numeric LITERAL is formatted at compile time (parseSingleArg, as string conversion):
    // `console.log(-0.0)` printed `0`.
    const lit = args[i].trim();
    if (
      only?.kind === "literal" && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(lit) &&
      Object.is(Number(lit), -0)
    ) {
      only.text = "-0";
    }
    segments.push(...argSegs);
  }

  // Always terminate with a newline (console.log behaviour)
  segments.push({ kind: "literal", text: "\n" });
  return segments;
}

// ---------------------------------------------------------------------------
// WAT emitter
// ---------------------------------------------------------------------------

/**
 * Generates the sequence of WAT statements that implement a console.log call
 * via WASI fd_write.
 *
 * The generated statements:
 *   1. For each numeric segment: call $__i32_to_str / $__f64_to_str into a scratch slot,
 *      then store the scratch address and returned length into the iovec entry.
 *   2. For each literal segment: store the static data address and byte count into
 *      the iovec entry.
 *   3. Call fd_write once with iov_count = segments.length.
 *
 * @param segments    - Parsed segments from parseConsoleLogArgs.
 * @param allocString - Allocator that places string literals into the data section.
 * @param indent      - Indentation prefix for each emitted line.
 * @returns Array of WAT statement strings to be inserted at the call site.
 */
export function emitConsoleLog(
  segments: LogSegment[],
  allocString: DataAllocator,
  indent = "    ",
  fd = 1,
  iovBase = IOV_BASE,
  scratchBase = SCRATCH_BASE,
): {
  statements: string[];
  needsHelpers: boolean;
  needsStrGather: boolean;
  needsArrPrintHelper: boolean;
  needsJoinHelper: boolean;
} {
  const nwrittenOffset = iovBase + (NWRITTEN_OFFSET - IOV_BASE); // = iovBase + 128
  // Step 0 (sw68): an argument that calls a user function may PRINT, and a nested console.log
  // writes the same cursor, buffer and iov area this line is being built in: the outer line lost
  // what it had (`console.log("outer:", scale(4), "end")` printed `inner 40.25 end`). JavaScript
  // evaluates every argument, left to right, before printing, so do that: each expression goes to
  // a temporary first, then the line is built from the temporaries. Only lines with such a call.
  const hoisted = hoistCallingArgs(segments);
  segments = hoisted.segments;
  // Step 1: merge consecutive literal segments to minimise iov count.
  // e.g. [{literal,"x: "},{literal," "},{literal,"\n"}] → [{literal,"x:  \n"}]
  const merged: LogSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (seg.kind === "literal" && last?.kind === "literal") {
      merged[merged.length - 1] = { kind: "literal", text: last.text + seg.text };
    } else {
      merged.push({ ...seg } as LogSegment);
    }
  }

  // Step 2: detect a standalone trailing "\n" so we can absorb it inline.
  const numericKinds = new Set(["i32var", "i64var", "f64var", "i32expr", "i64expr", "f64expr"]);
  // `boolexpr` joined this set on 2026-08-24: gather mode evaluates the operand exactly once
  // now, so an arbitrary bool expression is safe to gather and can absorb a trailing newline.
  const strBoolKinds = new Set(["strvar", "boolvar", "boolexpr", "strcall", "strexpr"]);
  const trailingLitNL = merged.length >= 2 &&
    merged[merged.length - 1].kind === "literal" &&
    (merged[merged.length - 1] as { kind: "literal"; text: string }).text === "\n";
  const canInlineNL = trailingLitNL &&
    (numericKinds.has(merged[merged.length - 2].kind) ||
      strBoolKinds.has(merged[merged.length - 2].kind));

  // Active segments to process (strip standalone "\n" when we will inline it).
  const activeSegs = (trailingLitNL && canInlineNL) ? merged.slice(0, -1) : merged;

  // Step 3: decide emit strategy.
  // Gather mode consolidates ALL output into scratch (SCRATCH_BASE...) and emits a
  // single fd_write iov.
  //
  // ⚠️ CORRECTED 2026-08-24 — the previous note here read "needed because wasmtime 43 only
  // processes the first iov", which blamed the wrong side and would send the next reader to file a
  // wasmtime bug. Measured on wasmtime 47.0.3 with a two-iovec fixture: it writes iov[0] only AND
  // REPORTS `nwritten = 2` of the 3 requested. That is a SHORT WRITE, which WASI explicitly permits;
  // wasmtime is telling the truth. **The defect is ours — we never read `nwritten` back** (it is
  // stored at NWRITTEN_OFFSET and no emitted code ever loads it) and no emitted path retries, so any
  // short write silently truncates output.
  //
  // Gather mode therefore MITIGATES rather than fixes: one iovec makes a short write less likely,
  // not impossible — a large enough single write can still be truncated. The real fix is a retry
  // loop around fd_write. See cmem/compiler-bugs.md § "fd_write short writes".
  // strvar uses memory.copy into scratch; boolvar uses conditional memory.copy.
  // boolexpr USED to stay in per-iov mode because gather evaluated the operand three times, which
  // is unsafe for arbitrary WAT. The bool branch now evaluates it exactly once, so it can gather.
  const gatherable = (s: LogSegment) =>
    s.kind === "literal" || numericKinds.has(s.kind) || s.kind === "strvar" ||
    s.kind === "boolvar" || s.kind === "boolexpr" || s.kind === "arrptr" || s.kind === "joinarr" ||
    s.kind === "strcall" || s.kind === "strexpr";
  const arrptrKinds = new Set(["arrptr", "joinarr"]);
  // Single strvar/boolvar/arrptr/joinarr/strcall/strexpr segments also use gather so the newline can be inlined.
  const useGather = activeSegs.every(gatherable) &&
    (activeSegs.length > 1 || strBoolKinds.has(activeSegs[0]?.kind ?? "") ||
      arrptrKinds.has(activeSegs[0]?.kind ?? "") || activeSegs[0]?.kind === "strcall" ||
      activeSegs[0]?.kind === "strexpr");

  const statements: string[] = [];
  let needsHelpers = false;
  let needsStrGather = false;
  let needsArrPrintHelper = false;
  let needsJoinHelper = false;

  if (useGather) {
    // ── Gather-buffer mode ────────────────────────────────────────────────────
    // The line is built in the console buffer `$__cbuf`, a heap block that GROWS on demand
    // (`$__cbuf_need`, `$__cbuf_put`; sw62, 2026-10-13): it was the fixed 128-byte scratch at
    // SCRATCH_BASE, and any longer line (eight floats, a long string, an array) ran over the data
    // after it and corrupted later output. Every write ensures room first. The buffer can MOVE
    // when it grows, so iov[0].ptr is set just before the write.
    // iov[0].len (iovBase+4) doubles as the running cursor into the buffer.
    const cursorAddr = iovBase + 4;
    // A line of literals and numbers whose worst case fits the fixed scratch keeps it: no
    // allocation, the code exactly as before (an f64 prints in at most 24 bytes; 32 are kept).
    // Anything that can be longer (strings, booleans, arrays, joins, or more numbers than fit)
    // goes to the growable buffer.
    const SCRATCH_BYTES = SCRATCH_SLOTS * 32;
    const worst = activeSegs.reduce(
      (n, s) =>
        s.kind === "literal"
          ? n + new TextEncoder().encode(s.text).length
          : numericKinds.has(s.kind)
          ? n + 32
          : Infinity,
      canInlineNL ? 1 : 0,
    );
    const fits = worst <= SCRATCH_BYTES;
    const B = fits ? `(i32.const ${scratchBase})` : "(global.get $__cbuf)";
    /** The buffer address `off` bytes in (a constant when the line uses the fixed scratch). */
    const at = (off: number) => fits ? `(i32.const ${scratchBase + off})` : `(i32.add ${B} (i32.const ${off}))`;
    if (fits) {
      statements.push(
        `${indent}(i32.store (i32.const ${iovBase}) (i32.const ${scratchBase}))`,
        `${indent}(i32.store (i32.const ${cursorAddr}) (i32.const 0))`,
      );
    } else {
      needsStrGather = true; // wasic emits $__cbuf_* with $__str_gather
      statements.push(`${indent}(i32.store (i32.const ${cursorAddr}) (i32.const 0))`);
    }

    let compileCursor = 0; // byte offset into the buffer, valid until the first runtime write
    let runtimeCursor = false; // true after the first numeric (cursor only in mem[cursorAddr])
    /** Room for `extra` more bytes at the current cursor (nothing to do in the fixed scratch). */
    const need = (extra: string) => {
      if (fits) return;
      statements.push(
        `${indent}(call $__cbuf_need (i32.add ${
          runtimeCursor ? `(i32.load (i32.const ${cursorAddr}))` : `(i32.const ${compileCursor})`
        } ${extra}))`,
      );
    };
    /** Pins the compile-time cursor into memory (before a helper reads it). */
    const pin = () => {
      if (!runtimeCursor) {
        statements.push(`${indent}(i32.store (i32.const ${cursorAddr}) (i32.const ${compileCursor}))`);
        runtimeCursor = true;
      }
    };

    for (const seg of activeSegs) {
      if (seg.kind === "literal") {
        const bytes = Array.from(new TextEncoder().encode(seg.text));
        if (bytes.length > 0) need(`(i32.const ${bytes.length})`);
        if (!runtimeCursor) {
          // Compile-time position: buffer-relative constant offsets
          for (let j = 0; j < bytes.length; j++) {
            statements.push(`${indent}(i32.store8 ${at(compileCursor + j)} (i32.const ${bytes[j]}))`);
          }
          compileCursor += bytes.length;
        } else {
          // Runtime position: cursor-relative stores then advance cursor
          for (let j = 0; j < bytes.length; j++) {
            statements.push(
              `${indent}(i32.store8 (i32.add ${B} (i32.add (i32.load (i32.const ${cursorAddr})) (i32.const ${j}))) (i32.const ${
                bytes[j]
              }))`,
            );
          }
          if (bytes.length > 0) {
            statements.push(
              `${indent}(i32.store (i32.const ${cursorAddr}) (i32.add (i32.load (i32.const ${cursorAddr})) (i32.const ${bytes.length})))`,
            );
          }
        }
      } else if (seg.kind === "strvar") {
        // String variable — copy bytes into scratch via $__str_gather, advance cursor
        // $__str_gather(src_ptr, src_len, dst_ptr) — a byte-copy loop helper, no bulk-memory needed
        needsStrGather = true;
        // Support module string consts encoded as __strconst_ptr_NNN / __strconst_len_NNN
        const ptrMsc = seg.ptrLocal.match(/^__strconst_ptr_(\d+)$/);
        const lenMsc = seg.lenLocal.match(/^__strconst_len_(\d+)$/);
        const ptrWat = ptrMsc ? `(i32.const ${ptrMsc[1]})` : `(local.get $${seg.ptrLocal})`;
        const lenWat = lenMsc ? `(i32.const ${lenMsc[1]})` : `(local.get $${seg.lenLocal})`;
        pin();
        statements.push(`${indent}(call $__cbuf_put ${ptrWat} ${lenWat} (i32.const ${cursorAddr}))`);
      } else if (seg.kind === "boolvar" || seg.kind === "boolexpr") {
        // Bool — copy "true"/"false" bytes into scratch via $__str_gather, advance cursor.
        //
        // ONE `if`, gather + cursor bump inside each arm, so the operand is evaluated EXACTLY ONCE.
        // The previous shape built `srcExpr` and `lenExpr` as separate value-form `if`s and used
        // `lenExpr` twice — THREE evaluations. Harmless for `boolvar` (`local.get` is pure), fatal
        // for `boolexpr`, which is why `boolexpr` was excluded from gather mode entirely. Evaluating
        // once is what lets it in (see `gatherable` below), so the exclusion and the double-eval bug
        // were one knot, not two.
        //
        // Everything duplicated across the arms is pure: `destExpr` is a constant or an i32.load,
        // and the offsets/lengths are compile-time constants.
        needsStrGather = true;
        const [trueOff] = allocString("true");
        const [falseOff] = allocString("false");
        const val = seg.kind === "boolvar" ? `(local.get $${seg.name})` : seg.wat;
        pin();
        statements.push(
          `${indent}(if ${val}`,
          `${indent}  (then (call $__cbuf_put (i32.const ${trueOff}) (i32.const 4) (i32.const ${cursorAddr})))`,
          `${indent}  (else (call $__cbuf_put (i32.const ${falseOff}) (i32.const 5) (i32.const ${cursorAddr}))))`,
        );
      } else if (seg.kind === "arrptr") {
        // Array pointer — write "[ elem, ... ]" into scratch via helper
        needsArrPrintHelper = true;
        needsHelpers = true; // $__arr_inspect depends on $__i32_to_str / $__f64_to_str
        // $__arr_inspect loads the length ONCE, ensures room for the worst case, then writes.
        pin();
        statements.push(`${indent}${arrInspectCall(seg, `(i32.const ${cursorAddr})`)}`);
      } else if (seg.kind === "joinarr") {
        // Phase 28: arr.join(sep) — written into the buffer via a wrapper that ensures room
        needsJoinHelper = true;
        needsHelpers = true; // $__dynarr_join_to_scratch_* depends on $__i32_to_str / $__f64_to_str
        pin();
        const joinHelper = seg.elemType === "f64" ? "$__cbuf_join_f64" : "$__cbuf_join_i32";
        statements.push(
          `${indent}(call ${joinHelper} ${seg.arrWat} (i32.const ${seg.sepPtr}) (i32.const ${seg.sepLen}) (i32.const ${cursorAddr}))`,
        );
      } else if (seg.kind === "strcall") {
        // String-returning function: call (void, sets globals), then append from the globals
        statements.push(`${indent}${seg.callWat}`);
        pin();
        statements.push(
          `${indent}(call $__cbuf_put (global.get $__str_ret_ptr) (global.get $__str_ret_len) (i32.const ${cursorAddr}))`,
        );
      } else if (seg.kind === "strexpr") {
        // Arbitrary WAT ptr+len expressions, evaluated pointer first, as before
        pin();
        statements.push(`${indent}(call $__cbuf_put ${seg.ptrWat} ${seg.lenWat} (i32.const ${cursorAddr}))`);
      } else {
        // Numeric segment — convert directly into the buffer at the cursor (32 bytes holds any
        // number: an f64 is at most 24, an i64 21 with its `n`)
        needsHelpers = true;
        need("(i32.const 32)");
        const destExpr = runtimeCursor
          ? `(i32.add ${B} (i32.load (i32.const ${cursorAddr})))`
          : at(compileCursor);

        let callExpr: string;
        if (seg.kind === "i32var") {
          callExpr = `(call $__i32_to_str (local.get $${seg.name}) ${destExpr})`;
        } else if (seg.kind === "i64var") {
          callExpr = `(call ${i64Printer(seg)} (local.get $${seg.name}) ${destExpr})`;
        } else if (seg.kind === "f64var") {
          callExpr = `(call ${f64Printer(seg)} (local.get $${seg.name}) ${destExpr})`;
        } else if (seg.kind === "i32expr") {
          callExpr = `(call $__i32_to_str ${seg.wat} ${destExpr})`;
        } else if (seg.kind === "i64expr") {
          callExpr = `(call ${i64Printer(seg)} ${seg.wat} ${destExpr})`;
        } else {
          callExpr = `(call ${f64Printer(seg)} ${seg.wat} ${destExpr})`;
        }
        // string conversion of an i64: drop the `n` (sw50)
        if ((seg.kind === "i64var" || seg.kind === "i64expr") && seg.strConv) {
          callExpr = `(i32.sub ${callExpr} (i32.const 1))`;
        }

        if (!runtimeCursor) {
          // cursor = compileCursor + result_of_call
          statements.push(
            `${indent}(i32.store (i32.const ${cursorAddr}) (i32.add (i32.const ${compileCursor}) ${callExpr}))`,
          );
          runtimeCursor = true;
        } else {
          // cursor = cursor + result_of_call
          statements.push(
            `${indent}(i32.store (i32.const ${cursorAddr}) (i32.add (i32.load (i32.const ${cursorAddr})) ${callExpr}))`,
          );
        }
      }
    }

    // Inline the trailing newline
    if (canInlineNL) {
      pin();
      need("(i32.const 1)");
      statements.push(
        `${indent}(i32.store8 (i32.add ${B} (i32.load (i32.const ${cursorAddr}))) (i32.const 10))`,
        `${indent}(i32.store (i32.const ${cursorAddr}) (i32.add (i32.load (i32.const ${cursorAddr})) (i32.const 1)))`,
      );
    }
    pin(); // a line of literals only: the cursor has to be in memory for the iov

    // Single fd_write — iov[0].ptr is the buffer (where it is NOW: the growable one can move, and
    // a nested console.log in an argument rewrites the iov), iov[0].len the cursor
    statements.push(`${indent}(i32.store (i32.const ${iovBase}) ${B})`);
    statements.push(
      `${indent}(call $__fd_write_all`,
      `${indent}  (i32.const ${fd})`,
      `${indent}  (i32.const ${iovBase})`,
      `${indent}  (i32.const 1)`,
      `${indent}  (i32.const ${nwrittenOffset}))`,
    );
  } else {
    // ── Per-iov mode (single active segment, or strvar/bool segments) ─────────
    let numericSlot = 0;
    let lastNumericScratch = -1;
    let lastNumericIovLen = -1;

    for (let i = 0; i < activeSegs.length; i++) {
      const seg = activeSegs[i];
      const iovPtr = iovBase + i * 8; // iov[i].buf  (i32)
      const iovLen = iovBase + i * 8 + 4; // iov[i].buf_len (i32)

      if (seg.kind === "literal") {
        const [offset, len] = allocDecoded(allocString, seg.text);
        statements.push(
          `${indent}(i32.store (i32.const ${iovPtr}) (i32.const ${offset}))`,
          `${indent}(i32.store (i32.const ${iovLen}) (i32.const ${len}))`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else if (seg.kind === "strvar") {
        const _ptrMsc = seg.ptrLocal.match(/^__strconst_ptr_(\d+)$/);
        const _lenMsc = seg.lenLocal.match(/^__strconst_len_(\d+)$/);
        const _ptrW = _ptrMsc ? `(i32.const ${_ptrMsc[1]})` : `(local.get $${seg.ptrLocal})`;
        const _lenW = _lenMsc ? `(i32.const ${_lenMsc[1]})` : `(local.get $${seg.lenLocal})`;
        statements.push(
          `${indent}(i32.store (i32.const ${iovPtr}) ${_ptrW})`,
          `${indent}(i32.store (i32.const ${iovLen}) ${_lenW})`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else if (seg.kind === "boolvar" || seg.kind === "boolexpr") {
        const [trueOff] = allocString("true");
        const [falseOff] = allocString("false");
        const val = seg.kind === "boolvar" ? `(local.get $${seg.name})` : seg.wat;
        // ONE `if`, both stores inside each arm — so ${val} is evaluated EXACTLY ONCE.
        //
        // This used to be two value-form `(if (result i32) ${val} …)` stores, which interpolated the
        // operand twice. For `boolvar` that is harmless (`local.get` is pure), but `boolexpr` is
        // arbitrary WAT: `console.log(isPositive(5))` called isPositive TWICE, so any side effect in
        // a bool-returning function happened twice. That is a semantic bug, not a formatting one, and
        // no engine could have caught it — they all agree on the wrong answer.
        statements.push(
          `${indent}(if ${val}`,
          `${indent}  (then`,
          `${indent}    (i32.store (i32.const ${iovPtr}) (i32.const ${trueOff}))`,
          `${indent}    (i32.store (i32.const ${iovLen}) (i32.const 4)))`,
          `${indent}  (else`,
          `${indent}    (i32.store (i32.const ${iovPtr}) (i32.const ${falseOff}))`,
          `${indent}    (i32.store (i32.const ${iovLen}) (i32.const 5))))`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else if (seg.kind === "arrptr") {
        needsArrPrintHelper = true;
        needsHelpers = true;
        // into the growable console buffer (sw62): the fixed scratch is 128 bytes
        needsStrGather = true;
        statements.push(
          `${indent}(i32.store (i32.const ${iovLen}) (i32.const 0))`,
          `${indent}${arrInspectCall(seg, `(i32.const ${iovLen})`)}`,
          `${indent}(i32.store (i32.const ${iovPtr}) (global.get $__cbuf))`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else if (seg.kind === "joinarr") {
        needsJoinHelper = true;
        needsHelpers = true;
        needsStrGather = true; // the growable console buffer (sw62)
        const joinHelper = seg.elemType === "f64" ? "$__cbuf_join_f64" : "$__cbuf_join_i32";
        statements.push(
          `${indent}(i32.store (i32.const ${iovLen}) (i32.const 0))`,
          `${indent}(call ${joinHelper} ${seg.arrWat} (i32.const ${seg.sepPtr}) (i32.const ${seg.sepLen}) (i32.const ${iovLen}))`,
          `${indent}(i32.store (i32.const ${iovPtr}) (global.get $__cbuf))`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else if (seg.kind === "strcall") {
        // String-returning function: call (void, sets globals), store globals in iov
        statements.push(
          `${indent}${seg.callWat}`,
          `${indent}(i32.store (i32.const ${iovPtr}) (global.get $__str_ret_ptr))`,
          `${indent}(i32.store (i32.const ${iovLen}) (global.get $__str_ret_len))`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else if (seg.kind === "strexpr") {
        // Arbitrary WAT ptr+len expressions — store computed values directly into iov
        statements.push(
          `${indent}(i32.store (i32.const ${iovPtr}) ${seg.ptrWat})`,
          `${indent}(i32.store (i32.const ${iovLen}) ${seg.lenWat})`,
        );
        lastNumericScratch = -1;
        lastNumericIovLen = -1;
      } else {
        // Numeric segment
        if (numericSlot >= SCRATCH_SLOTS) { // SCRATCH_SLOTS = 4 (constant)
          const [offset, len] = allocString("?");
          statements.push(
            `${indent}(i32.store (i32.const ${iovPtr}) (i32.const ${offset}))`,
            `${indent}(i32.store (i32.const ${iovLen}) (i32.const ${len}))`,
          );
          continue;
        }

        needsHelpers = true;
        const scratchPtr = scratchBase + numericSlot * 32;
        numericSlot++;

        let callExpr: string;
        if (seg.kind === "i32var") {
          callExpr = `(call $__i32_to_str (local.get $${seg.name}) (i32.const ${scratchPtr}))`;
        } else if (seg.kind === "i64var") {
          callExpr = `(call ${i64Printer(seg)} (local.get $${seg.name}) (i32.const ${scratchPtr}))`;
        } else if (seg.kind === "f64var") {
          callExpr = `(call ${f64Printer(seg)} (local.get $${seg.name}) (i32.const ${scratchPtr}))`;
        } else if (seg.kind === "i32expr") {
          callExpr = `(call $__i32_to_str ${seg.wat} (i32.const ${scratchPtr}))`;
        } else if (seg.kind === "i64expr") {
          callExpr = `(call ${i64Printer(seg)} ${seg.wat} (i32.const ${scratchPtr}))`;
        } else {
          callExpr = `(call ${f64Printer(seg)} ${seg.wat} (i32.const ${scratchPtr}))`;
        }
        // string conversion of an i64: drop the `n` (sw50)
        if ((seg.kind === "i64var" || seg.kind === "i64expr") && seg.strConv) {
          callExpr = `(i32.sub ${callExpr} (i32.const 1))`;
        }

        // The value FIRST, then the pointer: evaluating the value can run a nested console.log (a
        // function that prints, `console.log(scale(4))`), which rewrites the iov; a pointer stored
        // before it was stale (sw62, 2026-10-13: it pointed into the nested line's buffer).
        statements.push(
          `${indent}(i32.store (i32.const ${iovLen}) ${callExpr})`,
          `${indent}(i32.store (i32.const ${iovPtr}) (i32.const ${scratchPtr}))`,
        );
        lastNumericScratch = scratchPtr;
        lastNumericIovLen = iovLen;
      }
    }

    // Inline the newline byte into the last numeric scratch buffer.
    if (canInlineNL && lastNumericScratch >= 0) {
      statements.push(
        `${indent}(i32.store8 (i32.add (i32.const ${lastNumericScratch}) (i32.load (i32.const ${lastNumericIovLen}))) (i32.const 10))`,
        `${indent}(i32.store (i32.const ${lastNumericIovLen}) (i32.add (i32.load (i32.const ${lastNumericIovLen})) (i32.const 1)))`,
      );
    }

    statements.push(
      `${indent}(call $__fd_write_all`,
      `${indent}  (i32.const ${fd})`,
      `${indent}  (i32.const ${iovBase})`,
      `${indent}  (i32.const ${activeSegs.length})`,
      `${indent}  (i32.const ${nwrittenOffset}))`,
    );
  }

  // sw68: the arguments, evaluated before the line is touched
  statements.unshift(...hoisted.pre.map((p) => `${indent}${p}`));
  return { statements, needsHelpers, needsStrGather, needsArrPrintHelper, needsJoinHelper };
}

// ---------------------------------------------------------------------------
// WAT helper function bodies
// ---------------------------------------------------------------------------

/**
 * Returns WAT definitions for the numeric-to-string helper functions.
 * Include this string once in the module, only when numeric log arguments are present.
 *
 * $__i32_to_str: complete signed decimal conversion.
 * $__f64_to_str: integer part + up to 6 significant decimal digits (trailing zeros stripped).
 *   Note: values outside the i32 range for the integer part will be clamped.
 */
/**
 * WAT for `$__fd_write_all` — an `fd_write` that honours SHORT WRITES.
 *
 * WASI permits `fd_write` to write fewer bytes than requested and report the true count in
 * `*nwritten`. Measured 2026-08-24: wasmtime 47.0.3 writes `iov[0]` only and reports
 * `nwritten = 2` of 3 requested; wasmer 7.2.1 writes all 3. Both are conforming.
 *
 * Every emitted call used to be `(drop (call $fd_write …))` — the result and `nwritten` were
 * discarded — so on wasmtime any output split across more than one iovec silently truncated. The
 * visible symptom was `console.log(<bool expr>)` losing its trailing newline (37 corpus modules).
 *
 * The loop drains the iovec array in place, advancing `ptr` and shrinking `len` on a partial write.
 * It bails on a non-zero errno and on zero progress — the latter matters, because a runtime that
 * reports success while writing nothing would otherwise spin forever.
 *
 * Emitted whenever `hasConsoleLog` is set, i.e. exactly when `$fd_write` is imported.
 */
export function getFdWriteAllWat(): string {
  return `
  ;; ── fd_write that honours short writes ────────────────────────────────────
  (func $__fd_write_all (param $fd i32) (param $iov i32) (param $cnt i32) (param $nw i32)
    (local $n i32)
    (local $len i32)
    (block $done
      (loop $again
        (br_if $done (i32.eqz (local.get $cnt)))
        ;; non-zero errno: no progress is possible, stop. (The previous code dropped the
        ;; result entirely, so bailing here is no quieter than what it replaced.)
        (br_if $done
          (call $fd_write (local.get $fd) (local.get $iov) (local.get $cnt) (local.get $nw)))
        (local.set $n (i32.load (local.get $nw)))
        ;; zero bytes written would spin forever
        (br_if $done (i32.eqz (local.get $n)))
        ;; consume $n bytes across the iovec array, in place
        (block $consumed
          (loop $eat
            (br_if $consumed (i32.eqz (local.get $cnt)))
            (br_if $consumed (i32.eqz (local.get $n)))
            (local.set $len (i32.load (i32.add (local.get $iov) (i32.const 4))))
            (if (i32.ge_u (local.get $n) (local.get $len))
              (then
                ;; this iovec is fully written — move to the next
                (local.set $n (i32.sub (local.get $n) (local.get $len)))
                (local.set $iov (i32.add (local.get $iov) (i32.const 8)))
                (local.set $cnt (i32.sub (local.get $cnt) (i32.const 1))))
              (else
                ;; partial: advance ptr, shrink len, and re-issue
                (i32.store (local.get $iov)
                  (i32.add (i32.load (local.get $iov)) (local.get $n)))
                (i32.store (i32.add (local.get $iov) (i32.const 4))
                  (i32.sub (local.get $len) (local.get $n)))
                (local.set $n (i32.const 0))))
            (br $eat)))
        (br $again))))
`;
}

/**
 * WAT source for the numeric-to-text runtime helpers a compiled module links when it prints or
 * concatenates numbers: `$__i32_to_str` (and its radix form), `$__i64_to_str`, `$__f64_to_str`
 * (with the big-integer scratch routines it uses for exact decimal output), and the array-to-text
 * writers. Each writes UTF-8 at a caller-supplied buffer and returns the byte count. wasic emits it
 * only when the module needs numeric helpers.
 *
 * @returns The helper functions as WAT text, ready to splice into a module body.
 */
export function getHelperWat(): string {
  return `
  ;; ── i32 → decimal string ──────────────────────────────────────────────────
  ;; Writes the decimal representation of $val at $buf, returns byte count.
  (func $__i32_to_str (param $val i32) (param $buf i32) (result i32)
    (local $start i32)
    (local $end i32)
    (local $tmp i32)
    (local $ch i32)
    (local $neg i32)
    (local $orig i32)
    (local.set $orig (local.get $buf))
    (local.set $start (local.get $buf))
    ;; Zero
    (if (i32.eqz (local.get $val))
      (then
        (i32.store8 (local.get $buf) (i32.const 48))
        (return (i32.const 1))
      )
    )
    ;; Negative
    (if (i32.lt_s (local.get $val) (i32.const 0))
      (then
        (i32.store8 (local.get $buf) (i32.const 45))
        (local.set $buf (i32.add (local.get $buf) (i32.const 1)))
        (local.set $start (local.get $buf))
        (local.set $neg (i32.const 1))
        (local.set $val (i32.sub (i32.const 0) (local.get $val)))
      )
    )
    (local.set $end (local.get $buf))
    ;; Write digits in reverse
    (block $done
      (loop $loop
        (br_if $done (i32.eqz (local.get $val)))
        (i32.store8
          (local.get $end)
          (i32.add (i32.const 48) (i32.rem_u (local.get $val) (i32.const 10)))
        )
        (local.set $val (i32.div_u (local.get $val) (i32.const 10)))
        (local.set $end (i32.add (local.get $end) (i32.const 1)))
        (br $loop)
      )
    )
    ;; Reverse digit bytes in-place
    (local.set $tmp (local.get $start))
    (local.set $ch (i32.sub (local.get $end) (i32.const 1)))
    (block $rdone
      (loop $rloop
        (br_if $rdone (i32.ge_u (local.get $tmp) (local.get $ch)))
        (local.set $neg (i32.load8_u (local.get $tmp)))
        (i32.store8 (local.get $tmp) (i32.load8_u (local.get $ch)))
        (i32.store8 (local.get $ch) (local.get $neg))
        (local.set $tmp (i32.add (local.get $tmp) (i32.const 1)))
        (local.set $ch (i32.sub (local.get $ch) (i32.const 1)))
        (br $rloop)
      )
    )
    ;; Return total length (including leading '-' if any)
    (i32.sub (local.get $end) (local.get $orig))
  )

  ;; ── i32 → string in an arbitrary radix (2..36), e.g. (14).toString(2) = "1110" ──
  ;; Mirrors $__i32_to_str but with a parameterised base + digit→char (0-9→'0'+d, 10-35→'a'+d-10).
  ;; Negative values get a leading '-' and unsigned magnitude digits (JS sign-magnitude semantics).
  (func $__i32_to_str_radix (param $val i32) (param $radix i32) (param $buf i32) (result i32)
    (local $start i32)
    (local $end i32)
    (local $tmp i32)
    (local $ch i32)
    (local $swap i32)
    (local $orig i32)
    (local $d i32)
    (local.set $orig (local.get $buf))
    (local.set $start (local.get $buf))
    ;; clamp radix to [2,36] (JS RangeError otherwise; fall back to base 10)
    (if (i32.or (i32.lt_s (local.get $radix) (i32.const 2)) (i32.gt_s (local.get $radix) (i32.const 36)))
      (then (local.set $radix (i32.const 10)))
    )
    ;; Zero
    (if (i32.eqz (local.get $val))
      (then
        (i32.store8 (local.get $buf) (i32.const 48))
        (return (i32.const 1))
      )
    )
    ;; Negative → leading '-' then magnitude
    (if (i32.lt_s (local.get $val) (i32.const 0))
      (then
        (i32.store8 (local.get $buf) (i32.const 45))
        (local.set $buf (i32.add (local.get $buf) (i32.const 1)))
        (local.set $start (local.get $buf))
        (local.set $val (i32.sub (i32.const 0) (local.get $val)))
      )
    )
    (local.set $end (local.get $buf))
    ;; Write digits in reverse
    (block $done
      (loop $loop
        (br_if $done (i32.eqz (local.get $val)))
        (local.set $d (i32.rem_u (local.get $val) (local.get $radix)))
        (i32.store8
          (local.get $end)
          (if (result i32) (i32.lt_u (local.get $d) (i32.const 10))
            (then (i32.add (i32.const 48) (local.get $d)))
            (else (i32.add (i32.const 87) (local.get $d)))
          )
        )
        (local.set $val (i32.div_u (local.get $val) (local.get $radix)))
        (local.set $end (i32.add (local.get $end) (i32.const 1)))
        (br $loop)
      )
    )
    ;; Reverse digit bytes in-place
    (local.set $tmp (local.get $start))
    (local.set $ch (i32.sub (local.get $end) (i32.const 1)))
    (block $rdone
      (loop $rloop
        (br_if $rdone (i32.ge_u (local.get $tmp) (local.get $ch)))
        (local.set $swap (i32.load8_u (local.get $tmp)))
        (i32.store8 (local.get $tmp) (i32.load8_u (local.get $ch)))
        (i32.store8 (local.get $ch) (local.get $swap))
        (local.set $tmp (i32.add (local.get $tmp) (i32.const 1)))
        (local.set $ch (i32.sub (local.get $ch) (i32.const 1)))
        (br $rloop)
      )
    )
    (i32.sub (local.get $end) (local.get $orig))
  )

  ;; -- Dragon4 (Burger-Dybvig) shortest + correctly-rounded f64 -> decimal ------
  ;; Fixed-size limb bignums (48 x u32 = 1536 bits) in a lazily-malloc'd scratch
  ;; region ($__d4s). Produces the shortest decimal digit string that round-trips
  ;; to the exact f64 (round-to-even ties), then formats per ECMAScript
  ;; Number.prototype.toString rules (fixed-point for pointPos in (-6,21], else
  ;; scientific). 100% byte-exact parity with V8 across normal + subnormal range.
  (func $__bz (param $p i32)
    (local $i i32)
    (loop $l
      (i32.store (i32.add (local.get $p) (i32.shl (local.get $i) (i32.const 2))) (i32.const 0))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 48)))
    )
  )
  (func $__bset64 (param $p i32) (param $v i64)
    (call $__bz (local.get $p))
    (i32.store (local.get $p) (i32.wrap_i64 (i64.and (local.get $v) (i64.const 0xffffffff))))
    (i32.store offset=4 (local.get $p) (i32.wrap_i64 (i64.shr_u (local.get $v) (i64.const 32))))
  )
  (func $__bmul_u32 (param $p i32) (param $m i32)
    (local $i i32) (local $carry i64) (local $prod i64) (local $addr i32)
    (loop $l
      (local.set $addr (i32.add (local.get $p) (i32.shl (local.get $i) (i32.const 2))))
      (local.set $prod
        (i64.add
          (i64.mul (i64.extend_i32_u (i32.load (local.get $addr))) (i64.extend_i32_u (local.get $m)))
          (local.get $carry)))
      (i32.store (local.get $addr) (i32.wrap_i64 (i64.and (local.get $prod) (i64.const 0xffffffff))))
      (local.set $carry (i64.shr_u (local.get $prod) (i64.const 32)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 48)))
    )
  )
  (func $__bshl (param $p i32) (param $bits i32)
    (local $limbShift i32) (local $bitShift i32) (local $i i32) (local $src i32)
    (local $lo i32) (local $hi i32) (local $val i32)
    (local.set $limbShift (i32.div_u (local.get $bits) (i32.const 32)))
    (local.set $bitShift  (i32.rem_u (local.get $bits) (i32.const 32)))
    (local.set $i (i32.const 47))
    (loop $l
      (local.set $src (i32.sub (local.get $i) (local.get $limbShift)))
      (local.set $val (i32.const 0))
      (if (i32.ge_s (local.get $src) (i32.const 0))
        (then
          (local.set $lo (i32.load (i32.add (local.get $p) (i32.shl (local.get $src) (i32.const 2)))))
          (if (i32.eqz (local.get $bitShift))
            (then (local.set $val (local.get $lo)))
            (else
              (local.set $val (i32.shl (local.get $lo) (local.get $bitShift)))
              (if (i32.gt_s (local.get $src) (i32.const 0))
                (then
                  (local.set $hi (i32.load (i32.add (local.get $p) (i32.shl (i32.sub (local.get $src) (i32.const 1)) (i32.const 2)))))
                  (local.set $val (i32.or (local.get $val)
                    (i32.shr_u (local.get $hi) (i32.sub (i32.const 32) (local.get $bitShift)))))
                ))
            ))
        ))
      (i32.store (i32.add (local.get $p) (i32.shl (local.get $i) (i32.const 2))) (local.get $val))
      (local.set $i (i32.sub (local.get $i) (i32.const 1)))
      (br_if $l (i32.ge_s (local.get $i) (i32.const 0)))
    )
  )
  (func $__bcmp (param $a i32) (param $b i32) (result i32)
    (local $i i32) (local $va i32) (local $vb i32)
    (local.set $i (i32.const 47))
    (loop $l
      (local.set $va (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2)))))
      (local.set $vb (i32.load (i32.add (local.get $b) (i32.shl (local.get $i) (i32.const 2)))))
      (if (i32.ne (local.get $va) (local.get $vb))
        (then (return (select (i32.const 1) (i32.const -1) (i32.gt_u (local.get $va) (local.get $vb))))))
      (local.set $i (i32.sub (local.get $i) (i32.const 1)))
      (br_if $l (i32.ge_s (local.get $i) (i32.const 0)))
    )
    (i32.const 0)
  )
  (func $__badd (param $d i32) (param $a i32) (param $b i32)
    (local $i i32) (local $carry i64) (local $sum i64)
    (loop $l
      (local.set $sum
        (i64.add
          (i64.add
            (i64.extend_i32_u (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2)))))
            (i64.extend_i32_u (i32.load (i32.add (local.get $b) (i32.shl (local.get $i) (i32.const 2))))))
          (local.get $carry)))
      (i32.store (i32.add (local.get $d) (i32.shl (local.get $i) (i32.const 2)))
        (i32.wrap_i64 (i64.and (local.get $sum) (i64.const 0xffffffff))))
      (local.set $carry (i64.shr_u (local.get $sum) (i64.const 32)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 48)))
    )
  )
  (func $__bsub (param $d i32) (param $a i32) (param $b i32)
    (local $i i32) (local $borrow i64) (local $diff i64)
    (loop $l
      (local.set $diff
        (i64.sub
          (i64.sub
            (i64.extend_i32_u (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2)))))
            (i64.extend_i32_u (i32.load (i32.add (local.get $b) (i32.shl (local.get $i) (i32.const 2))))))
          (local.get $borrow)))
      (i32.store (i32.add (local.get $d) (i32.shl (local.get $i) (i32.const 2)))
        (i32.wrap_i64 (i64.and (local.get $diff) (i64.const 0xffffffff))))
      (local.set $borrow (i64.and (i64.shr_u (local.get $diff) (i64.const 63)) (i64.const 1)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 48)))
    )
  )
  (func $__f64_to_str (param $val f64) (param $buf i32) (result i32)
    (local $bits i64) (local $e i32) (local $f i64)
    (local $even i32) (local $isMin i32)
    (local $R i32) (local $S i32) (local $MP i32) (local $MM i32) (local $TMP i32) (local $DIG i32)
    (local $k i32) (local $ndig i32) (local $i i32) (local $dg i32)
    (local $ptr i32) (local $sign i32) (local $cmp i32) (local $low i32) (local $high i32)
    (local $pp i32)
    (local.set $ptr (local.get $buf))
    ;; NaN
    (if (f64.ne (local.get $val) (local.get $val))
      (then
        (i32.store8 (local.get $ptr) (i32.const 78))
        (i32.store8 offset=1 (local.get $ptr) (i32.const 97))
        (i32.store8 offset=2 (local.get $ptr) (i32.const 78))
        (return (i32.const 3))))
    ;; sign (-0 -> lt is false -> prints "0")
    (if (f64.lt (local.get $val) (f64.const 0))
      (then
        (i32.store8 (local.get $ptr) (i32.const 45))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
        (local.set $val (f64.neg (local.get $val)))
        (local.set $sign (i32.const 1))))
    ;; Infinity
    (if (f64.eq (local.get $val) (f64.const inf))
      (then
        (i32.store8 (local.get $ptr) (i32.const 73))
        (i32.store8 offset=1 (local.get $ptr) (i32.const 110))
        (i32.store8 offset=2 (local.get $ptr) (i32.const 102))
        (i32.store8 offset=3 (local.get $ptr) (i32.const 105))
        (i32.store8 offset=4 (local.get $ptr) (i32.const 110))
        (i32.store8 offset=5 (local.get $ptr) (i32.const 105))
        (i32.store8 offset=6 (local.get $ptr) (i32.const 116))
        (i32.store8 offset=7 (local.get $ptr) (i32.const 121))
        (return (i32.add (i32.sub (local.get $ptr) (local.get $buf)) (i32.const 8)))))
    ;; zero
    (if (f64.eq (local.get $val) (f64.const 0))
      (then
        (i32.store8 (local.get $ptr) (i32.const 48))
        (return (i32.add (i32.sub (local.get $ptr) (local.get $buf)) (i32.const 1)))))
    ;; lazily allocate bignum scratch
    (if (i32.eqz (global.get $__d4s))
      (then (global.set $__d4s (call $__malloc (i32.const 1024)))))
    (local.set $R   (global.get $__d4s))
    (local.set $S   (i32.add (global.get $__d4s) (i32.const 192)))
    (local.set $MP  (i32.add (global.get $__d4s) (i32.const 384)))
    (local.set $MM  (i32.add (global.get $__d4s) (i32.const 576)))
    (local.set $TMP (i32.add (global.get $__d4s) (i32.const 768)))
    (local.set $DIG (i32.add (global.get $__d4s) (i32.const 960)))
    ;; decompose f64 -> f (mantissa integer) x 2^e
    (local.set $bits (i64.reinterpret_f64 (local.get $val)))
    (local.set $e (i32.wrap_i64 (i64.and (i64.shr_u (local.get $bits) (i64.const 52)) (i64.const 0x7ff))))
    (local.set $f (i64.and (local.get $bits) (i64.const 0xfffffffffffff)))
    (if (i32.eqz (local.get $e))
      (then (local.set $e (i32.const -1074)))
      (else
        (local.set $f (i64.or (local.get $f) (i64.shl (i64.const 1) (i64.const 52))))
        (local.set $e (i32.sub (local.get $e) (i32.const 1075)))))
    (local.set $even (i32.eqz (i32.wrap_i64 (i64.and (local.get $f) (i64.const 1)))))
    (local.set $isMin (i64.eq (local.get $f) (i64.shl (i64.const 1) (i64.const 52))))
    ;; build R, S, m+, m-
    (if (i32.ge_s (local.get $e) (i32.const 0))
      (then
        (call $__bset64 (local.get $TMP) (i64.const 1))
        (call $__bshl (local.get $TMP) (local.get $e))
        (if (i32.eqz (local.get $isMin))
          (then
            (call $__bset64 (local.get $R) (local.get $f))
            (call $__bshl (local.get $R) (i32.add (local.get $e) (i32.const 1)))
            (call $__bset64 (local.get $S) (i64.const 2))
            (memory.copy (local.get $MP) (local.get $TMP) (i32.const 192))
            (memory.copy (local.get $MM) (local.get $TMP) (i32.const 192)))
          (else
            (call $__bset64 (local.get $R) (local.get $f))
            (call $__bshl (local.get $R) (i32.add (local.get $e) (i32.const 2)))
            (call $__bset64 (local.get $S) (i64.const 4))
            (memory.copy (local.get $MP) (local.get $TMP) (i32.const 192))
            (call $__bshl (local.get $MP) (i32.const 1))
            (memory.copy (local.get $MM) (local.get $TMP) (i32.const 192)))))
      (else
        (if (i32.or (i32.eq (local.get $e) (i32.const -1074)) (i32.eqz (local.get $isMin)))
          (then
            (call $__bset64 (local.get $R) (local.get $f))
            (call $__bshl (local.get $R) (i32.const 1))
            (call $__bset64 (local.get $S) (i64.const 1))
            (call $__bshl (local.get $S) (i32.add (i32.sub (i32.const 0) (local.get $e)) (i32.const 1)))
            (call $__bset64 (local.get $MP) (i64.const 1))
            (call $__bset64 (local.get $MM) (i64.const 1)))
          (else
            (call $__bset64 (local.get $R) (local.get $f))
            (call $__bshl (local.get $R) (i32.const 2))
            (call $__bset64 (local.get $S) (i64.const 1))
            (call $__bshl (local.get $S) (i32.add (i32.sub (i32.const 0) (local.get $e)) (i32.const 2)))
            (call $__bset64 (local.get $MP) (i64.const 2))
            (call $__bset64 (local.get $MM) (i64.const 1))))))
    ;; k estimate from binary magnitude (bidirectional fixup corrects any error)
    (local.set $k
      (i32.trunc_f64_s
        (f64.ceil
          (f64.mul (f64.convert_i32_s (i32.add (local.get $e) (i32.const 52)))
                   (f64.const 0.30102999566398114)))))
    ;; initial scale by 10^k
    (if (i32.ge_s (local.get $k) (i32.const 0))
      (then
        (local.set $i (i32.const 0))
        (block $se (loop $sl
          (br_if $se (i32.ge_s (local.get $i) (local.get $k)))
          (call $__bmul_u32 (local.get $S) (i32.const 10))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $sl))))
      (else
        (local.set $i (local.get $k))
        (block $re (loop $rl
          (br_if $re (i32.ge_s (local.get $i) (i32.const 0)))
          (call $__bmul_u32 (local.get $R)  (i32.const 10))
          (call $__bmul_u32 (local.get $MP) (i32.const 10))
          (call $__bmul_u32 (local.get $MM) (i32.const 10))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $rl)))))
    ;; too-small fixup: while high(R+m+, S) -> S*=10; k++
    (block $fse (loop $fsl
      (call $__badd (local.get $TMP) (local.get $R) (local.get $MP))
      (local.set $cmp (call $__bcmp (local.get $TMP) (local.get $S)))
      (br_if $fse (i32.eqz
        (select (i32.ge_s (local.get $cmp) (i32.const 0))
                (i32.gt_s (local.get $cmp) (i32.const 0))
                (local.get $even))))
      (call $__bmul_u32 (local.get $S) (i32.const 10))
      (local.set $k (i32.add (local.get $k) (i32.const 1)))
      (br $fsl)))
    ;; too-big fixup: while NOT high(10*(R+m+), S) -> R,m+,m- *=10; k--
    (block $fbe (loop $fbl
      (call $__badd (local.get $TMP) (local.get $R) (local.get $MP))
      (call $__bmul_u32 (local.get $TMP) (i32.const 10))
      (local.set $cmp (call $__bcmp (local.get $TMP) (local.get $S)))
      (br_if $fbe (i32.eqz
        (select (i32.lt_s (local.get $cmp) (i32.const 0))
                (i32.le_s (local.get $cmp) (i32.const 0))
                (local.get $even))))
      (call $__bmul_u32 (local.get $R)  (i32.const 10))
      (call $__bmul_u32 (local.get $MP) (i32.const 10))
      (call $__bmul_u32 (local.get $MM) (i32.const 10))
      (local.set $k (i32.sub (local.get $k) (i32.const 1)))
      (br $fbl)))
    ;; digit generation
    (local.set $ndig (i32.const 0))
    (loop $dl
      (call $__bmul_u32 (local.get $R)  (i32.const 10))
      (call $__bmul_u32 (local.get $MP) (i32.const 10))
      (call $__bmul_u32 (local.get $MM) (i32.const 10))
      ;; dg = R/S ; R = R%S  (repeated subtract, dg in [0,9])
      (local.set $dg (i32.const 0))
      (block $sube (loop $subl
        (br_if $sube (i32.lt_s (call $__bcmp (local.get $R) (local.get $S)) (i32.const 0)))
        (call $__bsub (local.get $R) (local.get $R) (local.get $S))
        (local.set $dg (i32.add (local.get $dg) (i32.const 1)))
        (br $subl)))
      ;; low
      (local.set $cmp (call $__bcmp (local.get $R) (local.get $MM)))
      (local.set $low
        (select (i32.le_s (local.get $cmp) (i32.const 0))
                (i32.lt_s (local.get $cmp) (i32.const 0))
                (local.get $even)))
      ;; high
      (call $__badd (local.get $TMP) (local.get $R) (local.get $MP))
      (local.set $cmp (call $__bcmp (local.get $TMP) (local.get $S)))
      (local.set $high
        (select (i32.ge_s (local.get $cmp) (i32.const 0))
                (i32.gt_s (local.get $cmp) (i32.const 0))
                (local.get $even)))
      ;; continue when neither boundary reached
      (if (i32.and (i32.eqz (local.get $low)) (i32.eqz (local.get $high)))
        (then
          (i32.store8 (i32.add (local.get $DIG) (local.get $ndig)) (i32.add (i32.const 48) (local.get $dg)))
          (local.set $ndig (i32.add (local.get $ndig) (i32.const 1)))
          (br $dl)))
      ;; terminate: choose final digit (default keep dg)
      (if (i32.and (local.get $high) (i32.eqz (local.get $low)))
        (then (local.set $dg (i32.add (local.get $dg) (i32.const 1))))
        (else
          (if (i32.and (local.get $high) (local.get $low))
            (then
              (call $__badd (local.get $TMP) (local.get $R) (local.get $R))
              (local.set $cmp (call $__bcmp (local.get $TMP) (local.get $S)))
              (if (i32.gt_s (local.get $cmp) (i32.const 0))
                (then (local.set $dg (i32.add (local.get $dg) (i32.const 1))))
                (else
                  (if (i32.eqz (local.get $cmp))
                    (then (if (i32.and (local.get $dg) (i32.const 1))
                            (then (local.set $dg (i32.add (local.get $dg) (i32.const 1)))))))))))))
      (i32.store8 (i32.add (local.get $DIG) (local.get $ndig)) (i32.add (i32.const 48) (local.get $dg)))
      (local.set $ndig (i32.add (local.get $ndig) (i32.const 1)))
    )
    ;; format per ECMAScript Number.prototype.toString (pointPos == k)
    (local.set $pp (local.get $k))
    ;; pp > 21 -> scientific "d[.ddd]e+E"
    (if (i32.gt_s (local.get $pp) (i32.const 21))
      (then
        (i32.store8 (local.get $ptr) (i32.load8_u (local.get $DIG)))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
        (if (i32.gt_s (local.get $ndig) (i32.const 1))
          (then
            (i32.store8 (local.get $ptr) (i32.const 46))
            (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
            (memory.copy (local.get $ptr) (i32.add (local.get $DIG) (i32.const 1)) (i32.sub (local.get $ndig) (i32.const 1)))
            (local.set $ptr (i32.add (local.get $ptr) (i32.sub (local.get $ndig) (i32.const 1))))))
        (i32.store8 (local.get $ptr) (i32.const 101))
        (i32.store8 offset=1 (local.get $ptr) (i32.const 43))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 2)))
        (local.set $ptr (i32.add (local.get $ptr) (call $__i32_to_str (i32.sub (local.get $pp) (i32.const 1)) (local.get $ptr))))
        (return (i32.sub (local.get $ptr) (local.get $buf)))))
    ;; pp <= -6 -> scientific "d[.ddd]e-E"
    (if (i32.le_s (local.get $pp) (i32.const -6))
      (then
        (i32.store8 (local.get $ptr) (i32.load8_u (local.get $DIG)))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
        (if (i32.gt_s (local.get $ndig) (i32.const 1))
          (then
            (i32.store8 (local.get $ptr) (i32.const 46))
            (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
            (memory.copy (local.get $ptr) (i32.add (local.get $DIG) (i32.const 1)) (i32.sub (local.get $ndig) (i32.const 1)))
            (local.set $ptr (i32.add (local.get $ptr) (i32.sub (local.get $ndig) (i32.const 1))))))
        (i32.store8 (local.get $ptr) (i32.const 101))
        (i32.store8 offset=1 (local.get $ptr) (i32.const 45))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 2)))
        (local.set $ptr (i32.add (local.get $ptr) (call $__i32_to_str (i32.sub (i32.const 1) (local.get $pp)) (local.get $ptr))))
        (return (i32.sub (local.get $ptr) (local.get $buf)))))
    ;; pp <= 0 -> "0." + (-pp) zeros + digits
    (if (i32.le_s (local.get $pp) (i32.const 0))
      (then
        (i32.store8 (local.get $ptr) (i32.const 48))
        (i32.store8 offset=1 (local.get $ptr) (i32.const 46))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 2)))
        (local.set $i (i32.const 0))
        (block $ze (loop $zl
          (br_if $ze (i32.ge_s (local.get $i) (i32.sub (i32.const 0) (local.get $pp))))
          (i32.store8 (local.get $ptr) (i32.const 48))
          (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $zl)))
        (memory.copy (local.get $ptr) (local.get $DIG) (local.get $ndig))
        (local.set $ptr (i32.add (local.get $ptr) (local.get $ndig)))
        (return (i32.sub (local.get $ptr) (local.get $buf)))))
    ;; pp >= ndig -> digits + (pp-ndig) zeros
    (if (i32.ge_s (local.get $pp) (local.get $ndig))
      (then
        (memory.copy (local.get $ptr) (local.get $DIG) (local.get $ndig))
        (local.set $ptr (i32.add (local.get $ptr) (local.get $ndig)))
        (local.set $i (i32.const 0))
        (block $ze2 (loop $zl2
          (br_if $ze2 (i32.ge_s (local.get $i) (i32.sub (local.get $pp) (local.get $ndig))))
          (i32.store8 (local.get $ptr) (i32.const 48))
          (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $zl2)))
        (return (i32.sub (local.get $ptr) (local.get $buf)))))
    ;; else split at pp: digits[0..pp) "." digits[pp..]
    (memory.copy (local.get $ptr) (local.get $DIG) (local.get $pp))
    (local.set $ptr (i32.add (local.get $ptr) (local.get $pp)))
    (i32.store8 (local.get $ptr) (i32.const 46))
    (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
    (memory.copy (local.get $ptr) (i32.add (local.get $DIG) (local.get $pp)) (i32.sub (local.get $ndig) (local.get $pp)))
    (local.set $ptr (i32.add (local.get $ptr) (i32.sub (local.get $ndig) (local.get $pp))))
    (i32.sub (local.get $ptr) (local.get $buf))
  )

  ;; ── i64 → decimal string ──────────────────────────────────────────────────
  ;; Writes the decimal representation of $val at $buf, returns byte count.
  (func $__i64_to_str (param $val i64) (param $buf i32) (result i32)
    (local $start i32)
    (local $end i32)
    (local $tmp i32)
    (local $ch i32)
    (local $neg i32)
    (local $digit i32)
    (local $orig i32)
    (local.set $orig (local.get $buf))
    (local.set $start (local.get $buf))
    ;; Zero
    (if (i64.eqz (local.get $val))
      (then
        (i32.store8 (local.get $buf) (i32.const 48))
        (i32.store8 (i32.add (local.get $buf) (i32.const 1)) (i32.const 110))
        (return (i32.const 2))
      )
    )
    ;; Negative
    (if (i64.lt_s (local.get $val) (i64.const 0))
      (then
        (i32.store8 (local.get $buf) (i32.const 45))
        (local.set $buf (i32.add (local.get $buf) (i32.const 1)))
        (local.set $start (local.get $buf))
        (local.set $neg (i32.const 1))
        (local.set $val (i64.sub (i64.const 0) (local.get $val)))
      )
    )
    (local.set $end (local.get $buf))
    ;; Write digits in reverse
    (block $done
      (loop $loop
        (br_if $done (i64.eqz (local.get $val)))
        (local.set $digit (i32.wrap_i64 (i64.rem_u (local.get $val) (i64.const 10))))
        (i32.store8
          (local.get $end)
          (i32.add (i32.const 48) (local.get $digit))
        )
        (local.set $val (i64.div_u (local.get $val) (i64.const 10)))
        (local.set $end (i32.add (local.get $end) (i32.const 1)))
        (br $loop)
      )
    )
    ;; Reverse digit bytes in-place
    (local.set $tmp (local.get $start))
    (local.set $ch (i32.sub (local.get $end) (i32.const 1)))
    (block $rdone
      (loop $rloop
        (br_if $rdone (i32.ge_u (local.get $tmp) (local.get $ch)))
        (local.set $neg (i32.load8_u (local.get $tmp)))
        (i32.store8 (local.get $tmp) (i32.load8_u (local.get $ch)))
        (i32.store8 (local.get $ch) (local.get $neg))
        (local.set $tmp (i32.add (local.get $tmp) (i32.const 1)))
        (local.set $ch (i32.sub (local.get $ch) (i32.const 1)))
        (br $rloop)
      )
    )
    ;; Append 'n' suffix for bigint display
    (i32.store8 (local.get $end) (i32.const 110))
    (local.set $end (i32.add (local.get $end) (i32.const 1)))
    ;; Return total length (including leading '-' and trailing 'n')
    (i32.sub (local.get $end) (local.get $orig))
  )
`.trimEnd();
}

/**
 * Returns the WAT helpers that print a whole array (or typed array) into the console buffer in
 * Deno / Node's layout: `$__arr_inspect(arr, kind, name_len, cursor_addr)`.
 * arr layout: [length:i32, capacity:i32, elements from +8 (i32 or f64)].
 * Depends on: $__i32_to_str, $__f64_to_str (getHelperWat) and $__cbuf_need (the string gather).
 */
export function getArrPrintHelperWat(): string {
  return `
  ;; ── console: an array as Deno and Node print it (sw66, sw67, 2026-10-13) ──
  ;; util.inspect's layout for a top-level argument (groupArrayElements + reduceToSingleString):
  ;; at most 100 elements, then "... N more items"; one line "[ a, b ]" when it fits 80 columns;
  ;; otherwise more than 6 entries are grouped into right-aligned columns; otherwise one element
  ;; per line. name_len is 0 for an array, else a typed array's name length: its opening is then
  ;; "Int32Array(3) [" (name, "(", the length's digits, ") [").
  ;; Element i's text, at dest; returns its length. kind is the element layout (arrInspectKind):
  ;; 0 i32, 1 f64, 2 i8, 3 u8, 4 i16, 5 u16, 6 u32, 7 f32, 8 boolean, 9 bigint (i64, with its n),
  ;; 10 string (8-byte ptr,len pairs; quoted as inspect quotes: the first of " ' \` the text does not
  ;; hold, else ", with \\ \\n \\t \\r \\b \\f \\v and \\xNN escapes; ld37). An f64 -0 prints "-0".
  (func $__arr_elem_str (param $arr i32) (param $i i32) (param $kind i32) (param $dest i32) (result i32)
    (local $v f64) (local $a i32)
    (local $sp i32) (local $sl i32) (local $k i32) (local $ch i32) (local $has i32) (local $qc i32) (local $o i32)
    (local.set $a (i32.add (local.get $arr) (i32.const 8)))
    (if (i32.eq (local.get $kind) (i32.const 8))
      (then
        (if (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2))))
          (then (i32.store (local.get $dest) (i32.const 0x65757274)) (return (i32.const 4)))) ;; "true"
        (i32.store (local.get $dest) (i32.const 0x736c6166)) ;; "fals"
        (i32.store8 offset=4 (local.get $dest) (i32.const 101)) ;; "e"
        (return (i32.const 5))))
    (if (i32.eq (local.get $kind) (i32.const 9))
      (then (return (call $__i64_to_str
        (i64.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 3)))) (local.get $dest)))))
    (if (i32.eq (local.get $kind) (i32.const 10))
      (then
        (local.set $sp (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 3)))))
        (local.set $sl (i32.load offset=4 (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 3)))))
        ;; which quote characters the text holds: bit 0 ", bit 1 ', bit 2 \`
        (block $s_done
          (loop $scan
            (br_if $s_done (i32.ge_u (local.get $k) (local.get $sl)))
            (local.set $ch (i32.load8_u (i32.add (local.get $sp) (local.get $k))))
            (if (i32.eq (local.get $ch) (i32.const 34)) (then (local.set $has (i32.or (local.get $has) (i32.const 1)))))
            (if (i32.eq (local.get $ch) (i32.const 39)) (then (local.set $has (i32.or (local.get $has) (i32.const 2)))))
            (if (i32.eq (local.get $ch) (i32.const 96)) (then (local.set $has (i32.or (local.get $has) (i32.const 4)))))
            (local.set $k (i32.add (local.get $k) (i32.const 1)))
            (br $scan)))
        (local.set $qc (select (i32.const 34)
          (select (i32.const 39)
            (select (i32.const 96) (i32.const 34) (i32.eqz (i32.and (local.get $has) (i32.const 4))))
            (i32.eqz (i32.and (local.get $has) (i32.const 2))))
          (i32.eqz (i32.and (local.get $has) (i32.const 1)))))
        (i32.store8 (local.get $dest) (local.get $qc))
        (local.set $o (i32.add (local.get $dest) (i32.const 1)))
        (local.set $k (i32.const 0))
        (block $w_done
          (loop $write
            (br_if $w_done (i32.ge_u (local.get $k) (local.get $sl)))
            (local.set $ch (i32.load8_u (i32.add (local.get $sp) (local.get $k))))
            ;; $has (the quote mask) is free from here: it holds an escape's letter
            (if (i32.or (i32.eq (local.get $ch) (local.get $qc)) (i32.eq (local.get $ch) (i32.const 92)))
              (then
                (i32.store8 (local.get $o) (i32.const 92))
                (i32.store8 offset=1 (local.get $o) (local.get $ch))
                (local.set $o (i32.add (local.get $o) (i32.const 2))))
              (else (if (i32.or (i32.lt_u (local.get $ch) (i32.const 32)) (i32.eq (local.get $ch) (i32.const 127)))
                (then
                  (i32.store8 (local.get $o) (i32.const 92))
                  ;; \\n \\t \\r \\b \\f \\v by name, else \\xNN (upper-case hex)
                  (local.set $has (select (i32.const 110) (i32.const 0) (i32.eq (local.get $ch) (i32.const 10))))
                  (if (i32.eq (local.get $ch) (i32.const 9)) (then (local.set $has (i32.const 116))))
                  (if (i32.eq (local.get $ch) (i32.const 13)) (then (local.set $has (i32.const 114))))
                  (if (i32.eq (local.get $ch) (i32.const 8)) (then (local.set $has (i32.const 98))))
                  (if (i32.eq (local.get $ch) (i32.const 12)) (then (local.set $has (i32.const 102))))
                  (if (i32.eq (local.get $ch) (i32.const 11)) (then (local.set $has (i32.const 118))))
                  (if (local.get $has)
                    (then
                      (i32.store8 offset=1 (local.get $o) (local.get $has))
                      (local.set $o (i32.add (local.get $o) (i32.const 2))))
                    (else
                      (i32.store8 offset=1 (local.get $o) (i32.const 120)) ;; "x"
                      (i32.store8 offset=2 (local.get $o) (i32.add (i32.shr_u (local.get $ch) (i32.const 4))
                        (select (i32.const 48) (i32.const 55) (i32.lt_u (i32.shr_u (local.get $ch) (i32.const 4)) (i32.const 10)))))
                      (i32.store8 offset=3 (local.get $o) (i32.add (i32.and (local.get $ch) (i32.const 15))
                        (select (i32.const 48) (i32.const 55) (i32.lt_u (i32.and (local.get $ch) (i32.const 15)) (i32.const 10)))))
                      (local.set $o (i32.add (local.get $o) (i32.const 4))))))
                (else
                  (i32.store8 (local.get $o) (local.get $ch))
                  (local.set $o (i32.add (local.get $o) (i32.const 1)))))))
            (local.set $k (i32.add (local.get $k) (i32.const 1)))
            (br $write)))
        (i32.store8 (local.get $o) (local.get $qc))
        (return (i32.sub (i32.add (local.get $o) (i32.const 1)) (local.get $dest)))))
    (if (i32.eqz (local.get $kind))
      (then (return (call $__i32_to_str
        (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2)))) (local.get $dest)))))
    (if (i32.eq (local.get $kind) (i32.const 2))
      (then (return (call $__i32_to_str (i32.load8_s (i32.add (local.get $a) (local.get $i))) (local.get $dest)))))
    (if (i32.eq (local.get $kind) (i32.const 3))
      (then (return (call $__i32_to_str (i32.load8_u (i32.add (local.get $a) (local.get $i))) (local.get $dest)))))
    (if (i32.eq (local.get $kind) (i32.const 4))
      (then (return (call $__i32_to_str
        (i32.load16_s (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 1)))) (local.get $dest)))))
    (if (i32.eq (local.get $kind) (i32.const 5))
      (then (return (call $__i32_to_str
        (i32.load16_u (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 1)))) (local.get $dest)))))
    (if (i32.eq (local.get $kind) (i32.const 6))
      (then (local.set $v (f64.convert_i32_u (i32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2))))))))
    (if (i32.eq (local.get $kind) (i32.const 7))
      (then (local.set $v (f64.promote_f32 (f32.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2))))))))
    (if (i32.eq (local.get $kind) (i32.const 1))
      (then (local.set $v (f64.load (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 3)))))))
    (if (i32.and (f64.eq (local.get $v) (f64.const 0))
                 (i64.lt_s (i64.reinterpret_f64 (local.get $v)) (i64.const 0)))
      (then
        (i32.store8 (local.get $dest) (i32.const 45))
        (i32.store8 offset=1 (local.get $dest) (i32.const 48))
        (return (i32.const 2))))
    (call $__f64_to_str (local.get $v) (local.get $dest))
  )
  (func $__arr_spaces (param $dest i32) (param $n i32) (result i32)
    (block $done
      (loop $fill
        (br_if $done (i32.le_s (local.get $n) (i32.const 0)))
        (i32.store8 (local.get $dest) (i32.const 32))
        (local.set $dest (i32.add (local.get $dest) (i32.const 1)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $fill)))
    (local.get $dest)
  )
  (func $__arr_inspect (param $arr i32) (param $kind i32) (param $name_len i32) (param $cursor_addr i32)
    (local $brace_len i32) (local $len i32) (local $shown i32) (local $more i32) (local $outn i32) (local $cur i32)
    (local $p i32) (local $q i32) (local $lens i32) (local $cw i32) (local $i i32) (local $j i32)
    (local $l i32) (local $total i32) (local $maxl i32) (local $amax i32) (local $cols i32)
    (local $c i32) (local $w i32) (local $more_len i32) (local $one i32) (local $t i32)
    (local $bias f64) (local $bmax f64) (local $extra i32) (local $left i32) (local $b i32)
    (local.set $len (i32.load (local.get $arr)))
    (local.set $cur (i32.load (local.get $cursor_addr)))
    (local.set $shown (select (i32.const 100) (local.get $len) (i32.gt_u (local.get $len) (i32.const 100))))
    (local.set $more (i32.sub (local.get $len) (local.get $shown)))
    ;; booleans and strings align LEFT in columns (padEnd); numbers and bigints right (padStart)
    (local.set $left (i32.or (i32.eq (local.get $kind) (i32.const 8)) (i32.eq (local.get $kind) (i32.const 10))))
    ;; a string's text: at most 4 bytes per byte (an \\xNN escape) and its two quotes
    (if (i32.eq (local.get $kind) (i32.const 10))
      (then
        (local.set $i (i32.const 0))
        (block $x_done
          (loop $extra_l
            (br_if $x_done (i32.ge_u (local.get $i) (local.get $shown)))
            (local.set $extra (i32.add (local.get $extra) (i32.add (i32.const 2) (i32.shl
              (i32.load offset=12 (i32.add (local.get $arr) (i32.shl (local.get $i) (i32.const 3)))) (i32.const 2)))))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $extra_l)))))
    ;; room: an element <= 24 bytes, with its padding and separators <= 30; the "more" entry and
    ;; the brackets <= 64; a string array's text; then the length table (4 per element) and the
    ;; column widths (12 x 4)
    (call $__cbuf_need (i32.add (local.get $cur)
      (i32.add (i32.add (i32.mul (local.get $shown) (i32.const 34)) (i32.const 128)) (local.get $extra))))
    (local.set $p (i32.add (global.get $__cbuf) (local.get $cur)))
    (if (i32.eqz (local.get $len))
      (then
        (i32.store16 (local.get $p) (i32.const 0x5d5b)) ;; "[]"
        (i32.store (local.get $cursor_addr) (i32.add (local.get $cur) (i32.const 2)))
        (return)))
    (local.set $lens (i32.and (i32.add (i32.add (i32.add (local.get $p)
      (i32.add (i32.mul (local.get $shown) (i32.const 30)) (i32.const 64))) (local.get $extra)) (i32.const 3)) (i32.const -4)))
    (local.set $cw (i32.add (local.get $lens) (i32.shl (local.get $shown) (i32.const 2))))
    ;; pass 1: each element's WIDTH (its text is written at p and overwritten below); a string's
    ;; width counts characters, not UTF-8 bytes, as inspect's does for these
    (local.set $i (i32.const 0))
    (block $m_done
      (loop $measure
        (br_if $m_done (i32.ge_u (local.get $i) (local.get $shown)))
        (local.set $l (call $__arr_elem_str (local.get $arr) (local.get $i) (local.get $kind) (local.get $p)))
        (if (i32.eq (local.get $kind) (i32.const 10))
          (then
            (local.set $t (i32.const 0))
            (local.set $b (i32.const 0))
            (block $u_done
              (loop $utf8
                (br_if $u_done (i32.ge_u (local.get $b) (local.get $l)))
                (if (i32.ne (i32.and (i32.load8_u (i32.add (local.get $p) (local.get $b))) (i32.const 0xc0)) (i32.const 0x80))
                  (then (local.set $t (i32.add (local.get $t) (i32.const 1)))))
                (local.set $b (i32.add (local.get $b) (i32.const 1)))
                (br $utf8)))
            (local.set $l (local.get $t))))
        (i32.store (i32.add (local.get $lens) (i32.shl (local.get $i) (i32.const 2))) (local.get $l))
        (local.set $total (i32.add (local.get $total) (i32.add (local.get $l) (i32.const 2))))
        (if (i32.gt_u (local.get $l) (local.get $maxl)) (then (local.set $maxl (local.get $l))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $measure)))
    (local.set $outn (i32.add (local.get $shown) (i32.ne (local.get $more) (i32.const 0))))
    (local.set $brace_len (i32.const 1))
    (if (local.get $name_len)
      (then (local.set $brace_len (i32.add (i32.add (local.get $name_len) (i32.const 4))
        (call $__i32_to_str (local.get $len) (local.get $p))))))
    ;; "... N more item" + "s" when N > 1
    (if (local.get $more)
      (then (local.set $more_len (i32.add (i32.add (call $__i32_to_str (local.get $more) (local.get $p))
        (i32.const 14)) (i32.gt_u (local.get $more) (i32.const 1))))))
    ;; grouping: more than 6 entries, short enough, and many or narrow
    (if (i32.gt_u (local.get $outn) (i32.const 6))
      (then
        (local.set $amax (i32.add (local.get $maxl) (i32.const 2)))
        (if (i32.and (i32.lt_u (i32.mul (local.get $amax) (i32.const 3)) (i32.const 80))
                     (i32.or (f64.gt (f64.div (f64.convert_i32_u (local.get $total)) (f64.convert_i32_u (local.get $amax)))
                                     (f64.const 5))
                             (i32.le_u (local.get $maxl) (i32.const 6))))
          (then
            (local.set $bias (f64.sqrt (f64.sub (f64.convert_i32_u (local.get $amax))
              (f64.div (f64.convert_i32_u (local.get $total)) (f64.convert_i32_u (local.get $outn))))))
            (local.set $bmax (f64.max (f64.sub (f64.sub (f64.convert_i32_u (local.get $amax)) (f64.const 3))
              (local.get $bias)) (f64.const 1)))
            ;; Math.round (half up) of sqrt(2.5 * biasedMax * entries) / biasedMax
            (local.set $cols (i32.trunc_f64_u (f64.floor (f64.add (f64.div
              (f64.sqrt (f64.mul (f64.mul (f64.const 2.5) (local.get $bmax)) (f64.convert_i32_u (local.get $shown))))
              (local.get $bmax)) (f64.const 0.5)))))
            (local.set $t (i32.div_u (i32.const 80) (local.get $amax)))
            (if (i32.lt_u (local.get $t) (local.get $cols)) (then (local.set $cols (local.get $t))))
            (if (i32.gt_u (local.get $cols) (i32.const 12)) (then (local.set $cols (i32.const 12))))
            (if (i32.le_u (local.get $cols) (i32.const 1)) (then (local.set $cols (i32.const 0))))))))
    ;; each column's width: its widest element + 2
    (local.set $c (i32.const 0))
    (block $w_done
      (loop $widths
        (br_if $w_done (i32.ge_u (local.get $c) (local.get $cols)))
        (local.set $w (i32.const 0))
        (local.set $j (local.get $c))
        (block $col_done
          (loop $col
            (br_if $col_done (i32.ge_u (local.get $j) (local.get $shown)))
            (local.set $l (i32.load (i32.add (local.get $lens) (i32.shl (local.get $j) (i32.const 2)))))
            (if (i32.gt_u (local.get $l) (local.get $w)) (then (local.set $w (local.get $l))))
            (local.set $j (i32.add (local.get $j) (local.get $cols)))
            (br $col)))
        (i32.store (i32.add (local.get $cw) (i32.shl (local.get $c) (i32.const 2))) (i32.add (local.get $w) (i32.const 2)))
        (local.set $c (i32.add (local.get $c) (i32.const 1)))
        (br $widths)))
    ;; one line when ungrouped and within 80 columns: start = entries + brace_len + 10
    (if (i32.eqz (local.get $cols))
      (then
        (local.set $t (i32.add (i32.add (i32.shl (local.get $outn) (i32.const 1)) (local.get $brace_len)) (i32.const 10)))
        (local.set $one (i32.and
          (i32.le_u (i32.add (local.get $t) (local.get $outn)) (i32.const 80))
          (i32.le_u (i32.add (i32.add (local.get $t) (i32.sub (local.get $total) (i32.shl (local.get $shown) (i32.const 1))))
            (local.get $more_len)) (i32.const 80))))))
    ;; pass 2: write
    (local.set $q (local.get $p))
    (if (local.get $one)
      (then (i32.store16 (local.get $q) (i32.const 0x205b)) (local.set $q (i32.add (local.get $q) (i32.const 2)))) ;; "[ "
      (else (i32.store (local.get $q) (i32.const 0x20200a5b)) (local.set $q (i32.add (local.get $q) (i32.const 4))))) ;; "[\\n  "
    (local.set $i (i32.const 0))
    (block $e_done
      (loop $emit
        (br_if $e_done (i32.ge_u (local.get $i) (local.get $shown)))
        (local.set $l (i32.load (i32.add (local.get $lens) (i32.shl (local.get $i) (i32.const 2)))))
        (if (local.get $cols)
          (then
            (local.set $c (i32.rem_u (local.get $i) (local.get $cols)))
            (local.set $w (i32.load (i32.add (local.get $cw) (i32.shl (local.get $c) (i32.const 2)))))
            (if (i32.and (i32.eqz (local.get $c)) (i32.ne (local.get $i) (i32.const 0)))
              (then (i32.store (local.get $q) (i32.const 0x20200a2c)) (local.set $q (i32.add (local.get $q) (i32.const 4))))) ;; ",\\n  "
            ;; padStart: every cell but a row's last is "elem, " padded to the column width, and
            ;; the row's last is padded to the width less the separator. padEnd ($left): the
            ;; padding follows "elem, ", and a row's last cell has none.
            (if (i32.eqz (local.get $left))
              (then (local.set $q (call $__arr_spaces (local.get $q) (i32.sub (i32.sub (local.get $w) (i32.const 2)) (local.get $l))))))
            (local.set $q (i32.add (local.get $q)
              (call $__arr_elem_str (local.get $arr) (local.get $i) (local.get $kind) (local.get $q))))
            (if (i32.and (i32.ne (local.get $c) (i32.sub (local.get $cols) (i32.const 1)))
                         (i32.ne (local.get $i) (i32.sub (local.get $shown) (i32.const 1))))
              (then
                (i32.store16 (local.get $q) (i32.const 0x202c)) (local.set $q (i32.add (local.get $q) (i32.const 2))) ;; ", "
                (if (local.get $left)
                  (then (local.set $q (call $__arr_spaces (local.get $q) (i32.sub (i32.sub (local.get $w) (i32.const 2)) (local.get $l)))))))))
          (else
            (if (local.get $i)
              (then
                (if (local.get $one)
                  (then (i32.store16 (local.get $q) (i32.const 0x202c)) (local.set $q (i32.add (local.get $q) (i32.const 2))))
                  (else (i32.store (local.get $q) (i32.const 0x20200a2c)) (local.set $q (i32.add (local.get $q) (i32.const 4)))))))
            (local.set $q (i32.add (local.get $q)
              (call $__arr_elem_str (local.get $arr) (local.get $i) (local.get $kind) (local.get $q))))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $emit)))
    (if (local.get $more)
      (then
        (if (local.get $one)
          (then (i32.store16 (local.get $q) (i32.const 0x202c)) (local.set $q (i32.add (local.get $q) (i32.const 2))))
          (else (i32.store (local.get $q) (i32.const 0x20200a2c)) (local.set $q (i32.add (local.get $q) (i32.const 4)))))
        (i32.store (local.get $q) (i32.const 0x202e2e2e)) ;; "... "
        (local.set $q (i32.add (local.get $q) (i32.const 4)))
        (local.set $q (i32.add (local.get $q) (call $__i32_to_str (local.get $more) (local.get $q))))
        (i64.store (local.get $q) (i64.const 0x74692065726f6d20)) ;; " more it"
        (i32.store16 offset=8 (local.get $q) (i32.const 0x6d65)) ;; "em"
        (local.set $q (i32.add (local.get $q) (i32.const 10)))
        (if (i32.gt_u (local.get $more) (i32.const 1))
          (then (i32.store8 (local.get $q) (i32.const 115)) (local.set $q (i32.add (local.get $q) (i32.const 1)))))))
    (if (local.get $one)
      (then (i32.store16 (local.get $q) (i32.const 0x5d20)) (local.set $q (i32.add (local.get $q) (i32.const 2)))) ;; " ]"
      (else (i32.store16 (local.get $q) (i32.const 0x5d0a)) (local.set $q (i32.add (local.get $q) (i32.const 2))))) ;; "\\n]"
    (i32.store (local.get $cursor_addr) (i32.add (local.get $cur) (i32.sub (local.get $q) (local.get $p))))
  )`;
}

/**
 * Phase 28: Returns WAT helper functions that write arr.join(sep) output
 * into the scratch gather buffer.
 *
 * Signatures:
 *   $__dynarr_join_to_scratch_i32(arr, sep_ptr, sep_len, scratch_base, cursor_addr)
 *   $__dynarr_join_to_scratch_f64(arr, sep_ptr, sep_len, scratch_base, cursor_addr)
 * Depends on: $__i32_to_str / $__f64_to_str (from getHelperWat)
 */
export function getJoinHelperWat(): string {
  return `
  ;; ── join i32[] to scratch ──────────────────────────────────────────────────
  (func $__dynarr_join_to_scratch_i32
    (param $arr i32) (param $sep_ptr i32) (param $sep_len i32)
    (param $scratch_base i32) (param $cursor_addr i32)
    (local $len i32)
    (local $idx i32)
    (local $cur i32)
    (local $si i32)
    (local $slen i32)
    (local $elem i32)
    (local.set $len (i32.load (local.get $arr)))
    (local.set $cur (i32.load (local.get $cursor_addr)))
    (block $done
      (loop $loop
        (br_if $done (i32.ge_u (local.get $idx) (local.get $len)))
        ;; Write separator before each element except the first
        (if (i32.gt_u (local.get $idx) (i32.const 0))
          (then
            (local.set $si (i32.const 0))
            (block $sep_done
              (loop $sep_lp
                (br_if $sep_done (i32.ge_u (local.get $si) (local.get $sep_len)))
                (i32.store8
                  (i32.add (i32.add (local.get $scratch_base) (local.get $cur)) (local.get $si))
                  (i32.load8_u (i32.add (local.get $sep_ptr) (local.get $si))))
                (local.set $si (i32.add (local.get $si) (i32.const 1)))
                (br $sep_lp)
              )
            )
            (local.set $cur (i32.add (local.get $cur) (local.get $sep_len)))
          )
        )
        ;; Convert element to decimal string and write into scratch
        (local.set $elem (i32.load (i32.add (i32.add (local.get $arr) (i32.const 8)) (i32.shl (local.get $idx) (i32.const 2)))))
        (local.set $slen (call $__i32_to_str (local.get $elem) (i32.add (local.get $scratch_base) (local.get $cur))))
        (local.set $cur (i32.add (local.get $cur) (local.get $slen)))
        (local.set $idx (i32.add (local.get $idx) (i32.const 1)))
        (br $loop)
      )
    )
    (i32.store (local.get $cursor_addr) (local.get $cur))
  )
  ;; ── join f64[] to scratch ──────────────────────────────────────────────────
  (func $__dynarr_join_to_scratch_f64
    (param $arr i32) (param $sep_ptr i32) (param $sep_len i32)
    (param $scratch_base i32) (param $cursor_addr i32)
    (local $len i32)
    (local $idx i32)
    (local $cur i32)
    (local $si i32)
    (local $slen i32)
    (local $elem f64)
    (local.set $len (i32.load (local.get $arr)))
    (local.set $cur (i32.load (local.get $cursor_addr)))
    (block $done
      (loop $loop
        (br_if $done (i32.ge_u (local.get $idx) (local.get $len)))
        (if (i32.gt_u (local.get $idx) (i32.const 0))
          (then
            (local.set $si (i32.const 0))
            (block $sep_done
              (loop $sep_lp
                (br_if $sep_done (i32.ge_u (local.get $si) (local.get $sep_len)))
                (i32.store8
                  (i32.add (i32.add (local.get $scratch_base) (local.get $cur)) (local.get $si))
                  (i32.load8_u (i32.add (local.get $sep_ptr) (local.get $si))))
                (local.set $si (i32.add (local.get $si) (i32.const 1)))
                (br $sep_lp)
              )
            )
            (local.set $cur (i32.add (local.get $cur) (local.get $sep_len)))
          )
        )
        (local.set $elem (f64.load (i32.add (i32.add (local.get $arr) (i32.const 8)) (i32.shl (local.get $idx) (i32.const 3)))))
        (local.set $slen (call $__f64_to_str (local.get $elem) (i32.add (local.get $scratch_base) (local.get $cur))))
        (local.set $cur (i32.add (local.get $cur) (local.get $slen)))
        (local.set $idx (i32.add (local.get $idx) (i32.const 1)))
        (br $loop)
      )
    )
    (i32.store (local.get $cursor_addr) (local.get $cur))
  )
  ;; ── join → a real (ptr, len) STRING value ──────────────────────────────────
  ;; The two helpers above write into a caller-supplied scratch buffer, which only suits the
  ;; console.log gather path. These wrappers give arr.join(sep) a string VALUE, so it also works in
  ;; \`const s: string = arr.join(sep)\`, in concatenation and in comparisons. They reuse the scratch
  ;; writers verbatim (same tested loop) over a heap buffer plus a 4-byte cursor cell. Capacity is a
  ;; worst-case bound: an i32 renders in <= 11 bytes ("-2147483648"), an f64 (Dragon4) in well under
  ;; 32, plus one separator per element and slack.
  (func $__dynarr_join_str_i32
    (param $arr i32) (param $sep_ptr i32) (param $sep_len i32)
    (result i32 i32)
    (local $buf i32)
    (local $cursor i32)
    (local $n i32)
    (local.set $n (i32.load (local.get $arr)))
    (local.set $buf (call $__malloc
      (i32.add (i32.const 16)
        (i32.add (i32.mul (local.get $n) (i32.const 12))
                 (i32.mul (local.get $n) (local.get $sep_len))))))
    (local.set $cursor (call $__malloc (i32.const 4)))
    (i32.store (local.get $cursor) (i32.const 0))
    (call $__dynarr_join_to_scratch_i32
      (local.get $arr) (local.get $sep_ptr) (local.get $sep_len)
      (local.get $buf) (local.get $cursor))
    (local.get $buf)
    (i32.load (local.get $cursor))
  )
  (func $__dynarr_join_str_f64
    (param $arr i32) (param $sep_ptr i32) (param $sep_len i32)
    (result i32 i32)
    (local $buf i32)
    (local $cursor i32)
    (local $n i32)
    (local.set $n (i32.load (local.get $arr)))
    (local.set $buf (call $__malloc
      (i32.add (i32.const 16)
        (i32.add (i32.mul (local.get $n) (i32.const 32))
                 (i32.mul (local.get $n) (local.get $sep_len))))))
    (local.set $cursor (call $__malloc (i32.const 4)))
    (i32.store (local.get $cursor) (i32.const 0))
    (call $__dynarr_join_to_scratch_f64
      (local.get $arr) (local.get $sep_ptr) (local.get $sep_len)
      (local.get $buf) (local.get $cursor))
    (local.get $buf)
    (i32.load (local.get $cursor))
  )
  ;; ── console: arr.join(sep) into the growable console buffer (sw62, 2026-10-13) ──
  (func $__cbuf_join_i32 (param $arr i32) (param $sep_ptr i32) (param $sep_len i32) (param $cursor_addr i32)
    (call $__cbuf_need (i32.add (i32.load (local.get $cursor_addr))
      (i32.add (i32.mul (i32.load (local.get $arr)) (i32.add (i32.const 11) (local.get $sep_len)))
               (i32.const 8))))
    (call $__dynarr_join_to_scratch_i32 (local.get $arr) (local.get $sep_ptr) (local.get $sep_len)
      (global.get $__cbuf) (local.get $cursor_addr))
  )
  (func $__cbuf_join_f64 (param $arr i32) (param $sep_ptr i32) (param $sep_len i32) (param $cursor_addr i32)
    (call $__cbuf_need (i32.add (i32.load (local.get $cursor_addr))
      (i32.add (i32.mul (i32.load (local.get $arr)) (i32.add (i32.const 24) (local.get $sep_len)))
               (i32.const 8))))
    (call $__dynarr_join_to_scratch_f64 (local.get $arr) (local.get $sep_ptr) (local.get $sep_len)
      (global.get $__cbuf) (local.get $cursor_addr))
  )`;
}
