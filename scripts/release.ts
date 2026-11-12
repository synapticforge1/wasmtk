/**
 * release.ts — the local half of a release: the workspace's release-process.md § 5 **U4** (all
 * projects; owner's order D1, 2026-11-10). Run after the owner's level was applied with
 * `deno task bump <kind>`:
 *
 *   deno task release      (runs `bun scripts/release.ts`)
 *
 * Guards, before anything is committed — each one a release that went wrong somewhere:
 *   0a. the tree is clean but for the bump's own files, UNTRACKED files counted as dirty (a file
 *       never committed is absent from the release while every local check passes), and those
 *       files change NOTHING but their version line (`bumpOnly`; a rename onto one blocks);
 *   0b. on `main`, and `main` equal to `origin/main` (after a fetch): the push adds the bump only;
 *   0c. the tag absent locally and on origin (a tag that exists has been, or will be, released);
 *   0d. JSR does not already serve the version (a version number is immutable there);
 *   0e. COLD checks in an empty DENO_DIR, as publish.yml's `checks` runs them: `deno check main.ts`
 *       and `deno publish --dry-run` (a warm cache passes what CI fails);
 *   0f. the published root runs as a user runs it: `--version` names this version, `--help` exits 0;
 *   0g. the version's entry in `cmem/release.md` records BOTH required reviews — a security review
 *       and a hardening review, each ended by an empty round (🔒 owner 2026-11-12, workspace
 *       `review-process.md` § 0, letter H35; the entry is committed with the release notes, U2).
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
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import denoJson from "../deno.json" with { type: "json" };
import { jsrHas } from "./publish-workflow.ts";

/** What `deno task bump` writes (deno.json + scripts/sync-version.ts's two mirrors). */
export const RELEASE_FILES = ["deno.json", "package.json", "src/utils.ts"];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Does a review paragraph say, affirmatively, that the review ended by an empty round? It must
 * carry the recorded form "ended by an empty round (round <n>" (cmem/review-process.md § 3), and
 * the clause it stands in must not deny or defer it ("NOT yet ended by …", "will be ended by …").
 * Review round 1, 2026-11-12 (findings A1 / C2): the guard had matched the bare words "empty
 * round", so "not yet ended by an empty round" passed.
 */
