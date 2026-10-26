/**
 * @module tsbundler
 * @description Import bundler pre-pass for the wasmtk TypeScript-to-WASM compiler.
 *
 * Resolves relative `import` statements in a TypeScript entry file, merges all
 * imported source files into a single flat source string, and strips import /
 * export declarations so the result can be fed directly into WasicTranspiler.
 *
 * ## Name mangling
 *
 * Every exported symbol from an imported file is prefixed with a module name
 * derived from the file's basename (without extension), so that identically-named
 * functions or variables in different modules never collide in the merged output:
 *
 *   mathlib.ts   →  prefix "mathlib"   →  add        becomes  mathlib_add
 *   myotherlib.ts→  prefix "myotherlib"→  add        becomes  myotherlib_add
 *
 * Import aliases are treated as compile-time local names only and are fully
 * erased — the canonical WAT name is always the module-prefixed original:
 *
 *   import { add as mathAdd } from "./mathlib.ts"
 *   →  mathAdd in this file rewrites to  mathlib_add  in the merged output
 *
 * ## Supported import forms (single-line)
 *
 *   import { foo, bar }             from "./path.ts"   — named imports
 *   import { foo as f, bar as b }   from "./path.ts"   — aliased named imports
 *   import defaultExport            from "./path.ts"   — default import
 *   import * as ns                  from "./path.ts"   — namespace import
 *   import defaultExport, { foo }   from "./path.ts"   — default + named
 *   import type { Foo }             from "./path.ts"   — type-only (erased)
 *   import "./path.ts"                                 — side-effect import
 *
 * ## Supported export forms (non-entry files)
 *
 *   export function foo() {}                           — named function export
 *   export const x = 1                                 — named const export
 *   export default function foo() {}                   — default export
 *   export { foo } from "./lib.ts"                     — named re-export
 *   export { foo as bar } from "./lib.ts"              — aliased re-export
 *   export * from "./lib.ts"                           — wildcard re-export
 *
 * Non-relative specifiers (jsr:, npm:, https://) are left in place and will
 * surface as unsupported-feature warnings from the transpiler.
 *
 * Circular and duplicate imports are detected via a visited-path set and
 * silently deduplicated (first occurrence wins).  Export rename maps are cached
 * separately so re-exports can resolve names from already-visited files.
 *
 * ## Limitation
 * Multiline import blocks (opening `{` on a separate line) are not yet
 * handled — use single-line named imports in files intended for wasmtk.
 */

import { basename, dirname, join } from "@std/path";
import { rt } from "./rt.ts";
import { CAPABILITIES } from "./wasm/caps_bytes.ts";
import { isWasMathSpecifier, wasMathRewrites, WM_F32_TS, WM_NAMESPACES } from "./wasmath_lower.ts";

// ---------------------------------------------------------------------------
// Phase 18 — WASM import types
// ---------------------------------------------------------------------------

/**
 * Describes a .wasm file referenced by an import statement in the entry source.
 * Collected by bundleImportsEx and handed to the wasic compiler for WAT-level merge.
 */
export interface WasmImportEntry {
  /** Resolved absolute path to the .wasm file, or a synthetic `wasmtk:<cap>` id for an
   *  embedded capability (Brief #4) — in that case `bytes`/`witText` are populated and no
   *  file is read. */
  filePath: string;
  /** Module prefix derived from the filename, e.g. "math" for "./math.wasm". */
  prefix: string;
  /**
   * Maps each original export name to its canonical prefixed name.
   * e.g. for math.wasm: { "add" → "math_add", "multiply" → "math_multiply" }
   * Import aliases are already resolved: `{ add as sum }` → localRewrites "sum"→"math_add"
   * but renames still records "add"→"math_add" for use by the merge step.
   */
  renames: Map<string, string>;
  /** Embedded module bytes for a virtual `wasmtk:<cap>` import (Brief #4). When set, the
   *  merge reads these instead of `filePath`. */
  bytes?: Uint8Array;
  /** Embedded `.wit` text for a virtual capability — supplies logical (string) signatures
   *  to the merge in place of a sibling `.wit` file. */
  witText?: string;
}

