/**
 * check_publish_workflow.ts — proves the CI steps in `scripts/publish-workflow.ts` (publish.yml,
 * the workspace release process U5–U8 in the owner's order: checks → tag → page → publish) do what
 * they promise, against a MOCK GitHub REST API, a mock JSR and a fake `git`: no network, no token.
 * Re-run it whenever publish-workflow.ts changes; the real API is exercised only by a real release.
 *
 * The version tag IS the release (owner, 2026-11-10): the page is made ON the tag, and no branch
 * is ever written. The mock refuses a page that names a `target_commitish`, answers 422 for a ref
 * that already exists (as GitHub does), and records every write, so a stray write turns a case red.
 * Every refusal is checked by its MESSAGE (a crash, also exit 1, cannot pass as one), and every case
 * has a deadline (a hang fails, it does not stall the suite) — review round 1, 2026-11-12. The JSR
 * mock checks every request's path and cache-bust, and env vars are always restored — round 2.
 *
 *   U5 is-release (a fake git with a small history; ls-remote lists EVERY tag, annotated ones with
 *   their `^{}` line; stderr kept apart; JSR per version; the bump run's state faked).
 *   Round 3 (F): only the BUMP COMMIT's own run releases, and only when pushed alone. Round 4: over a
 *   released previous version; a re-run re-verifies; later pushes read the bump run's real state.
 *     S1  bump run, no tag, JSR without it → release
 *     S2  bump run, tag AT THIS COMMIT + JSR → a release again (re-run all: `verify` runs again)
 *     S3  HEAD is not GITHUB_SHA → refused         S4  stderr that LOOKS like the ref line is not a tag
 *     S5  only OTHER tags (v9.8.70, v1.0.0) are not v9.8.7
 *     S6  bump run re-run, tag without JSR → resumes (a release)
 *     S7  JSR has it, no tag → refused (published outside the flow)
 *     S8  ls-remote fails → refused (never "no tag")
 *     S9  later push, JSR unreadable → not a release, a warning
 *     S10 bump run, JSR unreadable → refused (cannot decide)
 *     S11 bump pushed with other commits → refused   S12 workflow_dispatch → never a release
 *     S13 later push, released → nothing
 *     S14 / S15 / S16 / S17 later push, unreleased: the bump run running → a warning; finished →
 *         refused UNRELEASED; NO run of its own → refused at once; its state unreadable → a warning
 *     S18 a merge changing the version is not a bump
 *     S19 later push, JSR without tag → refused   S20 the first deno.json is a bump
 *     S21 releaseOutputs   S22 findBump   S23 seconds()   S31 lsRemotePeeled
 *     S24 a version-line revert to a released version, pushed with others → done, not refused
 *     S25 / S26 / S27 a bump over a previous version not on JSR / with no tag / JSR unreadable → refused
 *     S28 the tag at ANOTHER commit → refused   S29 an annotated tag peeling here → resumes
 *     S30 later push, unreleased, no bump commit found → refused
 *     Q1  the bump run's state from the Actions API: running / finished / none / unreadable
 *   U6 tag
 *     T1  absent → an annotated tag object + its ref (2 writes), read back peels to the commit
 *     T2  a re-run: already at this commit → 0 writes
 *     T3  already at ANOTHER commit → refused, 0 writes (a tag never moves)
 *     T4  created, but does not read back → refused
 *   U7 release (the page FROM the tag)
 *     A   fresh annotated tag: the page created on it, read back — exactly 1 write
 *     B   a re-run (page there): 0 writes
 *     C   lightweight tag: peels without a tag object
 *     D   tag missing on GitHub: refused, 0 writes (POST /releases would CREATE the tag)
 *     E   tag peels to another commit: refused, 0 writes
 *     H   page POST "succeeds" but cannot be read back: refused
 *     H2  the page's state unreadable (GET 500) → refused before any write   H3 the read-back
 *         page names another tag → refused
 *     I   a call that never answers: ends at HTTP_TIMEOUT_MS (measured), refused, no write
 *   U8 jsr-has
 *     K1  200 → "true", 404 → "false", 500 every time → an error (never "absent", which would
 *         re-attempt an immutable upload)       K2  a 503, then no answer, then 200 → retried, "true"
 *     K3  JSR_HAS_TRIES unset (as in CI) → the default 3 tries
 *   U8 provenance (the read-back the file calls "the only evidence"; the LAST read decides)
 *     P1  a Rekor id (string) → pass    P2 null → WITHOUT provenance    P3 0 (number) is absence
 *     P4  404 throughout → NOT ON JSR (named apart)    P5 500 throughout → JSR could not be read
 *     P6  a numeric id → pass    P7 "null" / P8 "000" (strings) are absence
 *     P9  404, then the id → pass    P10 500 then 404 → could not be read (not "not on JSR")
 *     P11 no answer throughout → could not be read   P12 200 without id, then 500 → could not be read
 *     P13 PROVENANCE_TRIES=0 → the default 12 reads, not none   P14 "007" is not an id
 *     P15 a re-run (attempt 2) asks new cache-bust URLs
 *
 * Usage (from the repo root):  bun scripts/check_publish_workflow.ts
 */
