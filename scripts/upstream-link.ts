/**
 * upstream-link.ts — generate `deno.upstream.json`, a throwaway config that points EVERY binaryang
 * specifier at the LOCAL `upstream/binaryang` checkout instead of the pinned JSR release.
 *
 * Usage:  deno task upstream:link          # regenerate deno.upstream.json from deno.json
 *
 * ## How the local paths are found
 *
 * Each `deno.json` import of the form `jsr:@jrmarcum/binaryang@<version>/<subpath>` is resolved
 * through the checkout's own `jsr.json` `exports["./<subpath>"]` — the same table JSR resolves the
 * pin through. Until 2026-11-05 two paths were hard-coded here; binaryang's Bun migration (B7,
 * 2026-10-13: no `deno.json`, compat moved to `src/compat/`) broke them and the script refused on
 * every clone for three weeks. Reading the exports keeps it in step with any later move, and maps
 * all four binaryang specifiers, so an exploration build never mixes the checkout with a JSR copy.
 *
 * ## Why this is a separate config and not an edit to deno.json
 *
 * `deno.json` carries an EXACT pin on every binaryang subpath, and the standing invariant is that
 * **neither moves without a full gate** (see cmem/design-decisions.md). A local checkout is not a
 * version anyone can pin, roll back to, or hand to a colleague. Editing `deno.json` to point at it —
 * even temporarily — makes the authoritative pin lie, and this project has already paid for a
 * premature "it's fixed upstream" decision once.
 *
 * So the split is deliberate:
 *
 *   deno.json           the GATE OF RECORD. Always a published, pinned version. Never edited to
 *                       point at a checkout.
 *   deno.upstream.json  EXPLORATION ONLY. Generated, gitignored, disposable. Use it to reproduce a
 *                       bug against upstream `main`, to try a fix before it ships, or to answer
 *                       "is this fixed yet" without waiting for a release.
 *
 * ## The structural guard
 *
 * `deno task upstream:install` installs the binary as **`wasmtk-upstream`**, NOT `wasmtk`. The test
 * suites invoke `wasmtk` by name (`WASMTK_BIN`), so an upstream build **cannot** be picked up by a
 * gate run even by accident. That is not politeness — the recorded failure mode here is exactly
 * "the suite silently ran the wrong binary", and a naming collision is the only thing standing
 * between an exploratory build and a green gate that means nothing.
 *
 * **A result from `wasmtk-upstream` is never evidence for a decision.** It tells you where to look.
 * The gate of record runs `wasmtk`, built from the pin in `deno.json`.
 */
import { spawnSync } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import denoJson from "../deno.json" with { type: "json" };

const ROOT = new URL("../", import.meta.url);
const CHECKOUT = new URL("upstream/binaryang/", ROOT);
const PIN = /^jsr:@jrmarcum\/binaryang@[^/]+\/(.+)$/;

// Fail loudly rather than silently generating a config that resolves to the published package.
let exportsMap: Record<string, string>;
try {
  const manifest = JSON.parse(await readFile(new URL("jsr.json", CHECKOUT), "utf8"));
  exportsMap = manifest.exports;
  if (manifest.name !== "@jrmarcum/binaryang" || typeof exportsMap !== "object") throw 0;
} catch {
  console.error(
    "❌ upstream/binaryang is not checked out (no binaryang jsr.json). Clone it first:",
  );
  console.error("   git clone https://github.com/synapticforge1/binaryang.git upstream/binaryang");
  process.exit(1);
}

const cfg = structuredClone(denoJson) as Record<string, unknown>;
const imports = { ...(cfg.imports as Record<string, string>) };
const swapped: string[] = [];
for (const [spec, target] of Object.entries(imports)) {
  const sub = target.match(PIN)?.[1];
  if (sub === undefined) continue;
  const entry = exportsMap[`./${sub}`];
  if (typeof entry !== "string") {
    console.error(
      `❌ "${spec}" pins ${target}, but the checkout's jsr.json exports no "./${sub}".`,
    );
    console.error(
      "   The subpath was renamed or removed upstream — the pin will break on that release too.",
    );
    process.exit(1);
  }
  const path = `./upstream/binaryang/${entry.replace(/^\.\//, "")}`;
  try {
    await stat(new URL(path.slice(2), ROOT));
  } catch {
    console.error(`❌ "${spec}": jsr.json exports "./${sub}" as ${entry}, which does not exist.`);
    process.exit(1);
  }
  swapped.push(`${spec}: ${target} → ${path}`);
  imports[spec] = path;
}
if (swapped.length === 0) {
  console.error("❌ deno.json imports no `jsr:@jrmarcum/binaryang@…/<subpath>` — nothing to link.");
  process.exit(1);
}
cfg.imports = imports;
// A generated config must never be publishable or self-describing as the real package.
delete cfg.publish;
delete cfg.tasks;
// Nor may it touch the gate of record's lockfile. Both configs sit beside the same `deno.lock`, and
// a run through this one PRUNED the pinned binaryang entry and its integrity hash from it (measured
// 2026-11-05). An exploration build has no pin to protect, so it uses no lockfile at all.
cfg.lock = false;

const out = new URL("deno.upstream.json", ROOT);
await writeFile(out, JSON.stringify(cfg, null, 2) + "\n");

console.log("✅ wrote deno.upstream.json (gitignored, exploration only)");
for (const s of swapped) console.log(`   ${s}`);
const head = (spawnSync("git", ["-C", "upstream/binaryang", "rev-parse", "--short", "HEAD"], {
  encoding: "utf8",
}).stdout ?? "").trim();
console.log(`   checkout at ${head || "unknown"}`);
console.log("");
console.log("   Use:  deno run -A --config deno.upstream.json <script>");
console.log(
  "         deno task upstream:install     # installs as `wasmtk-upstream`, NOT `wasmtk`",
);
console.log("   ⚠️  Results from this config are NOT evidence for a decision — the gate of record");
console.log("       runs `wasmtk`, built from the pinned release in deno.json.");
