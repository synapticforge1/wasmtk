/**
 * check_publish_workflow.ts — proves the CI steps in `scripts/publish-workflow.ts` (publish.yml,
 * the workspace release process U5–U8 in the owner's order: checks → tag → page → publish) do what
 * they promise, against a MOCK GitHub REST API, a mock JSR and a fake `git`: no network, no token.
 * Re-run it whenever publish-workflow.ts changes; the real API is exercised only by a real release.
 *
 * The version tag IS the release (owner, 2026-11-10): the page is made ON the tag, and no branch
 * is ever written. The mock refuses a page that names a `target_commitish`, and records every
 * write, so a stray write turns a case red.
 *
 *   U5 is-release
 *     S1  the tag is not on origin → release; S2 it is → not a release;
 *     S3  HEAD is not GITHUB_SHA → refused
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
 *     G   a leftover `release/<tag>` branch elsewhere (the old flow's): ignored, page on the tag
 *     H   page POST "succeeds" but cannot be read back: refused
 *     I   a call that never answers: times out, refused (HTTP_TIMEOUT_MS)
 *   U8 jsr-has
 *     K   200 → "true", 404 → "false", 500 → an error (never "absent", which would re-attempt an
 *         immutable upload)
 *
 * Usage (from the repo root):  bun scripts/check_publish_workflow.ts
 */
import { createTag, type GitHubEnv, isRelease, jsrHas, release } from "./publish-workflow.ts";

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
        if (!w.dropTagRefOnPost) w.tags[body.ref.slice(10)] = { type: "tag", sha: body.sha };
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

async function check(
  name: string,
  run: (f: ReturnType<typeof mockFetch>) => Promise<number>,
  w: World,
  want: { code: number; writes: string[]; page?: boolean; tagAt?: string },
) {
  const log = console.log;
  const lines: string[] = [];
  console.log = (...a: unknown[]) => lines.push(a.join(" "));
  let code: number;
  try {
    code = await run(mockFetch(w));
  } finally {
    console.log = log;
  }
  const page = TAG in w.releases;
  const tagObj = w.tags[TAG];
  const tagAt = tagObj
    ? (tagObj.type === "tag" ? w.tagObjects[tagObj.sha]?.sha ?? "?" : tagObj.sha)
    : "";
  const ok = code === want.code && JSON.stringify(w.writes) === JSON.stringify(want.writes) &&
    (want.page === undefined || page === want.page) &&
    (want.tagAt === undefined || tagAt === want.tagAt);
  report(
    name,
    ok,
    `exit ${code}, writes [${w.writes.join(", ")}]`,
    `want exit ${want.code}, writes [${want.writes.join(", ")}]\n     ${lines.join("\n     ")}`,
  );
}

// ── U5 is-release, with a fake git ──
const fakeGit = (head: string, remoteHasTag: boolean) => (args: string[]) => {
  if (args[0] === "rev-parse") return { code: 0, out: `${head}\n` };
  if (args[0] === "ls-remote") {
    return { code: 0, out: remoteHasTag ? `${SHA}\trefs/tags/v9.8.7\n` : "" };
  }
  return { code: 1, out: "fake git: unexpected" };
};
{
  const r1 = isRelease(SHA, "9.8.7", fakeGit(SHA, false));
  report(
    "S1 tag not on origin → release",
    r1.release === true && r1.tag === TAG,
    JSON.stringify(r1),
  );
  const r2 = isRelease(SHA, "9.8.7", fakeGit(SHA, true));
  report("S2 tag on origin → not a release", r2.release === false, JSON.stringify(r2));
  let threw = "";
  try {
    isRelease(SHA, "9.8.7", fakeGit(OTHER, false));
  } catch (e) {
    threw = (e as Error).message;
  }
  report(
    "S3 HEAD is not GITHUB_SHA → refused",
    /not this run's commit/.test(threw),
    threw || "no error",
  );
}

// ── U6 tag ──
const tagWrites = [`tag object ${TAG}`, `ref refs/tags/${TAG}`];
await check(
  "T1 tag absent → created, read back",
  (f) => createTag(TAG, env, f),
  world({ tags: {} }),
  {
    code: 0,
    writes: tagWrites,
    tagAt: SHA,
  },
);
await check("T2 re-run, tag at this commit", (f) => createTag(TAG, env, f), world(), {
  code: 0,
  writes: [],
  tagAt: SHA,
});
await check(
  "T3 tag at another commit → refused",
  (f) => createTag(TAG, env, f),
  world({ tags: { [TAG]: { type: "commit", sha: OTHER } } }),
  { code: 1, writes: [], tagAt: OTHER },
);
await check(
  "T4 created but not readable back → refused",
  (f) => createTag(TAG, env, f),
  world({ tags: {}, dropTagRefOnPost: true }),
  { code: 1, writes: tagWrites },
);

// ── U7 release ──
const rel = (f: ReturnType<typeof mockFetch>) => release(TAG, env, f);
const page = [`release ${TAG}`];
await check("A fresh annotated tag", rel, world(), { code: 0, writes: page, page: true });
await check(
  "B re-run, page there",
  rel,
  world({
    releases: { [TAG]: { tag_name: TAG, html_url: "x", author: { login: "github-actions[bot]" } } },
  }),
  { code: 0, writes: [] },
);
await check("C lightweight tag", rel, world({ tags: { [TAG]: { type: "commit", sha: SHA } } }), {
  code: 0,
  writes: page,
});
await check("D tag missing", rel, world({ tags: {} }), { code: 1, writes: [], page: false });
await check(
  "E tag peels elsewhere",
  rel,
  world({ tags: { [TAG]: { type: "commit", sha: OTHER } } }),
  {
    code: 1,
    writes: [],
    page: false,
  },
);
await check(
  "G leftover release branch elsewhere is ignored",
  rel,
  world({ branches: { [`release/${TAG}`]: OTHER } }),
  { code: 0, writes: page, page: true },
);
await check("H page not readable back", rel, world({ dropReleaseOnPost: true }), {
  code: 1,
  writes: page,
  page: false,
});
process.env.HTTP_TIMEOUT_MS = "200";
await check("I a call that never answers", rel, world({ hang: true }), { code: 1, writes: [] });
delete process.env.HTTP_TIMEOUT_MS;

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

console.log(failed ? `\n${failed} of ${cases} case(s) FAILED` : `\nall ${cases} cases pass`);
process.exit(failed ? 1 : 0);
