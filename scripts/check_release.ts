/**
 * check_release.ts — proves `scripts/release.ts`'s pure guards do what they promise (no git, no
 * network). The git / JSR / push half of release.ts is rehearsed against a scratch bare origin
 * instead (cmem/workflow.md § The release flow, U4).
 *
 * Guard 0g, `reviewsRecorded` (the release's entry in cmem/release.md records the security and the
 * hardening review, each ended by an empty round — workspace review-process.md § 0, letter H35):
 *   R1  both recorded in the documented form → no problem
 *   R2  no entry for the version → refused
 *   R3  only the security review → the hardening review named as missing
 *   R4  a hardening review that does not say it ended empty → refused
 *   R5  the reviews recorded under ANOTHER version's entry do not count
 *   R6  `### 4.0.0-rc.1` is not the entry for 4.0.0
 *   R7  a NEGATED record ("NOT yet ended by an empty round") → refused       (review round 1, A)
 *   R8  a deferred record ("will be ended by an empty round …") → refused     (round 1, A)
 *   R9  a "**Security review pending**" label is not `**Security review:**`   (round 1, A)
 *   R10 an entry inside an HTML comment, or a fenced code block, does not count (round 1, A)
 *   R11 a reviewed entry OUTSIDE § Release History does not count            (round 1, A)
 *   R12 a `####` subheading inside the entry does not end it                  (round 1, A)
 *   R13 CRLF line endings → parsed the same
 * Guard 0a, `releaseBlockers` + `bumpOnly` (the release commits the bump and nothing else):
 *   B1  untracked and unrelated paths block; the bump's three files pass
 *   B2  a rename / add / delete onto a release file blocks                    (round 1, A2)
 *   B3  deno.json / package.json with only the version changed → accepted
 *   B4  deno.json with another field changed too → refused                   (round 1, A2)
 *   B5  src/utils.ts with only VERSION changed → accepted; with another edit → refused
 * Guard 0c, `lsRemoteHas` (stdout only, the exact ref):
 *   L1  `refs/tags/v3.0.1` is not found in `refs/tags/v3.0.10`; a stderr warning is not a ref
 *
 * Usage (from the repo root):  bun scripts/check_release.ts
 */
import { bumpOnly, lsRemoteHas, releaseBlockers, reviewsRecorded } from "./release.ts";

const SEC =
  "**Security review:** everything since v3.0.0; rounds 3; ended by an empty round (round 3, 2026-12-01).";
const HARD =
  "**Hardening review:** the seven axes; rounds 2; ended by an empty round (round 2, 2026-12-01).";
const both = (v: string) =>
  `### ${v} — 2026-12-01\n\n**Summary.** Something changed.\n\n${SEC}\n\n${HARD}\n`;
const doc = (...entries: string[]) => `# release.md\n\n## Release History\n\n${entries.join("\n")}`;

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

