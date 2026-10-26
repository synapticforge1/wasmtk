/**
 * @module wasmbundle
 * @description Phase 19 — Bundle multiple .wasm files into a single .wasm library.
 *
 * Merges N standalone .wasm modules (WASI executables or pure libraries) into one
 * combined .wasm that exports all their functions under a unified namespace.
 *
 * ## On binaryang's `wasm-bundle` (2026-10-26, workspace letter H11)
 *
 * The owner decided (2026-10-06) that bundling moves to binaryang as `wasm-bundle`, which we import
 * back. Its `bundle()` lays each input's whole memory image at its own base in ONE memory, renumbers
 * every index space on the IR, shares each import once, and relocates addresses from the producer's
 * `linking` / `reloc.*` sections, or, for a module without them, by its data's address range with
 * a printed warning (`unmarked: 'guess'`; wasic marks no addresses yet, so every wasic input is
 * guessed, as the regex bundler this replaced always did, silently).
 *
 * What stays ours is wasic's runtime contract, done as a pass over binaryang's IR around `bundle()`:
 * every wasic module exports its heap pointer (`__heap_ptr`), its exception tag (`__exn_tag`) and
 * the kind of the exception in flight (`__exn_kind`). Bundled as they are, each module would keep
 * its own heap, which grows upward and calls `memory.grow` only past `memory.size`, so in the
 * per-image layout the first module's heap would run into the next module's image; and its own
 * tag, so a program's `catch` would not see a library's `throw` (ld114). Before `bundle()`, each
 * one becomes an IMPORT of a small module of ours, `wasmtk_rt`, which defines them once; after it,
 * the shared heap is seated above the last image. Every wasic module then allocates from one heap
 * at the end of memory, and throws and catches one tag.
 *
 * The IR is binaryang's, read with `readBinary` from `compat/binaryen` (`module._inner` is the IR,
 * documented there) and written with `new Module(ir).emitBinary()`. So this command needs the
 * binaryang backend, which deno.json pins.
 *
 * ## Conflict resolution (Phase 20)
 *
 * When two or more input modules export the same name, wasmbundle detects the conflict and
 * resolves it, per conflict:
 *
 *  - Interactive (default): four-option prompt per conflict:
 *      [1] Prefix with module name  →  mathlib_add, utils_add
 *      [2] Prefix with alias        →  m_add, u_add  (requires --alias)
 *      [3] Exclude both
 *      [4] Stop compile             →  rename in source and recompile
 *  - --on-conflict=prefix : auto-prefix all conflicts with module filename.
 *  - --on-conflict=alias  : auto-prefix all conflicts with --alias values.
 *  - --on-conflict=exclude: auto-exclude all conflicting exports.
 *  - --alias a.wasm=m,b.wasm=n : supply alias prefixes for interactive or alias mode.
 *
 * Non-conflicting exports always keep their bare name in the output. The resolution is applied to
 * the inputs' exports before `bundle()`, which then sees no conflict.
 *
 * ## Pipeline
 *
 *  1. Read each .wasm into binaryang's IR.
 *  2. wasic's runtime trio → imports of `wasmtk_rt`; export names collected.
 *  3. Resolve conflicts (interactive or via --on-conflict flag) on the inputs' exports.
 *  4. `bundle()` the inputs and `wasmtk_rt`; print its report and warnings.
 *  5. Seat the shared heap above the last image, with room to allocate.
 *  6. Write the IR, optimize with Binaryen (-Oz), write the output (default: combined.wasm) and its
 *     .wit.
 */

import { basename } from "@std/path";
import { bundle, type BundleInput, moduleNameOf } from "binaryang-bundle";
import wabtInit from "wabt";
import binaryen from "./binaryen.ts";
import { samePath } from "./outpath.ts";
import { rt } from "./rt.ts";
import { emitWitBeside } from "./witgen.ts";

// ---------------------------------------------------------------------------
// The IR's shapes, as bundle() takes them
// ---------------------------------------------------------------------------

