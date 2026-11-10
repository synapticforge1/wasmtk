/**
 * release.ts — the local half of a release (the workspace's release-process.md § 2 step 8, for
 * JS / TS projects; reference: binaryang's `scripts/release/publish.ts`). Run after the owner's
 * level was applied with `deno task bump <kind>`:
 *
 *   deno task release      (runs `bun scripts/release.ts`)
 *
 * Guards, before anything is committed or tagged — each one a release that went wrong somewhere:
 *   0a. the tree is clean but for the bump's own files, UNTRACKED files counted as dirty (a file
 *       never committed is absent from the tag while every local check passes);
 *   0b. the tag is not on origin (a remote tag has already triggered publish.yml);
 *   0c. JSR does not already serve the version (a version number is immutable there);
 *   0d. COLD checks in an empty DENO_DIR, as publish.yml runs them: `deno check main.ts` and
 *       `deno publish --dry-run` (a warm cache passes what CI fails AFTER the tag is public);
 *   0e. the published root runs as a user runs it: `--version` names this version, `--help` exits 0.
 * Then: commit RELEASE_FILES as `bump to vX.Y.Z` (if anything is staged), tag locally, and push
 * `main` AND the tag in ONE push, as a user — publish.yml does the rest (checks → jsr → release).
 *
 * This script never runs `deno publish` (release-process.md § 1 rule 3): a local publish uploads
 * WITHOUT provenance, and that version can never be fixed. Replaced `scripts/publish.ts` /
 * `deno task publish` on 2026-11-10, which had none of the guards and pushed in two pushes.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import denoJson from "../deno.json" with { type: "json" };
import { jsrHas } from "./publish-workflow.ts";

/** What `deno task bump` writes (deno.json + scripts/sync-version.ts's two mirrors). */
export const RELEASE_FILES = ["deno.json", "package.json", "src/utils.ts"];

/** `git status --porcelain` lines that would be LEFT OUT of the release (untracked included). */
export function releaseBlockers(porcelain: string): string[] {
  return porcelain.split("\n").filter((l) => l.trim() !== "").filter((l) => {
    const path = l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop()!;
    return !RELEASE_FILES.includes(path);
  });
}

const version = denoJson.version;
const tag = `v${version}`;

function run(cmd: string[]): void {
  console.log(`$ ${cmd.join(" ")}`);
  const code = spawnSync(cmd[0]!, cmd.slice(1), { stdio: "inherit" }).status ?? 1;
  if (code !== 0) {
    console.error(`\nCommand failed with exit code ${code}: ${cmd.join(" ")}`);
    process.exit(code);
  }
}

function capture(cmd: string[], env?: NodeJS.ProcessEnv): { code: number; out: string } {
  const r = spawnSync(cmd[0]!, cmd.slice(1), { encoding: "utf8", env, maxBuffer: 1 << 26 });
  return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

function refuse(why: string, ...detail: string[]): never {
  console.error(`Refusing to release ${tag}: ${why}`);
  for (const d of detail) console.error(`  ${d}`);
  process.exit(1);
}

if (import.meta.main) {
  console.log(`Releasing ${tag}\n`);

  // 0a. A clean tree but for the bump.
  const status = capture(["git", "status", "--porcelain", "--untracked-files=all"]);
  if (status.code !== 0) refuse("git status failed.", status.out.trim());
  const dirty = releaseBlockers(status.out);
  if (dirty.length > 0) {
    refuse(
      "the working tree is not clean.",
      `${dirty.length} path(s) would be LEFT OUT of the release:`,
      ...dirty.slice(0, 10).map((l) => `  ${l}`),
      ...(dirty.length > 10 ? [`  ... and ${dirty.length - 10} more`] : []),
      `This script commits ${RELEASE_FILES.join(", ")} only; commit the rest first.`,
    );
  }

  // 0b. The tag is not on origin.
  const remote = capture(["git", "ls-remote", "--tags", "origin", `refs/tags/${tag}`]);
  if (remote.code !== 0) refuse("could not read origin's tags.", remote.out.trim());
  if (remote.out.trim() !== "") {
    refuse(
      "that tag already exists on origin.",
      "It has already triggered publish.yml. `deno task bump <kind>` for the next version.",
    );
  }

  // 0c. JSR does not serve the version.
  try {
    if ((await jsrHas(version)) === "true") {
      refuse(`JSR already serves ${denoJson.name}@${version} (immutable).`);
    }
  } catch (e) {
    refuse("could not ask JSR whether it has this version.", (e as Error).message);
  }

  // 0d. Cold checks, as publish.yml's `checks` job runs them.
  const cold = await mkdtemp(join(tmpdir(), "wasmtk-release-cold-"));
  try {
    const env = { ...process.env, DENO_DIR: cold };
    for (const args of [["check", "main.ts"], ["publish", "--dry-run", "--allow-dirty"]]) {
      console.log(`$ DENO_DIR=<empty> deno ${args.join(" ")}   (cold)`);
      const r = capture(["deno", ...args], env);
      if (r.code !== 0) {
        refuse(
          `the cold \`deno ${
            args.join(" ")
          }\` failed — publish.yml would fail the same way, after the tag was public.`,
          ...r.out.trim().split("\n").slice(-15),
        );
      }
    }
  } finally {
    await rm(cold, { recursive: true, force: true }).catch(() => {});
  }

  // 0e. The published root, run as a user runs it.
  const ver = capture(["deno", "run", "-A", "main.ts", "--version"]);
  if (ver.code !== 0 || !ver.out.includes(tag)) {
    refuse(`\`main.ts --version\` does not report ${tag}.`, ver.out.trim());
  }
  const help = capture(["deno", "run", "-A", "main.ts", "--help"]);
  if (help.code !== 0) {
    refuse("`main.ts --help` failed.", help.out.trim().split("\n").slice(-5).join(" "));
  }
  console.log(`$ main.ts --version → ${ver.out.trim()}; --help → exit 0`);

  // 1. Commit the bump (only if staged: the bump may already be committed).
  run(["git", "add", ...RELEASE_FILES]);
  if (spawnSync("git", ["diff", "--cached", "--quiet"]).status !== 0) {
    run(["git", "commit", "-m", `bump to ${tag}`]);
  } else {
    console.log("(the bump is already committed — skipping the commit)");
  }

  // 2. Tag locally (forced: a local tag left by an earlier attempt that failed before its push is
  //    re-created; the REMOTE tag was refused at 0b), and 3. push main AND the tag in ONE push.
  run(["git", "tag", "-f", tag]);
  run(["git", "push", "origin", "main", tag]);

  console.log(`\nPushed main and ${tag}. publish.yml runs: checks → jsr → release.`);
  console.log("  https://github.com/synapticforge1/wasmtk/actions");
  console.log('Read every job; a failure past the upload → "Re-run failed jobs", never a new tag.');
}
