/**
 * scripts/check-licences.ts — the licence inventory gate (workspace review standard § 10; owner,
 * 2026-11-20: "We need to be compliant with licensing with dependencies").
 *
 * Reads every package `deno.lock` resolves (its `jsr` and `npm` sections) and fails when one is
 * not in `licences.json`, or its recorded licence is not in the allowlist. Offline: the inventory
 * holds what was read from each registry; a new dependency is added there after reading its
 * licence. Also checks the package ships its own licence files and NOTICE.md (`publish.include`).
 *
 *   bun scripts/check-licences.ts              exit 1 on a finding
 *   bun scripts/check-licences.ts --self-test
 */
import { readFileSync } from "node:fs";
import process from "node:process";

interface Inventory {
  allowed: string[];
  packages: Record<string, { licence: string; note?: string }>;
}

/** Every `jsr:` / `npm:` package@version a deno.lock resolves. */
export function lockPackages(
  lock: { jsr?: Record<string, unknown>; npm?: Record<string, unknown> },
): string[] {
  return [
    ...Object.keys(lock.jsr ?? {}).map((k) => `jsr:${k}`),
    ...Object.keys(lock.npm ?? {}).map((k) => `npm:${k}`),
  ].sort();
}

/** The problems (empty = compliant). */
export function licenceProblems(pkgs: string[], inv: Inventory, include: string[]): string[] {
  const out: string[] = [];
  for (const p of pkgs) {
    const e = inv.packages[p];
    if (!e) out.push(`${p} is not in licences.json: read its licence and record it`);
    else if (!inv.allowed.includes(e.licence)) {
      out.push(`${p} is ${e.licence}, not an allowed licence`);
    }
  }
  for (const f of ["LICENSE-MIT", "LICENSE-APACHE", "NOTICE.md"]) {
    if (!include.includes(f)) out.push(`deno.json publish.include does not ship ${f}`);
  }
  return out;
}

function selfTest(): boolean {
  const inv: Inventory = {
    allowed: ["MIT"],
    packages: { "jsr:@a/b@1.0.0": { licence: "MIT" }, "npm:x@1.0.0": { licence: "GPL-3.0" } },
  };
  const all = ["LICENSE-MIT", "LICENSE-APACHE", "NOTICE.md"];
  const cases: [string, boolean][] = [
    [
      "a listed, allowed package passes",
      licenceProblems(["jsr:@a/b@1.0.0"], inv, all).length === 0,
    ],
    [
      "an unlisted package is refused",
      /not in licences\.json/.test(licenceProblems(["jsr:@a/c@1.0.0"], inv, all).join()),
    ],
    [
      "a listed package with a licence not allowed is refused",
      /GPL-3\.0, not an allowed/.test(licenceProblems(["npm:x@1.0.0"], inv, all).join()),
    ],
    [
      "a package without NOTICE.md in publish.include is refused",
      /NOTICE\.md/.test(licenceProblems([], inv, ["LICENSE-MIT", "LICENSE-APACHE"]).join()),
    ],
    [
      "the lock's jsr and npm sections are both read",
      lockPackages({ jsr: { "@a/b@1.0.0": {} }, npm: { "x@1.0.0": {} } }).join() ===
        "jsr:@a/b@1.0.0,npm:x@1.0.0",
    ],
  ];
  for (const [n, ok] of cases) console.log(`${ok ? "  ✓" : "  ✗"} ${n}`);
  return cases.every(([, ok]) => ok);
}

if (import.meta.main) {
  if (process.argv.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  const lock = JSON.parse(readFileSync("deno.lock", "utf8"));
  const inv = JSON.parse(readFileSync("licences.json", "utf8")) as Inventory;
  const include =
    (JSON.parse(readFileSync("deno.json", "utf8")).publish?.include ?? []) as string[];
  const pkgs = lockPackages(lock);
  const problems = licenceProblems(pkgs, inv, include);
  for (const p of problems) console.error(`check-licences: ${p}`);
  console.log(
    problems.length
      ? `check-licences: ${problems.length} problem(s)`
      : `check-licences: ${pkgs.length} packages, all licences allowed`,
  );
  process.exit(problems.length ? 1 : 0);
}
