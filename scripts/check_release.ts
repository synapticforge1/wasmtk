/**
 * check_release.ts — proves `scripts/release.ts`'s pure guards do what they promise (no git, no
 * network): `reviewsRecorded` (guard 0g: the release's entry in cmem/release.md records both the
 * security and the hardening review, each ended by an empty round — workspace review-process.md
 * § 0, letter H35) and `releaseBlockers` (guard 0a: what a release would leave out).
 * The git / JSR / push half of release.ts is rehearsed against a scratch bare origin instead
 * (cmem/workflow.md § The release flow, U4).
 *
 *   R1  an entry with both reviews, each "ended by an empty round" → no problem
 *   R2  no entry for the version → refused
 *   R3  only the security review → the hardening review named as missing
 *   R4  a hardening review that does not say it ended empty → refused
 *   R5  the reviews recorded under ANOTHER version's entry do not count
 *   R6  `### 4.0.0-rc.1` is not the entry for 4.0.0
 *   B1  releaseBlockers: the bump's three files pass, anything else (untracked too) blocks
 *
 * Usage (from the repo root):  bun scripts/check_release.ts
 */
import { releaseBlockers, reviewsRecorded } from "./release.ts";

const both = (v: string) =>
  `### ${v} — 2026-12-01

**Summary.** Something changed.

**Security review:** everything since v3.0.0; rounds 3; ended by an empty round (round 3).

**Hardening review:** the seven axes; rounds 2; ended by an empty round (round 2, 2026-12-01).
`;
const doc = (...entries: string[]) => `# release.md\n\n## Release History\n\n${entries.join("\n")}`;

let failed = 0;
let cases = 0;
const check = (name: string, got: string[], want: RegExp | null) => {
  cases++;
  const ok = want === null ? got.length === 0 : got.some((p) => want.test(p));
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got.length ? got.join(" | ") : "no problem"}`);
};

check("R1 both reviews recorded", reviewsRecorded(doc(both("4.0.0")), "4.0.0"), null);
check("R2 no entry", reviewsRecorded(doc(both("3.0.0")), "4.0.0"), /no "### 4\.0\.0" entry/);
check(
  "R3 hardening missing",
  reviewsRecorded(
    doc("### 4.0.0\n\n**Security review:** rounds 1; ended by an empty round (round 1).\n"),
    "4.0.0",
  ),
  /no \*\*Hardening review\*\*/,
);
check(
  "R4 hardening not ended empty",
  reviewsRecorded(
    doc(both("4.0.0").replace("ended by an empty round (round 2, 2026-12-01)", "round 2 found 1")),
    "4.0.0",
  ),
  /hardening review does not say it ended by an empty round/,
);
check(
  "R5 another entry's reviews do not count",
  reviewsRecorded(
    doc("### 4.0.0 — 2026-12-02\n\n**Summary.** No reviews here.\n", both("3.0.0")),
    "4.0.0",
  ),
  /no \*\*Security review\*\*/,
);
check(
  "R6 4.0.0-rc.1 is not 4.0.0",
  reviewsRecorded(doc(both("4.0.0-rc.1")), "4.0.0"),
  /no "### 4\.0\.0" entry/,
);
{
  const porcelain =
    " M deno.json\n M package.json\n M src/utils.ts\n?? stray.ts\n M src/wasic.ts\n";
  const blocked = releaseBlockers(porcelain);
  cases++;
  const ok = blocked.length === 2 && blocked.some((l) => l.includes("stray.ts")) &&
    blocked.some((l) => l.includes("src/wasic.ts"));
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} B1 releaseBlockers: ${blocked.join(" | ")}`);
}

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
