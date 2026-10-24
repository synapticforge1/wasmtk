/**
 * check_compat_gate.ts — proves the compatibility gate (H6.3: `scripts/api-surface.ts` +
 * `scripts/bump.ts`) FAILS on purpose, as `../cmem/layout-and-packaging.md` requires ("invert it
 * before trusting it"). Re-run it whenever either script changes.
 *
 * Everything happens in a THROWAWAY clone of the CURRENT BRANCH's last commit (uncommitted edits
 * are not included): the real repo's version, files and tags are never touched, and the test tag
 * `v99.0.0` exists only in the clone.
 *
 *   A  against the real last release tag: a kind below the floor is refused, nothing written;
 *      a kind at the floor is written
 *   B  Rule 5: a surface change without its re-baseline commit is refused before any floor
 *   E  the CLI surface: a flag removed → major; a dispatcher command added → minor
 *   D  reviewed changes: the committed reviews lower the floor; an edited signature voids its
 *      review; a review cannot excuse a removal
 *   C  against a tag on a KNOWN surface: no change → patch; an export removed → patch refused,
 *      major floor, the symbol named; an export added → minor floor
 *   F  Rule 4: a removal without a deprecation release is refused at any kind; after a release
 *      that deprecated it, allowed; CI's `--verify-tag` passes a major tag and refuses a minor one
 *
 * Usage (from the repo root):  bun scripts/check_compat_gate.ts
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = process.cwd();
const clone = await mkdtemp(join(tmpdir(), "wasmtk_gate_"));
const branch =
  (spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).stdout ?? "")
    .trim();
// deno-lint-ignore require-await
const run = async (cmd: string, args: string[], cwd = clone) => {
  const o = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 30 });
  return { code: o.status ?? 1, out: (o.stdout ?? "") + (o.stderr ?? "") };
};
// The scripts under test run on the same runtime as this one (Bun).
const bump = (kind?: string) => run(process.execPath, ["scripts/bump.ts", ...(kind ? [kind] : [])]);
const surface = (...args: string[]) => run(process.execPath, ["scripts/api-surface.ts", ...args]);
const version = async () => JSON.parse(await readFile(`${clone}/deno.json`, "utf8")).version;
const reset = async () => void await run("git", ["checkout", "--", "."]);

let bad = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (!ok) bad++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${name}${
      // the head and the END of the output: a refusal's reason is usually its last line
      ok ? "" : `\n     ${(detail.length > 900 ? detail.slice(0, 300) + "\n…\n" + detail.slice(-600) : detail)
        .replace(/\n/g, "\n     ")}`
    }`,
  );
};

// This drive records no file ownership, so git refuses the repo as a clone source; a per-command
// exception, not a global config change.
const safe = `safe.directory=${repo.split("\\").join("/")}/.git`;
const cl = await run(
  "git",
  // --no-hardlinks: the repo is on D:, the temp dir on C:, and hard links cannot cross drives.
  ["-c", safe, "clone", "--quiet", "--no-hardlinks", "--branch", branch, repo, clone],
  repo,
);
if (cl.code !== 0) throw new Error(`clone failed: ${cl.out}`);
const v0 = await version();
console.log(`clone at ${clone}, version ${v0}`);

// A. Against the REAL last release (v2.0.3): the floor is MAJOR (`./console_log`'s LogSegment and
// ArrayLookup CHANGED; the owner, 2026-10-09: the next release is major). Until 2026-10-23 these
// cases expected MINOR, and failed from 2026-10-09 on, unnoticed: the floor moved under them.
let r = await bump("patch");
check(
  "A1 patch below the MAJOR floor is refused, nothing written",
  r.code !== 0 && await version() === v0 && /below the surface floor \(major\)/.test(r.out),
  r.out,
);
r = await bump("minor");
check(
  "A2 minor below the MAJOR floor is refused, nothing written",
  r.code !== 0 && await version() === v0 && /below the surface floor \(major\)/.test(r.out),
  r.out,
);
r = await bump("major");
check(
  "A3 major at the floor is allowed and written",
  r.code === 0 && await version() === bumpOf(v0, "major"),
  r.out,
);
await reset();

// B. Rule 5: a surface change without its re-baseline commit is refused before any floor.
const wast = `${clone}/src/wast.ts`;
const src = await readFile(wast, "utf8");
// Un-export `isList`, and FAIL if the edit did nothing (a no-op edit passed two cases before).
const unexported = src.replace("export const isList =", "const isList =");
if (unexported === src) throw new Error("test edit did nothing: `export const isList =` not found");
await writeFile(wast, unexported);
r = await bump("major");
check(
  "B1 stale api-surface.json refused (even for major), nothing written",
  r.code !== 0 && await version() === v0 && /does not match the code/.test(r.out) &&
    /isList REMOVED/.test(r.out),
  r.out,
);
r = await surface("--check");
check("B2 --check fails on the stale snapshot", r.code !== 0, r.out);
await reset();

// C. The spec's inversion, against a KNOWN surface: tag the clone's HEAD (surface == snapshot).
await run("git", ["tag", "v99.0.0"]);
r = await surface("--floor");
check(
  "C1 no change since the tag: floor PATCH",
  /floor since v99\.0\.0.*PATCH/.test(r.out) && /no surface change/.test(r.out),
  r.out,
);
r = await bump("patch");
check(
  "C2 patch at a PATCH floor is allowed",
  r.code === 0 && await version() === "99.0.1".replace("99.0.1", bumpOf(v0, "patch")),
  r.out,
);
await reset();
// Remove an export, re-baseline (as Rule 5 demands), then try a patch: refused for the right reason.
await writeFile(wast, unexported);
await surface("--record");
r = await bump("patch");
check(
  "C3 export REMOVED: patch refused, floor MAJOR, the symbol named",
  r.code !== 0 && /floor.*MAJOR/.test(r.out) && /\.\/wast isList REMOVED/.test(r.out),
  r.out,
);
await reset();
// Add an export instead: floor MINOR; patch refused, minor allowed.
await writeFile(
  wast,
  src + "\n/** Probe export for the gate test. */\nexport const gateProbe = 1;\n",
);
await surface("--record");
r = await bump("patch");
check(
  "C4 export ADDED: patch refused, floor MINOR",
  r.code !== 0 && /floor.*MINOR/.test(r.out) && /gateProbe added/.test(r.out),
  r.out,
);
r = await bump("minor");
check("C5 export ADDED: minor allowed", r.code === 0, r.out);
await reset();