// ── guard 0g ──
check("R1 both reviews recorded", reviewsRecorded(doc(both("4.0.0")), "4.0.0"), null);
check("R2 no entry", reviewsRecorded(doc(both("3.0.0")), "4.0.0"), /no "### 4\.0\.0" entry/);
check(
  "R3 hardening missing",
  reviewsRecorded(doc(`### 4.0.0\n\n${SEC}\n`), "4.0.0"),
  /no \*\*Hardening review:\*\*/,
);
check(
  "R4 hardening not ended empty",
  reviewsRecorded(doc(`### 4.0.0\n\n${SEC}\n\n**Hardening review:** round 2 found 1.\n`), "4.0.0"),
  /hardening review does not record/,
);
check(
  "R5 another entry's reviews do not count",
  reviewsRecorded(
    doc("### 4.0.0 — 2026-12-02\n\n**Summary.** No reviews here.\n", both("3.0.0")),
    "4.0.0",
  ),
  /no \*\*Security review:\*\*/,
);
check(
  "R6 4.0.0-rc.1 is not 4.0.0",
  reviewsRecorded(doc(both("4.0.0-rc.1")), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
check(
  "R7 a negated record is refused",
  reviewsRecorded(
    doc(
      `### 4.0.0\n\n**Security review:** round 1 found 4; NOT yet ended by an empty round (round 1).\n\n${HARD}\n`,
    ),
    "4.0.0",
  ),
  /security review does not record/,
);
check(
  "R8 a deferred record is refused",
  reviewsRecorded(
    doc(
      `### 4.0.0\n\n${SEC}\n\n**Hardening review:** will be ended by an empty round (round 2).\n`,
    ),
    "4.0.0",
  ),
  /hardening review does not record/,
);
check(
  "R9 a 'pending' label is not the record",
  reviewsRecorded(
    doc(
      `### 4.0.0\n\n**Security review pending** — ended by an empty round (round 1).\n\n${HARD}\n`,
    ),
    "4.0.0",
  ),
  /no \*\*Security review:\*\*/,
);
check(
  "R10a an entry inside an HTML comment does not count",
  reviewsRecorded(doc(`<!--\n${both("4.0.0")}\n-->\n`), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
check(
  "R10b reviews inside a fenced block do not count",
  // Blank lines inside the fence: each review paragraph there starts with its label, so only the
  // fence stripping keeps them out (a fence line glued to the first paragraph proved nothing —
  // that version of this case survived its mutant).
  reviewsRecorded(doc(`### 4.0.0\n\n\`\`\`\n\n${SEC}\n\n${HARD}\n\n\`\`\`\n`), "4.0.0"),
  /no \*\*Security review:\*\*/,
);
check(
  "R11 a reviewed entry outside Release History does not count",
  reviewsRecorded(
    `# r\n\n## Plans\n\n${both("4.0.0")}\n## Release History\n\n### 4.0.0\n\n**Summary.** x\n`,
    "4.0.0",
  ),
  /no \*\*Security review:\*\*/,
);
check(
  "R12 a #### subheading stays inside the entry",
  reviewsRecorded(doc(`### 4.0.0\n\n#### Reviews\n\n${SEC}\n\n${HARD}\n`), "4.0.0"),
  null,
);
check("R13 CRLF", reviewsRecorded(doc(both("4.0.0")).replace(/\n/g, "\r\n"), "4.0.0"), null);

// ── guard 0a ──
{
  const blocked = releaseBlockers(
    " M deno.json\n M package.json\nM  src/utils.ts\n?? stray.ts\n M src/wasic.ts\n",
  );
  is(
    "B1 untracked and unrelated paths block, the bump's files pass",
    blocked.length === 2 && blocked.some((l) => l.includes("stray.ts")) &&
      blocked.some((l) => l.includes("src/wasic.ts")),
    blocked.join(" | "),
  );
  const moved = releaseBlockers("R  src/old.ts -> src/utils.ts\nA  deno.json\n D package.json\n");
  is(
    "B2 a rename / add / delete onto a release file blocks",
    moved.length === 3,
    moved.join(" | "),
  );
}
{
  const dj = '{\n  "name": "@x/y",\n  "version": "3.0.0",\n  "description": "d"\n}\n';
  const djBumped = dj.replace('"3.0.0"', '"4.0.0"');
  const pj = JSON.stringify({ name: "@x/y", version: "3.0.0", type: "module" }, null, 2) + "\n";
  const pjBumped = JSON.stringify({ name: "@x/y", version: "4.0.0", type: "module" }, null, 2) +
    "\n";
  const ok3 = bumpOnly("deno.json", dj, djBumped, "4.0.0") === "" &&
    bumpOnly("package.json", pj, pjBumped, "4.0.0") === "";
  is("B3 only the version changed → accepted", ok3, "deno.json, package.json");
  const rideAlong = bumpOnly("deno.json", dj, djBumped.replace('"d"', '"RIDE-ALONG"'), "4.0.0");
  is(
    "B4 another field changed too → refused",
    /changes more than its version line/.test(rideAlong),
    rideAlong,
  );
  const ut = 'export const VERSION = "3.0.0";\nexport const X = 1;\n';
  const utOk = bumpOnly("src/utils.ts", ut, ut.replace("3.0.0", "4.0.0"), "4.0.0");
  const utBad = bumpOnly(
    "src/utils.ts",
    ut,
    ut.replace("3.0.0", "4.0.0").replace("X = 1", "X = 2"),
    "4.0.0",
  );
  is(
    "B5 utils.ts VERSION only → accepted; another edit → refused",
    utOk === "" && /changes more than its VERSION line/.test(utBad),
    `${utOk || "accepted"} / ${utBad}`,
  );
}

// ── guard 0c ──
{
  const out10 = `${"a".repeat(40)}\trefs/tags/v3.0.10\n`;
  is(
    "L1 the exact ref only, stdout only",
    !lsRemoteHas(out10, "refs/tags/v3.0.1") && lsRemoteHas(out10, "refs/tags/v3.0.10") &&
      !lsRemoteHas("", "refs/tags/v3.0.1"),
    "v3.0.1 not in v3.0.10; empty stdout = absent",
  );
}

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
