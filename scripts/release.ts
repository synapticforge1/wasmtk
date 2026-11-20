/**
 * release.ts — the local half of a release: the workspace's release-process.md § 5 **U4** (all
 * projects; owner's order D1, 2026-11-10). Run after the owner's level was applied with
 * `deno task bump <kind>`:
 *
 *   deno task release                       (runs `bun scripts/release.ts`)
 *
 * Guards, before anything is committed — each one a release that went wrong somewhere:
 *   0g. FIRST (workspace review standard § 9, letter H37 (d), 2026-11-20): the review set's
 *       result — `scripts/review-gate.ts`: the gitignored `cmem/review-issues.md` says
 *       `Review complete: <commit>`, an ancestor of HEAD, and nothing but the bump, CHANGELOG.md
 *       and `cmem/` changed since. (Until 2026-11-20 0g read two record paragraphs in
 *       `cmem/release.md`, H35; that parser and its strict-Markdown rule are retired.)
 *   0a. the tree is clean but for the bump's own files, UNTRACKED files counted as dirty, and those
 *       files plain modifications (a rename / add / delete onto one blocks);
 *   0b. on `main`, and either `main` = `origin/main` with the bump in the working tree (changing
 *       NOTHING but the version lines — `bumpOnly`), or `main` = `origin/main` + exactly ONE commit
 *       that passes `verifyReleaseCommit` (a bump already committed, e.g. by the owner's "commit");
 *   0c. the tag absent locally and on origin (a tag that exists has been, or will be, released);
 *   0d. JSR does not already serve the version (a version number is immutable there);
 *   0h. the version it bumps FROM (origin/main's) is released: its tag on origin and on JSR;
 *   0i. the compatibility gate (`api-surface.ts --verify-release`: one SemVer step, the surface
 *       floor) — LOCAL only since 2026-11-20 (H37 (e): every gate runs here, CI only publishes);
 *   0e. COLD checks on exactly what will be committed (`git archive HEAD` unpacked to a temp folder,
 *       plus the bump) with an empty DENO_DIR: `deno check main.ts`, `deno publish --dry-run`,
 *       then `--version` names this version and `--help` exits 0 — so an ignored or skip-worktree
 *       file the working copy has but the commit lacks cannot make them pass; nothing is
 *       registered in .git, and Ctrl-C removes the temp folders.
 * The push is `--no-follow-tags`.
 * Then: commit RELEASE_FILES as `bump to vX.Y.Z` (unless already committed), push `main` as a user,
 * and read it back with `git ls-remote`. **It makes and pushes NO tag** (U4): CI reads the pushed
 * version, then CI creates the tag, then the Release page from the tag, then publishes to JSR.
 *
 * **CI no longer repeats this gate** (owner, 2026-11-17, H37 (e): "We want the CI to verify the
 * version, then tag, create the release page and publish, and skip any version already
 * published"). From review round 2 (R2-B) to 2026-11-20 CI ran `release.ts --verify-commit` so a
 * hand-pushed `bump to` commit could not release unguarded; that check read the review record in
 * `cmem/release.md`, which CI cannot read now that the review's result is the gitignored issues
 * file. The rule stands instead: never push a version change by hand (working-rules.md).
 *
 * Never `deno publish` here (§ 1 rule 3: a local publish uploads WITHOUT provenance, and that
 * version can never be fixed), never `git tag`. Replaced `scripts/publish.ts` / `deno task publish`
 * on 2026-11-10, which had none of the guards, force-moved a local tag and pushed twice.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import denoJson from "../deno.json" with { type: "json" };
import { jsrHas, lsRemoteHas, lsRemotePeeled, versionAt } from "./publish-workflow.ts";
import { ISSUES_FILE, reviewGate } from "./review-gate.ts";

/** What `deno task bump` writes (deno.json + scripts/sync-version.ts's two mirrors). */
export const RELEASE_FILES = ["deno.json", "package.json", "src/utils.ts"];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A git call's result: `out` is STDOUT only (the only thing parsed), `err` its stderr. */
export type Git = (args: string[]) => { code: number; out: string; err: string };

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
 * Is `now` the earlier `head` with ONLY the version changed to `version`? The JSON manifests are
 * compared as data (everything but `version` equal, nested values included); `src/utils.ts` as text
 * (identical but for the `VERSION` constant, whatever its spacing). Returns the problem, or "".
 * Review round 1 (A2): any edit in a release file had ridden along in the `bump to` commit;
 * round 2 (R2-E): a `VERSION="x"` spacing was wrongly refused.
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
  // Anchored at a line start, and exactly one: a `// export const VERSION = "x"` comment above
  // the real line had been read as the constant (review round 3).
  const VERSION = /^(export const VERSION\s*=\s*)"([^"]*)"/m;
  const all = n.match(/^export const VERSION\s*=/gm) ?? [];
  if (all.length !== 1) return `${file} has ${all.length} VERSION constants, not exactly one`;
  if ((h.match(/^export const VERSION\s*=/gm) ?? []).length !== 1) {
    return `${file} had no single VERSION constant before the bump`;
  }
  const got = VERSION.exec(n)?.[2];
  if (got !== version) return `${file}'s VERSION constant is ${got ?? "missing"}, not "${version}"`;
  return h.replace(VERSION, `$1"${version}"`) === n
    ? ""
    : `${file} changes more than its VERSION line`;
}

