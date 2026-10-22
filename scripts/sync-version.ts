/**
 * Reads `version` and `name` from deno.json and writes them into:
 *   - package.json  (version + name fields)
 *   - src/utils.ts  (VERSION constant)
 *
 * Run via:  deno task update-version   (runs `bun scripts/sync-version.ts`)
 * Must be invoked from the project root (deno task does this automatically).
 */
import { readFile, writeFile } from "node:fs/promises";

const root = process.cwd();

const denoJson = JSON.parse(await readFile(`${root}/deno.json`, "utf8"));
const { version, name } = denoJson as { version: string; name: string };

// ── package.json ──────────────────────────────────────────────────────────────
const pkgPath = `${root}/package.json`;
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
pkg.name = name;
pkg.version = version;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`✅ package.json  → ${version}`);

// ── src/utils.ts ──────────────────────────────────────────────────────────────
const utilsPath = `${root}/src/utils.ts`;
const utils = await readFile(utilsPath, "utf8");
const updated = utils.replace(
  /(export const VERSION\s*=\s*)"[^"]*"/,
  `$1"${version}"`,
);
if (updated === utils) {
  // Either already up to date, or the pattern wasn't found — distinguish the two.
  if (utils.includes(`VERSION = "${version}"`)) {
    console.log(`✅ src/utils.ts  → ${version} (already up to date)`);
  } else {
    console.warn("⚠️  src/utils.ts VERSION constant not found — skipped");
  }
} else {
  await writeFile(utilsPath, updated);
  console.log(`✅ src/utils.ts  → ${version}`);
}