import {
  bumpRunState,
  createTag,
  findBump,
  type GitHubEnv,
  isRelease,
  jsrHas,
  lsRemotePeeled,
  provenance,
  release,
  releaseOutputs,
  type RunState,
  seconds,
} from "./publish-workflow.ts";

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);
const TAG = "v9.8.7";
const API = "https://api.example.test";
const REPO = "o/r";

interface World {
  tags: Record<string, { type: string; sha: string }>; // refs/tags/<name> → object
  tagObjects: Record<string, { type: string; sha: string }>; // annotated tag sha → object
  branches: Record<string, string>;
  releases: Record<string, { tag_name: string; html_url: string; author: { login: string } }>;
  dropReleaseOnPost?: boolean; // H: POST answers 201 but nothing is stored
  dropTagRefOnPost?: boolean; // T4: the ref POST answers 201 but nothing is stored
  hang?: boolean; // I: every GitHub call hangs until its signal aborts
  releaseGetStatus?: number; // H2: GET /releases/tags answers this (e.g. 500) before any POST
  readBackTag?: string; // H3: the page read back names another tag
  writes: string[];
}

const world = (over: Partial<World> = {}): World => ({
  tags: { [TAG]: { type: "tag", sha: "t".repeat(40) } },
  tagObjects: { ["t".repeat(40)]: { type: "commit", sha: SHA } },
  branches: {},
  releases: {},
  writes: [],
  ...over,
});

function mockFetch(w: World) {
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    const res = (status: number, body: unknown = {}) =>
      new Response(JSON.stringify(body), { status });
    if (w.hang) {
      return await new Promise<Response>((_, reject) =>
        init.signal?.addEventListener("abort", () => reject(new Error("aborted (timeout)")))
      );
    }
    const path = url.slice(`${API}/repos/${REPO}`.length);
    const method = init.method ?? "GET";
    let m: RegExpMatchArray | null;
    if (method === "GET" && (m = path.match(/^\/git\/ref\/tags\/(.+)$/))) {
      const t = w.tags[decodeURIComponent(m[1])];
      return t ? res(200, { object: t }) : res(404);
    }
    if (method === "GET" && (m = path.match(/^\/git\/tags\/(.+)$/))) {
      const o = w.tagObjects[m[1]];
      return o ? res(200, { object: o }) : res(404);
    }
    if (method === "POST" && path === "/git/tags") {
      const body = JSON.parse(String(init.body));
      w.writes.push(`tag object ${body.tag}`);
      if (body.type !== "commit" || body.object !== SHA) {
        return res(422, { message: "test: bad tag" });
      }
      const objSha = "o".repeat(40);
      w.tagObjects[objSha] = { type: "commit", sha: body.object };
      return res(201, { sha: objSha });
    }
    if (method === "POST" && path === "/git/refs") {
      const body = JSON.parse(String(init.body));
      w.writes.push(`ref ${body.ref}`);
      if (body.ref.startsWith("refs/tags/")) {
        const name = body.ref.slice(10);
        if (w.tags[name]) return res(422, { message: "Reference already exists" });
        if (!w.dropTagRefOnPost) w.tags[name] = { type: "tag", sha: body.sha };
      } else {
        w.branches[body.ref.replace("refs/heads/", "")] = body.sha;
      }
      return res(201, { ref: body.ref });
    }
    if (method === "GET" && (m = path.match(/^\/releases\/tags\/(.+)$/))) {
      if (w.releaseGetStatus) return res(w.releaseGetStatus, { message: "mock: GET refused" });
      const r = w.releases[decodeURIComponent(m[1])];
      return r ? res(200, w.readBackTag ? { ...r, tag_name: w.readBackTag } : r) : res(404);
    }
    if (method === "POST" && path === "/releases") {
      const body = JSON.parse(String(init.body));
      w.writes.push(`release ${body.tag_name}`);
      if (!body.generate_release_notes) return res(422, { message: "test: notes not asked" });
      if ("target_commitish" in body) {
        return res(422, { message: "test: the page must be made ON the tag, no target" });
      }
      if (!w.dropReleaseOnPost) {
        w.releases[body.tag_name] = {
          tag_name: body.tag_name,
          html_url: `https://github.example/${REPO}/releases/tag/${body.tag_name}`,
          author: { login: "github-actions[bot]" },
        };
      }
      return res(201, {});
    }
    return res(599, { message: `mock: unhandled ${method} ${path}` });
  };
}

const env: GitHubEnv = { api: API, repo: REPO, sha: SHA, token: "test" };

