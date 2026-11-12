/**
 * The logic of publish.yml's steps, so the workflow's `run:` steps only launch commands
 * (workspace `working-rules.md` § Tooling rule 1: a CI `run:` block launches; its logic is
 * TypeScript; rule 2: no `deno eval "…"`). Moved here 2026-10-27 from inline shell + `deno eval`;
 * the GitHub Release moved here 2026-11-10 from `gh release create` (letters H30, H32).
 *
 * **The order is the owner's** (2026-11-10, workspace release-process.md § 5 U5–U8, decision D1):
 * "the CI to check first, then push the tag, and then create the release page from the tag, then
 * publish the package to the registry". The local `deno task release` pushes `main` only; this
 * file is every CI step after that:
 *
 *   bun scripts/publish-workflow.ts is-release            # U5: HEAD = GITHUB_SHA; the tag AND JSR
 *   bun scripts/publish-workflow.ts tag <tag>             # U6: CI creates the annotated tag, reads back
 *   bun scripts/publish-workflow.ts release <tag>         # U7: the Release page FROM the tag
 *   deno run … publish-workflow.ts oidc-check             # U8 diagnostic: OIDC env present?
 *   deno run … publish-workflow.ts jsr-has <version>      # U8: present=true|false (a re-run skips)
 *   bun scripts/publish-workflow.ts provenance <version>  # U8 read-back, fatal: JSR's Rekor entry
 *
 * The two `deno run` lines run in the `jsr` job, beside its OIDC token, so nothing but Deno and
 * this first-party file is installed or run there (review round 1, finding E); they take only the
 * permissions publish.yml grants them.
 *
 * `tag` and `release` follow H32's discipline: nothing is written before the state on GitHub is
 * read, an existing result is done (re-runs write nothing — U12), a tag is never moved, and every
 * write is read back. Every network call has its own time limit (HTTP_TIMEOUT_MS, default 30 s).
 * `gh` is never used (🔒 owner 2026-11-08, letter H30). Tested against a mock API by
 * `scripts/check_publish_workflow.ts`. `oidc-check` and `provenance` are the shell steps of
 * 2026-10-27 kept message for message; `provenance` polls 12 times, 15 s apart (override with
 * PROVENANCE_TRIES / PROVENANCE_WAIT_S).
 */
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import denoJson from "../deno.json" with { type: "json" };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const timeoutMs = () => Number(process.env.HTTP_TIMEOUT_MS ?? 30_000);
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

/** One request with its own time limit; a timeout or network error throws. */
async function call(f: Fetch, url: string, init: RequestInit = {}): Promise<Response> {
  return await f(url, { ...init, signal: AbortSignal.timeout(timeoutMs()) });
}

/** `@scope/name` → JSR's version-record URL. */
export function jsrVersionUrl(pkg: string, version: string): string {
  const scope = pkg.slice(0, pkg.indexOf("/")).replace(/^@/, "");
  const name = pkg.slice(pkg.indexOf("/") + 1);
  return `https://api.jsr.io/scopes/${scope}/packages/${name}/versions/${version}`;
}

/**
 * JSR's version record → its Rekor log id, or "" while (or when) there is none. Only a non-empty
 * string of digits or a positive integer counts: `null`, `0`, `false`, "" or "null" are absence
 * (review round 1: `0` / `false` had counted as present).
 */
export function jsrRekor(body: string): string {
  try {
    const id = (JSON.parse(body) as { rekorLogId?: unknown }).rekorLogId;
    if (typeof id === "string" && /^0*[1-9]\d*$/.test(id.trim())) return id.trim();
    if (typeof id === "number" && Number.isInteger(id) && id > 0) return String(id);
    return "";
  } catch {
    return "";
  }
}

function writeOutput(...lines: string[]): number {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    console.error("::error::GITHUB_OUTPUT is not set (this subcommand runs inside GitHub Actions)");
    return 1;
  }
  appendFileSync(out, lines.map((l) => `${l}\n`).join(""));
  return 0;
}

// ── U5: is this a release? ───────────────────────────────────────────────────────────────────

/** A git call's result: `out` is STDOUT only (the only thing parsed), `err` its stderr. */
export type Git = (args: string[]) => { code: number; out: string; err: string };

