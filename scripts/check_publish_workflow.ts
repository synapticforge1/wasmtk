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
 *   U5 is-release (a fake git with a small history; ls-remote lists EVERY tag; stderr kept apart).
 *   Round 3 (F): only the BUMP COMMIT's own run releases, and only when pushed alone.
 *     S1  bump run, no tag, JSR without it → release   S2  tag + JSR → done, not a release
 *     S3  HEAD is not GITHUB_SHA → refused         S4  stderr that LOOKS like the ref line is not a tag
 *     S5  only OTHER tags (v9.8.70, v1.0.0) → release
 *     S6  bump run re-run, tag without JSR → resumes (a release)
 *     S7  JSR has it, no tag → refused (published outside the flow)
 *     S8  ls-remote fails → refused (never "no tag")
 *     S9  later push, JSR unreadable → not a release, a warning
 *     S10 bump run, JSR unreadable → refused (cannot decide)
 *     S11 bump pushed with other commits → refused   S12 workflow_dispatch → never a release
 *     S13 later push, released → nothing      S14 later push, unreleased, in grace → a warning
 *     S15 / S16 later push, unreleased past grace (no tag / tag) → refused UNRELEASED, by name
 *     S17 a shorter grace     S18 a merge changing the version is not a bump
 *     S19 later push, JSR without tag → refused   S20 the first deno.json is a bump
 *     S21 releaseOutputs   S22 findBump   S23 seconds()
 *     S24 a version-line revert to a released version, pushed with others → done, not refused
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
 *     I   a call that never answers: ends at HTTP_TIMEOUT_MS (measured), refused, no write
 *   U8 jsr-has
 *     K1  200 → "true", 404 → "false", 500 every time → an error (never "absent", which would
 *         re-attempt an immutable upload)       K2  a 503, then no answer, then 200 → retried, "true"
 *   U8 provenance (the read-back the file calls "the only evidence"; the LAST read decides)
 *     P1  a Rekor id (string) → pass    P2 null → WITHOUT provenance    P3 0 (number) is absence
 *     P4  404 throughout → NOT ON JSR (named apart)    P5 500 throughout → JSR could not be read
 *     P6  a numeric id → pass    P7 "null" / P8 "000" (strings) are absence
 *     P9  404, then the id → pass    P10 500 then 404 → could not be read (not "not on JSR")
 *     P11 no answer throughout → could not be read   P12 200 without id, then 500 → could not be read
 *     P13 PROVENANCE_TRIES=0 → the default 12 reads, not none
 *
 * Usage (from the repo root):  bun scripts/check_publish_workflow.ts
 */
import {
  createTag,
  findBump,
  type GitHubEnv,
  isRelease,
  jsrHas,
  provenance,
  release,
  releaseOutputs,
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
      const r = w.releases[decodeURIComponent(m[1])];
      return r ? res(200, r) : res(404);
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

// ── U5 is-release: a fake git holding a small HISTORY (commits with parents, deno.json versions
//    and times), whose ls-remote lists EVERY tag it holds (so only the exact-ref parse can pick the
//    right one — review round 2), whose stderr can look exactly like a ref line, and a mock JSR.
//    Round 3 (F): the release is decided by the BUMP COMMIT's run, so the history matters ──
interface Commit {
  parents: string[];
  version: string | null; // null = no deno.json there
  time: number; // seconds
}
const NOW = 1_800_000_000_000; // ms
const PREV = "c".repeat(40); // 9.8.6, the bump's parent
const LATER = "d".repeat(40); // a later commit on main, still 9.8.7
const SIDE = "e".repeat(40); // a side-branch commit (a merge's second parent)
const minsAgo = (m: number) => NOW / 1000 - m * 60;
/** PREV (9.8.6) ← SHA (bump to 9.8.7, `bumpAge` minutes ago) [← LATER (9.8.7, now)] */
const history = (bumpAge = 5, later = false): Record<string, Commit> => ({
  [PREV]: { parents: [], version: "9.8.6", time: minsAgo(bumpAge + 60) },
  [SHA]: { parents: [PREV], version: "9.8.7", time: minsAgo(bumpAge) },
  ...(later ? { [LATER]: { parents: [SHA], version: "9.8.7", time: minsAgo(0) } } : {}),
});
const fakeGit = (
  head: string,
  remoteTags: string[],
  o: { stderr?: string; lsRemoteCode?: number; commits?: Record<string, Commit> } = {},
) => {
  const commits = o.commits ?? history();
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
      const lines = remoteTags.map((t) => `${SHA}\trefs/tags/${t}`);
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
      const lines: string[] = [];
      for (let at: string | undefined = head; at && commits[at]; at = commits[at].parents[0]) {
        lines.push(`${at} ${commits[at].time}`);
      }
      return { code: 0, out: lines.join("\n") + "\n", err: "" };
    }
    return { code: 1, out: "", err: `fake git: unexpected ${args.join(" ")}` };
  };
};
const jsrSays = (has: boolean | "throws") => () =>
  has === "throws"
    ? Promise.reject(new Error("JSR answered HTTP 503 (3 tries)"))
    : Promise.resolve(has ? "true" as const : "false" as const);
