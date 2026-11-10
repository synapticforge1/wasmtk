/**
 * check_publish_workflow.ts — proves `scripts/publish-workflow.ts release` (publish.yml's `release`
 * job, letters H30 / H32) does what H32's order says, against a MOCK GitHub REST API and a mock
 * JSR: no network, no token. Re-run it whenever publish-workflow.ts changes; the real API is
 * exercised only by the next tag run.
 *
 *   A  fresh tag (annotated): branch + page created, read back — exactly 2 writes
 *   B  re-run (branch and page there): 0 writes, success
 *   C  lightweight tag: peels without a tag object
 *   D  tag missing on GitHub: refused, 0 writes (POST /releases would CREATE the tag)
 *   E  tag peels to another commit: refused, 0 writes
 *   F  JSR does not serve the version: refused, 0 writes
 *   G  branch exists at another commit: refused, no page written
 *   H  page POST "succeeds" but cannot be read back: refused
 *   I  a call that never answers: times out, refused (HTTP_TIMEOUT_MS)
 *   J  C34: JSR has the version although `deno publish` failed after the upload → page made
 *
 * Usage (from the repo root):  bun scripts/check_publish_workflow.ts
 */
import { release, type ReleaseEnv } from "./publish-workflow.ts";

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
  jsrHas: boolean;
  dropReleaseOnPost?: boolean; // H: POST answers 201 but nothing is stored
  hang?: boolean; // I: every GitHub call hangs until its signal aborts
  writes: string[];
}

const world = (over: Partial<World> = {}): World => ({
  tags: { [TAG]: { type: "tag", sha: "t".repeat(40) } },
  tagObjects: { ["t".repeat(40)]: { type: "commit", sha: SHA } },
  branches: {},
  releases: {},
  jsrHas: true,
  writes: [],
  ...over,
});

function mockFetch(w: World) {
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    const res = (status: number, body: unknown = {}) =>
      new Response(JSON.stringify(body), { status });
    if (url.startsWith("https://api.jsr.io/")) return res(w.jsrHas ? 200 : 404);
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
    if (method === "GET" && (m = path.match(/^\/git\/ref\/heads\/(.+)$/))) {
      const b = w.branches[m[1]];
      return b ? res(200, { object: { type: "commit", sha: b } }) : res(404);
    }
    if (method === "POST" && path === "/git/refs") {
      const body = JSON.parse(String(init.body));
      w.writes.push(`branch ${body.ref}`);
      w.branches[body.ref.replace("refs/heads/", "")] = body.sha;
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

const env: ReleaseEnv = { api: API, repo: REPO, sha: SHA, token: "test", tries: 2, waitS: 0 };

let failed = 0;
async function check(
  name: string,
  w: World,
  want: { code: number; writes: string[]; page?: boolean },
) {
  const log = console.log;
  const lines: string[] = [];
  console.log = (...a: unknown[]) => lines.push(a.join(" "));
  let code: number;
  try {
    code = await release(TAG, env, mockFetch(w));
  } finally {
    console.log = log;
  }
  const page = TAG in w.releases;
  const ok = code === want.code && JSON.stringify(w.writes) === JSON.stringify(want.writes) &&
    (want.page === undefined || page === want.page);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: exit ${code}, writes [${w.writes.join(", ")}]`);
  if (!ok) {
    console.log(
      `     want exit ${want.code}, writes [${want.writes.join(", ")}]\n     ${
        lines.join("\n     ")
      }`,
    );
  }
}

const both = [`branch refs/heads/release/${TAG}`, `release ${TAG}`];
await check("A fresh annotated tag", world(), { code: 0, writes: both, page: true });
await check(
  "B re-run, branch and page there",
  world({
    branches: { [`release/${TAG}`]: SHA },
    releases: { [TAG]: { tag_name: TAG, html_url: "x", author: { login: "github-actions[bot]" } } },
  }),
  { code: 0, writes: [] },
);
await check("C lightweight tag", world({ tags: { [TAG]: { type: "commit", sha: SHA } } }), {
  code: 0,
  writes: both,
});
await check("D tag missing", world({ tags: {} }), { code: 1, writes: [], page: false });
await check(
  "E tag peels elsewhere",
  world({ tags: { [TAG]: { type: "commit", sha: OTHER } } }),
  { code: 1, writes: [], page: false },
);
await check("F JSR lacks the version", world({ jsrHas: false }), {
  code: 1,
  writes: [],
  page: false,
});
await check(
  "G branch at another commit",
  world({ branches: { [`release/${TAG}`]: OTHER } }),
  { code: 1, writes: [], page: false },
);
await check("H page not readable back", world({ dropReleaseOnPost: true }), {
  code: 1,
  writes: both,
  page: false,
});
process.env.HTTP_TIMEOUT_MS = "200";
await check("I a call that never answers", world({ hang: true }), { code: 1, writes: [] });
delete process.env.HTTP_TIMEOUT_MS;
// J is A's world reached on the C34 path: publish.yml runs this job on `uploaded`, not on
// `deno publish`'s exit, so what decides is JSR serving the version — which it does here.
await check("J publish failed after upload, JSR has it", world({ jsrHas: true }), {
  code: 0,
  writes: both,
  page: true,
});

console.log(failed ? `\n${failed} case(s) FAILED` : "\nall 10 cases pass");
process.exit(failed ? 1 : 0);