let failed = 0;
let cases = 0;
const report = (name: string, ok: boolean, got: string, detail = "") => {
  cases++;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${got}${ok || !detail ? "" : `\n     ${detail}`}`);
};

/** Captures what `fn` prints; a case that runs longer than `deadlineMs` FAILS instead of hanging. */
async function quiet<T>(
  fn: () => Promise<T>,
  deadlineMs = 10_000,
): Promise<{ v: T; lines: string[]; ms: number }> {
  const log = console.log;
  const lines: string[] = [];
  console.log = (...a: unknown[]) => lines.push(a.join(" "));
  const t0 = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const v = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`case exceeded its ${deadlineMs} ms deadline`)),
          deadlineMs,
        );
      }),
    ]);
    return { v, lines, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
    console.log = log;
  }
}

async function check(
  name: string,
  run: (f: ReturnType<typeof mockFetch>) => Promise<number>,
  w: World,
  want: { code: number; writes: string[]; page?: boolean; tagAt?: string; msg?: RegExp },
) {
  let code = -1;
  let lines: string[] = [];
  try {
    ({ v: code, lines } = await quiet(() => run(mockFetch(w))));
  } catch (e) {
    lines = [`THREW: ${(e as Error).message}`];
  }
  const page = TAG in w.releases;
  const tagObj = w.tags[TAG];
  const tagAt = tagObj
    ? (tagObj.type === "tag" ? w.tagObjects[tagObj.sha]?.sha ?? "?" : tagObj.sha)
    : "";
  // A refusal must be the RIGHT refusal: its message is matched, so a crash (also exit 1) or the
  // mock's 599 for an unexpected call cannot pass as one (review round 1, finding G).
  const said = lines.join("\n");
  const ok = code === want.code && JSON.stringify(w.writes) === JSON.stringify(want.writes) &&
    (want.page === undefined || page === want.page) &&
    (want.tagAt === undefined || tagAt === want.tagAt) &&
    (want.msg === undefined || want.msg.test(said)) && !/HTTP 599|network:/.test(said);
  report(
    name,
    ok,
    `exit ${code}, writes [${w.writes.join(", ")}]`,
    `want exit ${want.code}, writes [${want.writes.join(", ")}]\n     ${lines.join("\n     ")}`,
  );
}

// ── U5 is-release: a fake git holding a small HISTORY (commits with parents and deno.json
//    versions), whose ls-remote lists EVERY tag it holds (so only the exact-ref parse can pick the
//    right one — review round 2) with annotated tags' `^{}` lines, whose stderr can look exactly
//    like a ref line; a mock JSR per version; a fake run state for the bump commit (round 4) ──
interface Commit {
  parents: string[];
  version: string | null; // null = no deno.json there
}
const PREV = "c".repeat(40); // 9.8.6, the bump's parent
const LATER = "d".repeat(40); // a later commit on main, still 9.8.7
const SIDE = "e".repeat(40); // a side-branch commit (a merge's second parent)
/** PREV (9.8.6) ← SHA (bump to 9.8.7) [← LATER (9.8.7)] */
const history = (later = false): Record<string, Commit> => ({
  [PREV]: { parents: [], version: "9.8.6" },
  [SHA]: { parents: [PREV], version: "9.8.7" },
  ...(later ? { [LATER]: { parents: [SHA], version: "9.8.7" } } : {}),
});
/** A tag: a name (lightweight, at SHA) or [name, commit] (ANNOTATED: object line + `^{}` line). */
type RemoteTag = string | [string, string];
const fakeGit = (
  head: string,
  remoteTags: RemoteTag[],
  o: {
    stderr?: string;
    lsRemoteCode?: number;
    logCode?: number;
    commits?: Record<string, Commit>;
    prevTag?: boolean; // v9.8.6 on origin (default: yes)
  } = {},
) => {
  const commits = o.commits ?? history();
  const tags: RemoteTag[] = [...remoteTags, ...(o.prevTag === false ? [] : ["v9.8.6"])];
  const resolve = (rev: string): string | undefined => {
    const m = /^(.*?)(\^*)$/.exec(rev)!;
    let at: string | undefined = m[1] === "HEAD" ? head : m[1];
    for (let i = 0; i < m[2].length && at; i++) at = commits[at]?.parents[0];
    return at && commits[at] ? at : undefined;
  };
  return (args: string[]) => {
    if (args[0] === "rev-parse") return { code: 0, out: `${head}\n`, err: o.stderr ?? "" };
    if (args[0] === "ls-remote") {
      if (o.lsRemoteCode) return { code: o.lsRemoteCode, out: "", err: "fatal: unable to access" };
      const lines = tags.flatMap((t) =>
        typeof t === "string"
          ? [`${SHA}\trefs/tags/${t}`]
          : [`${"7".repeat(40)}\trefs/tags/${t[0]}`, `${t[1]}\trefs/tags/${t[0]}^{}`]
      );
      return { code: 0, out: lines.length ? lines.join("\n") + "\n" : "", err: o.stderr ?? "" };
    }
    if (args[0] === "rev-list" && args.includes("--parents")) {
      const c = commits[head];
      return c
        ? { code: 0, out: `${[head, ...c.parents].join(" ")}\n`, err: "" }
        : { code: 128, out: "", err: "fake git: no HEAD" };
    }
    if (args[0] === "show" && args[1]?.endsWith(":deno.json")) {
      const at = resolve(args[1].slice(0, -":deno.json".length));
      const v = at ? commits[at].version : null;
      return v === null
        ? { code: 128, out: "", err: "fatal: path does not exist" }
        : { code: 0, out: JSON.stringify({ name: "@x/y", version: v }), err: "" };
    }
    if (args[0] === "log" && args.includes("--first-parent")) {
      if (o.logCode) return { code: o.logCode, out: "", err: "fatal: bad revision" };
      const lines: string[] = [];
      for (let at: string | undefined = head; at && commits[at]; at = commits[at].parents[0]) {
        lines.push(at);
      }
      return { code: 0, out: lines.join("\n") + "\n", err: "" };
    }
    return { code: 1, out: "", err: `fake git: unexpected ${args.join(" ")}` };
  };
};
type Has = boolean | "throws";
/** JSR's answer for 9.8.7 (`has`) and for the previous version 9.8.6 (`prev`, default: there). */
const jsrSays = (has: Has, prev: Has = true) => (v: string) => {
  const a = v === "9.8.7" ? has : prev;
  return a === "throws"
    ? Promise.reject(new Error("JSR answered HTTP 503 (3 tries)"))
    : Promise.resolve(a ? "true" as const : "false" as const);
};
async function decide(
  name: string,
  git: ReturnType<typeof fakeGit>,
  jsrHasIt: Has,
  want: boolean | RegExp,
  wantWarning = false,
  run: { sha?: string; before?: string | null; state?: RunState | "throws"; prev?: Has } = {},
  warningSays?: RegExp,
) {
  let got = "";
  let ok = false;
  try {
    const r = await isRelease(
      {
        sha: run.sha ?? SHA,
        version: "9.8.7",
        before: run.before === null ? undefined : run.before ?? PREV,
      },
      git,
      jsrSays(jsrHasIt, run.prev),
      (bump) =>
        run.state === "throws"
          ? Promise.reject(new Error("HTTP 502"))
          : Promise.resolve(bump === SHA || bump === LATER ? run.state ?? "running" : "none"),
    );
    got = JSON.stringify(r);
    ok = typeof want === "boolean" && r.release === want && r.tag === TAG &&
      Boolean(r.warning) === wantWarning && (!warningSays || warningSays.test(r.warning ?? ""));
  } catch (e) {
    got = `refused: ${(e as Error).message}`;
    ok = want instanceof RegExp && want.test(got);
  }
  report(name, ok, got);
}
// The bump commit's own run (HEAD = SHA, pushed alone: before = PREV; 9.8.6 released).
await decide("S1 bump run: no tag, JSR without it → release", fakeGit(SHA, []), false, true);
await decide(
  "S2 bump run: tag AT THIS COMMIT + JSR → a release again (re-run all: verify runs again)",
  fakeGit(SHA, ["v9.8.7"]),
  true,
  true,
);
await decide(
  "S3 HEAD is not GITHUB_SHA → refused",
  fakeGit(OTHER, []),
  false,
  /not this run's commit/,
);
// S4 / S5 with JSR HAVING the version, so a misread tag turns "refused" into "release".
await decide(
  "S4 stderr that LOOKS like the ref line is not a tag (JSR has it → refused)",
  fakeGit(SHA, [], { stderr: `${SHA}\trefs/tags/v9.8.7\n` }),
  true,
  /published outside this flow/,
);
await decide(
  "S5 only OTHER tags on origin (v9.8.70, v1.0.0) are not v9.8.7 (JSR has it → refused)",
  fakeGit(SHA, ["v9.8.70", "v1.0.0"]),
  true,
  /published outside this flow/,
);
await decide(
  "S6 bump run re-run: tag at this commit, JSR without it → RESUMES (a release)",
  fakeGit(SHA, ["v9.8.7"]),
  false,
  true,
);
await decide(
  "S7 JSR has it, no tag → refused",
  fakeGit(SHA, []),
  true,
  /published outside this flow/,
);
await decide(
  "S8 ls-remote fails → refused (never read as 'no tag')",
  fakeGit(SHA, ["v9.8.7"], { lsRemoteCode: 128 }),
  false,
  /could not read origin's tags/,
);
await decide(
  "S9 later push, JSR unreadable → not a release, with a WARNING",
  fakeGit(LATER, ["v9.8.7"], { commits: history(true) }),
  "throws",
  false,
  true,
  { sha: LATER, before: SHA },
  /could not be read/,
);
await decide(
  "S10 bump run, JSR unreadable → refused (cannot decide)",
  fakeGit(SHA, []),
  "throws",
  /cannot be decided/,
);
await decide(
  "S11 bump pushed WITH other commits (before ≠ its parent) → refused",
  fakeGit(SHA, []),
  false,
  /carry the bump commit ALONE/,
  false,
  { before: OTHER },
);
await decide(
  "S12 workflow_dispatch on the bump commit → never a release, a warning",
  fakeGit(SHA, []),
  false,
  false,
  true,
  { before: null },
  /workflow_dispatch never releases/,
);
// A LATER push meets the version: the bump commit's OWN run decides (round 4).
await decide(
  "S13 later push, version released (tag + JSR) → not a release, no warning",
  fakeGit(LATER, ["v9.8.7"], { commits: history(true) }),
  true,
  false,
  false,
  { sha: LATER, before: SHA },
);
await decide(
  "S14 later push, unreleased, the bump run still RUNNING → a warning, not a release",
  fakeGit(LATER, [], { commits: history(true) }),
  false,
  false,
  true,
  { sha: LATER, before: SHA, state: "running" },
  /being released by the bump commit/,
);
await decide(
  "S15 later push, unreleased, the bump run FINISHED → refused UNRELEASED, naming the bump",
  fakeGit(LATER, [], { commits: history(true) }),
  false,
  new RegExp(`UNRELEASED VERSION on main: no tag.*bump commit ${SHA.slice(0, 11)}'s run finished`),
  false,
  { sha: LATER, before: SHA, state: "finished" },
);
await decide(
  "S16 later push, the bump commit has NO run (pushed under a later commit) → refused AT ONCE",
  fakeGit(LATER, ["v9.8.7"], { commits: history(true) }),
  false,
  /UNRELEASED VERSION on main: the tag exists.*has NO run of its own/,
  false,
  { sha: LATER, before: PREV, state: "none" },
);
await decide(
  "S17 later push, the bump run's state unreadable → a warning",
  fakeGit(LATER, [], { commits: history(true) }),
  false,
  false,
  true,
  { sha: LATER, before: SHA, state: "throws" },
  /could not be read \(HTTP 502\)/,
);
await decide(
  "S18 a MERGE that changes the version is not a bump commit → not a release",
  fakeGit(LATER, [], {
    commits: {
      [PREV]: { parents: [], version: "9.8.6" },
      [SIDE]: { parents: [PREV], version: "9.8.7" },
      [LATER]: { parents: [PREV, SIDE], version: "9.8.7" },
    },
  }),
  false,
  false,
  true,
  { sha: LATER, before: PREV },
);
await decide(
  "S19 later push, JSR has it, no tag → refused",
  fakeGit(LATER, [], { commits: history(true) }),
  true,
  /published outside this flow/,
  false,
  { sha: LATER, before: SHA },
);
await decide(
  "S20 the first deno.json ever (no parent version) is a bump → release",
  fakeGit(SHA, [], {
    commits: {
      [PREV]: { parents: [], version: null },
      [SHA]: { parents: [PREV], version: "9.8.7" },
    },
    prevTag: false,
  }),
  false,
  true,
);
await decide(
  "S24 a version-line REVERT to a released version, pushed with others → done, not refused",
  fakeGit(LATER, [["v9.8.7", SHA]], {
    commits: {
      [SHA]: { parents: [], version: "9.8.7" },
      [PREV]: { parents: [SHA], version: "9.8.8" },
      [LATER]: { parents: [PREV], version: "9.8.7" },
    },
  }),
  true,
  false,
  false,
  { sha: LATER, before: OTHER },
);
// Round 4: the previous version must be released before a bump over it.
await decide(
  "S25 a bump over a STRANDED previous version (tag, not on JSR) → refused",
  fakeGit(SHA, []),
  false,
  /previous version 9\.8\.6 was never released \(tag v9\.8\.6: yes; on JSR: no\)/,
  false,
  { prev: false },
);
await decide(
  "S26 a bump over a previous version with NO tag → refused",
  fakeGit(SHA, [], { prevTag: false }),
  false,
  /previous version 9\.8\.6 was never released \(tag v9\.8\.6: no; on JSR: yes\)/,
);
await decide(
  "S27 the previous version's JSR state unreadable → refused (cannot decide)",
  fakeGit(SHA, []),
  false,
  /JSR could not be read for the previous version 9\.8\.6/,
  false,
  { prev: "throws" },
);
await decide(
  "S28 bump run, v9.8.7 already at ANOTHER commit, not on JSR → refused (a tag never moves)",
  fakeGit(SHA, [["v9.8.7", OTHER]]),
  false,
  /exists on origin at b{40}, not this commit/,
);
await decide(
  "S29 an ANNOTATED tag peeling to this commit → resumes (the `^{}` line read)",
  fakeGit(SHA, [["v9.8.7", SHA]]),
  false,
  true,
);
await decide(
  "S30 later push, unreleased, and NO bump commit found → refused",
  fakeGit(LATER, [], { commits: history(true), logCode: 128 }),
  false,
  /no commit on main's first-parent line bumps to it/,
  false,
  { sha: LATER, before: SHA },
);
{
  const o = releaseOutputs({ release: true, version: "9.8.7", tag: TAG });
  report(
    "S21 the step outputs are release / version / tag, one per line",
    JSON.stringify(o) === JSON.stringify(["release=true", "version=9.8.7", "tag=v9.8.7"]),
    JSON.stringify(o),
  );
  const f = findBump(fakeGit(LATER, [], { commits: history(true) }), "9.8.7");
  report("S22 findBump: the commit that changed the version TO it", f === SHA, String(f));
  const s = [
    seconds(undefined, 7),
    seconds("x", 7),
    seconds("-1", 7),
    seconds("0", 7),
    seconds("2.5", 7),
  ];
  report(
    "S23 seconds(): unset / NaN / negative → the default; 0 and fractions kept",
    JSON.stringify(s) === JSON.stringify([7, 7, 7, 0, 2.5]),
    JSON.stringify(s),
  );
  const peeled = [
    lsRemotePeeled(`${OTHER}\trefs/tags/v1\n${SHA}\trefs/tags/v1^{}\n`, "refs/tags/v1"),
    lsRemotePeeled(`${SHA}\trefs/tags/v1\n`, "refs/tags/v1"),
    lsRemotePeeled(`${SHA}\trefs/tags/v1^{}\n`, "refs/tags/v1"),
    lsRemotePeeled(`${SHA}\trefs/tags/v10\n`, "refs/tags/v1"),
    lsRemotePeeled("warning: refs/tags/v1\n", "refs/tags/v1"),
  ];
  report(
    "S31 lsRemotePeeled: annotated → its commit; lightweight → itself; a lone ^{}, v10 or a warning line naming the ref → absent",
    JSON.stringify(peeled) === JSON.stringify([SHA, SHA, "", "", ""]),
    JSON.stringify(peeled),
  );
}
// ── the bump run's state, from the Actions API (a mock) ──
{
  const W = ".github/workflows/publish.yml";
  const runsMock = (status: number, runs: Array<{ path: string; status: string }>) => {
    const seen: string[] = [];
    const f = (url: string) => {
      seen.push(url);
      return Promise.resolve(new Response(JSON.stringify({ workflow_runs: runs }), { status }));
    };
    return { f, seen };
  };
  const ask = async (status: number, runs: Array<{ path: string; status: string }>) => {
    const m = runsMock(status, runs);
    try {
      const st = await bumpRunState(SHA, { api: API, repo: REPO, token: "t", workflow: W }, m.f);
      return { st, url: m.seen[0] ?? "" };
    } catch (e) {
      return { st: `throws: ${(e as Error).message}`, url: m.seen[0] ?? "" };
    }
  };
  const a = await ask(200, [{ path: W, status: "in_progress" }, { path: W, status: "completed" }]);
  const b = await ask(200, [{ path: `${W}@refs/heads/main`, status: "completed" }]);
  const c = await ask(200, [{ path: ".github/workflows/other.yml", status: "in_progress" }]);
  const d = await ask(500, []);
  report(
    "Q1 run state: any run going → running; all done → finished; only OTHER workflows → none; HTTP 500 → throws",
    a.st === "running" && b.st === "finished" && c.st === "none" &&
      /throws: .*HTTP 500/.test(d.st) &&
      a.url.includes(`head_sha=${SHA}`) && a.url.includes("event=push") &&
      a.url.startsWith(`${API}/repos/${REPO}/actions/runs`),
    `${a.st} / ${b.st} / ${c.st} / ${d.st} — ${a.url}`,
  );
}

