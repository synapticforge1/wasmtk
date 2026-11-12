/**
 * check_release.ts — proves `scripts/release.ts`'s guards do what they promise (no network; git is
 * a fake). The push half of release.ts is rehearsed against a scratch bare origin instead
 * (cmem/workflow.md § The release flow, U4). Review rounds 1–2, 2026-11-12.
 *
 * The review record (guard 0g, `reviewsRecorded` / `reviewRecordProblem`) — the STRICT form
 *   "**Security review:** <scope>; rounds <n>; ended by an empty round (round <n>, <YYYY-MM-DD>).":
 *   R1  both in the form → no problem          R2  no entry → refused
 *   R3  only the security review → the hardening review named as missing
 *   R5  another version's records do not count R6  `### 4.0.0-rc.1` is not 4.0.0
 *   R7  unfinished phrasings round 2 found ("NOT done … —", "hasn't …", "TODO:", "planned to be",
 *       a denial after the phrase) → each refused
 *   R8  the template's own placeholder "(round n, date)" → refused
 *   R9  last round ≠ round count; an impossible date; text after the final period → refused
 *   R10 hidden text does not count: an HTML comment (closed or NOT), a fence (``` / ~~~, a ````
 *       fence closed only by ````, an UNCLOSED fence)
 *   R11 a reviewed entry before, or AFTER, § Release History does not count
 *   R12 a `####` subheading stays inside the entry; R13 CRLF; R14 a record given twice → refused
 * The bump only (guards 0a / 0b, `releaseBlockers`, `bumpOnly`):
 *   B1  untracked / unrelated paths block, the bump's files pass; B2 rename / add / delete block
 *   B3  version-only JSON → accepted; B4 a top-level OR NESTED (`imports`) change → refused
 *   B5  utils.ts: VERSION only → accepted, in any spacing; another edit → refused
 * `lsRemoteHas`: L1 the exact ref only; a warning line that MENTIONS the ref is not one
 * The commit gate CI repeats (`verifyReleaseCommit`, a fake git):
 *   V1  a `bump to` commit, version lines only, both records → passes
 *   V2  a wrong subject; V3 a fourth file in the commit; V4 a ride-along inside deno.json;
 *   V5  the records missing at HEAD → each refused, by name
 *
 * Usage (from the repo root):  bun scripts/check_release.ts
 */
import {
  bumpOnly,
  type Git,
  lsRemoteHas,
  releaseBlockers,
  reviewsRecorded,
  stripHidden,
  verifyReleaseCommit,
} from "./release.ts";

const SEC =
  "**Security review:** everything since v3.0.0; rounds 3; ended by an empty round (round 3, 2026-12-01).";
const HARD =
  "**Hardening review:** the seven axes; rounds 2; ended by an empty round (round 2, 2026-12-01).";
const both = (v: string) =>
  `### ${v} — 2026-12-01\n\n**Summary.** Something changed.\n\n${SEC}\n\n${HARD}\n`;
const doc = (...entries: string[]) => `# release.md\n\n## Release History\n\n${entries.join("\n")}`;
const entry = (...paras: string[]) => doc(`### 4.0.0\n\n${paras.join("\n\n")}\n`);

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