export function endedByEmptyRound(paragraph: string): boolean {
  const m = /ended by an empty round \(round \d+/i.exec(paragraph);
  if (!m) return false;
  const cut = Math.max(
    ...[".", ";", "!", "?", "\n"].map((c) => paragraph.lastIndexOf(c, m.index - 1)),
  );
  const clause = paragraph.slice(cut + 1, m.index);
  return !/\b(not|no|never|yet|pending|without|until|unless|will|would|should|if|once|when)\b/i
    .test(
      clause,
    );
}

/**
 * Guard 0g: the problems with `version`'s entry in `cmem/release.md` (empty = it records both
 * required reviews). Only the `## Release History` section counts (not a plan elsewhere in the
 * file), HTML comments and fenced code are ignored, and the entry is the `### X.Y.Z` section up to
 * the next `###` or `##` heading (a `####` subheading stays inside it). It must hold a paragraph
 * beginning exactly `**Security review:**` and one beginning `**Hardening review:**`, each ended
 * by an empty round in the recorded form (`endedByEmptyRound`).
 */
export function reviewsRecorded(releaseMd: string, version: string): string[] {
  const text = releaseMd.replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "");
  const lines = text.split("\n");
  const hist = lines.findIndex((l) => /^## Release History\s*$/.test(l));
  if (hist < 0) return ['cmem/release.md has no "## Release History" section'];
  let histEnd = hist + 1;
  while (histEnd < lines.length && !/^## /.test(lines[histEnd])) histEnd++;
  const head = new RegExp(`^### ${escapeRe(version)}(\\s|$)`);
  let start = -1;
  for (let i = hist + 1; i < histEnd && start < 0; i++) if (head.test(lines[i])) start = i;
  if (start < 0) return [`cmem/release.md has no "### ${version}" entry in its Release History`];
  let end = start + 1;
  while (end < histEnd && !/^#{2,3} /.test(lines[end])) end++;
  const paragraphs = lines.slice(start + 1, end).join("\n").split(/\n\s*\n/);
  const problems: string[] = [];
  for (const kind of ["Security", "Hardening"]) {
    const p = paragraphs.find((x) => x.trimStart().startsWith(`**${kind} review:**`));
    if (!p) problems.push(`the ${version} entry records no **${kind} review:** paragraph`);
    else if (!endedByEmptyRound(p)) {
      problems.push(
        `the ${version} entry's ${kind.toLowerCase()} review does not record that it ended by an empty round ("ended by an empty round (round n, date)")`,
      );
    }
  }
  return problems;
}

/**
 * `git status --porcelain` lines that would be LEFT OUT of the release, or that are not a plain
 * modification of a release file: untracked, added, deleted, renamed or copied paths all block
 * (review round 1, finding A2: a rename ONTO a release file had passed).
 */
export function releaseBlockers(porcelain: string): string[] {
  return porcelain.split("\n").filter((l) => l.trim() !== "").filter((l) => {
    const xy = l.slice(0, 2);
    const path = l.slice(3).replace(/^"|"$/g, "");
    return !RELEASE_FILES.includes(path) || !/^( M|M |MM)$/.test(xy);
  });
}

/**
 * Is `now` the committed `head` with ONLY the version changed to `version`? The JSON manifests are
 * compared as data (everything but `version` equal); `src/utils.ts` as text (identical but for the
 * `export const VERSION = "…"` line). Returns the problem, or "" (review round 1, finding A2: any
 * edit in a release file had ridden along in the `bump to` commit).
 */
export function bumpOnly(file: string, head: string, now: string, version: string): string {
  const h = head.replace(/\r\n/g, "\n"), n = now.replace(/\r\n/g, "\n");
  if (file.endsWith(".json")) {
    let a: Record<string, unknown>, b: Record<string, unknown>;
    try {
      a = JSON.parse(h);
      b = JSON.parse(n);
    } catch {
      return `${file} is not valid JSON`;
    }
    if (b.version !== version) return `${file}'s version is ${String(b.version)}, not ${version}`;
    return JSON.stringify({ ...a, version }) === JSON.stringify(b)
      ? ""
      : `${file} changes more than its version line`;
  }
  const versioned = h.replace(/(export const VERSION\s*=\s*)"[^"]*"/, `$1"${version}"`);
  if (!n.includes(`export const VERSION = "${version}"`)) {
    return `${file}'s VERSION constant is not "${version}"`;
  }
  return versioned === n ? "" : `${file} changes more than its VERSION line`;
}

/** The exact ref line of `git ls-remote` output for `ref` exists (stdout only, never stderr). */
export function lsRemoteHas(stdout: string, ref: string): boolean {
  return stdout.split("\n").some((l) => l.trim().split(/\s+/)[1] === ref);
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

/**
 * A command's exit code, its stdout (the only thing a guard ever parses) and its stderr (shown in
 * a refusal, never parsed). Review round 1, finding D: stderr had been joined to stdout, so a git
 * warning read as a tag on origin, or as a path left out of the release.
 */
function capture(
  cmd: string[],
  env?: NodeJS.ProcessEnv,
): { code: number; out: string; err: string } {
  const r = spawnSync(cmd[0]!, cmd.slice(1), { encoding: "utf8", env, maxBuffer: 1 << 26 });
  return { code: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
}
const said = (r: { out: string; err: string }) => (r.err + r.out).trim();

function refuse(why: string, ...detail: string[]): never {
  console.error(`Refusing to release ${tag}: ${why}`);
  for (const d of detail) console.error(`  ${d}`);
  process.exit(1);
}

if (import.meta.main) {
  console.log(`Releasing ${tag}\n`);

  // 0a. A clean tree but for the bump.
  const status = capture(["git", "status", "--porcelain", "--untracked-files=all"]);
  if (status.code !== 0) refuse("git status failed.", said(status));
  const dirty = releaseBlockers(status.out);
  if (dirty.length > 0) {
    refuse(
      "the working tree is not clean.",
      `${dirty.length} path(s) would be LEFT OUT of the release, or are not a plain modification:`,
      ...dirty.slice(0, 10).map((l) => `  ${l}`),
      ...(dirty.length > 10 ? [`  ... and ${dirty.length - 10} more`] : []),
      `This script commits ${RELEASE_FILES.join(", ")} only; commit the rest first.`,
    );
  }
  // …and the release files change NOTHING but their version line.
  for (const file of RELEASE_FILES) {
    const head = capture(["git", "show", `HEAD:${file}`]);
    if (head.code !== 0) refuse(`could not read ${file} at HEAD.`, said(head));
    const problem = bumpOnly(file, head.out, await readFile(file, "utf8"), version);
    if (problem) {
      refuse(
        `${problem}.`,
        "A release commits the bump only; commit any other change to it first, as its own commit.",
      );
    }
  }

  // 0g. Both required reviews recorded in the release's entry (checked early: it is cheap, and a
  //     release without them is not ready — workspace review-process.md § 0).
  let releaseMd = "";
  try {
    releaseMd = await readFile("cmem/release.md", "utf8");
  } catch {
    refuse("cmem/release.md is missing.");
  }
  const unreviewed = reviewsRecorded(releaseMd, version);
  if (unreviewed.length > 0) {
    refuse(
      "the security and hardening reviews are not recorded.",
      ...unreviewed,
      'Run "security review" and "hardening review" to their empty rounds and record both in the',
      "release's entry (cmem/review-process.md § 3), committed with the release notes.",
    );
  }

  // 0b. On main, equal to origin/main: the push adds the bump and nothing else.
  const branch = capture(["git", "rev-parse", "--abbrev-ref", "HEAD"]).out.trim();
  if (branch !== "main") refuse(`on branch ${branch}, not main (releases go out from main).`);
  const fetched = capture(["git", "fetch", "-q", "origin", "main"]);
  if (fetched.code !== 0) refuse("could not fetch origin/main.", said(fetched));
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
  if (remote.code !== 0) refuse("could not read origin's tags.", said(remote));
  if (lsRemoteHas(remote.out, `refs/tags/${tag}`)) {
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
          ...said(r).split("\n").slice(-15),
        );
      }
    }
  } finally {
    await rm(cold, { recursive: true, force: true }).catch(() => {});
  }

  // 0f. The published root, run as a user runs it.
  const ver = capture(["deno", "run", "-A", "main.ts", "--version"]);
  if (ver.code !== 0 || !new RegExp(`(^|\\s)${escapeRe(tag)}(\\s|$)`, "m").test(ver.out)) {
    refuse(`\`main.ts --version\` does not report exactly ${tag}.`, said(ver));
  }
  const help = capture(["deno", "run", "-A", "main.ts", "--help"]);
  if (help.code !== 0) {
    refuse("`main.ts --help` failed.", said(help).split("\n").slice(-5).join(" "));
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
  const back = capture(["git", "ls-remote", "origin", "refs/heads/main"]).out.split("\n")
    .map((l) => l.trim().split(/\s+/)).find((f) => f[1] === "refs/heads/main")?.[0] ?? "";
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
