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
 *   C  against a tag on a KNOWN surface: no change → patch; an export removed → patch refused,
 *      major floor, the symbol named; an export added → minor floor
 *
 * Usage (from the repo root):  deno run -A scripts/check_compat_gate.ts
 */
const repo = Deno.cwd();
const clone = await Deno.makeTempDir({ prefix: "wasmtk_gate_" });
const branch = new TextDecoder().decode(
  (await new Deno.Command("git", { args: ["rev-parse", "--abbrev-ref", "HEAD"], stdout: "piped" })
    .output())
    .stdout,
).trim();
const dec = new TextDecoder();
const run = async (cmd: string, args: string[], cwd = clone) => {
  const o = await new Deno.Command(cmd, { args, cwd, stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, out: dec.decode(o.stdout) + dec.decode(o.stderr) };
};
const P = ["--allow-read", "--allow-write", "--allow-run", "--allow-env"];
const bump = (kind?: string) =>
  run(Deno.execPath(), ["run", ...P, "scripts/bump.ts", ...(kind ? [kind] : [])]);
const surface = (mode: string) =>
  run(Deno.execPath(), ["run", ...P, "scripts/api-surface.ts", mode]);
const version = async () => JSON.parse(await Deno.readTextFile(`${clone}/deno.json`)).version;
const reset = async () => void await run("git", ["checkout", "--", "."]);

let bad = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (!ok) bad++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${name}${
      ok ? "" : `\n     ${detail.replace(/\n/g, "\n     ").slice(0, 900)}`
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

// A. Against the REAL last release (v2.0.3): the floor is MAJOR (runWast/runWastPath signatures).
let r = await bump("patch");
check(
  "A1 patch below a MAJOR floor is refused, nothing written",
  r.code !== 0 && await version() === v0 && /below the surface floor \(major\)/.test(r.out),
  r.out,
);
r = await bump("minor");
check(
  "A2 minor below a MAJOR floor is refused, nothing written",
  r.code !== 0 && await version() === v0,
  r.out,
);
r = await bump("major");
check(
  "A3 major at the floor is allowed and written",
  r.code === 0 && (await version()).startsWith(String(Number(v0.split(".")[0]) + 1) + ".0.0"),
  r.out,
);
await reset();

// B. Rule 5: a surface change without its re-baseline commit is refused before any floor.
const wast = `${clone}/src/wast.ts`;
const src = await Deno.readTextFile(wast);
// Un-export `isList`, and FAIL if the edit did nothing (a no-op edit passed two cases before).
const unexported = src.replace("export const isList =", "const isList =");
if (unexported === src) throw new Error("test edit did nothing: `export const isList =` not found");
await Deno.writeTextFile(wast, unexported);
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
await Deno.writeTextFile(wast, unexported);
await surface("--record");
r = await bump("patch");
check(
  "C3 export REMOVED: patch refused, floor MAJOR, the symbol named",
  r.code !== 0 && /floor.*MAJOR/.test(r.out) && /\.\/wast isList REMOVED/.test(r.out),
  r.out,
);
await reset();
// Add an export instead: floor MINOR; patch refused, minor allowed.
await Deno.writeTextFile(
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

function bumpOf(v: string, k: string): string {
  const [a, b, c] = v.split(".").map(Number) as [number, number, number];
  return k === "patch" ? `${a}.${b}.${c + 1}` : k === "minor" ? `${a}.${b + 1}.0` : `${a + 1}.0.0`;
}

await Deno.remove(clone, { recursive: true });
console.log(bad === 0 ? "\nall gate cases pass" : `\n${bad} gate case(s) FAILED`);
if (bad) Deno.exit(1);