// D. Reviewed changes (api-surface.review.json), against the real last release again.
await run("git", ["tag", "-d", "v99.0.0"]);
r = await surface("--floor");
// (The whole floor is MAJOR for other symbols, see A; what is checked is each reviewed line.)
check(
  "D1 the committed reviews lower runWast / runWastPath to minor, each shown as REVIEWED",
  /^\s*minor\s+\.\/wast runWast signature CHANGED — REVIEWED/m.test(r.out) &&
    /^\s*minor\s+\.\/wast runWastPath signature CHANGED — REVIEWED/m.test(r.out),
  r.out,
);
// Change runWast's signature AGAIN (an added optional parameter), re-baseline: the review no longer
// matches its exact before/after, so the change is judged afresh (MAJOR) and the review is reported.
const SIG = "  path: string,\n  opts: WastOptions = {},\n): Promise<WastResult> {";
const src2 = src.replace(/\r\n/g, "\n");
const edited = src2.replace(
  SIG,
  "  path: string,\n  opts: WastOptions = {},\n  extra?: number,\n): Promise<WastResult> {",
);
if (edited === src2) throw new Error("test edit did nothing: runWast's signature text not found");
await writeFile(wast, edited);
await surface("--record");
r = await surface("--floor");
check(
  "D2 an edited signature voids its review: floor MAJOR, the stale review reported",
  /floor.*MAJOR/.test(r.out) && /\.\/wast runWast signature CHANGED\s*$/m.test(r.out) &&
    /review of \.\/wast runWast .* matches no change/.test(r.out),
  r.out,
);
await reset();
// A review cannot excuse a REMOVAL: --review on a removed export is refused.
await writeFile(wast, unexported);
await surface("--record");
r = await surface("--review", "./wast", "isList", "(whole)", "minor", "should be refused");
check(
  "D3 --review refuses to excuse a removed export",
  r.code !== 0 && /not a CHANGED member/.test(r.out),
  r.out,
);
await reset();