/** Extended return type from bundleImportsEx — includes both the merged TS source
 *  and any .wasm imports that need WAT-level merging. */
export interface BundleResult {
  /** Merged TypeScript source with all .ts imports inlined and names mangled. */
  source: string;
  /** .wasm imports discovered during bundling, in discovery order. */
  wasmImports: WasmImportEntry[];
  /** The TypeScript files read, entry first (real paths): where a compile error is located
   *  (D6, 2026-10-13). */
  files?: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Derives a valid identifier prefix from a file path.
 * Takes the basename without extension and replaces non-word characters with `_`.
 *
 * Examples:
 *   "./mathlib.ts"    →  "mathlib"
 *   "../my-utils.ts"  →  "my_utils"
 *   "./vec2d.ts"      →  "vec2d"
 */
function modulePrefix(filePath: string): string {
  return basename(filePath).replace(/\.[^/.]+$/, "").replace(/\W+/g, "_");
}

/** The prefix of an exported CLASS: capitalised (`shapes` → `Shapes`, `2d` → `M2d`), since wasic
 *  reads `new X(…)` and a class type by a leading capital (ld84, 2026-10-22). */
function classPrefix(prefix: string): string {
  return /^[a-z]/.test(prefix)
    ? prefix[0]!.toUpperCase() + prefix.slice(1)
    : /^[A-Z]/.test(prefix)
    ? prefix
    : `M${prefix}`;
}

/**
 * Blank out comments and string/template literals in one left-to-right pass, so the auto-merge
 * trigger sniff (below) only ever sees real CODE. A regex approach can't do this: stripping comments
 * first lets a `//` inside a string eat the rest of the line (hiding a real `: any`/`eval(`/`Function(`
 * after it → false-negative compile failure), while blanking strings first lets an apostrophe in a
 * comment (`// it's`) start a bogus string that swallows code. A single scanner that tracks both
 * states avoids both. String contents become a space (a trigger inside a string literal is data, not
 * code, so it must NOT count). Template interpolations `${…}` are blanked with the rest of the
 * template — a trigger living solely inside `${…}` is a rare, accepted miss.
 */
function stripCommentsAndStrings(s: string): string {
  let out = "";
  const n = s.length;
  for (let i = 0; i < n;) {
    const c = s[i];
    const d = i + 1 < n ? s[i + 1] : "";
    if (c === "/" && d === "/") {
      while (i < n && s[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < n && s[i] !== c) {
        if (s[i] === "\\") i++; // skip the escaped char
        i++;
      }
      i++; // consume the closing quote
      out += " ";
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Parses a named clause `{ foo, bar as baz }` and returns a map of
 * **local/alias name → original name** (without any prefix applied).
 * Used when resolving re-exports against a child's exportRenames.
 */
function parseClauseNames(clause: string): Map<string, string> {
  const inner = clause.replace(/^\{|\}$/g, "").trim();
  const map = new Map<string, string>();
  if (!inner) return map;
  for (const part of inner.split(",")) {
    const spec = part.trim();
    if (!spec) continue;
    const asMatch = spec.match(/^(\w+)\s+as\s+(\w+)$/);
    if (asMatch) {
      map.set(asMatch[2], asMatch[1]); // alias → original
    } else {
      map.set(spec, spec); // name → name
    }
  }
  return map;
}

/**
 * Applies a rename map to a source string.
 *
 * Keys may contain dots (e.g. `ns.foo`) for namespace-import rewrites.
 * All regex metacharacters in keys are escaped.  Renames are applied
 * longest-key-first to avoid partial substitution when one renamed symbol is
 * a prefix of another (e.g. "add" vs "addExt").
 *
 * Boundaries: `(?<!\w)key(?!\w)` — no word character immediately before or after.
 * This is equivalent to `\b` for pure-identifier keys and correctly handles
 * dotted keys like `math.add` (the `.` is a non-word character).
 *
 * @param src     - Source text to rewrite.
 * @param renames - Map of oldName → newName.
 */
function applyRenames(src: string, renames: Map<string, string>): string {
  if (renames.size === 0) return src;
  // ONE pass: an alternation of every key, longest first (so "add" never splits "addExt"), regex
  // metacharacters escaped (the `.` in namespace keys). `(?<![\w.])` keeps a plain identifier
  // rename (e.g. "log" → "LoggerProvider_log") off the same name used as a method (console.log).
  const keys = [...renames.keys()].sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\w.])(?:${keys.join("|")})(?!\\w)`, "g");
  // Only CODE is renamed: a name inside a string literal, template text or a comment is data
  // (`console.log("add")` printed the module-prefixed name; a wasMath label "i32.add" printed
  // `__wm_i32_add`, 2026-10-09). Code inside a template's `${…}` is code.
  const code = codeMask(src);
  return src.replace(
    re,
    (match, offset: number) => (code[offset] ? renames.get(match) ?? match : match),
  );
}

/** 1 for each character of `s` that is CODE: not inside a comment, a string literal or a template
 *  literal's text (the code inside `${…}` IS code, nested templates included). */
function codeMask(s: string): Uint8Array {
  const mask = new Uint8Array(s.length);
  const modes: ("code" | "tmpl")[] = ["code"];
  const depths: number[] = [0]; // `{` depth inside each code frame (a `}` at 0 closes a `${`)
  let i = 0;
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (modes[modes.length - 1] === "tmpl") {
      if (c === "\\") i += 2;
      else if (c === "`") {
        modes.pop();
        depths.pop();
        i++;
      } else if (c === "$" && d === "{") {
        modes.push("code");
        depths.push(0);
        i += 2;
      } else i++;
      continue;
    }
    if (c === "/" && d === "/") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      const end = s.indexOf("*/", i + 2);
      i = end < 0 ? s.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i++;
      while (i < s.length && s[i] !== c && s[i] !== "\n") i += s[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === "`") {
      modes.push("tmpl");
      depths.push(0);
      i++;
      continue;
    }
    if (c === "{") depths[depths.length - 1]++;
    else if (c === "}") {
      if (depths[depths.length - 1] === 0 && modes.length > 1) {
        modes.pop(); // the `}` closing a template's `${`
        depths.pop();
        i++;
        continue;
      }
      depths[depths.length - 1]--;
    }
    mask[i] = 1;
    i++;
  }
  return mask;
}

// ---------------------------------------------------------------------------
// Load result — carries renamed source + export rename map back to caller
// ---------------------------------------------------------------------------

interface LoadResult {
  /** Merged source with all imports inlined and names rewritten. */
  source: string;
  /**
   * Maps each **original** export name to the canonical prefixed name for this
   * module.  Used by callers to resolve named, default, and re-export bindings.
   *
   * e.g. for mathlib.ts:
   *   { "add" → "mathlib_add", "default" → "mathlib_compute", ... }
   */
  exportRenames: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads a TypeScript entry file, resolves all relative imports recursively,
 * and returns the merged source plus any .wasm imports that need WAT-level merging.
 *
 * Behaviour:
 * - .ts imports are inlined: files are prepended before the content that imports them.
 * - .wasm imports are detected and recorded in wasmImports; their call sites in the
 *   merged source are rewritten to the canonical prefixed names (e.g. math_add).
 * - All `import` declarations are stripped from the merged output.
 * - Exported symbols in non-entry files are renamed to `<module>_<name>` in
 *   both their definitions and all internal call sites.
 * - Import aliases are resolved to the canonical prefixed name at every call site.
 * - Namespace imports (`import * as ns`) rewrite `ns.foo` to `module_foo`.
 * - Default imports (`import foo from "./lib"`) rewrite `foo` to the default export.
 * - Re-exports bubble child canonical names into this module's export map.
 * - Missing .ts files are silently skipped; missing .wasm files are recorded
 *   with a warning but do not abort bundling.
 * - If the entry file itself cannot be read, the error propagates to the caller.
 *
 * @param entryPath - Absolute or cwd-relative path to the entry .ts file.
 */
export async function bundleImportsEx(entryPath: string): Promise<BundleResult> {
  const visited = new Set<string>();
  // Collected .wasm imports in discovery order (deduped by resolved path).
  const wasmImports: WasmImportEntry[] = [];
  // Cache exportRenames per realPath so re-export chains can resolve names
  // from already-visited (source-deduplicated) files.
  const exportRenamesCache = new Map<string, Map<string, string>>();
  // Which file declares each top-level VALUE name left unprefixed (a file's private names, and the
  // entry's): two files declaring the same one are refused (sw112, below).
  const topLevelOwner = new Map<string, string>();
  // The prefix each loaded file got. Two files with one basename (`a/util.ts`, `b/util.ts`) both
  // took `util`, so their `add`s were one `util_add`: refused as a duplicate (ld85, 2026-10-22).
  // The second gets `util_2`, the third `util_3`.
  const prefixTaken = new Set<string>();
  const uniquePrefix = (realPath: string): string => {
    const base = modulePrefix(realPath);
    let p = base;
    for (let n = 2; prefixTaken.has(p); n++) p = `${base}_${n}`;
    prefixTaken.add(p);
    return p;
  };

  async function load(filePath: string, isEntry: boolean): Promise<LoadResult> {
    // ── 1. Resolve canonical path ─────────────────────────────────────────
    let realPath: string;
    try {
      realPath = await rt.realPath(filePath);
    } catch (err) {
      if (isEntry) throw err;
      return { source: "", exportRenames: new Map() };
    }

    // Already visited: return empty source but supply cached exportRenames so
    // re-export chains still work.
    if (visited.has(realPath)) {
      return { source: "", exportRenames: exportRenamesCache.get(realPath) ?? new Map() };
    }
    visited.add(realPath);

    let src: string;
    try {
      src = await rt.readTextFile(realPath);
    } catch (err) {
      if (isEntry) throw err;
      return { source: "", exportRenames: new Map() };
    }

    // ── #14.3.1 auto-merge: pull the own dynamic runtime when the entry uses `any` or `eval` ──
    // The `any` type lowers to a boxed dynrt handle and `eval(...)` is the dynrt evaluator, so a
    // program using either needs `wasmtk:dynrt` merged. Rather than a new merge path, inject a
    // synthetic `import { …ops… } from "wasmtk:dynrt"` so the existing virtual-capability handler
    // below merges it (and Binaryen DCE strips the dynrt functions the program doesn't call).
    // Only the ENTRY is scanned; programs without `any`/`eval` are byte-for-byte unaffected.
    if (isEntry && !/from\s+["']wasmtk:dynrt["']/.test(src)) {
      // Sniff for triggers over CODE ONLY (comments + string literals blanked) — otherwise a
      // `Function(` / `eval(` / `: any` mentioned in a comment (e.g. dynrt's own doc-comments) would
      // falsely auto-merge the runtime, which for the dynrt library itself is circular; and a `//`
      // inside a string could hide a real trigger later on the same line (false-negative).
      const code = stripCommentsAndStrings(src);
      const usesAny = /:\s*any\b/.test(code) || /\bany\[\]/.test(code) || /<\s*any\s*>/.test(code);
      const usesEval = /\beval\s*\(/.test(code);
      const usesFunction = /\bFunction\s*\(/.test(code); // the `Function(params, body)` producer
      if (usesAny || usesEval || usesFunction) {
        const ops = [
          "dynNumber",
          "dynBool",
          "dynString",
          "dynNumberValue",
          "dynBoolValue",
          "dynToBool",
          "dynToNumber",
          "dynStrBytes",
          "dynStrLen",
          "dynStrCharAt",
          "dynTypeof",
          "dynTag",
          "dynAdd",
          "dynSub",
          "dynMul",
          "dynDiv",
          "dynMod",
          "dynNeg",
          "dynNot",
          "dynStrictEq",
          "dynLt",
          "dynGt",
          "dynLe",
          "dynGe",
          "dynApply",
          "dynMember",
          "dynIndexValue",
          "dynCall0",
          "dynCall1",
          "dynCall2",
          "dynCall3",
          "dynEval",
          "dynEvalEnv",
          "dynObject",
          "dynArray",
          "dynSet",
          "dynGet",
          "dynHas",
          "dynPush",
          "dynObjLen",
          "dynArrLen",
          "dynArrGet",
          "dynObjKeyPtr",
          "dynObjKeyLen",
          "dynObjValAt",
          "dynMakeFunc",
          "dynMakeFn",
          "dynStdEnv",
          "dynUndefined",
          "dynNull",
        ].join(", ");
        src = `import { ${ops} } from "wasmtk:dynrt";\n` + src;
      }
    }

    const fileDir = dirname(realPath);
    const prefix = uniquePrefix(realPath); // each file once: `visited` returns early above
    const importedChunks: string[] = [];

    // Collect all rewrites needed in this file's source after processing imports
    const localRewrites = new Map<string, string>();

    // exportRenames for this file (populated in steps 2 and 4)
    const exportRenames = new Map<string, string>();

    // ── 2a. Process re-export-from statements ─────────────────────────────
    //   export { foo, bar as baz } from "./lib.ts"
    const reExportNamedRe =
      /^[ \t]*export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*\r?\n?/gm;
    let rm: RegExpExecArray | null;
    while ((rm = reExportNamedRe.exec(src)) !== null) {
      const clause = rm[1];
      const specifier = rm[2];
      if (!specifier.startsWith(".")) continue;
      const resolved = join(
        fileDir,
        specifier.endsWith(".ts") ? specifier : specifier + ".ts",
      );
      const childResult = await load(resolved, false);
      // importedChunks: only add source if it hasn't already been added
      if (childResult.source) importedChunks.push(childResult.source);

      const childPrefix = modulePrefix(resolved);
      // Map alias/name → originalName from the clause
      const clauseMap = parseClauseNames(clause);
      for (const [exported, original] of clauseMap) {
        const canonical = childResult.exportRenames.get(original) ?? `${childPrefix}_${original}`;
        exportRenames.set(exported, canonical);
      }
    }

    //   export * from "./lib.ts"
    const reExportStarRe = /^[ \t]*export\s+\*\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*\r?\n?/gm;
    let rs: RegExpExecArray | null;
    while ((rs = reExportStarRe.exec(src)) !== null) {
      const specifier = rs[1];
      if (!specifier.startsWith(".")) continue;
      const resolved = join(
        fileDir,
        specifier.endsWith(".ts") ? specifier : specifier + ".ts",
      );
      const childResult = await load(resolved, false);
      if (childResult.source) importedChunks.push(childResult.source);
      // Bubble all of child's exports into this module's export map
      for (const [orig, canonical] of childResult.exportRenames) {
        exportRenames.set(orig, canonical);
      }
    }

    // ── 2b. Process import statements ─────────────────────────────────────
    // Captures everything between `import [type]` and `from "specifier"`.
    // Handles: named `{ foo }`, namespace `* as ns`, default `name`,
    //          combined `name, { foo }`, type-only.
    // Group 1: binding text (may be absent for side-effect imports)
    // Group 2: module specifier
    const importRe =
      /^[ \t]*import\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?[ \t]*\r?\n?/gm;

    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src)) !== null) {
      const binding = m[1].trim(); // e.g. "{ foo }", "* as math", "foo", "foo, { bar }"
      const specifier = m[2];

      // ── Virtual capability imports: `import { setNew } from "wasmtk:set"` (Brief #4) ──
      // Resolved to an embedded modc library; merged only because it's imported here
      // (feature-level tree-shake). No fixture .wasm on disk required.
      if (specifier.startsWith("wasmtk:")) {
        const capId = specifier.slice("wasmtk:".length);
        const cap = CAPABILITIES[capId];
        if (!cap) {
          throw new Error(
            `Unknown capability import "wasmtk:${capId}". Available: ${
              Object.keys(CAPABILITIES).map((k) => "wasmtk:" + k).join(", ")
            }`,
          );
        }
        const renames = new Map<string, string>();
        const namedMatch = binding.match(/\{([^}]*)\}/);
        if (namedMatch) {
          for (const [local, original] of parseClauseNames(namedMatch[1])) {
            const canonical = `${cap.prefix}_${original}`;
            renames.set(original, canonical);
            localRewrites.set(local, canonical);
          }
        }
        const virtualId = `wasmtk:${capId}`;
        if (!wasmImports.some((w) => w.filePath === virtualId)) {
          wasmImports.push({
            filePath: virtualId,
            prefix: cap.prefix,
            renames,
            bytes: cap.bytes,
            witText: cap.wit,
          });
        }
        continue;
      }

      // ── wasMath (`@jrmarcum/wasmtk/wasMath`, or a path to src/wasmath.ts): NOT inlined. Each
      // imported namespace's `ns.member` is rewritten to its lowering (wasmath_lower.ts): a wasm
      // helper `__wm_<ns>_<member>`, `Math.<x>` for the f64 Math members, or an f32 TypeScript
      // helper appended below. Only named imports of the namespaces are recognised.
      if (isWasMathSpecifier(specifier)) {
        const namedMatch = binding.match(/\{([^}]*)\}/);
        if (namedMatch) {
          for (const [local, original] of parseClauseNames(namedMatch[1])) {
            if (!WM_NAMESPACES.includes(original)) continue;
            for (const [from, to] of wasMathRewrites(local, original)) localRewrites.set(from, to);
          }
        }
        continue;
      }

      if (!specifier.startsWith(".")) continue; // skip non-relative specifiers

      // ── .wasm imports — record for WAT-level merge, don't inline as TS ───
      if (specifier.endsWith(".wasm")) {
        const resolvedWasm = join(fileDir, specifier);
        const wasmPrefix = modulePrefix(resolvedWasm);
        const renames = new Map<string, string>();

        // Parse named imports: `import { add, multiply as mul } from "./math.wasm"`
        const namedMatch = binding.match(/\{([^}]*)\}/);
        if (namedMatch) {
          for (const [local, original] of parseClauseNames(namedMatch[1])) {
            const canonical = `${wasmPrefix}_${original}`;
            renames.set(original, canonical);
            localRewrites.set(local, canonical);
          }
        }

        if (!wasmImports.some((w) => w.filePath === resolvedWasm)) {
          wasmImports.push({ filePath: resolvedWasm, prefix: wasmPrefix, renames });
        }
        continue; // do not attempt to load .wasm as TypeScript
      }