// The ref parser is shared with CI's is-release (one definition — scripts/publish-workflow.ts).
export { lsRemoteHas };

/**
 * The commit-level release gate, on HEAD — for a bump already committed (guard 0b): the subject is
 * `bump to v<version>`; against HEAD^ it changes only RELEASE_FILES, each by its version line
 * alone (`bumpOnly`). Returns the problems (empty = it passes). (CI ran it as `--verify-commit`
 * from review round 2 to 2026-11-20, with the review record check; both retired, H37.)
 * Review round 3: HEAD must have ONE parent (a merge is not a bump); EVERY release file is
 * compared at HEAD^ and HEAD, changed or not, so a deno.json-only bump that leaves package.json /
 * VERSION behind is refused (A1); HEAD^ must be at a different version, so a "bump" that bumps
 * nothing is refused (B1).
 */
export function verifyReleaseCommit(version: string, git: Git): string[] {
  const problems: string[] = [];
  const parents = git(["rev-list", "--parents", "-n", "1", "HEAD"]);
  if (parents.code !== 0) return [`could not read HEAD's parents: ${parents.err.trim()}`];
  const ids = parents.out.trim().split(/\s+/);
  if (ids.length !== 2) {
    return [
      `HEAD has ${
        ids.length - 1
      } parent(s) — a release commit is one ordinary commit on main, not a merge or a root`,
    ];
  }
  const subject = git(["log", "-1", "--format=%s", "HEAD"]);
  if (subject.code !== 0) return [`could not read HEAD: ${(subject.err + subject.out).trim()}`];
  if (subject.out.trim() !== `bump to v${version}`) {
    problems.push(
      `HEAD's subject is "${subject.out.trim()}", not "bump to v${version}" — a release is the commit \`deno task release\` makes, and nothing else`,
    );
  }
  // `--raw` carries the file MODES (round 5: `--name-status` shows a 100644 → 100755 change as a
  // plain `M`, so a mode change rode along): `:<old mode> <new mode> <old> <new> <status>\t<path>`.
  const diff = git(["diff", "--raw", "--no-abbrev", "--no-renames", "HEAD^", "HEAD"]);
  if (diff.code !== 0) return [...problems, `could not diff HEAD^..HEAD: ${diff.err.trim()}`];
  const changed: Array<[string, string]> = [];
  for (const l of diff.out.split("\n").filter((x) => x.trim() !== "")) {
    const m = /^:(\d{6}) (\d{6}) \S+ \S+ (\S+)\t(.+)$/.exec(l);
    if (!m) {
      problems.push(`could not read the diff line "${l}"`);
      continue;
    }
    const [, oldMode, newMode, status, path] = m;
    changed.push([status, path]);
    if (status !== "M" || !RELEASE_FILES.includes(path)) {
      problems.push(
        `the release commit touches ${path} (${status}) — only the version lines of ${
          RELEASE_FILES.join(", ")
        } may change`,
      );
    } else if (oldMode !== newMode) {
      problems.push(`the release commit changes ${path}'s mode (${oldMode} → ${newMode})`);
    }
  }
  if (!changed.some(([, p]) => p === "deno.json")) {
    problems.push("the release commit does not change deno.json's version");
  }
  for (const path of RELEASE_FILES) {
    const before = git(["show", `HEAD^:${path}`]), after = git(["show", `HEAD:${path}`]);
    if (before.code !== 0 || after.code !== 0) {
      problems.push(`could not read ${path} at HEAD^ / HEAD`);
      continue;
    }
    const p = bumpOnly(path, before.out, after.out, version);
    if (p) problems.push(p);
  }
  const was = git(["show", "HEAD^:deno.json"]);
  if (was.code === 0) {
    let prev: unknown;
    try {
      prev = (JSON.parse(was.out) as { version?: unknown }).version;
    } catch {
      prev = undefined;
    }
    if (prev === version) {
      problems.push(`HEAD^ is already at ${version} — the release commit bumps nothing`);
    }
  }
  return problems;
}