/**
 * The checked-out commit must be the run's (`GITHUB_SHA`). Then BOTH places that say "released"
 * are read — the tag on origin (an exact `refs/tags/v<version>` line of `ls-remote`'s stdout) and
 * JSR — and must agree:
 *   tag absent, JSR without it → a release;   tag present, JSR has it → not a release (checks only);
 *   tag present, JSR WITHOUT it → STRANDED: a release run tagged and then failed — refused loudly
 *     on every push until it is finished ("Re-run failed jobs" on that run, U12);
 *   tag absent, JSR HAS it → published outside this flow — refused (CI would otherwise tag and
 *     page this commit and pass provenance on the old record).
 * Review round 1, 2026-11-12 (findings C and D): the tag alone decided, so a stranded release went
 * green forever, and a git warning on stderr read as "tag present".
 */
/**
 * The exact ref line of `git ls-remote` stdout for `ref` exists: a 40-hex object id, whitespace, the
 * ref — so a warning that merely MENTIONS the ref is not one (review round 2, R2-C). Shared with
 * scripts/release.ts, so both halves read a ref the same way.
 */
export function lsRemoteHas(stdout: string, ref: string): boolean {
  return stdout.split("\n").some((l) => {
    const f = l.trim().split(/\s+/);
    return f.length === 2 && /^[0-9a-f]{40}$/.test(f[0]) && f[1] === ref;
  });
}

/**
 * … and when JSR cannot be read at all (after `jsrHas`'s retries): a version whose tag is on origin
 * is treated as "not a release" with a WARNING (a non-release push stays green through a JSR outage
 * — review round 2, R2-D); an untagged version cannot be decided, so the run is refused.
 */
export async function isRelease(
  sha: string,
  version: string,
  git: Git,
  jsr: (version: string) => Promise<"true" | "false">,
): Promise<{ release: boolean; version: string; tag: string; warning?: string }> {
  const head = git(["rev-parse", "HEAD"]);
  if (head.code !== 0 || head.out.trim() !== sha) {
    throw new Error(`HEAD is ${head.out.trim() || "unknown"}, not this run's commit ${sha}`);
  }
  const tag = `v${version}`;
  const ref = `refs/tags/${tag}`;
  const remote = git(["ls-remote", "--tags", "origin", ref]);
  if (remote.code !== 0) {
    throw new Error(`could not read origin's tags: ${(remote.err + remote.out).trim()}`);
  }
  const tagged = lsRemoteHas(remote.out, ref);
  let published: boolean;
  try {
    published = (await jsr(version)) === "true";
  } catch (e) {
    if (!tagged) {
      throw new Error(
        `JSR could not be read, so whether ${version} is a new release cannot be decided: ${
          (e as Error).message
        }. Re-run when JSR answers.`,
      );
    }
    return {
      release: false,
      version,
      tag,
      warning: `JSR could not be read (${
        (e as Error).message
      }); ${tag} is on origin, so this push is treated as not a release — the stranded-release check did not run.`,
    };
  }
  if (tagged && !published) {
    throw new Error(
      `STRANDED RELEASE: ${tag} is on origin but JSR does not serve ${version}. The release run that made the tag did not finish: open it and "Re-run failed jobs" (never a new tag, never "Re-run all jobs").`,
    );
  }
  if (!tagged && published) {
    throw new Error(
      `JSR already serves ${version} but ${tag} is not on origin: it was published outside this flow. Bump to the next version; never tag a commit for a version JSR already has.`,
    );
  }
  return { release: !tagged, version, tag };
}

// ── U6 / U7: the GitHub side, through the REST API ──────────────────────────────────────────────

/** What `tag` and `release` need from the runner; the defaults are GitHub Actions' own variables. */
export interface GitHubEnv {
  api: string; // GITHUB_API_URL
  repo: string; // GITHUB_REPOSITORY, owner/name
  sha: string; // GITHUB_SHA, the checked commit
  token: string; // GITHUB_TOKEN, contents: write
}

class GitHubError extends Error {}