// ── U6 tag ──
const tagWrites = [`tag object ${TAG}`, `ref refs/tags/${TAG}`];
await check(
  "T1 tag absent → created, read back",
  (f) => createTag(TAG, env, f),
  world({ tags: {} }),
  { code: 0, writes: tagWrites, tagAt: SHA, msg: /tag v9\.8\.7 created/ },
);
await check("T2 re-run, tag at this commit", (f) => createTag(TAG, env, f), world(), {
  code: 0,
  writes: [],
  tagAt: SHA,
  msg: /already at/,
});
await check(
  "T3 tag at another commit → refused",
  (f) => createTag(TAG, env, f),
  world({ tags: { [TAG]: { type: "commit", sha: OTHER } } }),
  { code: 1, writes: [], tagAt: OTHER, msg: /a tag never moves/ },
);
await check(
  "T4 created but not readable back → refused",
  (f) => createTag(TAG, env, f),
  world({ tags: {}, dropTagRefOnPost: true }),
  { code: 1, writes: tagWrites, msg: /read back: tag v9\.8\.7 peels to nothing/ },
);

// ── U7 release ──
const rel = (f: ReturnType<typeof mockFetch>) => release(TAG, env, f);
const page = [`release ${TAG}`];
await check("A fresh annotated tag", rel, world(), {
  code: 0,
  writes: page,
  page: true,
  msg: /created by/,
});
await check(
  "B re-run, page there",
  rel,
  world({
    releases: { [TAG]: { tag_name: TAG, html_url: "x", author: { login: "github-actions[bot]" } } },
  }),
  { code: 0, writes: [], msg: /already exists/ },
);
await check("C lightweight tag", rel, world({ tags: { [TAG]: { type: "commit", sha: SHA } } }), {
  code: 0,
  writes: page,
  msg: /created by/,
});
await check("D tag missing", rel, world({ tags: {} }), {
  code: 1,
  writes: [],
  page: false,
  msg: /does not exist on GitHub/,
});
await check(
  "E tag peels elsewhere",
  rel,
  world({ tags: { [TAG]: { type: "commit", sha: OTHER } } }),
  {
    code: 1,
    writes: [],
    page: false,
    msg: /peels to b{40}, not this run's commit/,
  },
);
await check("H page not readable back", rel, world({ dropReleaseOnPost: true }), {
  code: 1,
  writes: page,
  page: false,
  msg: /read back v9\.8\.7: HTTP 404/,
});
await check(
  "H2 the page's state unreadable (GET 500) → refused BEFORE any write (H32)",
  rel,
  world({ releaseGetStatus: 500 }),
  { code: 1, writes: [], page: false, msg: /GET release v9\.8\.7: HTTP 500/ },
);
await check(
  "H3 the page read back names ANOTHER tag → refused",
  rel,
  world({ readBackTag: "v0.0.1" }),
  { code: 1, writes: page, msg: /read back: page is for v0\.0\.1/ },
);
{
  // I: the PER-REQUEST limit is what ends a hung call — measured: it must end near
  // HTTP_TIMEOUT_MS (200 ms), long before the 30 s default, and never hang the suite.
  process.env.HTTP_TIMEOUT_MS = "200";
  const w = world({ hang: true });
  let code = -1;
  let ms = 0;
  let said = "";
  try {
    const r = await quiet(() => rel(mockFetch(w)), 5_000);
    code = r.v;
    ms = r.ms;
    said = r.lines.join(" ");
  } catch (e) {
    said = (e as Error).message;
  }
  delete process.env.HTTP_TIMEOUT_MS;
  report(
    "I a call that never answers times out at HTTP_TIMEOUT_MS",
    code === 1 && ms < 2_000 && /network:/.test(said) && w.writes.length === 0,
    `exit ${code} after ${ms} ms: ${said.slice(0, 120)}`,
  );
}

