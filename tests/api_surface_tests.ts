/**
 * api_surface_tests.ts — the compatibility gate's own rules (H6), on SYNTHETIC surfaces (2026-10-23).
 *
 *   Rule 4  a removal must follow a release that deprecated it (`undeprecatedRemovals`): a symbol,
 *           a member, a whole entrypoint; a symbol-level deprecation covers its members; the CLI
 *           surface is exempt (no doc comments); a deprecation marker reads minor, its removal is no
 *           break, and a removed member's marker is not reported twice.
 *   markers `generateSurface` turns a `@deprecated` doc tag into `(deprecated)` keys.
 *   step    `releaseStep`: one SemVer step, the components to its right reset, nothing skipped.
 *
 * The CI side (`--verify-tag`) composes these with git; it was run end to end on a scratch clone
 * (cmem/workflow.md, the release flow). Usage: deno run -A tests/api_surface_tests.ts
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEPRECATED,
  diffSurfaces,
  generateSurface,
  releaseStep,
  type Surface,
  type SurfaceSymbol,
} from "../scripts/api-surface.ts";

let passed = 0, failed = 0;
function ok(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? `: ${detail}` : ""}`);
  }
}

const fn = (deprecated = false): SurfaceSymbol => ({
  kind: "function",
  members: { "(whole)": "sig", ...(deprecated ? { [DEPRECATED]: "deprecated" } : {}) },
});
const iface = (members: Record<string, string>): SurfaceSymbol => ({ kind: "interface", members });
const surf = (entrypoints: Surface["entrypoints"]): Surface => ({
  tool: "wasmtk api-surface 1",
  entrypoints,
});

console.log("── Rule 4: deprecate before remove ──");
{
  const f = await diffSurfaces(surf({ ".": { a: fn(), b: fn() } }), surf({ ".": { b: fn() } }));
  ok("a symbol removed WITHOUT a deprecation is a Rule 4 removal", f.undeprecatedRemovals.join() === ". a");
  ok("…and the floor is still major", f.kind === "major");
}
{
  const f = await diffSurfaces(surf({ ".": { a: fn(true), b: fn() } }), surf({ ".": { b: fn() } }));
  ok("a symbol deprecated in the last release may be removed", f.undeprecatedRemovals.length === 0);
  ok("…which is still a major release", f.kind === "major");
}
{
  const before = iface({ "property:x": "n", "property:y": "n", [`${DEPRECATED}:property:y`]: "deprecated" });
  const f = await diffSurfaces(
    surf({ ".": { S: before } }),
    surf({ ".": { S: iface({ "property:x": "n" }) } }),
  );
  ok("a deprecated member may be removed", f.undeprecatedRemovals.length === 0, f.undeprecatedRemovals.join());
  ok(
    "…and its marker is not reported as an un-deprecation",
    !f.reasons.some((r) => r.what.includes("no longer deprecated")),
    f.reasons.map((r) => r.what).join(" | "),
  );
}
{
  const f = await diffSurfaces(
    surf({ ".": { S: iface({ "property:x": "n", "property:y": "n" }) } }),
    surf({ ".": { S: iface({ "property:x": "n" }) } }),
  );
  ok("an undeprecated member removed is a Rule 4 removal", f.undeprecatedRemovals.join() === ". S property:y");
}
{
  const f = await diffSurfaces(
    surf({ ".": { S: iface({ "property:x": "n", "property:y": "n", [DEPRECATED]: "deprecated" }) } }),
    surf({ ".": { S: iface({ "property:x": "n", [DEPRECATED]: "deprecated" }) } }),
  );
  ok("a deprecated SYMBOL covers the removal of its members", f.undeprecatedRemovals.length === 0);
}
{
  const f = await diffSurfaces(surf({ ".": { a: fn() }, "./old": { o: fn(true) } }), surf({ ".": { a: fn() } }));
  ok("an entrypoint whose every symbol was deprecated may be removed", f.undeprecatedRemovals.length === 0);
  const g = await diffSurfaces(
    surf({ ".": { a: fn() }, "./old": { o: fn(true), p: fn() } }),
    surf({ ".": { a: fn() } }),
  );
  ok("an entrypoint with a live symbol is a Rule 4 removal", g.undeprecatedRemovals.length === 1, g.undeprecatedRemovals.join());
}
{
  const cmd: SurfaceSymbol = { kind: "command", members: { "(dispatch)": "accepted" } };
  const f = await diffSurfaces(surf({ "(cli)": { "command:x": cmd, "command:y": cmd } }), surf({ "(cli)": { "command:y": cmd } }));
  ok("a CLI command removed is major but not a Rule 4 removal", f.kind === "major" && f.undeprecatedRemovals.length === 0);
}
{
  const f = await diffSurfaces(surf({ ".": { a: fn() } }), surf({ ".": { a: fn(true) } }));
  ok("deprecating a symbol is a minor change", f.kind === "minor" && f.reasons[0]?.what === ". a deprecated", JSON.stringify(f.reasons));
  const g = await diffSurfaces(surf({ ".": { a: fn(true) } }), surf({ ".": { a: fn() } }));
  ok("un-deprecating breaks nothing", g.kind === "patch" && g.undeprecatedRemovals.length === 0, JSON.stringify(g.reasons));
}

console.log("── markers from `deno doc` ──");
{
  const dir = await mkdtemp(join(tmpdir(), "wasmtk_surface_test_"));
  try {
    await writeFile(join(dir, "deno.json"), JSON.stringify({ name: "@t/t", version: "1.0.0", exports: { ".": "./mod.ts" } }));
    await writeFile(
      join(dir, "mod.ts"),
      "/**\n * Old.\n * @deprecated use newer\n */\nexport function old(): number {\n  return 1;\n}\n" +
        "/** Kept. */\nexport function kept(): number {\n  return 2;\n}\n" +
        "/** Shape. */\nexport interface Shape {\n  /** @deprecated gone soon */\n  legacy: number;\n  keep: number;\n}\n",
    );
    // generateSurface also reads a CLI from main.ts: give it the smallest one it accepts
    await writeFile(
      join(dir, "main.ts"),
      'import { parseArgs } from "jsr:@std/cli@^1.0.0/parse-args";\nconst args = parseArgs(Deno.args, {\n' +
        '  boolean: ["help"],\n});\nswitch (args._[0]) {\n    case "go":\n      break;\n}\n' +
        'if (args.help) console.log("  wasmtk go   run it");\n',
    );
    await Deno.mkdir(join(dir, "src"));
    const s = await generateSurface(dir);
    const e = s.entrypoints["."]!;
    ok("a symbol's @deprecated tag is a (deprecated) key", e.old?.members[DEPRECATED] === "deprecated");
    ok("…an undeprecated symbol has none", e.kept?.members[DEPRECATED] === undefined);
    ok(
      "a member's @deprecated tag is a (deprecated):<member> key",
      e.Shape?.members[`${DEPRECATED}:property:legacy`] === "deprecated" &&
        e.Shape?.members[`${DEPRECATED}:property:keep`] === undefined,
      JSON.stringify(e.Shape?.members),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

console.log("── one SemVer step ──");
{
  const cases: [string, string, string | null][] = [
    ["2.0.3", "3.0.0", "major"],
    ["2.0.3", "2.1.0", "minor"],
    ["2.0.3", "2.0.4", "patch"],
    ["1.9.9", "1.9.10", "patch"],
    ["2.0.3", "4.0.0", null], // skipped a major
    ["2.0.3", "3.0.1", null], // a major that did not reset the patch
    ["2.0.3", "2.0.3", null], // no step
    ["2.0.3", "2.1", null],
  ];
  for (const [a, b, want] of cases) {
    ok(`${a} → ${b} is ${want ?? "not a step"}`, releaseStep(a, b) === want);
  }
}

console.log(`\napi surface: ${passed} passed, ${failed} failed`);
if (failed > 0) Deno.exit(1);