function github(env: GitHubEnv, f: Fetch) {
  const gh = (path: string, init: RequestInit = {}) =>
    call(f, `${env.api}/repos/${env.repo}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  const json = async (res: Response, what: string) => {
    if (!res.ok) throw new GitHubError(`${what}: HTTP ${res.status} ${await res.text()}`);
    return await res.json();
  };
  /** The commit a tag peels to, following annotated tag objects; "" when the tag is absent. */
  const peel = async (tag: string): Promise<string> => {
    const ref = await gh(`/git/ref/tags/${encodeURIComponent(tag)}`);
    if (ref.status === 404) return "";
    let obj = (await json(ref, `GET tag ${tag}`)).object as { type: string; sha: string };
    for (let depth = 0; obj.type === "tag"; depth++) {
      if (depth > 8) throw new GitHubError(`tag ${tag}: more than 8 nested tag objects`);
      obj = (await json(await gh(`/git/tags/${obj.sha}`), `GET tag object ${obj.sha}`)).object;
    }
    if (obj.type !== "commit") throw new GitHubError(`tag ${tag} points at a ${obj.type}`);
    return obj.sha;
  };
  return { gh, json, peel };
}

const fail = (what: string, e: unknown) => {
  const msg = e instanceof GitHubError ? e.message : `network: ${(e as Error).message}`;
  console.log(`::error::${what}: ${msg}`);
  return 1;
};

/**
 * U6 — CI creates the annotated tag `tag` on GITHUB_SHA (after `checks` passed on that commit).
 * Already there at this commit = done (a re-run); there at ANOTHER commit = refused (a published
 * tag never moves). Then reads it back: the tag must peel to GITHUB_SHA.
 */
export async function createTag(tag: string, env: GitHubEnv, f: Fetch = fetch): Promise<number> {
  const { gh, json, peel } = github(env, f);
  try {
    const now = await peel(tag);
    if (now === env.sha) {
      console.log(`tag ${tag} already at ${env.sha} — nothing written`);
      return 0;
    }
    if (now) {
      throw new GitHubError(`tag ${tag} exists at ${now}, not ${env.sha}; a tag never moves`);
    }
    const obj = await json(
      await gh(`/git/tags`, {
        method: "POST",
        body: JSON.stringify({
          tag,
          message: `${denoJson.name} ${tag}`,
          object: env.sha,
          type: "commit",
        }),
      }),
      `POST tag object ${tag}`,
    );
    await json(
      await gh(`/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/tags/${tag}`, sha: obj.sha }),
      }),
      `POST refs/tags/${tag}`,
    );
    const back = await peel(tag);
    if (back !== env.sha) {
      throw new GitHubError(`read back: tag ${tag} peels to ${back || "nothing"}`);
    }
    console.log(`✅ tag ${tag} created (annotated, ${obj.sha}) → ${env.sha}`);
    return 0;
  } catch (e) {
    return fail(`tag ${tag}`, e);
  }
}

/**
 * U7 — the Release page FROM the tag, made BEFORE the publish (owner's order): the tag peels to
 * GITHUB_SHA (`POST /releases` would CREATE a missing tag) → an existing page is done → `POST` on
 * the tag (no `target_commitish`) with generated notes and the JSR link of the version about to be
 * published → read back, peel again.
 */
export async function release(tag: string, env: GitHubEnv, f: Fetch = fetch): Promise<number> {
  const { gh, json, peel } = github(env, f);
  const version = tag.replace(/^v/, "");
  try {
    const tagged = await peel(tag);
    if (!tagged) {
      throw new GitHubError(`tag ${tag} does not exist on GitHub (a POST would create it)`);
    }
    if (tagged !== env.sha) {
      throw new GitHubError(`tag ${tag} peels to ${tagged}, not this run's commit ${env.sha}`);
    }
    console.log(`tag ${tag} → ${env.sha}`);

    const existing = await gh(`/releases/tags/${encodeURIComponent(tag)}`);
    if (existing.status === 200) {
      const page = await existing.json();
      console.log(`Release ${tag} already exists (${page.html_url}) — nothing written`);
      return 0;
    }
    if (existing.status !== 404) await json(existing, `GET release ${tag}`);
    await json(
      await gh(`/releases`, {
        method: "POST",
        body: JSON.stringify({
          tag_name: tag,
          name: tag,
          generate_release_notes: true,
          body: `JSR: https://jsr.io/${denoJson.name}@${version}`,
        }),
      }),
      `POST release ${tag}`,
    );

    const page = await json(
      await gh(`/releases/tags/${encodeURIComponent(tag)}`),
      `read back ${tag}`,
    );
    if (page.tag_name !== tag) throw new GitHubError(`read back: page is for ${page.tag_name}`);
    if ((await peel(tag)) !== env.sha) throw new GitHubError(`read back: tag ${tag} moved`);
    console.log(`✅ Release ${tag} created by ${page.author?.login ?? "?"}: ${page.html_url}`);
    return 0;
  } catch (e) {
    return fail(`release ${tag}`, e);
  }
}