/**
 * A mock JSR that answers a SEQUENCE (the last answer repeats; "throw" = no answer) and checks
 * every request: the version record's exact path for @jrmarcum/wasmtk@9.8.7 and a cache-bust `cb=`
 * parameter — a wrong URL or a missing cache-bust answers 599 (review round 2: every mock had
 * ignored the URL, so a swapped scope / name survived). `seen` records the request count.
 */
function jsrMock(answers: Array<[number, unknown] | "throw">) {
  const state = { n: 0, bad: "" };
  const busts = new Set<string>();
  const f = (url: string) => {
    const u = new URL(url);
    const a = answers[Math.min(state.n++, answers.length - 1)];
    const cb = u.searchParams.get("cb") ?? "";
    // Each attempt must bust the cache ANEW: a repeated `cb` would be served the cached answer
    // (review round 3: the mock had only checked that one was present).
    const repeated = busts.has(cb);
    busts.add(cb);
    if (u.pathname !== "/scopes/jrmarcum/packages/wasmtk/versions/9.8.7" || !cb || repeated) {
      state.bad = url;
      return Promise.resolve(new Response("{}", { status: 599 }));
    }
    if (a === "throw") return Promise.reject(new Error("no answer"));
    return Promise.resolve(new Response(JSON.stringify(a[1]), { status: a[0] }));
  };
  return { f, state };
}