// E. The CLI surface (H6.4), against a tag on a known surface again.
await run("git", ["tag", "v99.0.0"]);
const mainPath = `${clone}/main.ts`;
const mainSrc = (await readFile(mainPath, "utf8")).replace(/\r\n/g, "\n");
// Remove the `--auto` boolean flag from parseArgs: a script passing `--auto` breaks → MAJOR.
const noAuto = mainSrc.replace(`"dry-run", "auto", "verbose"`, `"dry-run", "verbose"`);
if (noAuto === mainSrc) {
  throw new Error("test edit did nothing: the parseArgs boolean list not found");
}
await writeFile(mainPath, noAuto);
await surface("--record");
r = await surface("--floor");
check(
  "E1 a CLI flag REMOVED: floor MAJOR, `(cli) flag:--auto REMOVED` named",
  /floor since v99\.0\.0.*MAJOR/.test(r.out) && /\(cli\) flag:--auto REMOVED/.test(r.out),
  r.out,
);
await reset();
// Add a dispatcher command: additive → MINOR.
const withCmd = mainSrc.replace(
  `    case "clean":`,
  `    case "gate-probe":\n      break;\n    case "clean":`,
);
if (withCmd === mainSrc) throw new Error('test edit did nothing: `case "clean":` not found');
await writeFile(mainPath, withCmd);
await surface("--record");
r = await surface("--floor");
check(
  "E2 a CLI command ADDED: floor MINOR, `(cli) command:gate-probe added` named",
  /floor since v99\.0\.0.*MINOR/.test(r.out) && /\(cli\) command:gate-probe added/.test(r.out),
  r.out,
);
await reset();
await run("git", ["tag", "-d", "v99.0.0"]);

// F. Rule 4 (deprecate before remove) and CI's `--verify-tag` (2026-10-23). Commits are made in
// the clone only, under the noreply identity, and the clone is deleted.
const commit = (msg: string) =>
  run("git", [
    "-c", "user.email=81428316+jrmarcum@users.noreply.github.com", "-c", "user.name=gate",
    "commit", "--quiet", "-am", msg,
  ]);
await run("git", ["tag", "v99.0.0"]);
await writeFile(wast, unexported);
await surface("--record");
r = await bump("major");
check(
  "F1 an export removed WITHOUT a deprecation release is refused, even for major",
  r.code !== 0 && await version() === v0 && /never deprecated \(Rule 4\)/.test(r.out) &&
    /Rule 4: \.\/wast isList is removed/.test(r.out),
  r.out,
);
await reset();
await run("git", ["tag", "-d", "v99.0.0"]);
// Deprecate isList, re-baseline, commit, and tag THAT as the release; then remove it.
const deprecated = src.replace("export const isList =", "/**\n * @deprecated gate test\n */\nexport const isList =");
if (deprecated === src) throw new Error("test edit did nothing: `export const isList =` not found");
await writeFile(wast, deprecated);
await surface("--record");
await commit("gate test: deprecate isList");
await run("git", ["tag", "v99.0.0"]);
await writeFile(wast, unexported);
await surface("--record");
r = await bump("major");
check(
  "F2 an export deprecated in the last release may be removed (major)",
  r.code === 0 && await version() === bumpOf(v0, "major"),
  r.out,
);
await run("git", ["reset", "--quiet", "--hard", "HEAD~1"]);
await run("git", ["tag", "-d", "v99.0.0"]);
// --verify-tag: a major made by `bump` passes; a minor written BY HAND (bump would refuse it: the
// case CI exists for, a tag pushed without the local gate) is refused below the floor.
for (const [k, pass] of [["major", true], ["minor", false]] as const) {
  if (pass) await bump(k);
  else {
    const dj = await readFile(`${clone}/deno.json`, "utf8");
    const set = dj.replace(/("version"\s*:\s*)"\d+\.\d+\.\d+"/, `$1"${bumpOf(v0, k)}"`);
    if (set === dj) throw new Error("test edit did nothing: deno.json's version not found");
    await writeFile(`${clone}/deno.json`, set);
  }
  await commit(`gate test: ${k}`);
  const tag = `v${bumpOf(v0, k)}`;
  await run("git", ["tag", tag]);
  r = await surface("--verify-tag", tag);
  check(
    `F${pass ? 3 : 4} --verify-tag ${tag} ${pass ? "passes" : "is refused, below the floor"}`,
    pass
      ? r.code === 0 && /compatibility gate holds/.test(r.out)
      : r.code !== 0 && /below the surface floor \(major\)/.test(r.out),
    r.out,
  );
  await run("git", ["tag", "-d", tag]);
  await run("git", ["reset", "--quiet", "--hard", "HEAD~1"]);
}

function bumpOf(v: string, k: string): string {
  const [a, b, c] = v.split(".").map(Number) as [number, number, number];
  return k === "patch" ? `${a}.${b}.${c + 1}` : k === "minor" ? `${a}.${b + 1}.0` : `${a + 1}.0.0`;
}

await rm(clone, { recursive: true, force: true });
console.log(bad === 0 ? "\nall gate cases pass" : `\n${bad} gate case(s) FAILED`);
if (bad) process.exit(1);