      const resolved = join(
        fileDir,
        specifier.endsWith(".ts") ? specifier : specifier + ".ts",
      );

      const childResult = await load(resolved, false);
      if (childResult.source) importedChunks.push(childResult.source);

      const childPrefix = modulePrefix(resolved);

      // ── Namespace import: `* as ns` ─────────────────────────────────────
      const nsMatch = binding.match(/^\*\s+as\s+(\w+)$/);
      if (nsMatch) {
        const ns = nsMatch[1];
        // For every exported name from child, register `ns.name → canonical`
        for (const [orig, canonical] of childResult.exportRenames) {
          if (orig !== "default") {
            localRewrites.set(`${ns}.${orig}`, canonical);
          }
        }
        continue;
      }

      // ── Default import: plain identifier (no braces, no `*`) ─────────────
      // May be combined with named: `foo, { bar }`
      let remaining = binding;
      const defaultMatch = remaining.match(/^(\w+)\s*(?:,|$)/);
      if (defaultMatch && !remaining.startsWith("{") && !remaining.startsWith("*")) {
        const localDefault = defaultMatch[1];
        const canonical = childResult.exportRenames.get("default") ?? `${childPrefix}_default`;
        localRewrites.set(localDefault, canonical);
        // Strip the default part; remaining may still have `{ named }`
        remaining = remaining.slice(defaultMatch[0].length).trim();
      }

