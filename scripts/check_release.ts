/**
 * check_release.ts — proves `scripts/release.ts`'s guards do what they promise (no network; git is
 * a fake). The push half of release.ts is rehearsed against a scratch bare origin instead
 * (cmem/workflow.md § The release flow, U4). Review rounds 1–2, 2026-11-12.
 *
 * The review gate (guard 0g since 2026-11-20, `scripts/review-gate.ts`; letter H37 (d)) — it
 * replaced the record-paragraph cases R1–R16 and X1 (the retired `--verify-commit`):
 *   G1  "Review complete: <sha>" → the commit; G2 "none", no line, two lines, not hex → refused
 *   G3  a BOM / CRLF file still reads    G4 the bump, CHANGELOG.md and cmem/ are reviewed;
 *       anything else, and the issues file itself, are not
 *   G5  passes: an ancestor, only allowed files changed (committed AND in the working tree)
 *   G6  no issues file; G7 not an ancestor; G8 an unknown commit; G9 a src/ change committed
 *       since; G10 an uncommitted src/ change → each refused, by name
 * The bump only (guards 0a / 0b, `releaseBlockers`, `bumpOnly`):
 *   B1  untracked / unrelated paths block, the bump's files pass; B2 rename / add / delete block
 *   B3  version-only JSON → accepted; B4 a top-level OR NESTED (`imports`) change → refused
 *   B5  utils.ts: VERSION only → accepted, in any spacing; another edit → refused
 * `lsRemoteHas`: L1 the exact ref only; a warning line that MENTIONS the ref is not one
 * The commit gate for a bump already committed (`verifyReleaseCommit`, a fake git):
 *   V1  a `bump to` commit, version lines only → passes
 *   V2  a wrong subject; V3 a fourth file in the commit; V4 a ride-along inside deno.json
 *       → each refused, by name
 * Round 3:
 *   V6  deno.json bumped alone (package.json / VERSION left behind) → refused, each by name
 *   V7  HEAD^ already at the version (a "bump" that bumps nothing) → refused
 *   V8  a merge / V9 a root commit is not a release commit
 *   B6  a VERSION in a comment is not the constant; two constants → refused
 * Round 4: B7 a release file that is not JSON
 *
 * Usage (from the repo root):  bun scripts/check_release.ts
 */
import {
  bumpOnly,
  type Git,
  lsRemoteHas,
  releaseBlockers,
  verifyReleaseCommit,
} from "./release.ts";
import { reviewedCommit, reviewGate, unreviewedFiles } from "./review-gate.ts";

let failed = 0;
let cases = 0;
const check = (name: string, got: string[], want: RegExp | null) => {
  cases++;
  const ok = want === null ? got.length === 0 : got.some((p) => want.test(p));
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got.length ? got.join(" | ") : "no problem"}`);
};
const is = (name: string, ok: boolean, got: string) => {
  cases++;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got}`);
};

// ── the bump only ──
{
  const blocked = releaseBlockers(
    " M deno.json\n M package.json\nM  src/utils.ts\n?? stray.ts\n M src/wasic.ts\n",
  );
  is(
    "B1 untracked / unrelated block, the bump's files pass",
    blocked.length === 2 && blocked.some((l) => l.includes("stray.ts")) &&
      blocked.some((l) => l.includes("src/wasic.ts")),
    blocked.join(" | "),
  );
  const moved = releaseBlockers("R  src/old.ts -> src/utils.ts\nA  deno.json\n D package.json\n");
  is("B2 rename / add / delete onto a release file block", moved.length === 3, moved.join(" | "));
}
const DJ =
  '{\n  "name": "@x/y",\n  "version": "3.0.0",\n  "description": "d",\n  "imports": { "a": "jsr:@b/x@1.0.0" }\n}\n';
