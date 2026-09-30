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
 * "Backward compatible" is a gate result, not a judgment (the compatibility gate, H6.3): the surface
 * diff against the last release computes the minimum kind, and a bump below it is refused. Until
 * that gate lands, the README's `### ⚠️ Breaking Changes` table is the check a human makes.
 *
 * Unlike `update-version` (which only COPIES the existing deno.json version out to
 * package.json/src/utils.ts), this RAISES the deno.json version first. Must be run from the project
 * root (deno task does this automatically).
 */

const root = Deno.cwd();
const denoJsonPath = `${root}/deno.json`;

const KINDS = ["patch", "minor", "major"] as const;
type Kind = typeof KINDS[number];

const arg = Deno.args[0]?.toLowerCase();
if (!arg || !(KINDS as readonly string[]).includes(arg)) {
  console.error(
    `❌ bump: ${arg ? `unknown release kind "${arg}"` : "no release kind given"} — use one of:\n` +
      `   patch   bug fixes only, nothing added, nothing broken\n` +
      `   minor   new capability, backward compatible\n` +
      `   major   anything backward-incompatible (and add a README Breaking Changes row)`,
  );
  Deno.exit(1);
}
const kind = arg as Kind;

const text = await Deno.readTextFile(denoJsonPath);
const m = text.match(/("version"\s*:\s*)"(\d+)\.(\d+)\.(\d+)"/);
if (!m) {
  console.error('❌ bump: could not find a plain "version": "X.Y.Z" field in deno.json');
  Deno.exit(1);
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
await Deno.writeTextFile(denoJsonPath, updated);
console.log(`✅ deno.json     → ${to}  (${kind} bump from ${from})`);

// Propagate the freshly-written version to package.json + src/utils.ts.
await import("./sync-version.ts");
