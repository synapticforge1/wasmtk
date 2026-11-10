/**
 * release.ts — the local half of a release: the workspace's release-process.md § 5 **U4** (all
 * projects; owner's order D1, 2026-11-10). Run after the owner's level was applied with
 * `deno task bump <kind>`:
 *
 *   deno task release      (runs `bun scripts/release.ts`)
 *
 * Guards, before anything is committed — each one a release that went wrong somewhere:
 *   0a. the tree is clean but for the bump's own files, UNTRACKED files counted as dirty (a file
 *       never committed is absent from the release while every local check passes);
 *   0b. on `main`, and `main` equal to `origin/main` (after a fetch): the push adds the bump only;
 *   0c. the tag absent locally and on origin (a tag that exists has been, or will be, released);
 *   0d. JSR does not already serve the version (a version number is immutable there);
 *   0e. COLD checks in an empty DENO_DIR, as publish.yml's `checks` runs them: `deno check main.ts`
 *       and `deno publish --dry-run` (a warm cache passes what CI fails);
 *   0f. the published root runs as a user runs it: `--version` names this version, `--help` exits 0.
 * Then: commit RELEASE_FILES as `bump to vX.Y.Z` (if anything is staged), push `main` as a user,
 * and read it back with `git ls-remote`. **It makes and pushes NO tag** (U4): CI checks the pushed
 * commit, then CI creates the tag, then the Release page from the tag, then publishes to JSR —
 * publish.yml, in the owner's order.
 *
 * Never `deno publish` here (§ 1 rule 3: a local publish uploads WITHOUT provenance, and that
 * version can never be fixed), never `git tag`. Replaced `scripts/publish.ts` / `deno task publish`
 * on 2026-11-10, which had none of the guards, force-moved a local tag and pushed twice.
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

  // 0b. On main, equal to origin/main: the push adds the bump and nothing else.
  const branch = capture(["git", "rev-parse", "--abbrev-ref", "HEAD"]).out.trim();
  if (branch !== "main") refuse(`on branch ${branch}, not main (releases go out from main).`);
  const fetched = capture(["git", "fetch", "-q", "origin", "main"]);
  if (fetched.code !== 0) refuse("could not fetch origin/main.", fetched.out.trim());
  const local = capture(["git", "rev-parse", "HEAD"]).out.trim();
  const upstream = capture(["git", "rev-parse", "origin/main"]).out.trim();
  if (local !== upstream) {
    refuse(
      `main (${local.slice(0, 11)}) is not origin/main (${upstream.slice(0, 11)}).`,
      "Push or pull the work first (release-process.md U2: merge first), then bump and release.",
    );
  }

  // 0c. The tag absent locally and on origin.
  if (capture(["git", "rev-parse", "-q", "--verify", `refs/tags/${tag}`]).code === 0) {
    refuse(`a local tag ${tag} exists; CI makes the tag — delete the stray local one.`);
  }
  const remote = capture(["git", "ls-remote", "--tags", "origin", `refs/tags/${tag}`]);
  if (remote.code !== 0) refuse("could not read origin's tags.", remote.out.trim());
  if (remote.out.trim() !== "") {
    refuse(
      "that tag already exists on origin.",
      "That version is released (or being released). `deno task bump <kind>` for the next one.",
    );
  }

  // 0d. JSR does not serve the version.
  try {
    if ((await jsrHas(version)) === "true") {
      refuse(`JSR already serves ${denoJson.name}@${version} (immutable).`);
    }
  } catch (e) {
    refuse("could not ask JSR whether it has this version.", (e as Error).message);
  }

  // 0e. Cold checks, as publish.yml's `checks` job runs them.
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

  // 0f. The published root, run as a user runs it.
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

  // 2. Push main — and NO tag: CI tags after its checks pass on this commit (U4, U6).
  const bumped = capture(["git", "rev-parse", "HEAD"]).out.trim();
  run(["git", "push", "origin", "main"]);

  // 3. Read it back.
  const back = capture(["git", "ls-remote", "origin", "refs/heads/main"]).out.trim().split(/\s/)[0];
  if (back !== bumped) {
    refuse(`read back: origin's main is ${back || "unreadable"}, not the pushed ${bumped}.`);
  }
  console.log(`\nPushed main = ${bumped} (read back). publish.yml now runs, in the owner's order:`);
  console.log(`  checks on this commit → CI tags ${tag} → the Release page → the publish to JSR`);
  console.log("  https://github.com/synapticforge1/wasmtk/actions");
  console.log(
    'Read every job; a failure → "Re-run failed jobs", never a new tag, never a moved one.',
  );
}
