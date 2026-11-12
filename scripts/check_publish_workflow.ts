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
 * has a deadline (a hang fails, it does not stall the suite) — review round 1, 2026-11-12.
 *
 *   U5 is-release (a fake git that answers only the exact ref it is asked for; stderr kept apart)
 *     S1  no tag, JSR without it → release        S2  tag + JSR → not a release
 *     S3  HEAD is not GITHUB_SHA → refused         S4  a git WARNING on stderr is not a tag
 *     S5  only a different tag (v9.8.70) → release
 *     S6  tag without the JSR version → STRANDED, refused
 *     S7  JSR has it, no tag → refused (published outside the flow)
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
 *     K   200 → "true", 404 → "false", 500 → an error (never "absent", which would re-attempt an
 *         immutable upload)
 *   U8 provenance (the read-back the file calls "the only evidence")
 *     P1  a Rekor id → pass    P2 null → WITHOUT provenance    P3 0 is absence, not an id
 *     P4  404 throughout → NOT ON JSR (named apart)    P5 500 throughout → JSR could not be read
 *
 * Usage (from the repo root):  bun scripts/check_publish_workflow.ts
 */
import {
  createTag,
  type GitHubEnv,
  isRelease,
  jsrHas,
  provenance,
  release,
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

// ── U5 is-release: a fake git that ANSWERS ITS ARGUMENTS (only the exact ref it is asked for),
//    keeps stderr apart, and a mock JSR ──
const fakeGit = (head: string, remoteTags: string[], stderr = "") => (args: string[]) => {
  if (args[0] === "rev-parse") return { code: 0, out: `${head}\n`, err: stderr };
  if (args[0] === "ls-remote") {
    const asked = args[args.length - 1];
    const lines = remoteTags.filter((t) => `refs/tags/${t}` === asked)
      .map((t) => `${SHA}\trefs/tags/${t}`);
    return { code: 0, out: lines.length ? lines.join("\n") + "\n" : "", err: stderr };
  }
  return { code: 1, out: "", err: "fake git: unexpected" };
};
const jsrSays = (has: boolean) => () => Promise.resolve(has ? "true" as const : "false" as const);
async function decide(
  name: string,
  git: ReturnType<typeof fakeGit>,
  jsrHasIt: boolean,
  want: boolean | RegExp,
) {
  let got = "";
  let ok = false;
  try {
    const r = await isRelease(SHA, "9.8.7", git, jsrSays(jsrHasIt));
    got = JSON.stringify(r);
    ok = typeof want === "boolean" && r.release === want && r.tag === TAG;
  } catch (e) {
    got = `refused: ${(e as Error).message}`;
    ok = want instanceof RegExp && want.test(got);
  }
  report(name, ok, got);
}
await decide("S1 no tag, JSR without it → release", fakeGit(SHA, []), false, true);
await decide("S2 tag on origin, JSR has it → not a release", fakeGit(SHA, ["v9.8.7"]), true, false);
await decide(
  "S3 HEAD is not GITHUB_SHA → refused",
  fakeGit(OTHER, []),
  false,
  /not this run's commit/,
);
await decide(
  "S4 a git warning on stderr is NOT a tag",
  fakeGit(SHA, [], "warning: redirecting to https://example.test/r.git/\n"),
  false,
  true,
);
await decide(
  "S5 only a DIFFERENT tag on origin (v9.8.70) → release",
  fakeGit(SHA, ["v9.8.70"]),
  false,
  true,
);
await decide(
  "S6 tag on origin, JSR WITHOUT it → stranded, refused",
  fakeGit(SHA, ["v9.8.7"]),
  false,
  /STRANDED RELEASE/,
);
await decide(
  "S7 JSR has it, no tag → refused",
  fakeGit(SHA, []),
  true,
  /published outside this flow/,
);

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

// ── U8 jsr-has ──
{
  const jsr = (status: number) => () => Promise.resolve(new Response("{}", { status }));
  const got: string[] = [];
  for (const s of [200, 404, 500]) {
    try {
      got.push(await jsrHas("9.8.7", jsr(s)));
    } catch {
      got.push("error");
    }
  }
  report("K jsr-has 200 / 404 / 500", got.join(",") === "true,false,error", got.join(", "));
}

// ── U8 the provenance read-back (the step the file calls "the only evidence") ──
{
  process.env.PROVENANCE_TRIES = "2";
  process.env.PROVENANCE_WAIT_S = "0";
  const answers = (status: number, body: unknown) => () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
  const runs: [string, ReturnType<typeof answers>, number, RegExp][] = [
    [
      "P1 a Rekor id → pass",
      answers(200, { rekorLogId: "3439121339" }),
      0,
      /Provenance recorded — Rekor log ID: 3439121339/,
    ],
    [
      "P2 rekorLogId null → published WITHOUT provenance",
      answers(200, { rekorLogId: null }),
      1,
      /WITHOUT provenance/,
    ],
    [
      "P3 rekorLogId 0 is absence, not an id",
      answers(200, { rekorLogId: 0 }),
      1,
      /WITHOUT provenance/,
    ],
    [
      "P4 404 throughout → NOT ON JSR (not a provenance outage)",
      answers(404, {}),
      1,
      /NOT ON JSR at all/,
    ],
    ["P5 500 throughout → JSR could not be read", answers(500, {}), 1, /could not be read/],
  ];
  for (const [name, f, wantCode, wantMsg] of runs) {
    const r = await quiet(() => provenance("9.8.7", f));
    const said = r.lines.join(" ");
    report(name, r.v === wantCode && wantMsg.test(said), `exit ${r.v}: ${said.slice(-110)}`);
  }
  delete process.env.PROVENANCE_TRIES;
  delete process.env.PROVENANCE_WAIT_S;
}

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
