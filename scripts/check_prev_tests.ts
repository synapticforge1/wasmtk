/**
 * check_prev_tests.ts — Rule 3 of the compatibility gate (H6.5a, 2026-09-30; workspace
 * `layout-and-packaging.md`): "names are not behaviour". For a PATCH or MINOR bump, the PREVIOUS
 * release's `tests/` must pass against the NEW `src/`. A test that has to change is a surface
 * change: classify it before bumping. Run it before `deno task bump patch|minor`.
 *
 * What it does, never touching the real tree:
 *   1. clones the current branch's last COMMIT into a temp dir (uncommitted edits are not included);
 *   2. replaces the clone's `tests/` with EXACTLY the last `v*` tag's `tests/`;
 *   3. installs the clone as the global `wasmtk` (every suite invokes it by name), and ALWAYS
 *      reinstalls from the real repo afterwards; the installed code is the same `src/` either way;
 *   4. runs every `*_tests.ts` the tag had, one at a time (`deno test` for the `Deno.test` ones), the
 *      wasi suite before the engine cross-check that grades its output;
 *   5. writes a report: per suite, the exit code and its last summary lines.
 *
 * Not run: `golden_wat_tests` (its snapshot `tests/.golden/` is a gitignored LOCAL file, not a
 * release artifact, so the tag has none to compare with). A red suite is not automatically a
 * regression: the per-file wast baseline, for one, fails on an IMPROVEMENT by design. Every red line
 * must be read and classified (regression / intended surface change / improvement) before a bump.
 *
 * Usage (from the repo root; ~25–30 min):
 *   deno run -A scripts/check_prev_tests.ts [report.md] [--only a_tests.ts,b_tests.ts]
 * A red suite's report row carries its failure lines (✗, OFF BASELINE, error, FAIL …), not only
 * its summary, because a red row has to be classified from them.
 */
const repo = Deno.cwd();
const dec = new TextDecoder();
const run = async (cmd: string, args: string[], cwd: string) => {
  const o = await new Deno.Command(cmd, { args, cwd, stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, out: dec.decode(o.stdout) + dec.decode(o.stderr) };
};
const git = (args: string[], cwd = repo) => run("git", args, cwd);

const tag = (await git(["describe", "--tags", "--abbrev=0", "--match", "v*"])).out.trim();
const branch = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).out.trim();
const head = (await git(["rev-parse", "--short", "HEAD"])).out.trim();
const onlyAt = Deno.args.indexOf("--only");
const only = onlyAt >= 0 ? new Set((Deno.args[onlyAt + 1] ?? "").split(",").filter(Boolean)) : null;
const positional = Deno.args.filter((a, i) => a !== "--only" && i !== onlyAt + 1);
const reportPath = positional[0] ??
  `${await Deno.makeTempDir({ prefix: "wasmtk_prev_" })}/report.md`;
const clone = await Deno.makeTempDir({ prefix: "wasmtk_prevtests_" });
console.log(`previous release ${tag}'s tests against ${branch} @ ${head} (clone: ${clone})`);

// This drive records no file ownership, and D: → C: cannot hard-link (see check_compat_gate.ts).
const safe = `safe.directory=${repo.split("\\").join("/")}/.git`;
const cl = await git([
  "-c",
  safe,
  "clone",
  "--quiet",
  "--no-hardlinks",
  "--branch",
  branch,
  repo,
  clone,
]);
if (cl.code !== 0) throw new Error(`clone failed: ${cl.out}`);
for (const step of [["rm", "-r", "-q", "tests"], ["checkout", tag, "--", "tests"]]) {
  const r = await git(step, clone);
  if (r.code !== 0) throw new Error(`git ${step.join(" ")} failed: ${r.out}`);
}

const suites = [...Deno.readDirSync(`${clone}/tests`)]
  .filter((e) => e.isFile && e.name.endsWith("_tests.ts") && e.name !== "golden_wat_tests.ts")
  .filter((e) => !only || only.has(e.name))
  .map((e) => e.name)
  .sort((a, b) => order(a) - order(b) || a.localeCompare(b));
function order(n: string): number {
  // wasi first (it regenerates the corpus), then the engine cross-check that grades it, wast last.
  return n === "wasi_tests.ts"
    ? 0
    : n === "engine_cross_check_tests.ts"
    ? 1
    : n === "wast_tests.ts"
    ? 3
    : 2;
}

const rows: string[] = [];
let red = 0;
const install = await run(Deno.execPath(), ["task", "install"], clone);
if (install.code !== 0) throw new Error(`install from the clone failed: ${install.out}`);
try {
  for (const s of suites) {
    const src = await Deno.readTextFile(`${clone}/tests/${s}`);
    const perms = ["--allow-read", "--allow-write", "--allow-run", "--allow-env", "--allow-net"];
    const args = src.includes("Deno.test(")
      ? ["test", "--no-check", ...perms, `tests/${s}`]
      : ["run", ...perms, `tests/${s}`, ...(s === "wasi_tests.ts" ? ["tests/wasi/wasm_wasi"] : [])];
    const t0 = Date.now();
    const r = await run(Deno.execPath(), args, clone);
    const plain = r.out.replace(/\x1b\[[0-9;]*m/g, "").trim().split("\n");
    const summary = plain.filter((l) => /pass|fail|skip|clean|baseline|ok \||error/i.test(l))
      .slice(-4);
    // A red suite keeps its failure lines too: a red row has to be classified from them.
    const failures = r.code === 0
      ? []
      : plain.filter((l) => /✗|OFF BASELINE|FAIL|Uncaught|error:/i.test(l) && !summary.includes(l))
        .slice(0, 20);
    const tail = [...failures, ...summary];
    if (r.code !== 0) red++;
    const line = `| ${r.code === 0 ? "✅" : "❌"} | \`${s}\` | ${r.code} | ${
      ((Date.now() - t0) / 1000).toFixed(0)
    }s | ${tail.map((l) => l.trim().replaceAll("|", "\\|")).join("<br>")} |`;
    rows.push(line);
    console.log(`${r.code === 0 ? "ok  " : "RED "} ${s} (exit ${r.code})`);
  }
} finally {
  const back = await run(Deno.execPath(), ["task", "install"], repo);
  console.log(
    back.code === 0 ? "reinstalled wasmtk from the real repo" : `⚠️ reinstall failed: ${back.out}`,
  );
  await Deno.remove(clone, { recursive: true });
}

const report = [
  `# ${tag}'s tests against ${branch} @ ${head} (${new Date().toISOString().slice(0, 10)})`,
  "",
  `${suites.length} suites of ${tag} (golden_wat_tests not run: its snapshot is local, not released).`,
  `**${red} red.** Each red line must be classified before a patch or minor bump: a regression, an`,
  `intended surface change (then the floor is at least what the change is), or an improvement a`,
  `baseline pins (e.g. the per-file wast baseline fails on MORE passes by design).`,
  "",
  "| | suite | exit | time | last summary lines |",
  "| --- | --- | --- | --- | --- |",
  ...rows,
  "",
].join("\n");
await Deno.writeTextFile(reportPath, report);
console.log(`\n${red} of ${suites.length} suites red. Report: ${reportPath}`);