/** Sets env vars for one block and ALWAYS restores them (a failing case cannot leak them). */
async function withEnv(vars: Record<string, string>, fn: () => Promise<void>) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ── U8 jsr-has ──
await withEnv({ JSR_HAS_TRIES: "3", JSR_HAS_WAIT_S: "0" }, async () => {
  const got: string[] = [];
  for (const s of [200, 404, 500]) {
    try {
      got.push(await jsrHas("9.8.7", jsrMock([[s, {}]]).f));
    } catch {
      got.push("error");
    }
  }
  report("K1 jsr-has 200 / 404 / 500×3", got.join(",") === "true,false,error", got.join(", "));
  const m = jsrMock([[503, {}], "throw", [200, {}]]);
  let k2 = "";
  try {
    k2 = await jsrHas("9.8.7", m.f);
  } catch (e) {
    k2 = `error: ${(e as Error).message}`;
  }
  report(
    "K2 a 503 then no answer, then 200 → retried to 'true'",
    k2 === "true" && m.state.n === 3,
    `${k2} after ${m.state.n} requests`,
  );
});
// K3: the DEFAULT tries, as CI runs it (publish.yml sets no JSR_HAS_TRIES — round 4: every case
// had set it, so a default of 1 passed).
await withEnv({ JSR_HAS_WAIT_S: "0" }, async () => {
  const saved = process.env.JSR_HAS_TRIES;
  delete process.env.JSR_HAS_TRIES;
  try {
    const m = jsrMock([[500, {}], [500, {}], [200, {}]]);
    let k3 = "";
    try {
      k3 = await jsrHas("9.8.7", m.f);
    } catch (e) {
      k3 = `error: ${(e as Error).message}`;
    }
    report(
      "K3 JSR_HAS_TRIES unset → the default 3 tries (500, 500, 200 → 'true')",
      k3 === "true" && m.state.n === 3,
      `${k3} after ${m.state.n} requests`,
    );
  } finally {
    if (saved !== undefined) process.env.JSR_HAS_TRIES = saved;
  }
});

