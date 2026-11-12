/**
 * check_release.ts — proves `scripts/release.ts`'s guards do what they promise (no network; git is
 * a fake). The push half of release.ts is rehearsed against a scratch bare origin instead
 * (cmem/workflow.md § The release flow, U4). Review rounds 1–2, 2026-11-12.
 *
 * The review record (guard 0g, `reviewsRecorded` / `reviewRecordProblem`) — the STRICT form
 *   "**Security review (v<version>):** <scope>; rounds <n>; ended by an empty round (round <n>, <YYYY-MM-DD>).":
 *   R1  both in the form → no problem          R2  no entry → refused
 *   R3  only the security review → the hardening review named as missing
 *   R5  another version's records do not count R6  `### 4.0.0-rc.1` is not 4.0.0
 *   R7  unfinished phrasings round 2 found ("NOT done … —", "hasn't …", "TODO:", "planned to be",
 *       a denial after the phrase) → each refused
 *   R8  the template's own placeholder "(round n, date)" → refused
 *   R9  last round ≠ round count; an impossible date; text after the final period → refused
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
 * Round 3:
 *   V6  deno.json bumped alone (package.json / VERSION left behind) → refused, each by name
 *   V7  HEAD^ already at the version (a "bump" that bumps nothing) → refused
 *   V8  a merge / V9 a root commit is not a release commit
 *   B6  a VERSION in a comment is not the constant; two constants → refused
 * Round 4 — the record names its version, and cmem/release.md must be PLAIN Markdown:
 *   R9d an empty scope; R9e a scope with a backtick / <  → refused
 *   R10a–p every construct that can hide text (comments, fences — in lists and quotes too —
 *       `<?`, `<style>`, CDATA, `<!X`, `<!-->`, 4-space / tab indentation) → refused BY LINE
 *   R11c–e an indented / tab / setext heading → refused   R11f an entry cannot borrow the next
 *       entry's records (they name their version)   R15 an inline `<!--` is text
 *   R16 the REAL cmem/release.md is inside the subset
 *   V10 no cmem/release.md at HEAD   B7 a release file that is not JSON
 *   X1  the `--verify-commit` COMMAND's exit codes, in a real git repo
 *
 * Usage (from the repo root):  bun scripts/check_release.ts
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bumpOnly,
  type Git,
  lsRemoteHas,
  markdownSubsetProblems,
  releaseBlockers,
  reviewsRecorded,
  verifyReleaseCommit,
} from "./release.ts";

const secFor = (v: string) =>
  `**Security review (v${v}):** everything since v3.0.0; rounds 3; ended by an empty round (round 3, 2026-12-01).`;
const hardFor = (v: string) =>
  `**Hardening review (v${v}):** the seven axes; rounds 2; ended by an empty round (round 2, 2026-12-01).`;
const SEC = secFor("4.0.0");
const HARD = hardFor("4.0.0");
const both = (v: string) =>
  `### ${v} — 2026-12-01\n\n**Summary.** Something changed.\n\n${secFor(v)}\n\n${hardFor(v)}\n`;
const SUBSET =
  /line \d+: (a code fence|a line starting with "<"|indented 4\+ spaces|a tab|an indented heading|a heading without a space|a "===" \/ "---" line)/;
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
check("R3 hardening missing", reviewsRecorded(entry(SEC), "4.0.0"), /no \*\*Hardening review/);
check(
  "R5 another version's records do not count",
  reviewsRecorded(doc("### 4.0.0 — 2026-12-02\n\n**Summary.** none\n", both("3.0.0")), "4.0.0"),
  /no \*\*Security review/,
);
check(
  "R6 4.0.0-rc.1 is not 4.0.0",
  reviewsRecorded(doc(both("4.0.0-rc.1")), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
const S = "**Security review (v4.0.0):**";
for (
  const [label, sec] of [
    ["NOT done … —", `${S} NOT done for v3.0.4 — ended by an empty round (round 2, 2026-12-01).`],
    ["hasn't … yet", `${S} it hasn't ended by an empty round (round 2) yet.`],
    ["TODO:", `${S} TODO: ended by an empty round (round 2).`],
    ["planned to be", `${S} planned to be ended by an empty round (round 2, 2026-12-01).`],
    [
      "a denial after",
      `${S} x; rounds 2; ended by an empty round (round 2, 2026-12-01). No — round 2 found 3.`,
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
    entry(`${S} <scope>; rounds <n>; ended by an empty round (round n, date).`, HARD),
    "4.0.0",
  ),
  /security review is not in the recorded form/,
);
check(
  "R9a last round ≠ round count",
  reviewsRecorded(
    entry(`${S} x; rounds 3; ended by an empty round (round 2, 2026-12-01).`, HARD),
    "4.0.0",
  ),
  /last round \(2\) is not its round count \(3\)/,
);
check(
  "R9b an impossible date",
  reviewsRecorded(
    entry(`${S} x; rounds 2; ended by an empty round (round 2, 2026-02-30).`, HARD),
    "4.0.0",
  ),
  /2026-02-30 is not a real date/,
);
check(
  "R9c rounds 0",
  reviewsRecorded(
    entry(`${S} x; rounds 0; ended by an empty round (round 0, 2026-12-01).`, HARD),
    "4.0.0",
  ),
  /round count \(0\)/,
);
check(
  "R9d an EMPTY scope → refused",
  reviewsRecorded(
    entry(`${S} ; rounds 1; ended by an empty round (round 1, 2026-12-01).`, HARD),
    "4.0.0",
  ),
  /security review is not in the recorded form/,
);
check(
  "R9e a scope that is not plain text (a backtick / <) → refused",
  reviewsRecorded(
    entry(`${S} the \`x\` tool; rounds 1; ended by an empty round (round 1, 2026-12-01).`, HARD),
    "4.0.0",
  ),
  /scope .* is not plain text/,
);
// Round 4: the file must be PLAIN Markdown — every construct that can hide text is refused by
// line, whether or not it hides the records (rounds 2–3 had emulated CommonMark and missed cases).
for (
  const [label, md] of [
    ["R10a a closed HTML comment", doc(`<!--\n${both("4.0.0")}\n-->\n`)],
    ["R10b an UNCLOSED HTML comment", doc(`<!--\n${both("4.0.0")}\n`)],
    ["R10c a ``` fence", entry("```", "", SEC, HARD, "```")],
    ["R10d a ```` fence", entry("````", "```", SEC, HARD, "```", "````")],
    ["R10e an UNCLOSED ~~~ fence", entry("~~~", "", SEC, HARD)],
    ["R10f a comment opened in a LIST ITEM", entry("- <!--", `  ${SEC}`, `  ${HARD}`, "  -->")],
    ["R10g a fence in a list item", entry("- ```\n  code\n```", SEC, HARD)],
    ["R10h a <? … ?> block", entry("<?", SEC, HARD, "?>")],
    ["R10i a <style> block", entry("<style>", SEC, HARD, "</style>")],
    ["R10j a <![CDATA[ block", entry("<![CDATA[", SEC, HARD, "]]>")],
    ["R10k a <!X declaration", entry("<!X", SEC, HARD, ">")],
    ["R10l a record indented 4 spaces", entry(`    ${SEC}`, HARD)],
    ["R10m a tab-indented line", entry(`\t${SEC}`, HARD)],
    ["R10n a quoted fence", entry("> ```", SEC, HARD)],
    ["R10o a <!--> line", entry("<!-->", SEC, HARD)],
    ["R10p a numbered fence in a paragraph", entry("text\n5. ```", SEC, HARD)],
  ]
) check(`${label} → refused by line`, reviewsRecorded(md, "4.0.0"), SUBSET);
for (
  const [label, md] of [
    ["R11c an INDENTED heading", doc("### 4.0.0\n\nNotes.\n\n ### 3.9.9\n", both("3.9.9"))],
    ["R11d a heading with a TAB", doc("### 4.0.0\n\nNotes.\n\n###\t3.9.9\n", both("3.9.9"))],
    ["R11e a SETEXT heading", doc("### 4.0.0\n\nNotes.\n\n3.9.9\n-----\n", both("3.9.9"))],
  ]
) {
  check(
    `${label} → refused by line (an entry could run into it)`,
    reviewsRecorded(md, "4.0.0"),
    SUBSET,
  );
}
check(
  "R11f the next entry's records NAME its version: an entry cannot borrow them",
  reviewsRecorded(
    doc("### 4.0.0\n\nNotes.\n", `#### 3.9.9\n\n${secFor("3.9.9")}\n\n${hardFor("3.9.9")}\n`),
    "4.0.0",
  ),
  /security review is not in the recorded form "\*\*Security review \(v4\.0\.0\):\*\*/,
);
check(
  "R11a a reviewed entry BEFORE § Release History",
  reviewsRecorded(
    `# r\n\n## Plans\n\n${both("4.0.0")}\n## Release History\n\n### 4.0.0\n\n**Summary.** x\n`,
    "4.0.0",
  ),
  /no \*\*Security review/,
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
check(
  "R15 an inline `<!--` mid-line in prose is text (no false refusal)",
  reviewsRecorded(entry("Note: write `<!--` to hide; text <!-- here too.", SEC, HARD), "4.0.0"),
  null,
);
{
  // The REAL cmem/release.md is inside the subset (a false refusal would block every release).
  const here = dirname(fileURLToPath(import.meta.url));
  const real = markdownSubsetProblems(readFileSync(join(here, "..", "cmem", "release.md"), "utf8"));
  is(
    "R16 the real cmem/release.md is plain Markdown",
    real.length === 0,
    real.join(" | ") || "yes",
  );
}

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
  const PJ = JSON.stringify({ name: "@x/y", version: "3.0.0", type: "module" }, null, 2) + "\n";
  const UT = 'export const VERSION = "3.0.0";\nexport const X = 1;\n';
  // All three release files, bumped (round 3: the gate now reads every one, changed or not).
  const BUMPED: Record<string, [string, string]> = {
    "deno.json": [DJ, bumpV(DJ)],
    "package.json": [PJ, bumpV(PJ)],
    "src/utils.ts": [UT, bumpV(UT)],
  };
  const commitGit = (o: {
    subject?: string;
    diff?: string;
    files?: Record<string, [string, string]>;
    md?: string | null;
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
            Object.keys(files).filter((f) => files[f][0] !== files[f][1]).map((f) => `M\t${f}`)
                .join("\n") + "\n",
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
    /no \*\*Security review/,
  );
  check(
    "V10 HEAD has NO cmem/release.md → refused (round 4: never reached before)",
    verifyReleaseCommit("4.0.0", commitGit({ md: null })),
    /HEAD has no cmem\/release\.md/,
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
          diff: "M\tdeno.json\n",
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
  // X1: the `--verify-commit` COMMAND, as CI runs it — its exit code is the gate (round 4: a
  // mutant making it exit 0 on a refusal left every case green). A real git repo in a temp folder.
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "wasmtk-check-release-"));
  try {
    const g = (...a: string[]) =>
      spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...a], {
        cwd: dir,
        encoding: "utf8",
      });
    const put = (p: string, s: string) => {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), s);
    };
    const files = (v: string) => {
      put("deno.json", JSON.stringify({ name: "@x/y", version: v }, null, 2) + "\n");
      put("package.json", JSON.stringify({ name: "@x/y", version: v }, null, 2) + "\n");
      put("src/utils.ts", `export const VERSION = "${v}";\n`);
    };
    g("init", "-q", "-b", "main");
    files("3.0.0");
    put("cmem/release.md", doc(both("4.0.0")));
    for (const f of ["release.ts", "publish-workflow.ts"]) {
      cpSync(join(here, f), join(dir, "scripts", f));
    }
    g("add", "-A");
    g("commit", "-q", "-m", "base");
    files("4.0.0");
    g("commit", "-q", "-am", "bump to v4.0.0");
    const run = () =>
      spawnSync("bun", ["scripts/release.ts", "--verify-commit"], { cwd: dir, encoding: "utf8" });
    const ok = run();
    put("README.md", "x\n");
    g("add", "-A");
    g("commit", "-q", "-m", "not a bump");
    const bad = run();
    is(
      "X1 `release.ts --verify-commit`: exit 0 on a bump commit, exit 1 with ::error:: on another",
      ok.status === 0 && bad.status === 1 && /::error::v4\.0\.0: HEAD's subject/.test(bad.stderr),
      `bump → exit ${ok.status}; non-bump → exit ${bad.status} ${
        (ok.status === 0 ? bad.stderr : ok.stderr + ok.stdout).trim().split("\n")[0]
      }`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
