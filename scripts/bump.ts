/**
 * Raises the `version` field in deno.json by one SemVer 2.0.0 release step, then propagates it to
 * package.json + src/utils.ts (by importing sync-version.ts, which runs after deno.json is written).
 *
 * Run via:  deno task bump patch     # bug fixes only, nothing added or broken:  2.0.3 → 2.0.4
 *           deno task bump minor     # new capability, backward compatible:      2.0.3 → 2.1.0
 *           deno task bump major     # anything backward-INCOMPATIBLE:           2.0.3 → 3.0.0
 *
 * PLAIN SEMANTIC VERSIONING 2.0.0 (owner, 🔒 2026-09-20, workspace `cmem/layout-and-packaging.md`
 * § Versioning; H6). The kind is a COMPATIBILITY statement, and it resets every component to its
 * right. Components are unbounded integers: `1.9.9` is followed by `1.9.10` or `1.10.0`, never by
 * `2.0.0` unless something broke. This replaces the 2026-07-30 odometer (single-digit components
 * with a carry to the left), which the owner retired because a carry into a new major tells every
 * caret consumer "this broke" when it did not.
 *
 * The kind is REQUIRED; there is no default. A default of `patch` let a bump happen without anyone
 * stating what kind of release it is, which is the decision this script exists to force.
 *
 * "Backward compatible" is a gate result, not a judgment (the compatibility gate, H6.3,
 * `scripts/api-surface.ts`). Before writing anything this script (1) refuses if the committed
 * `api-surface.json` no longer matches the code (Rule 5: a surface change is re-baselined in its OWN
 * commit first), (2) computes the FLOOR, the minimum kind, from the surface at the last `v*` tag to
 * the surface now, and (3) refuses a kind below the floor, printing the symbols that set it. A kind
 * ABOVE the floor is allowed (a major the gate did not require is the owner's call).
 *
 * Unlike `update-version` (which only COPIES the existing deno.json version out to
 * package.json/src/utils.ts), this RAISES the deno.json version first. Must be run from the project
 * root (deno task does this automatically).
 */

import { readFile, writeFile } from "node:fs/promises";
import {
  diffSurfaces,
  generateSurface,
  type Kind,
  KIND_RANK,
  loadReviews,
  printFloor,
  serialize,
  surfaceAtLastTag,
} from "./api-surface.ts";

const root = process.cwd();
const denoJsonPath = `${root}/deno.json`;

const KINDS = ["patch", "minor", "major"] as const;

const arg = process.argv[2]?.toLowerCase();
if (!arg || !(KINDS as readonly string[]).includes(arg)) {
  console.error(
    `❌ bump: ${arg ? `unknown release kind "${arg}"` : "no release kind given"} — use one of:\n` +
      `   patch   bug fixes only, nothing added, nothing broken\n` +
      `   minor   new capability, backward compatible\n` +
      `   major   anything backward-incompatible (and add a README Breaking Changes row)`,
  );
  process.exit(1);
}
const kind = arg as Kind;

// ── The compatibility gate (H6.3). Nothing is written unless it passes.
const current = await generateSurface(root);
let committed = "";
try {
  committed = (await readFile(`${root}/api-surface.json`, "utf8")).replace(/\r\n/g, "\n");
} catch {
  console.error("❌ bump: api-surface.json is missing. Run `deno task api-surface` and commit it.");
  process.exit(1);
}
if (committed !== serialize(current)) {
  console.error("❌ bump: api-surface.json does not match the code:");
  printFloor(await diffSurfaces(JSON.parse(committed), current), "the committed snapshot");
  console.error(
    "   Re-baseline in its OWN commit first (`deno task api-surface`), stating the reason (Rule 5).",
  );
  process.exit(1);
}
const { tag, surface: released, source } = await surfaceAtLastTag();
const floor = await diffSurfaces(released, current, await loadReviews(root));
printFloor(floor, `${tag} (${source})`);
if (KIND_RANK[kind] < KIND_RANK[floor.kind]) {
  console.error(
    `❌ bump: a ${kind} release is below the surface floor (${floor.kind}) since ${tag}. ` +
      `Use \`deno task bump ${floor.kind}\`${
        floor.kind === "major" ? " and add a README Breaking Changes row" : ""
      }.`,
  );
  process.exit(1);
}

const text = await readFile(denoJsonPath, "utf8");
const m = text.match(/("version"\s*:\s*)"(\d+)\.(\d+)\.(\d+)"/);
if (!m) {
  console.error('❌ bump: could not find a plain "version": "X.Y.Z" field in deno.json');
  process.exit(1);
}

let [major, minor, patch] = [Number(m[2]), Number(m[3]), Number(m[4])];
const from = `${major}.${minor}.${patch}`;

// SemVer: raise the named component, reset every component to its right. No carry, no cap.
if (kind === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (kind === "minor") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}
const to = `${major}.${minor}.${patch}`;

// Targeted replace so the rest of deno.json's formatting is untouched.
const updated = text.replace(/("version"\s*:\s*)"\d+\.\d+\.\d+"/, `$1"${to}"`);
await writeFile(denoJsonPath, updated);
console.log(`✅ deno.json     → ${to}  (${kind} bump from ${from})`);

// Propagate the freshly-written version to package.json + src/utils.ts.
await import("./sync-version.ts");
