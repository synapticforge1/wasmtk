/**
 * review-gate.ts — the release's FIRST step (workspace review standard § 9, letter H37 (d),
 * 2026-11-20): "the release tooling runs the review set as its first step". The review itself is
 * agent work (the five classes, `cmem/review-process.md`) and cannot run inside a script, so
 * `deno task release` checks its RESULT, as LeptonPad, rsxtk and zilc do:
 *
 *   - the gitignored `cmem/review-issues.md` holds exactly one line `Review complete: <commit>`,
 *     written by the main agent only when a re-review came back empty in every class and the full
 *     suite then passed (`Review complete: none` until then);
 *   - that commit is an ancestor of HEAD (the review read this branch's code);
 *   - nothing a review reads changed since it: only the bump's own files, `CHANGELOG.md` and
 *     project memory (`cmem/`, the issues file excepted) may differ from the reviewed commit.
 *
 * It replaced guard 0g's check of two record paragraphs in `cmem/release.md` (H35, 2026-11-12).
 */

/** The file the gate reads (gitignored; `scripts/check-privacy.ts` refuses it tracked). */
export const ISSUES_FILE = "cmem/review-issues.md";

/** A git call's result (the same shape as release.ts's `Git`). */
export type Git = (args: string[]) => { code: number; out: string; err: string };

/**
 * The reviewed commit the issues file records, or why it records none: exactly one line
 * `Review complete: <7–40 hex digits>`; `none`, an empty value, no line or two lines refuse.
 */
export function reviewedCommit(text: string): { commit: string } | { refusal: string } {
  const t = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n"); // a Windows editor's BOM / CRLF
  const lines = [...t.matchAll(/^Review complete:[ \t]*(\S*)[ \t]*$/gm)];
  if (lines.length === 0) return { refusal: `no "Review complete:" line in ${ISSUES_FILE}` };
  if (lines.length > 1) {
    return { refusal: `more than one "Review complete:" line in ${ISSUES_FILE}` };
  }
  const value = lines[0][1];
  if (value === "" || value === "none") {
    return {
      refusal: `${ISSUES_FILE} says no review is complete ("Review complete: ${value || "none"}")`,
    };
  }
  if (!/^[0-9a-f]{7,40}$/.test(value)) {
    return { refusal: `"Review complete: ${value}" is not a commit id` };
  }
  return { commit: value };
}

/** The changed paths (as git prints them) that hold code or docs the review did not read. */
export function unreviewedFiles(
  changed: readonly string[],
  releaseFiles: readonly string[],
): string[] {
  return [...new Set(changed)].filter((p) =>
    !(releaseFiles.includes(p) || p === "CHANGELOG.md" ||
      (p.startsWith("cmem/") && p !== ISSUES_FILE))
  );
}

/**
 * The gate: the problems (empty = the release may proceed). `issues` is the issues file's text, or
 * null when it does not exist. Changes are read committed (`<reviewed>..HEAD`) and in the working
 * tree (`HEAD` against it), so an uncommitted edit outside the allowed files counts too.
 */
export function reviewGate(
  issues: string | null,
  git: Git,
  releaseFiles: readonly string[],
): string[] {
  if (issues === null) {
    return [`no ${ISSUES_FILE}: run "review" (the five classes, cmem/review-process.md) first`];
  }
  const r = reviewedCommit(issues);
  if ("refusal" in r) return [r.refusal];
  const anc = git(["merge-base", "--is-ancestor", r.commit, "HEAD"]);
  if (anc.code === 1) {
    return [
      `the reviewed commit ${r.commit} is not an ancestor of HEAD: the review read other code`,
    ];
  }
  if (anc.code !== 0) {
    return [`the reviewed commit ${r.commit} is not a commit here: ${anc.err.trim()}`];
  }
  const committed = git(["diff", "--name-only", "--no-renames", r.commit, "HEAD"]);
  const working = git(["diff", "--name-only", "--no-renames", "HEAD"]);
  if (committed.code !== 0 || working.code !== 0) {
    return [`could not diff against the reviewed commit: ${(committed.err + working.err).trim()}`];
  }
  const changed = (committed.out + "\n" + working.out).split("\n").map((l) => l.trim()).filter(
    Boolean,
  );
  const outside = unreviewedFiles(changed, releaseFiles);
  if (outside.length === 0) return [];
  return [
    `${outside.length} file(s) changed since the reviewed commit ${r.commit}, outside the bump and cmem/:`,
    ...outside.slice(0, 10).map((p) => `  ${p}`),
    ...(outside.length > 10 ? [`  ... and ${outside.length - 10} more`] : []),
    "Re-review the changes (a re-review reads the changes only, review-process.md § 9), then update the line.",
  ];
}