// ── U8 the provenance read-back (the step the file calls "the only evidence") ──
await withEnv({ PROVENANCE_TRIES: "3", PROVENANCE_WAIT_S: "0" }, async () => {
  const runs: [string, Array<[number, unknown] | "throw">, number, RegExp][] = [
    [
      "P1 a Rekor id (string) → pass",
      [[200, { rekorLogId: "3439121339" }]],
      0,
      /Rekor log ID: 3439121339/,
    ],
    [
      "P2 rekorLogId null → published WITHOUT provenance",
      [[200, { rekorLogId: null }]],
      1,
      /WITHOUT provenance/,
    ],
    ["P3 rekorLogId 0 (number) is absence", [[200, { rekorLogId: 0 }]], 1, /WITHOUT provenance/],
    [
      "P4 404 throughout → NOT ON JSR (not a provenance outage)",
      [[404, {}]],
      1,
      /NOT ON JSR at all/,
    ],
    ["P5 500 throughout → JSR could not be read", [[500, {}]], 1, /could not be read/],
    [
      "P6 a Rekor id as a NUMBER → pass",
      [[200, { rekorLogId: 3439121339 }]],
      0,
      /Rekor log ID: 3439121339/,
    ],
    [
      'P7 rekorLogId "null" (a string) is absence',
      [[200, { rekorLogId: "null" }]],
      1,
      /WITHOUT provenance/,
    ],
    [
      'P8 rekorLogId "0" / "000" is absence',
      [[200, { rekorLogId: "000" }]],
      1,
      /WITHOUT provenance/,
    ],
    [
      'P14 rekorLogId "007" (leading zeros) is not an id',
      [[200, { rekorLogId: "007" }]],
      1,
      /WITHOUT provenance/,
    ],
    [
      "P9 404, then the id → pass (JSR ingests late)",
      [[404, {}], [200, { rekorLogId: "5" }]],
      0,
      /Rekor log ID: 5/,
    ],
    [
      "P10 500, then 404 → could not be read (not 'not on JSR')",
      [[500, {}], [404, {}]],
      1,
      /could not be read/,
    ],
    [
      "P11 no answer throughout → could not be read",
      ["throw"],
      1,
      /could not be read for \S+ \(last: no answer/,
    ],
    [
      "P12 200 without id, then 500 → could not be read (the last read decides)",
      [[200, { rekorLogId: null }], [500, {}]],
      1,
      /could not be read .*earlier read showed the version without a Rekor id/,
    ],
  ];
  for (const [name, answers, wantCode, wantMsg] of runs) {
    const m = jsrMock(answers);
    const r = await quiet(() => provenance("9.8.7", m.f));
    const said = r.lines.join(" ");
    report(
      name,
      r.v === wantCode && wantMsg.test(said) && m.state.bad === "",
      `exit ${r.v}: ${said.slice(-110)}${m.state.bad ? ` BAD URL ${m.state.bad}` : ""}`,
    );
  }
  // P13: an invalid PROVENANCE_TRIES is not "zero reads": the default 12 applies.
  process.env.PROVENANCE_TRIES = "0";
  const m = jsrMock([[404, {}]]);
  const r = await quiet(() => provenance("9.8.7", m.f));
  report(
    "P13 PROVENANCE_TRIES=0 → the default 12 reads, not none",
    r.v === 1 && m.state.n === 12,
    `exit ${r.v} after ${m.state.n} reads`,
  );
});

// P15: a RE-RUN must bust the cache anew — GITHUB_RUN_ID stays the same across attempts, so the
// attempt is part of the cache-bust (round 4: attempt 2 asked attempt 1's URLs again).
await withEnv(
  { GITHUB_RUN_ID: "4242", PROVENANCE_TRIES: "2", PROVENANCE_WAIT_S: "0" },
  async () => {
    const urls: string[][] = [];
    for (const attempt of ["1", "2"]) {
      process.env.GITHUB_RUN_ATTEMPT = attempt;
      const seen: string[] = [];
      await quiet(() =>
        provenance("9.8.7", (u: string) => {
          seen.push(u);
          return Promise.resolve(new Response("{}", { status: 404 }));
        })
      );
      urls.push(seen);
    }
    delete process.env.GITHUB_RUN_ATTEMPT;
    const overlap = urls[0].filter((u) => urls[1].includes(u));
    report(
      "P15 attempt 2 of the same run asks NEW cache-bust URLs (none of attempt 1's)",
      urls[0].length === 2 && urls[1].length === 2 && overlap.length === 0,
      `${urls[0].join(", ")} | ${urls[1].join(", ")}`,
    );
  },
);

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