// ── U8: the publish, LAST ───────────────────────────────────────────────────────────────────────

function oidcCheck(): number {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL ?? "";
  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ?? "";
  if (url && token) {
    console.log("OIDC token endpoint available — provenance prerequisites met.");
  } else {
    // A warning, not a failure: the publish still runs, and the provenance step judges the outcome.
    console.log(
      `::warning::OIDC token NOT available (URL present: ${url ? "yes" : ""}, TOKEN present: ${
        token ? "yes" : ""
      }). deno publish will skip provenance. Verify id-token:write is honored — check org/enterprise Settings → Actions → General OIDC policy.`,
    );
  }
  return 0;
}

/** A positive integer from an environment variable, or `fallback` (0, NaN, "abc" are not counts). */
function count(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

/**
 * Does JSR already serve this version? Writes `present=true|false` to the step's outputs, so a
 * re-run skips `deno publish` (U8, U12). Only 200 and 404 are answers; anything else (or no answer
 * in time) is retried (JSR_HAS_TRIES, default 3; JSR_HAS_WAIT_S apart, default 5) and then fails
 * rather than being read as "absent", which would re-attempt an immutable upload. Review round 2
 * (R2-D): one request with no retry let a single JSR hiccup fail the step.
 */
export async function jsrHas(version: string, f: Fetch = fetch): Promise<"true" | "false"> {
  const tries = count(process.env.JSR_HAS_TRIES, 3);
  const waitS = Number(process.env.JSR_HAS_WAIT_S ?? 5);
  let last = "";
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await call(
        f,
        `${jsrVersionUrl(denoJson.name, version)}?cb=has-${Date.now()}-${i}`,
        {
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        },
      );
      if (res.status === 200) return "true";
      if (res.status === 404) return "false";
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = `no answer (${(e as Error).message})`;
    }
    if (i < tries) await sleep(waitS);
  }
  throw new Error(`JSR answered ${last} for ${denoJson.name}@${version} (${tries} tries)`);
}

// The OIDC step only proves the PREREQUISITE was met. It passed on every release from v1.11.3
// onward while JSR recorded NO provenance at all (rekorLogId null; v1.11.2 was the last version
// that had one) — ten releases of false assurance. JSR's `rekorLogId` is the only evidence.
export async function provenance(version: string, f: Fetch = fetch): Promise<number> {
  const pkg = denoJson.name;
  const url = jsrVersionUrl(pkg, version);
  const tries = count(process.env.PROVENANCE_TRIES, 12);
  const waitS = Number(process.env.PROVENANCE_WAIT_S ?? 15);
  const runId = process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`;
  console.log(`Checking ${url}`);
  // Three different failures, named apart (review round 1, finding C): JSR served the record but
  // with no Rekor id (published WITHOUT provenance); JSR answered 404 every time (the publish never
  // happened); JSR never answered usably (an error status or no answer — nothing is known).
  // The verdict follows the LAST read (review round 2, R2-C): a 200 without an id followed only by
  // failed reads is not "published WITHOUT provenance" — the later reads know nothing.
  let seen = false; // a 200 at least once
  let lastOk = false; // the last read was a 200
  let all404 = true; // every read was a 404
  let last = "";
  // JSR ingests asynchronously, so poll rather than reading once.
  for (let i = 1; i <= tries; i++) {
    // The JSR version endpoint is CACHED, and attestation is written a few seconds AFTER publish,
    // so a plain re-read can keep returning the pre-attestation record for minutes and report a
    // FALSE negative on a release that did get provenance. Measured 2026-08-27 on wabt-ts@1.5.1:
    // eight plain reads over ~3 minutes all returned null, while one cache-busted read showed
    // rekorLogId 2618866200, written 4s after publish. Cache-bust, or this step cannot be believed.
    let body = "";
    try {
      const res = await call(f, `${url}?cb=${runId}-${i}`, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      last = `HTTP ${res.status}`;
      if (res.status !== 404) all404 = false;
      lastOk = res.ok;
      if (res.ok) {
        seen = true;
        body = await res.text();
      }
    } catch (e) {
      // A network error or timeout is one more failed attempt, as `curl -sf … || true` was.
      all404 = false;
      lastOk = false;
      last = `no answer (${(e as Error).message})`;
    }
    const rekor = jsrRekor(body);
    if (rekor) {
      console.log(`✅ Provenance recorded — Rekor log ID: ${rekor}`);
      return 0;
    }
    if (i < tries) {
      console.log(`  attempt ${i}: no provenance yet, retrying in ${waitS}s`);
      await sleep(waitS);
    }
  }
  if (!seen && all404) {
    console.log(
      `::error::${pkg}@${version} is NOT ON JSR at all (404 on every read): the publish did not happen — read the jsr job's \`deno publish\` step. This is not a provenance outage.`,
    );
    return 1;
  }
  if (!lastOk) {
    console.log(
      `::error::JSR could not be read for ${pkg}@${version} (last: ${last}${
        seen ? "; an earlier read showed the version without a Rekor id" : ""
      }): neither provenance nor its absence is known. Re-run this job; it is not evidence of a provenance outage.`,
    );
    return 1;
  }
  console.log(
    `::error::${pkg}@${version} was published WITHOUT provenance (no Sigstore/Rekor entry). The last outage (v1.11.3 to v2.0.0, 2026-07-08 to 07-30) was SCOPE-WIDE, outside this repo: every @jrmarcum publish in that window lacked provenance (measured 2026-10-23, cmem/design-decisions.md). Check other packages' recent publishes before looking for a cause here; the OIDC step above only proves the token prerequisite.`,
  );
  return 1;
}