type IrModule = BundleInput["module"];
type IrExport = IrModule["exports"][number];
type IrGlobal = IrModule["globals"][number];
type IrTag = IrModule["tags"][number];

/** binaryang's `ExternalKind` values (the binary format's export kinds). */
const KIND = { Func: 0, Table: 1, Memory: 2, Global: 3, Tag: 4 } as const;

/** The module that defines wasic's shared runtime state in a bundle; each wasic input imports it. */
const RT_MODULE = "wasmtk_rt";

/** wasic's runtime exports, by name and kind. */
const RT_EXPORTS: ReadonlyMap<string, number> = new Map([
  ["__heap_ptr", KIND.Global],
  ["__exn_tag", KIND.Tag],
  ["__exn_kind", KIND.Global],
]);

const RT_WAT: Record<string, string> = {
  __heap_ptr: `(global $__heap_ptr (export "__heap_ptr") (mut i32) (i32.const 0))`,
  __exn_tag: `(tag $__exn_tag (export "__exn_tag") (param i32 i32))`,
  __exn_kind: `(global $__exn_kind (export "__exn_kind") (mut i32) (i32.const 0))`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a clean prefix from a .wasm file path (no extension, alphanumeric/underscore). */
function modulePrefix(filePath: string): string {
  return basename(filePath).replace(/\.wasm$/, "").replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Prompt the user interactively for a single conflict resolution.
 * Returns "prefix" | "alias" | "exclude" | "stop".
 * Option [2] (alias) is shown with examples when all conflicting files have an
 * alias in the provided map; otherwise it is shown with a usage hint.
 */
async function promptConflict(
  name: string,
  files: string[],
  aliases: Map<string, string>,
): Promise<"prefix" | "alias" | "exclude" | "stop"> {
  const fileNames = files.map((f) => basename(f));
  const prefixExamples = files.map((f) => `${modulePrefix(f)}_${name}`).join(", ");

  const fileAliases = files.map((f) => aliases.get(basename(f)) ?? aliases.get(f));
  const allHaveAliases = fileAliases.every((a) => a !== undefined);
  const aliasLine = allHaveAliases
    ? `  [2]  Prefix with alias         →  ${fileAliases.map((a) => `${a}_${name}`).join(", ")}\n`
    : `  [2]  Prefix with alias         →  (use --alias ${
      fileNames.map((f) => `${f}=<name>`).join(",")
    })\n`;

  const encoder = new TextEncoder();
  await rt.stdout.write(
    encoder.encode(
      `\nConflict: "${name}" exported by: ${fileNames.join(", ")}\n` +
        `  [1]  Prefix with module name  →  ${prefixExamples}\n` +
        aliasLine +
        `  [3]  Exclude both\n` +
        `  [4]  Stop compile             →  rename the function in source and recompile\n` +
        `  Choice (1/2/3/4): `,
    ),
  );
  const buf = new Uint8Array(16);
  const n = await rt.stdin.read(buf);
  const choice = n ? new TextDecoder().decode(buf.subarray(0, n)).trim() : "4";

  if (choice === "1") return "prefix";
  if (choice === "2") return allHaveAliases ? "alias" : "prefix";
  if (choice === "3") return "exclude";
  return "stop";
}

/** Print an error and exit 1. */
function fail(message: string): never {
  console.error(`❌ wasmbundle: ${message}`);
  rt.exit(1);
  throw new Error(message); // unreachable: rt.exit does not return
}

/** The entity an export names, by name (binaryang's reader names every reference). */
function exportTarget(m: IrModule, e: IrExport): string {
  if (e.var.kind === "name") return e.var.name;
  // An index: imports of the kind first, then definitions.
  const imported = m.imports.filter((i) => i.kind === e.kind);
  const i = e.var.value;
  if (i < imported.length) {
    const imp = imported[i] as unknown as Record<string, { name: string }>;
    return (imp.global ?? imp.tag ?? imp.func ?? imp.table ?? imp.memory).name;
  }
  const defs: { name: string }[] = e.kind === KIND.Global
    ? m.globals
    : e.kind === KIND.Tag
    ? m.tags
    : e.kind === KIND.Func
    ? m.functions
    : e.kind === KIND.Table
    ? m.tables
    : m.memories;
  return defs[i - imported.length]?.name ?? "";
}

/**
 * wasic's runtime state becomes imports of `wasmtk_rt`: each of `__heap_ptr` / `__exn_tag` /
 * `__exn_kind` this module DEFINES and exports loses its export and its definition, and is
 * imported under the same internal name, so every reference to it stays as it is. Returns the
 * names it moved, and the tag, whose signature the shared one must match.
 */
function importRuntimeState(m: IrModule, what: string): { moved: string[]; tag?: IrTag } {
  const moved: string[] = [];
  let tag: IrTag | undefined;
  for (const [name, kind] of RT_EXPORTS) {
    const e = m.exports.find((x) => x.name === name && x.kind === kind);
    if (e === undefined) continue;
    const target = exportTarget(m, e);
    if (kind === KIND.Global) {
      const at = m.globals.findIndex((g) => g.name === target);
      if (at < 0) continue; // already an import (a bundle bundled again): it stays one
      const g: IrGlobal = m.globals[at]!;
      if (!g.mutable) fail(`${what}: its ${name} is not a mutable global, as wasic's is`);
      m.globals.splice(at, 1);
      m.imports.push(
        {
          kind: KIND.Global,
          module: RT_MODULE,
          field: name,
          global: { name: g.name, type: g.type, mutable: true },
        } as IrModule["imports"][number],
      );
    } else {
      const at = m.tags.findIndex((t) => t.name === target);
      if (at < 0) continue;
      tag = m.tags[at]!;
      m.tags.splice(at, 1);
      m.imports.push(
        { kind: KIND.Tag, module: RT_MODULE, field: name, tag } as IrModule["imports"][number],
      );
    }
    m.exports.splice(m.exports.indexOf(e), 1);
    moved.push(name);
  }
  return { moved, tag };
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ModuleEntry {
  filePath: string;
  prefix: string;
  module: IrModule;
  /** The exports a conflict is judged on: every kind but memory (one memory serves all). */
  exports: string[];
  /** Its own memory's initial pages, when it carries wasic's runtime (the heap's headroom). */
  wasicPages: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Bundle multiple .wasm files into a single combined .wasm library.
 *
 * @param inputs      Absolute or relative paths to the input .wasm files.
 * @param outputPath  Path for the output .wasm (default: combined.wasm).
 * @param onConflict  Auto-resolve mode: "prefix" | "alias" | "exclude"; omit to prompt.
 * @param aliases     Map of basename (or full path) → alias prefix for conflict resolution.
 */
export async function runWasmBundle(
  inputs: string[],
  outputPath: string,
  onConflict?: "prefix" | "alias" | "exclude",
  aliases: Map<string, string> = new Map(),
): Promise<void> {
  if (inputs.length === 0) {
    console.error("❌ No input files specified.");
    rt.exit(1);
  }
  // `-o` naming an input would overwrite it (sw181, 2026-10-26; sw113's rule for every command)
  const clash = inputs.find((f) => samePath(f, outputPath));
  if (clash !== undefined) {
    fail(`the output '${outputPath}' is the input '${clash}'; it would be overwritten`);
  }

  // ── Read each module into binaryang's IR; wasic's runtime → imports ──────
  console.log(`\nLoading ${inputs.length} module(s)...`);
  const modules: ModuleEntry[] = [];
  let sharedTag: IrTag | undefined;
  const needed = new Set<string>();
  for (const filePath of inputs) {
    let module: IrModule;
    try {
      module = binaryen.readBinary(await rt.readFile(filePath))._inner as IrModule;
    } catch (e) {
      fail(`cannot read ${basename(filePath)}: ${e instanceof Error ? e.message : e}`);
    }
    const ownPages = Number(module.memories[0]?.limits.initial ?? 0n);
    const { moved, tag } = importRuntimeState(module, basename(filePath));
    for (const n of moved) needed.add(n);
    if (tag !== undefined) {
      if (sharedTag !== undefined && JSON.stringify(tag.sig) !== JSON.stringify(sharedTag.sig)) {
        fail(`${basename(filePath)}: its __exn_tag has a different signature than another input's`);
      }
      sharedTag = tag;
    }
    const exports = module.exports.filter((e) => e.kind !== KIND.Memory).map((e) => e.name);
    modules.push({
      filePath,
      prefix: modulePrefix(filePath),
      module,
      exports,
      wasicPages: moved.includes("__heap_ptr") ? ownPages : 0,
    });
    const expList = exports.length ? exports.join(", ") : "(none)";
    console.log(`  ✓ ${basename(filePath)}: ${exports.length} export(s): ${expList}`);
  }

  // ── Detect export name conflicts ──────────────────────────────────────────
  const nameToFiles = new Map<string, string[]>();
  for (const mod of modules) {
    for (const exp of mod.exports) {
      const list = nameToFiles.get(exp) ?? [];
      list.push(mod.filePath);
      nameToFiles.set(exp, list);
    }
  }

  const conflictNames = new Map<string, string[]>();
  for (const [name, files] of nameToFiles) {
    if (files.length > 1) conflictNames.set(name, files);
  }

  if (conflictNames.size > 0) {
    console.log(`\n⚠️  ${conflictNames.size} export conflict(s) detected:`);
  }

  // ── Resolve conflicts, on the inputs' exports ────────────────────────────
  for (const [name, files] of conflictNames) {
    let resolution: "prefix" | "alias" | "exclude" | "stop";

    if (onConflict === "prefix" || onConflict === "exclude") {
      resolution = onConflict;
      const fileNames = files.map((f) => basename(f)).join(", ");
      console.log(`  "${name}" (${fileNames}): → ${resolution}`);
    } else if (onConflict === "alias") {
      const missing = files.filter((f) => !(aliases.get(basename(f)) ?? aliases.get(f)));
      if (missing.length > 0) {
        console.error(
          `\n❌ --on-conflict=alias requires --alias for every conflicting module.\n` +
            `   Missing alias for: ${missing.map((f) => basename(f)).join(", ")}`,
        );
        rt.exit(1);
      }
      resolution = "alias";
      const fileNames = files.map((f) => basename(f)).join(", ");
      console.log(`  "${name}" (${fileNames}): → alias prefix`);
    } else {
      resolution = await promptConflict(name, files, aliases);
    }

    if (resolution === "stop") {
      console.error(
        `\n❌ Compile stopped. Rename "${name}" in your source and recompile.`,
      );
      rt.exit(1);
    }

    for (const mod of modules) {
      if (!files.includes(mod.filePath)) continue;
      const own = mod.module.exports.filter((e) => e.name === name && e.kind !== KIND.Memory);
      if (resolution === "exclude") {
        mod.module.exports = mod.module.exports.filter((e) => !own.includes(e));
        continue;
      }
      const prefix = resolution === "prefix"
        ? mod.prefix
        : aliases.get(basename(mod.filePath)) ?? aliases.get(mod.filePath) ?? mod.prefix;
      for (const e of own) e.name = `${prefix}_${name}`;
    }
  }

  // ── wasmtk_rt: the one heap pointer, tag and kind every wasic input imports ──
  const bundleInputs: BundleInput[] = [];
  const taken = new Set<string>([RT_MODULE]);
  for (const mod of modules) {
    let name = moduleNameOf(mod.filePath);
    for (let i = 2; taken.has(name); i++) name = `${moduleNameOf(mod.filePath)}_${i}`;
    taken.add(name);
    bundleInputs.push({ name, module: mod.module, source: mod.filePath });
  }
  if (needed.size > 0) {
    const wabt = await wabtInit();
    const wat = `(module\n  ${[...needed].map((n) => RT_WAT[n]).join("\n  ")})`;
    const rtMod = wabt.parseWat(`${RT_MODULE}.wat`, wat, { exceptions: true });
    const { buffer } = rtMod.toBinary({});
    rtMod.destroy();
    const module = binaryen.readBinary(new Uint8Array(buffer))._inner as IrModule;
    const ours = module.tags[0];
    if (
      sharedTag !== undefined && ours && JSON.stringify(ours.sig) !== JSON.stringify(sharedTag.sig)
    ) {
      fail("an input's __exn_tag is not wasic's (param i32 i32)");
    }
    bundleInputs.push({ name: RT_MODULE, module, source: `${RT_MODULE} (wasmtk)` });
  }

  // ── Bundle ───────────────────────────────────────────────────────────────
  console.log("\nBundling...");
  let result: ReturnType<typeof bundle>;
  try {
    result = bundle(bundleInputs, {
      onConflict: "refuse", // resolved above
      unmarked: "guess",
      log: (line) => console.log(line),
    });
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  const { module: out, report } = result;

  // ── The shared heap: above the last image, with the largest wasic image's pages to grow in
  // (a library's allocator does not grow memory; a program's does, past memory.size) ──
  if (needed.has("__heap_ptr")) {
    const heapExport = out.exports.find((e) => e.name === "__heap_ptr" && e.kind === KIND.Global);
    const heap = heapExport && out.globals.find((g) => g.name === exportTarget(out, heapExport));
    const first = heap?.init?.children[0] as { kind: string; value: { value: number } } | undefined;
    const memory = out.memories[0];
    if (!heap?.init || first?.kind !== "const" || !memory) {
      fail("cannot find the bundle's shared heap pointer");
    }
    const base = report.memory.pages * 65536;
    (heap.init.children as unknown[])[0] = { ...first, value: { ...first.value, value: base } };
    const pages = BigInt(report.memory.pages + Math.max(1, ...modules.map((m) => m.wasicPages)));
    memory.limits.initial = pages;
    if (memory.limits.max !== undefined && memory.limits.max < pages) memory.limits.max = pages;
    console.log(`  shared heap at ${base}; memory ${pages} page(s)`);
  }

  // A bundle always has a memory, exported as "memory": the runner and the host bindings read it
  // (the regex bundler always declared one; bundle() gives one only when an input has memory).
  if (out.memories.length === 0) {
    out.memories.push({ name: "$memory", limits: { initial: 1n, isShared: false, is64: false } });
    out.exports.push(
      { name: "memory", kind: KIND.Memory, var: { kind: "name", name: "$memory" } } as IrExport,
    );
  }

  let bytes: Uint8Array = new binaryen.Module(out).emitBinary();

  // ── Optimize with Binaryen ────────────────────────────────────────────────
  try {
    const bMod = binaryen.readBinary(bytes);
    bMod.setFeatures(binaryen.Features.All);
    bMod.optimize();
    bytes = bMod.emitBinary();
    bMod.dispose();
    console.log("  ✓ Optimized with Binaryen");
  } catch (e) {
    // Optional, but never silent (2026-09-28, found by the H11 inventory: a failed optimise used to
    // ship the unoptimised bundle without a word, the same hole as the Go/Zig producers').
    console.warn(
      `  ⚠️  Binaryen optimize failed, shipping the unoptimised bundle: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }

  // ── Write output ──────────────────────────────────────────────────────────
  await rt.writeFile(outputPath, bytes);
  const exportCount = report.exports.length;
  console.log(
    `\n✅ ${inputs.length} module(s) bundled → ${outputPath}` +
      ` (${exportCount} export(s), ${bytes.length} bytes)`,
  );
  // .wit auto-emission for the bundle (owner, 2026-09-28): from the optimised module.
  await emitWitBeside(outputPath, "wasmbundle");
}