// ── the review record ──
check("R1 both in the strict form", reviewsRecorded(doc(both("4.0.0")), "4.0.0"), null);
check("R2 no entry", reviewsRecorded(doc(both("3.0.0")), "4.0.0"), /no "### 4\.0\.0" entry/);
check("R3 hardening missing", reviewsRecorded(entry(SEC), "4.0.0"), /no \*\*Hardening review:\*\*/);
check(
  "R5 another version's records do not count",
  reviewsRecorded(doc("### 4.0.0 — 2026-12-02\n\n**Summary.** none\n", both("3.0.0")), "4.0.0"),
  /no \*\*Security review:\*\*/,
);
check(
  "R6 4.0.0-rc.1 is not 4.0.0",
  reviewsRecorded(doc(both("4.0.0-rc.1")), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
for (
  const [label, sec] of [
    [
      "NOT done … —",
      "**Security review:** NOT done for v3.0.4 — ended by an empty round (round 2, 2026-12-01).",
    ],
    ["hasn't … yet", "**Security review:** it hasn't ended by an empty round (round 2) yet."],
    ["TODO:", "**Security review:** TODO: ended by an empty round (round 2)."],
    [
      "planned to be",
      "**Security review:** planned to be ended by an empty round (round 2, 2026-12-01).",
    ],
    [
      "a denial after",
      "**Security review:** x; rounds 2; ended by an empty round (round 2, 2026-12-01). No — round 2 found 3.",
    ],
  ]
) {
  check(
    `R7 unfinished: ${label}`,
    reviewsRecorded(entry(sec, HARD), "4.0.0"),
    /security review is not in the recorded form/,
  );
}
check(
  "R8 the template's placeholder",
  reviewsRecorded(
    entry(
      "**Security review:** <scope>; rounds <n>; ended by an empty round (round n, date).",
      HARD,
    ),
    "4.0.0",
  ),
  /security review is not in the recorded form/,
);
check(
  "R9a last round ≠ round count",
  reviewsRecorded(
    entry("**Security review:** x; rounds 3; ended by an empty round (round 2, 2026-12-01).", HARD),
    "4.0.0",
  ),
  /last round \(2\) is not its round count \(3\)/,
);
check(
  "R9b an impossible date",
  reviewsRecorded(
    entry("**Security review:** x; rounds 2; ended by an empty round (round 2, 2026-02-30).", HARD),
    "4.0.0",
  ),
  /2026-02-30 is not a real date/,
);
check(
  "R9c rounds 0",
  reviewsRecorded(
    entry("**Security review:** x; rounds 0; ended by an empty round (round 0, 2026-12-01).", HARD),
    "4.0.0",
  ),
  /round count \(0\)/,
);
check(
  "R10a inside a closed HTML comment",
  reviewsRecorded(doc(`<!--\n${both("4.0.0")}\n-->\n`), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
check(
  "R10b inside an UNCLOSED HTML comment",
  reviewsRecorded(doc(`<!--\n${both("4.0.0")}\n`), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
check(
  "R10c inside a ``` fence (blank lines inside)",
  reviewsRecorded(entry("```", "", SEC, HARD, "```"), "4.0.0"),
  /no \*\*Security review:\*\*/,
);
check(
  "R10d inside a ```` fence holding an inner ``` (closed only by ````)",
  reviewsRecorded(entry("````", "```", SEC, HARD, "```", "````"), "4.0.0"),
  /no \*\*Security review:\*\*/,
);
check(
  "R10e inside an UNCLOSED ~~~ fence",
  reviewsRecorded(entry("~~~", "", SEC, HARD), "4.0.0"),
  /no \*\*Security review:\*\*/,
);
check(
  "R11a a reviewed entry BEFORE § Release History",
  reviewsRecorded(
    `# r\n\n## Plans\n\n${both("4.0.0")}\n## Release History\n\n### 4.0.0\n\n**Summary.** x\n`,
    "4.0.0",
  ),
  /no \*\*Security review:\*\*/,
);
check(
  "R11b a reviewed entry in a section AFTER § Release History",
  reviewsRecorded(
    `# r\n\n## Release History\n\n### 3.0.0\n\n**Summary.** x\n\n## Plans\n\n${both("4.0.0")}`,
    "4.0.0",
  ),
  /no "### 4\.0\.0" entry/,
);
check(
  "R12 a #### subheading stays inside",
  reviewsRecorded(entry("#### Reviews", SEC, HARD), "4.0.0"),
  null,
);
check("R13 CRLF", reviewsRecorded(doc(both("4.0.0")).replace(/\n/g, "\r\n"), "4.0.0"), null);
check(
  "R14 a record given twice",
  reviewsRecorded(entry(SEC, SEC, HARD), "4.0.0"),
  /security review twice/,
);
is(
  "R15 stripHidden keeps text after a closed comment and a closed fence",
  stripHidden("a\n<!-- x -->b\n```\nc\n```\nd").split("\n").join("|") === "a|b|d",
  JSON.stringify(stripHidden("a\n<!-- x -->b\n```\nc\n```\nd")),
);

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
  const MD = `# r\n\n## Release History\n\n${both("4.0.0")}`;
  const commitGit = (o: {
    subject?: string;
    diff?: string;
    files?: Record<string, [string, string]>;
    md?: string | null;
  } = {}): Git => {
    const files = o.files ?? { "deno.json": [DJ, bumpV(DJ)] };
    return (args) => {
      if (args[0] === "log") return { code: 0, out: `${o.subject ?? "bump to v4.0.0"}\n`, err: "" };
      if (args[0] === "diff") {
        return {
          code: 0,
          out: o.diff ?? Object.keys(files).map((f) => `M\t${f}`).join("\n") + "\n",
          err: "",
        };
      }
      if (args[0] === "show") {
        const [rev, path] = args[1].split(":");
        if (path === "cmem/release.md") {
          return o.md === null
            ? { code: 128, out: "", err: "fatal: no such path" }
            : { code: 0, out: o.md ?? MD, err: "" };
        }
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
    verifyReleaseCommit("4.0.0", commitGit({ diff: "M\tdeno.json\nM\tsrc/wasic.ts\n" })),
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
  check(
    "V5 the records missing at HEAD",
    verifyReleaseCommit("4.0.0", commitGit({ md: doc("### 4.0.0\n\n**Summary.** none\n") })),
    /no \*\*Security review:\*\*/,
  );
}

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