const version = denoJson.version;
const tag = `v${version}`;

/** Every command this script starts stops after 30 minutes (review H2, 2026-11-20: a hung `git
 *  fetch` or cold check hung the release with no message). */
const COMMAND_TIMEOUT_MS = 30 * 60 * 1000;

function run(cmd: string[], cwd?: string): void {
  console.log(`$ ${cmd.join(" ")}`);
  const r = spawnSync(cmd[0]!, cmd.slice(1), {
    stdio: "inherit",
    cwd,
    timeout: COMMAND_TIMEOUT_MS,
  });
  if (r.error && /ETIMEDOUT/.test(String(r.error))) {
    console.error(`\nCommand did not finish within 30 min and was stopped: ${cmd.join(" ")}`);
    process.exit(1);
  }
  const code = r.status ?? 1;
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
  opts: { env?: NodeJS.ProcessEnv; cwd?: string } = {},
): { code: number; out: string; err: string } {
  const r = spawnSync(cmd[0]!, cmd.slice(1), {
    encoding: "utf8",
    maxBuffer: 1 << 26,
    timeout: COMMAND_TIMEOUT_MS,
    ...opts,
  });
  // A command that could not start, or was stopped at the limit, says so (it read as a silent
  // refusal with no detail — review H14's sibling, R6-L5).
  const why = r.error ? `\n${cmd[0]}: ${r.error.message}` : "";
  return { code: r.status ?? 1, out: r.stdout ?? "", err: (r.stderr ?? "") + why };
}
const git: Git = (args) => capture(["git", ...args]);
const said = (r: { out: string; err: string }) => (r.err + r.out).trim();

function refuse(why: string, ...detail: string[]): never {
  console.error(`Refusing to release ${tag}: ${why}`);
  for (const d of detail) console.error(`  ${d}`);
  process.exit(1);
}

if (import.meta.main && process.argv.length > 2) {
  // `--verify-commit` was CI's (review round 2 → 2026-11-20); it is retired, and so is any flag.
  refuse(`unknown argument ${process.argv[2]} (release.ts takes none since 2026-11-20, H37).`);
}