      // ── Named imports: `{ foo, bar as b }` ──────────────────────────────
      const namedMatch = remaining.match(/\{([^}]*)\}/);
      if (namedMatch) {
        const clauseMap = parseClauseNames(namedMatch[1]);
        for (const [local, original] of clauseMap) {
          const canonical = childResult.exportRenames.get(original) ?? `${childPrefix}_${original}`;
          localRewrites.set(local, canonical);
        }
      }
    }

    // ── 2c. Detect wasmImport("./path.wasm") loader calls ─────────────────
    // Pattern: const { fn, original: alias } = await wasmImport("./module.wasm")
    // Note: destructuring uses JS colon syntax { original: alias }, unlike TS imports
    // which use { original as alias }.  Parse both here.
    const wasmImportCallRe =
      /^[ \t]*(?:const|let)\s+\{([^}]*)\}\s*=\s*await\s+wasmImport\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?[ \t]*\r?\n?/gm;
    let wi: RegExpExecArray | null;
    while ((wi = wasmImportCallRe.exec(src)) !== null) {
      const clause = wi[1];
      const spec = wi[2];
      if (!spec.endsWith(".wasm") || !spec.startsWith(".")) continue;
      const resolvedWasm = join(fileDir, spec);
      const wasmPrefix = modulePrefix(resolvedWasm);
      const renames = new Map<string, string>();
      // Parse destructuring clause — supports both plain `name` and `original: alias`
      for (const part of clause.split(",")) {
        const spec2 = part.trim();
        if (!spec2) continue;
        const colonIdx = spec2.indexOf(":");
        if (colonIdx !== -1) {
          const original = spec2.slice(0, colonIdx).trim();
          const alias = spec2.slice(colonIdx + 1).trim();
          const canonical = `${wasmPrefix}_${original}`;
          renames.set(original, canonical);
          localRewrites.set(alias, canonical);
        } else {
          const canonical = `${wasmPrefix}_${spec2}`;
          renames.set(spec2, canonical);
          localRewrites.set(spec2, canonical);
        }
      }
      if (!wasmImports.some((w) => w.filePath === resolvedWasm)) {
        wasmImports.push({ filePath: resolvedWasm, prefix: wasmPrefix, renames });
      }
    }

    // ── 3. Strip all import and re-export-from declarations ──────────────
    // Named imports and side-effect imports
    src = src.replace(
      /^[ \t]*import\s+(?:type\s+)?(?:.+?\s+from\s+)?['"][^'"]+['"]\s*;?[ \t]*\r?\n?/gm,
      "",
    );
    // Strip wasmImport() loader calls (replaced by direct WAT-level merge)
    src = src.replace(wasmImportCallRe, "");
    // Re-export-from: `export { … } from "…"` and `export * from "…"`
    src = src.replace(
      /^[ \t]*export\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*;?[ \t]*\r?\n?/gm,
      "",
    );
    src = src.replace(
      /^[ \t]*export\s+\*\s+from\s+['"][^'"]+['"]\s*;?[ \t]*\r?\n?/gm,
      "",
    );

    // ── 4. Non-entry: rename exported definitions to module-prefixed names ─
    if (!isEntry) {
      // Default exports: `export default function foo()`
      src = src.replace(
        /^export\s+default\s+((?:async\s+)?function)\s+(\w+)/gm,
        (_match, keyword, name) => {
          const prefixed = `${prefix}_${name}`;
          exportRenames.set(name, prefixed);
          exportRenames.set("default", prefixed);
          return `${keyword} ${prefixed}`;
        },
      );

      // Named exports: `export [async] function|const|let|var|type|interface|enum|class Name`
      // (`class` and `abstract class` were left out: the importer called `shapes_Box`, which was
      // never declared; ld84, 2026-10-22)
      src = src.replace(
        /^export\s+((?:async\s+)?function|const|let|var|type|interface|enum|(?:abstract\s+)?class)\s+(\w+)/gm,
        (_match, keyword: string, name) => {
          // A class keeps a capitalised name (`Shapes_Box`): wasic reads `new X(…)` and a class
          // type by its leading capital, and `new shapes_Box(4)` was "Unsupported expression".
          const prefixed = `${/class$/.test(keyword) ? classPrefix(prefix) : prefix}_${name}`;
          exportRenames.set(name, prefixed);
          return `${keyword} ${prefixed}`;
        },
      );

      // An export LIST of this file's own names, `export { triple, LIMIT as MAX };` (no `from`):
      // the statement goes, each declaration is renamed as an inline export is, and an importer
      // asks for the exported (aliased) name. It was ignored (ld84).
      const internalRenames = new Map(exportRenames);
      src = src.replace(
        /^export\s*\{([^}]*)\}\s*;?[ \t]*$/gm,
        (_match, list: string) => {
          for (const item of list.split(",").map((s) => s.trim()).filter(Boolean)) {
            const m = item.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
            if (!m) continue;
            const isClass = new RegExp(`^(?:abstract\\s+)?class\\s+${m[1]}\\b`, "m").test(src);
            const prefixed = `${isClass ? classPrefix(prefix) : prefix}_${m[1]}`;
            internalRenames.set(m[1]!, prefixed);
            exportRenames.set(m[2] ?? m[1]!, prefixed);
          }
          return "";
        },
      );

      // Apply those same renames to the rest of this file (internal call sites,
      // recursive calls, field accesses on struct types, etc.)
      src = applyRenames(src, internalRenames);
    }

    // ── 5. Rewrite imported-symbol references in this file ────────────────
    // (applies to both entry and non-entry files — a lib can import from another lib)
    if (localRewrites.size > 0) {
      src = applyRenames(src, localRewrites);
    }

    // ── 6. Two files of one program declaring the same top-level VALUE name (a non-entry file's
    // private names are not prefixed) were silently one name in the bundle: a dependency's
    // private `scale = 3` read the entry's `scale = 100`, so `helper(2)` gave 200 for 6 (sw112,
    // 2026-10-19). Prefixing them safely needs a parser (object keys and interface fields share
    // the spelling), so the collision is refused. `type` / `interface` repeats are left alone:
    // most files declare `type i32 = number`.
    const srcCode = codeMask(src);
    for (
      const d of src.matchAll(
        /^(?:(?:async\s+)?function\*?|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/gm,
      )
    ) {
      if (!srcCode[d.index!]) continue;
      const owner = topLevelOwner.get(d[1]!);
      if (owner !== undefined && owner !== realPath) {
        throw new Error(
          `the top-level name '${d[1]}' is declared in both ${owner} and ${realPath}; a bundle ` +
            `has one top level, so one of them would silently replace the other. Rename one ` +
            `(or export it and import it where it is used).`,
        );
      }
      topLevelOwner.set(d[1]!, realPath);
    }

    // Cache export map so re-export chains can resolve names from this module
    // even after it has been deduplicated (source not emitted twice).
    exportRenamesCache.set(realPath, exportRenames);

    return { source: [...importedChunks, src].join(""), exportRenames };
  }

  const result = await load(entryPath, true);
  // wasMath's f32 `Math`-style members are small TypeScript helpers (exactly their wasMath
  // bodies); append the ones the program calls, once.
  const f32Used = new Set(
    [...result.source.matchAll(/\b__wm_f32_(\w+)\b/g)].map((m) => m[1]).filter((m) =>
      m in WM_F32_TS
    ),
  );
  const helpers = [...f32Used].map((m) => WM_F32_TS[m]).join("\n");
  return {
    source: helpers ? `${result.source}\n${helpers}\n` : result.source,
    wasmImports,
    files: [...visited],
  };
}

/**
 * Backward-compatible wrapper around bundleImportsEx.
 * Returns only the merged TypeScript source string; .wasm imports are silently
 * collected but not returned.  Use bundleImportsEx when you need the wasm list.
 *
 * @param entryPath - Absolute or cwd-relative path to the entry .ts file.
 * @returns Merged source string with all .ts imports inlined and names mangled.
 */
export async function bundleImports(entryPath: string): Promise<string> {
  const { source } = await bundleImportsEx(entryPath);
  return source;
}