if (import.meta.main) {
  const [cmd, arg] = process.argv.slice(2);
  const e = process.env;
  const ghEnv = (): GitHubEnv => {
    const missing = ["GITHUB_REPOSITORY", "GITHUB_SHA", "GITHUB_TOKEN"].filter((k) => !e[k]);
    if (missing.length) {
      console.error(`::error::${cmd} needs ${missing.join(", ")}`);
      process.exit(2);
    }
    return {
      api: e.GITHUB_API_URL ?? "https://api.github.com",
      repo: e.GITHUB_REPOSITORY!,
      sha: e.GITHUB_SHA!,
      token: e.GITHUB_TOKEN!,
    };
  };
  switch (cmd) {
    case "is-release": {
      if (!e.GITHUB_SHA) {
        console.error("::error::is-release needs GITHUB_SHA");
        process.exit(2);
      }
      try {
        const r = await isRelease(e.GITHUB_SHA, denoJson.version, (args) => {
          const o = spawnSync("git", args, { encoding: "utf8" });
          return { code: o.status ?? 1, out: o.stdout ?? "", err: o.stderr ?? "" };
        }, jsrHas);
        if (r.warning) console.log(`::warning::${r.warning}`);
        console.log(
          r.release
            ? `${r.tag} is not on origin and JSR does not serve it: this push is the release of ${r.version}`
            : r.warning
            ? `${r.tag} is on origin: not a release (checks only; JSR unread)`
            : `${r.tag} exists and JSR serves it: not a release (checks only)`,
        );
        process.exit(writeOutput(`release=${r.release}`, `version=${r.version}`, `tag=${r.tag}`));
      } catch (err) {
        console.error(`::error::is-release: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }
    case "tag":
      if (!arg) break;
      process.exit(await createTag(arg, ghEnv()));
      break;
    case "release":
      if (!arg) break;
      process.exit(await release(arg, ghEnv()));
      break;
    case "oidc-check":
      process.exit(oidcCheck());
      break;
    case "jsr-has": {
      if (!arg) break;
      const version = arg.replace(/^v/, "");
      try {
        const present = await jsrHas(version);
        console.log(`JSR ${present === "true" ? "already serves" : "does not serve"} ${version}`);
        process.exit(writeOutput(`present=${present}`));
      } catch (err) {
        console.error(`::error::${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }
    case "provenance":
      if (!arg) break;
      process.exit(await provenance(arg.replace(/^v/, "")));
  }
  console.error(
    "usage: publish-workflow.ts is-release | tag <tag> | release <tag> | oidc-check | jsr-has <version> | provenance <version>",
  );
  process.exit(2);
}