const bumpV = (s: string) => s.replace('"3.0.0"', '"4.0.0"');
{
  const pj = JSON.stringify({ name: "@x/y", version: "3.0.0", type: "module" }, null, 2) + "\n";
  const ok3 = bumpOnly("deno.json", DJ, bumpV(DJ), "4.0.0") === "" &&
    bumpOnly("package.json", pj, bumpV(pj), "4.0.0") === "";
  is("B3 version-only JSON → accepted", ok3, "deno.json, package.json");
  const top = bumpOnly("deno.json", DJ, bumpV(DJ).replace('"d"', '"RIDE-ALONG"'), "4.0.0");
  const nested = bumpOnly("deno.json", DJ, bumpV(DJ).replace("@1.0.0", "@9.9.9"), "4.0.0");
  is(
    "B4 a top-level OR nested (imports) change → refused",
    /changes more than its version line/.test(top) &&
      /changes more than its version line/.test(nested),
    `${top} / ${nested}`,
  );
  const ut = 'export const VERSION = "3.0.0";\nexport const X = 1;\n';
  const tight = 'export const VERSION="3.0.0";\n';
  const utOk = bumpOnly("src/utils.ts", ut, bumpV(ut), "4.0.0");
  const tightOk = bumpOnly("src/utils.ts", tight, bumpV(tight), "4.0.0");
  const utBad = bumpOnly("src/utils.ts", ut, bumpV(ut).replace("X = 1", "X = 2"), "4.0.0");
  is(
    "B5 utils.ts: VERSION only (any spacing) → accepted; another edit → refused",
    utOk === "" && tightOk === "" && /changes more than its VERSION line/.test(utBad),
    `${utOk || "accepted"} / ${tightOk || "accepted"} / ${utBad}`,
  );
}

// ── lsRemoteHas ──
{
  const sha = "a".repeat(40);
  is(
    "L1 the exact ref only; a warning that MENTIONS the ref is not one",
    !lsRemoteHas(`${sha}\trefs/tags/v3.0.10\n`, "refs/tags/v3.0.1") &&
      lsRemoteHas(`${sha}\trefs/tags/v3.0.10\n`, "refs/tags/v3.0.10") &&
      !lsRemoteHas("warning: refs/tags/v3.0.1 is ambiguous\n", "refs/tags/v3.0.1") &&
      !lsRemoteHas("", "refs/tags/v3.0.1"),
    "v3.0.1 ≠ v3.0.10; a warning line; empty",
  );
}

