/**
 * release.ts — the local half of a release: the workspace's release-process.md § 5 **U4** (all
 * projects; owner's order D1, 2026-11-10). Run after the owner's level was applied with
 * `deno task bump <kind>`:
 *
 *   deno task release                       (runs `bun scripts/release.ts`)
 *   bun scripts/release.ts --verify-commit  (publish.yml's `checks`, on a release push: the same
 *                                            commit-level gate CI repeats — see below)
 *
 * Guards, before anything is committed — each one a release that went wrong somewhere:
 *   0a. the tree is clean but for the bump's own files, UNTRACKED files counted as dirty, and those
 *       files plain modifications (a rename / add / delete onto one blocks);
 *   0b. on `main`, and either `main` = `origin/main` with the bump in the working tree (changing
 *       NOTHING but the version lines — `bumpOnly`), or `main` = `origin/main` + exactly ONE commit
 *       that passes `verifyReleaseCommit` (a bump already committed, e.g. by the owner's "commit");
 *   0c. the tag absent locally and on origin (a tag that exists has been, or will be, released);
 *   0d. JSR does not already serve the version (a version number is immutable there);
 *   0h. the version it bumps FROM (origin/main's) is released: its tag on origin and on JSR;
 *   0e. COLD checks on exactly what will be committed (`git archive HEAD` unpacked to a temp folder,
 *       plus the bump) with an empty DENO_DIR, as publish.yml's `checks` runs them: `deno check
 *       main.ts`, `deno publish --dry-run`, then `--version` names this version and `--help` exits
 *       0 — so an ignored or skip-worktree file the working copy has but the commit lacks cannot
 *       make them pass; nothing is registered in .git, and Ctrl-C removes the temp folders;
 *   0g. the version's entry in `cmem/release.md` records BOTH required reviews in the strict form
 *       naming the version (`reviewRecordProblem`), the file plain Markdown throughout
 *       (`markdownSubsetProblems`; 🔒 owner 2026-11-12, workspace `review-process.md` § 0, H35).
 * The push is `--no-follow-tags`.
 * Then: commit RELEASE_FILES as `bump to vX.Y.Z` (unless already committed), push `main` as a user,
 * and read it back with `git ls-remote`. **It makes and pushes NO tag** (U4): CI checks the pushed
 * commit, then CI creates the tag, then the Release page from the tag, then publishes to JSR.
 *
 * **CI repeats the commit-level gate** (review round 2, 2026-11-12, finding R2-B): a hand-pushed
 * `bump to` commit — or any push that changes the version — would otherwise be released by CI
 * with none of these guards. `--verify-commit` checks HEAD: subject `bump to v<version>`, a diff
 * against HEAD^ that changes only the version lines of RELEASE_FILES, and both review records.
 *
 * Never `deno publish` here (§ 1 rule 3: a local publish uploads WITHOUT provenance, and that
 * version can never be fixed), never `git tag`. Replaced `scripts/publish.ts` / `deno task publish`
 * on 2026-11-10, which had none of the guards, force-moved a local tag and pushed twice.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import denoJson from "../deno.json" with { type: "json" };
import { jsrHas, lsRemoteHas, lsRemotePeeled, versionAt } from "./publish-workflow.ts";

/** What `deno task bump` writes (deno.json + scripts/sync-version.ts's two mirrors). */
export const RELEASE_FILES = ["deno.json", "package.json", "src/utils.ts"];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A git call's result: `out` is STDOUT only (the only thing parsed), `err` its stderr. */
export type Git = (args: string[]) => { code: number; out: string; err: string };

/**
 * Guard 0g reads `cmem/release.md` only as PLAIN Markdown, and refuses anything else (review round
 * 4, 2026-11-12). Rounds 2–3 had emulated CommonMark's hiding rules, and every round found another
 * construct the emulation missed (a comment in a list item, a fence ended by its item, `<?…?>` /
 * `<style>` / CDATA blocks, indented and setext headings) or wrongly applied (`<!-->`). So instead
 * of deciding what Markdown hides, the gate accepts only a subset in which NOTHING hides text and
 * every heading is spelled one way; a failure is a refusal by line, never a pass. Refused lines:
 *   – a tab in the indentation, or 4+ leading spaces (indented code);
 *   – after any list / quote markers, a line that starts with ``` / ~~~ (a fence) or `<` (an HTML
 *     block — comments, `<?`, `<!X`, `<![CDATA[`, `<style>` …);
 *   – a heading not at column 0 or not followed by a space, and a `===` / `---` line (a setext
 *     underline). Returns "line N: why" for each.
 */