if (import.meta.main) {
  console.log(`Releasing ${tag}\n`);

  // 0g. FIRST: the review set's result (review standard § 9, letter H37 (d)): the gitignored
  // issues file names the reviewed commit, an ancestor of HEAD, and nothing but the bump,
  // CHANGELOG.md and cmem/ changed since (scripts/review-gate.ts).
  let issues: string | null = null;
  try {
    issues = await readFile(ISSUES_FILE, "utf8");
  } catch {
    issues = null;
  }
  const unreviewed = reviewGate(
    issues,
    git,
    RELEASE_FILES,
    (file, atReviewed) => bumpOnly(file, atReviewed, readFileSync(file, "utf8"), version),
  );
  if (unreviewed.length > 0) {
    refuse(
      "the review set has not passed for this code.",
      ...unreviewed,
      'Run "review" (basic, hardening, licensing, security, privacy; cmem/review-process.md) to an',
      `empty re-review and a passing full suite, then set "Review complete: <commit>" in ${ISSUES_FILE}.`,
    );
  }

  // 0a. A clean tree but for plain modifications of the release files.
  const status = git(["status", "--porcelain", "--untracked-files=all"]);
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

  // 0b. On main; HEAD = origin/main with the bump in the working tree, or origin/main + the bump.
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out.trim();
  if (branch !== "main") refuse(`on branch ${branch}, not main (releases go out from main).`);
  const fetched = git(["fetch", "-q", "origin", "main"]);
  if (fetched.code !== 0) refuse("could not fetch origin/main.", said(fetched));
  const local = git(["rev-parse", "HEAD"]).out.trim();
  const upstream = git(["rev-parse", "origin/main"]).out.trim();
  const parent = git(["rev-parse", "-q", "--verify", "HEAD^"]).out.trim();
  let committed = false;
  if (local === upstream) {
    for (const file of RELEASE_FILES) {
      const head = git(["show", `HEAD:${file}`]);
      if (head.code !== 0) refuse(`could not read ${file} at HEAD.`, said(head));
      const problem = bumpOnly(file, head.out, await readFile(file, "utf8"), version);
      if (problem) {
        refuse(
          `${problem}.`,
          "A release commits the bump only (`deno task bump <kind>`); commit any other change first, as its own commit.",
        );
      }
    }
  } else if (parent === upstream && dirty.length === 0 && status.out.trim() === "") {
    const problems = verifyReleaseCommit(version, git);
    if (problems.length) {
      refuse(
        "HEAD is one commit ahead of origin/main but is not a releasable bump commit.",
        ...problems,
      );
    }
    committed = true;
    console.log(`(the bump is already committed — ${local.slice(0, 11)} passes the commit gate)`);
  } else {
    refuse(
      `main (${local.slice(0, 11)}) is not origin/main (${
        upstream.slice(0, 11)
      }), nor origin/main plus one bump commit.`,
      "Push or pull the other work first (release-process.md U2: merge first). Never push a",
      "`bump to` commit by hand: CI releases any pushed version change, and no longer re-checks it.",
    );
  }

  // 0c. The tag absent locally and on origin.
  if (git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]).code === 0) {
    refuse(`a local tag ${tag} exists; CI makes the tag — delete the stray local one.`);
  }
  const remote = git(["ls-remote", "--tags", "origin", `refs/tags/${tag}`]);
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

  // 0h. The version this bumps FROM (origin/main's) is released — tag on origin AND on JSR. A bump
  //     over a stranded or refused version would bury it for good (review round 4; CI refuses the
  //     same in is-release).
  const prev = versionAt(git, upstream);
  if (prev !== null && prev !== version) {
    const pref = `refs/tags/v${prev}`;
    const prevTag = git(["ls-remote", "origin", pref, `${pref}^{}`]);
    if (prevTag.code !== 0) refuse("could not read origin's tags.", said(prevTag));
    let prevJsr: string;
    try {
      prevJsr = await jsrHas(prev);
    } catch (e) {
      refuse(
        `could not ask JSR whether it has the previous version ${prev}.`,
        (e as Error).message,
      );
    }
    const tagged = lsRemotePeeled(prevTag.out, pref) !== "";
    if (!tagged || prevJsr !== "true") {
      refuse(
        `the previous version ${prev} was never released (tag v${prev} on origin: ${
          tagged ? "yes" : "no"
        }; on JSR: ${prevJsr === "true" ? "yes" : "no"}).`,
        "Finish it first (re-run its bump commit's run on GitHub), or revert the version line to the",
        "last RELEASED version in a normal commit and bump from there.",
      );
    }
  }

  // 0i. The compatibility gate CI runs on the candidate (`api-surface.ts --verify-release`: one
  //     SemVer step from the previous tag, at or above the surface floor), run HERE before the
  //     push — round 5: a hand-typed 3.0.0 → 7.0.0 or → 2.9.9 passed every local guard and was
  //     refused only by CI, after `main` already carried the unreleased version. The working tree
  //     is HEAD + the bump (0a), exactly the candidate.
  console.log("$ bun scripts/api-surface.ts --verify-release");
  const surface = capture(["bun", "scripts/api-surface.ts", "--verify-release"]);
  if (surface.code !== 0) {
    refuse(
      "the compatibility gate refuses this version (CI would refuse it after the push).",
      ...said(surface).split("\n").slice(-12),
    );
  }

  // 0e. Cold checks on EXACTLY what will be committed: `git archive HEAD` unpacked into a temp
  //     folder, plus the bump, and an empty DENO_DIR. Round 4: a `git worktree` had registered
  //     itself in .git and, on Ctrl-C, stayed registered; an archive registers nothing. Cleanup
  //     always runs before a refusal (round 1, H), and on Ctrl-C too.
  const tree = await mkdtemp(join(tmpdir(), "wasmtk-release-tree-"));
  const cold = await mkdtemp(join(tmpdir(), "wasmtk-release-cold-"));
  const cleanup = () => {
    for (const d of [tree, cold]) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch { /* best effort */ }
    }
  };
  const onSignal = () => {
    cleanup();
    console.error(`\nInterrupted: nothing committed or pushed; the temp folders removed.`);
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  let failure: string[] | null = null;
  let reported = "";
  try {
    const tar = join(cold, "tree.tar");
    const archived = git(["archive", "--format=tar", "-o", tar, "HEAD"]);
    // The archive is named RELATIVE to its folder: Git Bash's GNU tar reads `C:\…\tree.tar` as a
    // remote `host:file` and fails (round 5); Windows' bsdtar and Linux tar take either.
    const unpacked = archived.code === 0
      ? capture(["tar", "-xf", "tree.tar", "-C", tree], { cwd: cold })
      : archived;
    await rm(tar, { force: true });
    if (unpacked.code !== 0) {
      failure = ["could not unpack HEAD for the cold checks.", said(unpacked)];
    } else {
      if (!committed) {
        for (const f of RELEASE_FILES) await cp(f, join(tree, f));
      }
      const env = { ...process.env, DENO_DIR: cold };
      for (const args of [["check", "main.ts"], ["publish", "--dry-run", "--allow-dirty"]]) {
        console.log(`$ (HEAD + the bump, DENO_DIR=<empty>) deno ${args.join(" ")}   (cold)`);
        const r = capture(["deno", ...args], { env, cwd: tree });
        if (r.code !== 0) {
          failure = [
            `the cold \`deno ${
              args.join(" ")
            }\` failed on what would be committed — publish.yml would fail the same way.`,
            ...said(r).split("\n").slice(-15),
          ];
          break;
        }
      }
      if (!failure) {
        const ver = capture(["deno", "run", "-A", "main.ts", "--version"], { cwd: tree });
        if (ver.code !== 0 || !new RegExp(`(^|\\s)${escapeRe(tag)}(\\s|$)`, "m").test(ver.out)) {
          failure = [`\`main.ts --version\` does not report exactly ${tag}.`, said(ver)];
        } else {
          const help = capture(["deno", "run", "-A", "main.ts", "--help"], { cwd: tree });
          if (help.code !== 0) {
            failure = ["`main.ts --help` failed.", said(help).split("\n").slice(-5).join(" ")];
          } else {
            reported = ver.out.trim();
          }
        }
      }
    }
  } finally {
    cleanup();
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }
  if (failure) refuse(failure[0], ...failure.slice(1));
  console.log(`$ main.ts --version → ${reported}; --help → exit 0 (on HEAD + the bump)`);

  // 1. Commit the bump (unless already committed and gated above).
  if (!committed) {
    run(["git", "add", ...RELEASE_FILES]);
    run(["git", "commit", "-m", `bump to ${tag}`]);
    // The commit just made is what CI will gate: re-run the same gate on it now (a hook, a staged
    // index entry or a racing edit could have changed it — review round 3). On failure, undo it.
    const made = verifyReleaseCommit(version, git);
    if (made.length) {
      git(["reset", "--soft", "HEAD^"]);
      refuse("the commit just made does not pass the commit gate (undone; changes kept).", ...made);
    }
  }

  // 2. Push main — and NO tag: CI tags after its checks pass on this commit (U4, U6).
  //    `--no-follow-tags`: a `push.followTags` setting would otherwise push every local annotated
  //    tag on main's history along with it (review round 4).
  const bumped = git(["rev-parse", "HEAD"]).out.trim();
  run(["git", "push", "--no-follow-tags", "origin", "main"]);

  // 3. Read it back.
  const back = git(["ls-remote", "origin", "refs/heads/main"]).out.split("\n")
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