async function decide(
  name: string,
  git: ReturnType<typeof fakeGit>,
  jsrHasIt: boolean | "throws",
  want: boolean | RegExp,
  wantWarning = false,
  run: { sha?: string; before?: string | null; graceMin?: number } = {},
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
        now: NOW,
        graceMin: run.graceMin,
      },
      git,
      jsrSays(jsrHasIt),
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
// The bump commit's own run (HEAD = SHA, pushed alone: before = PREV).
await decide("S1 bump run: no tag, JSR without it → release", fakeGit(SHA, []), false, true);
await decide("S2 bump run: tag + JSR → done, not a release", fakeGit(SHA, ["v9.8.7"]), true, false);
await decide(
  "S3 HEAD is not GITHUB_SHA → refused",
  fakeGit(OTHER, []),
  false,
  /not this run's commit/,
);
// S4 / S5 with JSR HAVING the version, so a misread tag turns "refused" into "done" (round 3: with
// JSR empty the bump run releases tag or no tag, and both cases had gone vacuous).
await decide(
  "S4 stderr that LOOKS like the ref line is not a tag (JSR has it → refused, not 'done')",
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
  "S6 bump run re-run: tag on origin, JSR without it → RESUMES (a release)",
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
  fakeGit(LATER, ["v9.8.7"], { commits: history(5, true) }),
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
// F: a LATER push meets the version (the bump's run was cancelled, failed, or is still running).
await decide(
  "S13 later push, version released (tag + JSR) → not a release, no warning",
  fakeGit(LATER, ["v9.8.7"], { commits: history(500, true) }),
  true,
  false,
  false,
  { sha: LATER, before: SHA },
);
await decide(
  "S14 later push, unreleased, bump 5 min ago → NOT a release, a warning (in progress)",
  fakeGit(LATER, [], { commits: history(5, true) }),
  false,
  false,
  true,
  { sha: LATER, before: SHA },
  /possibly still in progress/,
);
await decide(
  "S15 later push, unreleased, bump 2 h ago → refused UNRELEASED, naming the bump commit",
  fakeGit(LATER, [], { commits: history(120, true) }),
  false,
  new RegExp(`UNRELEASED VERSION on main: .*bump commit ${SHA.slice(0, 11)}.*no tag`),
  false,
  { sha: LATER, before: SHA },
);
await decide(
  "S16 later push, tag but no JSR, past grace → refused UNRELEASED (the tag exists)",
  fakeGit(LATER, ["v9.8.7"], { commits: history(120, true) }),
  false,
  /UNRELEASED VERSION on main: .*the tag exists/,
  false,
  { sha: LATER, before: SHA },
);
await decide(
  "S17 RELEASE_GRACE_MIN=5: bump 10 min ago → refused",
  fakeGit(LATER, [], { commits: history(10, true) }),
  false,
  /UNRELEASED VERSION/,
  false,
  { sha: LATER, before: SHA, graceMin: 5 },
);
await decide(
  "S18 a MERGE that changes the version is not a bump commit → not a release",
  fakeGit(LATER, [], {
    commits: {
      [PREV]: { parents: [], version: "9.8.6", time: minsAgo(70) },
      [SIDE]: { parents: [PREV], version: "9.8.7", time: minsAgo(6) },
      [LATER]: { parents: [PREV, SIDE], version: "9.8.7", time: minsAgo(5) },
    },
  }),
  false,
  false,
  true,
  { sha: LATER, before: PREV },
);
await decide(
  "S19 later push, JSR has it, no tag → refused",
  fakeGit(LATER, [], { commits: history(5, true) }),
  true,
  /published outside this flow/,
  false,
  { sha: LATER, before: SHA },
);
await decide(
  "S20 the first deno.json ever (no parent version) is a bump → release",
  fakeGit(SHA, [], {
    commits: {
      [PREV]: { parents: [], version: null, time: minsAgo(70) },
      [SHA]: { parents: [PREV], version: "9.8.7", time: minsAgo(5) },
    },
  }),
  false,
  true,
);
await decide(
  "S24 a version-line REVERT to a released version, pushed with others → done, not refused",
  fakeGit(LATER, ["v9.8.7"], {
    commits: {
      [SHA]: { parents: [], version: "9.8.7", time: minsAgo(500) },
      [PREV]: { parents: [SHA], version: "9.8.8", time: minsAgo(90) },
      [LATER]: { parents: [PREV], version: "9.8.7", time: minsAgo(1) },
    },
  }),
  true,
  false,
  false,
  { sha: LATER, before: OTHER },
);
{
  const o = releaseOutputs({ release: true, version: "9.8.7", tag: TAG });
  report(
    "S21 the step outputs are release / version / tag, one per line",
    JSON.stringify(o) === JSON.stringify(["release=true", "version=9.8.7", "tag=v9.8.7"]),
    JSON.stringify(o),
  );
  const f = findBump(fakeGit(LATER, [], { commits: history(120, true) }), "9.8.7");
  report(
    "S22 findBump: the commit that changed the version TO it, not a later one",
    f?.sha === SHA && f.time === minsAgo(120),
    JSON.stringify(f),
  );
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

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