export function markdownSubsetProblems(text: string): string[] {
  const out: string[] = [];
  text.replace(/\r\n/g, "\n").split("\n").forEach((line, i) => {
    const at = `cmem/release.md line ${i + 1}`;
    if (/^ *\t/.test(line)) return out.push(`${at}: a tab in the indentation`);
    if (/^ {4,}\S/.test(line)) return out.push(`${at}: indented 4+ spaces (a code block)`);
    const body = line.replace(/^(?: {0,3}(?:>|[-*+]|\d{1,9}[.)])(?= |$) ?)+/, "").trimStart();
    if (/^(`{3,}|~{3,})/.test(body)) return out.push(`${at}: a code fence`);
    if (body.startsWith("<")) return out.push(`${at}: a line starting with "<" (an HTML block)`);
    if (/^ {1,3}#{1,6}(\s|$)/.test(line)) return out.push(`${at}: an indented heading`);
    if (/^#{1,6}(\t|$)/.test(line)) return out.push(`${at}: a heading without a space`);
    if (/^ {0,3}(=+|-+) *$/.test(line)) return out.push(`${at}: a "===" / "---" line`);
  });
  return out;
}

/**
 * THE record of a required review, and nothing else (cmem/review-process.md § 3):
 *
 *   **Security review (v<version>):** <scope>; rounds <n>; ended by an empty round (round <n>, <YYYY-MM-DD>).
 *
 * The whole paragraph must be exactly this (whitespace and line breaks normalised): the version is
 * the release's (round 4: an entry could borrow the records of the release below it), the scope is
 * plain text, the last round is the empty one (both numbers equal), the date is real, and nothing
 * follows the final period. Round 2 (R2-A): free prose with negating words had let five phrasings
 * of an UNFINISHED review pass; a strict form cannot be half-matched. Returns the problem, or "".
 */
export function reviewRecordProblem(
  paragraph: string,
  kind: "Security" | "Hardening",
  version: string,
): string {
  const p = paragraph.replace(/\s+/g, " ").trim();
  const re = new RegExp(
    `^\\*\\*${kind} review \\(v${
      escapeRe(version)
    }\\):\\*\\* ([^\\s;][^;]*?); rounds (\\d+); ended by an empty round \\(round (\\d+), (\\d{4})-(\\d{2})-(\\d{2})\\)\\.$`,
  );
  const m = re.exec(p);
  const form =
    `"**${kind} review (v${version}):** <scope>; rounds <n>; ended by an empty round (round <n>, <YYYY-MM-DD>)."`;
  if (!m) return `the ${kind.toLowerCase()} review is not in the recorded form ${form}`;
  if (/[<`\\]/.test(m[1])) {
    return `the ${kind.toLowerCase()} review's scope "${
      m[1]
    }" is not plain text (no <, backtick or backslash)`;
  }
  const [, , rounds, last, y, mo, d] = m;
  if (Number(rounds) < 1 || rounds !== last) {
    return `the ${kind.toLowerCase()} review's last round (${last}) is not its round count (${rounds}): the empty round ends it`;
  }
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${y}-${mo}-${d}`) {
    return `the ${kind.toLowerCase()} review's date ${y}-${mo}-${d} is not a real date`;
  }
  return "";
}

/**
 * Guard 0g: the problems with `version`'s entry in `cmem/release.md` (empty = it records both
 * required reviews). The WHOLE file must be plain Markdown (`markdownSubsetProblems`), so nothing
 * in it can hide text. Only the `## Release History` section counts (up to the next `#` / `##`
 * heading); the entry is the `### X.Y.Z` section up to the next `#`–`###` heading (a `####`
 * subheading stays inside it). It must hold exactly one paragraph beginning `**Security review`
 * and one beginning `**Hardening review` at column 0, each in the strict recorded form naming
 * this version (`reviewRecordProblem`).
 */
