/**
 * Publish script: syncs version, commits, tags, and pushes so GitHub Actions
 * can run `deno publish` with OIDC provenance via the publish.yml workflow.
 *
 * Usage: deno task publish   (runs `bun scripts/publish.ts`; JSR publishing itself stays
 * `deno publish` in the workflow, the one Deno dependency, cmem/deno-exit-plan.md role E)
 *
 * Steps:
 *   1. Read current version from deno.json
 *   2. Run scripts/sync-version.ts to propagate to package.json + src/utils.ts
 *   3. git add the changed files
 *   4. git commit "bump version to vX.Y.Z"
 *   5. git tag vX.Y.Z
 *   6. git push && git push --tags  ← triggers the publish.yml workflow
 */
import { spawnSync } from "node:child_process";
import denoJson from "../deno.json" with { type: "json" };

const version = denoJson.version;
const tag = `v${version}`;

function run(cmd: string[]): void {
  const { status, stderr } = spawnSync(cmd[0]!, cmd.slice(1), { encoding: "utf8" });
  if (status !== 0) {
    console.error(stderr);
    process.exit(status ?? 1);
  }
}

console.log(`Publishing ${tag} via GitHub Actions…`);

// 1. Sync version to package.json + src/utils.ts
run(["bun", "scripts/sync-version.ts"]);

// 2. Stage the three files that sync-version touches
run(["git", "add", "deno.json", "package.json", "src/utils.ts"]);

// 3. Commit (skip if nothing staged — version was already synced)
const diffCode = spawnSync("git", ["diff", "--cached", "--quiet"]).status;
if (diffCode !== 0) {
  run(["git", "commit", "-m", `bump version to ${tag}`]);
}

// 4. Tag (force-update in case of re-run after a failed push)
run(["git", "tag", "-f", tag]);

// 5. Push commit + tag — triggers publish.yml which runs `deno publish` with provenance
run(["git", "push"]);
run(["git", "push", "origin", tag]);

console.log(`\nTag ${tag} pushed. GitHub Actions will publish to JSR with provenance.`);
console.log(`Watch progress at: https://github.com/jrmarcum/wasmtk/actions`);