// ── the commit gate CI repeats ──
{
  const PJ = JSON.stringify({ name: "@x/y", version: "3.0.0", type: "module" }, null, 2) + "\n";
  const UT = 'export const VERSION = "3.0.0";\nexport const X = 1;\n';
  // All three release files, bumped (round 3: the gate now reads every one, changed or not).
  const BUMPED: Record<string, [string, string]> = {
    "deno.json": [DJ, bumpV(DJ)],
    "package.json": [PJ, bumpV(PJ)],
    "src/utils.ts": [UT, bumpV(UT)],
  };
  // One `git diff --raw --no-abbrev` line, as real git prints it (round 5: the gate reads modes).
  const raw = (status: string, path: string, modes = ["100644", "100644"]) =>
    `:${modes[0]} ${modes[1]} ${"a".repeat(40)} ${"b".repeat(40)} ${status}\t${path}`;
  const commitGit = (o: {
    subject?: string;
    diff?: string;
    files?: Record<string, [string, string]>;
    parents?: number;
  } = {}): Git => {
    const files = { ...BUMPED, ...o.files };
    return (args) => {
      if (args[0] === "rev-list") {
        const ids = ["1", "2", "3"].slice(0, o.parents ?? 1).map((c) => c.repeat(40));
        return { code: 0, out: `${"f".repeat(40)} ${ids.join(" ")}`.trim() + "\n", err: "" };
      }
      if (args[0] === "log") return { code: 0, out: `${o.subject ?? "bump to v4.0.0"}\n`, err: "" };
      if (args[0] === "diff") {
        return {
          code: 0,
          out: o.diff ??
            Object.keys(files).filter((f) => files[f][0] !== files[f][1]).map((f) => raw("M", f))
                .join("\n") + "\n",
          err: "",
        };
      }
      if (args[0] === "show") {
        const [rev, path] = args[1].split(":");
        const pair = files[path];
        if (!pair) return { code: 128, out: "", err: "fatal: no such path" };
        return { code: 0, out: rev === "HEAD^" ? pair[0] : pair[1], err: "" };
      }
      return { code: 1, out: "", err: "fake git: unexpected" };
    };
  };
  check("V1 a releasable bump commit passes", verifyReleaseCommit("4.0.0", commitGit()), null);
  check(
    "V2 a wrong subject",
    verifyReleaseCommit("4.0.0", commitGit({ subject: "fix: something" })),
    /not "bump to v4\.0\.0"/,
  );
  check(
    "V3 a fourth file in the commit",
    verifyReleaseCommit(
      "4.0.0",
      commitGit({ diff: `${raw("M", "deno.json")}\n${raw("M", "src/wasic.ts")}\n` }),
    ),
    /touches src\/wasic\.ts/,
  );
  check(
    "V4 a ride-along inside deno.json",
    verifyReleaseCommit(
      "4.0.0",
      commitGit({ files: { "deno.json": [DJ, bumpV(DJ).replace('"d"', '"X"')] } }),
    ),
    /deno\.json changes more than its version line/,
  );
  // Round 3.
  check(
    "V6 deno.json bumped ALONE (package.json / VERSION left behind) → refused (A1)",
    verifyReleaseCommit(
      "4.0.0",
      commitGit({ files: { "package.json": [PJ, PJ], "src/utils.ts": [UT, UT] } }),
    ),
    /package\.json's version is 3\.0\.0, not 4\.0\.0/,
  );
  {
    const v6b = verifyReleaseCommit(
      "4.0.0",
      commitGit({ files: { "package.json": [PJ, PJ], "src/utils.ts": [UT, UT] } }),
    );
    check("V6b … and VERSION too, by name", v6b, /src\/utils\.ts's VERSION constant is 3\.0\.0/);
  }
  {
    const at4 = bumpV(DJ);
    check(
      "V7 HEAD^ already at the version: a 'bump' that bumps nothing → refused (B1)",
      verifyReleaseCommit(
        "4.0.0",
        commitGit({
          diff: `${raw("M", "deno.json")}\n`,
          files: {
            "deno.json": [at4, at4],
            "package.json": [bumpV(PJ), bumpV(PJ)],
            "src/utils.ts": [bumpV(UT), bumpV(UT)],
          },
        }),
      ),
      /HEAD\^ is already at 4\.0\.0/,
    );
  }
  check(
    "V11 a MODE change on a release file rides along → refused (round 5)",
    verifyReleaseCommit(
      "4.0.0",
      commitGit({
        diff: `${raw("M", "deno.json")}\n${raw("M", "package.json")}\n${
          raw("M", "src/utils.ts", ["100644", "100755"])
        }\n`,
      }),
    ),
    /changes src\/utils\.ts's mode \(100644 → 100755\)/,
  );
  check(
    "V8 a MERGE commit is not a release commit",
    verifyReleaseCommit("4.0.0", commitGit({ parents: 2 })),
    /HEAD has 2 parent\(s\)/,
  );
  check(
    "V9 a root commit is not a release commit",
    verifyReleaseCommit("4.0.0", commitGit({ parents: 0 })),
    /HEAD has 0 parent\(s\)/,
  );
}

// ── round 4: what the suites had not reached ──
{
  const valid = JSON.stringify({ name: "@x/y", version: "3.0.0" }, null, 2) + "\n";
  const broken = bumpOnly("package.json", valid, "{ broken", "4.0.0");
  is(
    "B7 a release file that is not valid JSON after the bump → refused",
    /package\.json is not valid JSON/.test(broken),
    broken || "accepted",
  );
}
{
  // ── the review gate (guard 0g since 2026-11-20, scripts/review-gate.ts; letter H37 (d)) ──
  const SHA = "0123456789abcdef0123456789abcdef01234567";
  const RF = ["deno.json", "package.json", "src/utils.ts"];
  const done = `# review-issues\n\nReview complete: ${SHA}\n`;
  const r1 = reviewedCommit(done);
  is(
    'G1 "Review complete: <sha>" → the commit',
    "commit" in r1 && r1.commit === SHA,
    JSON.stringify(r1),
  );
  const refusals = [
    reviewedCommit("Review complete: none\n"),
    reviewedCommit("# nothing here\n"),
    reviewedCommit(`Review complete: ${SHA}\nReview complete: ${SHA}\n`),
    reviewedCommit("Review complete: main\n"),
    reviewedCommit("Review complete:\n"),
  ];
  is(
    "G2 none / no line / two lines / not hex / empty → each refused",
    refusals.every((r) => "refusal" in r) &&
      "refusal" in refusals[0] && /says no review is complete/.test(refusals[0].refusal),
    refusals.map((r) => ("refusal" in r ? r.refusal : "ACCEPTED")).join(" | "),
  );
  const bom = reviewedCommit(`﻿Review complete: ${SHA}\r\n`);
  is("G3 a BOM and CRLF still read", "commit" in bom && bom.commit === SHA, JSON.stringify(bom));
  const outside = unreviewedFiles(
    [
      "deno.json",
      "package.json",
      "src/utils.ts",
      "CHANGELOG.md",
      "cmem/release.md",
      "cmem/STATE.md",
      "cmem/review-issues.md",
      "src/wasic.ts",
      "README.md",
      ".github/workflows/publish.yml",
    ],
    RF,
  );
  is(
    "G4 the bump, CHANGELOG.md and cmem/ are reviewed; the issues file and anything else are not",
    outside.join(",") ===
      "cmem/review-issues.md,src/wasic.ts,README.md,.github/workflows/publish.yml",
    outside.join(","),
  );
  const fake = (o: { anc?: number; committed?: string; working?: string } = {}): Git => (args) => {
    if (args[0] === "merge-base") {
      const code = o.anc ?? 0;
      return { code, out: "", err: code > 1 ? `fatal: Not a valid commit name ${args[2]}` : "" };
    }
    if (args[0] === "diff" && args.length === 5) {
      return { code: 0, out: o.committed ?? "", err: "" };
    }
    if (args[0] === "diff") return { code: 0, out: o.working ?? "", err: "" };
    return { code: 1, out: "", err: "fake git: unexpected" };
  };
  check(
    "G5 an ancestor; only the bump, CHANGELOG.md and cmem/ changed since → passes",
    reviewGate(
      done,
      fake({ committed: "cmem/STATE.md\nCHANGELOG.md\n", working: "deno.json\npackage.json\n" }),
      RF,
    ),
    null,
  );
  check("G6 no issues file → refused", reviewGate(null, fake(), RF), /no cmem\/review-issues\.md/);
  check(
    "G7 not an ancestor of HEAD → refused",
    reviewGate(done, fake({ anc: 1 }), RF),
    /not an ancestor/,
  );
  check(
    "G8 an unknown commit → refused",
    reviewGate(done, fake({ anc: 128 }), RF),
    /not a commit here/,
  );
  check(
    "G9 a src/ change COMMITTED since the review → refused, by name",
    reviewGate(done, fake({ committed: "cmem/STATE.md\nsrc/wasic.ts\n" }), RF),
    /^  src\/wasic\.ts$/,
  );
  check(
    "G10 an UNCOMMITTED src/ change → refused, by name",
    reviewGate(done, fake({ working: "src/host.ts\n" }), RF),
    /^  src\/host\.ts$/,
  );
}
{
  const h = '// export const VERSION = "3.0.0";\nexport const VERSION = "3.0.0";\n';
  const commentOnly = bumpOnly(
    "src/utils.ts",
    h,
    h.replace('// export const VERSION = "3.0.0"', '// export const VERSION = "4.0.0"'),
    "4.0.0",
  );
  const twice = 'export const VERSION = "3.0.0";\nexport const VERSION = "3.0.0";\n';
  const two = bumpOnly("src/utils.ts", twice, twice.replace(/3\.0\.0/g, "4.0.0"), "4.0.0");
  is(
    "B6 a VERSION in a COMMENT is not the constant; two constants → refused",
    /VERSION constant is 3\.0\.0/.test(commentOnly) && /2 VERSION constants/.test(two),
    `${commentOnly} / ${two}`,
  );
}

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