export function reviewsRecorded(releaseMd: string, version: string): string[] {
  const subset = markdownSubsetProblems(releaseMd);
  if (subset.length) {
    return [
      ...subset,
      "the release gate reads cmem/release.md only as plain Markdown (headings at column 0, paragraphs, lists) — write those lines another way",
    ];
  }
  const lines = releaseMd.replace(/\r\n/g, "\n").split("\n");
  const hist = lines.findIndex((l) => /^## Release History\s*$/.test(l));
  if (hist < 0) return ['cmem/release.md has no "## Release History" section'];
  let histEnd = hist + 1;
  while (histEnd < lines.length && !/^#{1,2} /.test(lines[histEnd])) histEnd++;
  const head = new RegExp(`^### ${escapeRe(version)}(\\s|$)`);
  let start = -1;
  for (let i = hist + 1; i < histEnd && start < 0; i++) if (head.test(lines[i])) start = i;
  if (start < 0) return [`cmem/release.md has no "### ${version}" entry in its Release History`];
  let end = start + 1;
  while (end < histEnd && !/^#{1,3} /.test(lines[end])) end++;
  const paragraphs = lines.slice(start + 1, end).join("\n").split(/\n\s*\n/)
    .map((x) => x.replace(/^\n+/, ""));
  const problems: string[] = [];
  for (const kind of ["Security", "Hardening"] as const) {
    const ps = paragraphs.filter((x) => x.startsWith(`**${kind} review`));
    if (ps.length === 0) {
      problems.push(`the ${version} entry records no **${kind} review (v${version}):** paragraph`);
    } else if (ps.length > 1) {
      problems.push(`the ${version} entry records the ${kind.toLowerCase()} review twice`);
    } else {
      const p = reviewRecordProblem(ps[0], kind, version);
      if (p) problems.push(`the ${version} entry: ${p}`);
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
 * The commit-level release gate, on HEAD — run by CI on every release push (`--verify-commit`) and
 * locally for a bump already committed: the subject is `bump to v<version>`; against HEAD^ it
 * changes only RELEASE_FILES, each by its version line alone (`bumpOnly`); and HEAD's
 * `cmem/release.md` records both required reviews. Returns the problems (empty = it passes).
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
  const diff = git(["diff", "--name-status", "--no-renames", "HEAD^", "HEAD"]);
  if (diff.code !== 0) return [...problems, `could not diff HEAD^..HEAD: ${diff.err.trim()}`];
  const changed = diff.out.split("\n").filter((l) => l.trim() !== "").map((l) => l.split("\t"));
  for (const [status, path] of changed) {
    if (status !== "M" || !RELEASE_FILES.includes(path)) {
      problems.push(
        `the release commit touches ${path} (${status}) — only the version lines of ${
          RELEASE_FILES.join(", ")
        } may change`,
      );
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
  const md = git(["show", "HEAD:cmem/release.md"]);
  if (md.code !== 0) problems.push("HEAD has no cmem/release.md");
  else problems.push(...reviewsRecorded(md.out, version));
  return problems;
}

const version = denoJson.version;
const tag = `v${version}`;

function run(cmd: string[], cwd?: string): void {
  console.log(`$ ${cmd.join(" ")}`);
  const code = spawnSync(cmd[0]!, cmd.slice(1), { stdio: "inherit", cwd }).status ?? 1;
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
  const r = spawnSync(cmd[0]!, cmd.slice(1), { encoding: "utf8", maxBuffer: 1 << 26, ...opts });
  return { code: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
}
const git: Git = (args) => capture(["git", ...args]);
const said = (r: { out: string; err: string }) => (r.err + r.out).trim();

function refuse(why: string, ...detail: string[]): never {
  console.error(`Refusing to release ${tag}: ${why}`);
  for (const d of detail) console.error(`  ${d}`);
  process.exit(1);
}

if (import.meta.main && process.argv[2] === "--verify-commit") {
  // CI (publish.yml `checks`, on a release push): the same gate as a local release, on HEAD.
  const problems = verifyReleaseCommit(version, git);
  if (problems.length) {
    for (const p of problems) console.error(`::error::${tag}: ${p}`);
    console.error(
      `::error::${tag} is not released: push the bump only through \`deno task release\`, after both reviews are recorded.`,
    );
    process.exit(1);
  }
  console.log(`✅ ${tag}: HEAD is the bump commit, version lines only, both reviews recorded`);
  process.exit(0);
}

if (import.meta.main) {
  console.log(`Releasing ${tag}\n`);

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
      "`bump to` commit by hand: CI releases any pushed version change, and refuses one this gate did not pass.",
    );
  }

  // 0g. Both required reviews recorded in the release's entry (HEAD's, committed with the notes).
  const md = git(["show", "HEAD:cmem/release.md"]);
  if (md.code !== 0) refuse("HEAD has no cmem/release.md.", said(md));
  const unreviewed = reviewsRecorded(md.out, version);
  if (unreviewed.length > 0) {
    refuse(
      "the security and hardening reviews are not recorded.",
      ...unreviewed,
      'Run "security review" and "hardening review" to their empty rounds and record both in the',
      "release's entry (cmem/review-process.md § 3), committed with the release notes.",
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
    const unpacked = archived.code === 0 ? capture(["tar", "-xf", tar, "-C", tree]) : archived;
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
