/**
 * scripts/check_privacy_gate.ts — self-test of `scripts/check-privacy.ts` (letter H37 (b),
 * 2026-11-20). Each case is a line the gate must refuse or must pass; the synthetic secrets below
 * are built from parts so this file itself scans clean.
 *
 *   bun scripts/check_privacy_gate.ts
 */
import process from "node:process";
import { findLeaks, mask, privateFilesTracked } from "./check-privacy.ts";

let failed = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}`);
};
const kinds = (text: string, file = "src/x.ts") =>
  findLeaks(file, text, undefined).map((l) => l.kind);

const drive = ["C", ":", "\\", "Users", "\\", "someone", "\\", "x"].join("");
const gitBash = ["/", "d", "/", "Programs", "/", "x"].join("");
const home = ["/", "home", "/", "someone", "/", "x"].join("");
const person = ["someone", "@", "gmail", ".", "com"].join("");
const ghToken = ["gh", "p_", "A".repeat(36)].join("");
const longPass = ["postgres://", "user", ":", "hunter22secret", "@", "db.internal"].join("");

check(
  "a Windows drive path in a user profile is refused",
  kinds(`const p = "${drive}";`).includes("drive path"),
);
check("a Git Bash drive path is refused", kinds(`see ${gitBash}`).includes("drive path"));
check("a Linux home path is refused", kinds(`cd ${home}`).includes("home path"));
check("the CI runner's home is allowed", kinds("cd /home/runner/work/x").length === 0);
check("a personal email address is refused", kinds(`mail ${person}`).includes("email address"));
check("a GitHub token is refused", kinds(`token=${ghToken}`).includes("GitHub token"));
check(
  "a reserved example domain is allowed",
  kinds("user.email=t@example.invalid; a@example.com").length === 0,
);
check("a noreply address is allowed", kinds("123+x@users.noreply.github.com").length === 0);
check(
  "URL userinfo with a placeholder is not an email",
  kinds('"postgres://user:pass@host.com:5432/p"').length === 0,
);
check(
  "a real-looking password in a URL is refused",
  kinds(`"${longPass}"`).includes("URL credentials"),
);
check(
  "the maintainer address is allowed in a manifest only",
  findLeaks("deno.json", `"author": "${person}"`, person).length === 0 &&
    findLeaks("src/x.ts", person, person).length === 1,
);
check(
  "the issues file, cmem/local/, .claude/ and CLAUDE.md are refused when tracked",
  privateFilesTracked([
    "cmem/review-issues.md",
    "cmem/local/a.md",
    ".claude/s.json",
    "CLAUDE.md",
    "src/a.ts",
  ])
    .length === 4,
);
{
  // review P1: a Linux removable drive or Silverblue home names the user (both purges missed it)
  const media = ["file://", "/run/media/", "someone", "/3285-ABCD/x.wasm"].join("");
  check(
    "a /run/media/<user>/ path (in a file:/// URL) is refused (P1)",
    kinds(`"${media}"`).includes("home path"),
  );
  check(
    "a /var/home/<user>/ path is refused (P1)",
    kinds(`${["/var/home/", "someone", "/x"].join("")}`).includes("home path"),
  );
}
{
  // review H13: a long line with no `@` is linear (it was quadratic: 160 K chars 5.8 s)
  const long = "a.".repeat(500_000); // 1 MB
  const t0 = performance.now();
  const n = kinds(long).length;
  const ms = performance.now() - t0;
  check(`a 1 MB line scans in linear time (${ms.toFixed(0)} ms)`, n === 0 && ms < 3000);
  check(
    "an address inside a long line is still found",
    kinds("x".repeat(100_000) + ` ${person} ` + "y".repeat(100_000)).includes("email address"),
  );
}
check(
  "a finding is masked to its first three characters",
  mask(ghToken).startsWith("ghp") && !mask(ghToken).includes("AAAA"),
);

console.log(
  failed ? `check-privacy self-test: ${failed} FAILED` : "check-privacy self-test: all cases pass",
);
process.exit(failed ? 1 : 0);
