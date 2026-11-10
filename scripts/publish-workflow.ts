/**
 * The logic of publish.yml's steps, so the workflow's `run:` steps only launch commands
 * (workspace `working-rules.md` § Tooling rule 1: a CI `run:` block launches; its logic is
 * TypeScript; rule 2: no `deno eval "…"`). Moved here 2026-10-27 from inline shell + `deno eval`;
 * the GitHub Release moved here 2026-11-10 from `gh release create` (letters H30, H32).
 *
 * Usage:
 *   bun scripts/publish-workflow.ts oidc-check            # the PREREQUISITE: OIDC env present?
 *   bun scripts/publish-workflow.ts jsr-has <version>     # step output present=true|false (a re-run)
 *   bun scripts/publish-workflow.ts mark-uploaded         # job output `uploaded=true`, BEFORE publish
 *   bun scripts/publish-workflow.ts provenance <version>  # the OUTCOME: JSR recorded a Rekor entry?
 *   bun scripts/publish-workflow.ts release <tag>         # the `release` job: the tag's Release page
 *
 * `oidc-check` and `provenance` were kept as they were in the shell, message for message;
 * `provenance` polls 12 times, 15 s apart (override with PROVENANCE_TRIES / PROVENANCE_WAIT_S).
 *
 * ## `release` (H32's order, kept)
 *
 * **The version tag IS the release** (owner, 2026-11-10: "We should be releasing on version tag and
 * creating a release page at that time"): the tag push runs publish.yml, and the page is made in
 * that run, ON the tag — no `release/<tag>` branch (the old flow made one and pointed the page at
 * it; dropped 2026-11-10). Runs in its own job with `contents: write` only, after the publish job,
 * on the publish job's `uploaded` output rather than its exit (C34: `deno publish` uploads, THEN
 * signs provenance, so a failure after the upload would otherwise strand the version without its
 * page):
 *
 *   0. JSR answers 200 for the version (polled like `provenance`) — nothing is made for a version
 *      the registry does not have;
 *   1. the tag exists on GitHub and peels (annotated tags followed) to GITHUB_SHA — `POST /releases`
 *      CREATES a missing tag, so this is checked before any write;
 *   2. the Release page: one already there = done (re-runs write nothing); else `POST` for the
 *      existing tag (no `target_commitish`) with `generate_release_notes` and the JSR link on top;
 *   3. read back: the page exists for the tag, and the tag still peels to GITHUB_SHA.
 *
 * Every network call has its own time limit (HTTP_TIMEOUT_MS, default 30 s). `gh` is never used
 * (🔒 owner 2026-11-08, letter H30). Tested against a mock API by `scripts/check_publish_workflow.ts`.
 */
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

/** JSR's version record → its Rekor log id, or "" while (or when) there is none. */
export function jsrRekor(body: string): string {
  try {
    const id = (JSON.parse(body) as { rekorLogId?: string | number | null }).rekorLogId;
    return id === null || id === undefined ? "" : String(id);
  } catch {
    return "";
  }
}

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

/**
 * Does JSR already serve this version? Writes `present=true|false` to the step's outputs, so a
 * re-run after a failure past the upload skips `deno publish` (release-process.md § 2 step 9).
 * Only 200 and 404 are answers; anything else (or no answer in time) fails the step rather than
 * being read as "absent", which would re-attempt an immutable upload.
 */
export async function jsrHas(version: string, f: Fetch = fetch): Promise<"true" | "false"> {
  const res = await call(f, `${jsrVersionUrl(denoJson.name, version)}?cb=has-${Date.now()}`, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });
  if (res.status === 200) return "true";
  if (res.status === 404) return "false";
  throw new Error(`JSR answered HTTP ${res.status} for ${denoJson.name}@${version}`);
}

function writeOutput(line: string): number {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    console.error("::error::GITHUB_OUTPUT is not set (this subcommand runs inside GitHub Actions)");
    return 1;
  }
  appendFileSync(out, `${line}\n`);
  return 0;
}

/** Writes `uploaded=true` to the step's outputs; run immediately BEFORE `deno publish` (C34). */
function markUploaded(): number {
  if (writeOutput("uploaded=true") !== 0) return 1;
  console.log(
    "uploaded=true (the follow-on jobs run from here on, whatever deno publish exits with)",
  );
  return 0;
}

// The OIDC step only proves the PREREQUISITE was met. It passed on every release from v1.11.3
// onward while JSR recorded NO provenance at all (rekorLogId null; v1.11.2 was the last version
// that had one) — ten releases of false assurance. JSR's `rekorLogId` is the only evidence.
export async function provenance(version: string, f: Fetch = fetch): Promise<number> {
  const pkg = denoJson.name;
  const url = jsrVersionUrl(pkg, version);
  const tries = Number(process.env.PROVENANCE_TRIES ?? 12);
  const waitS = Number(process.env.PROVENANCE_WAIT_S ?? 15);
  const runId = process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`;
  console.log(`Checking ${url}`);
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
      if (res.ok) body = await res.text();
    } catch {
      // A network error or timeout is one more failed attempt, as `curl -sf … || true` was.
    }
    const rekor = jsrRekor(body);
    if (rekor) {
      console.log(`✅ Provenance recorded — Rekor log ID: ${rekor}`);
      return 0;
    }
    console.log(`  attempt ${i}: no provenance yet, retrying in ${waitS}s`);
    await sleep(waitS);
  }
  console.log(
    `::error::${pkg}@${version} was published WITHOUT provenance (no Sigstore/Rekor entry). The last outage (v1.11.3 to v2.0.0, 2026-07-08 to 07-30) was SCOPE-WIDE, outside this repo: every @jrmarcum publish in that window lacked provenance (measured 2026-10-23, cmem/design-decisions.md). Check other packages' recent publishes before looking for a cause here; the OIDC step above only proves the token prerequisite.`,
  );
  return 1;
}

/** What `release` needs from the runner; the defaults are GitHub Actions' own variables. */
export interface ReleaseEnv {
  api: string; // GITHUB_API_URL
  repo: string; // GITHUB_REPOSITORY, owner/name
  sha: string; // GITHUB_SHA, the tagged commit
  token: string; // GITHUB_TOKEN, contents: write
  tries: number; // JSR polls (RELEASE_JSR_TRIES, default 12)
  waitS: number; // seconds between them (RELEASE_JSR_WAIT_S, default 15)
}

class ReleaseError extends Error {}

/** H32's order: JSR has it → tag peels to sha → page on the tag (or done) → read back. */
export async function release(tag: string, env: ReleaseEnv, f: Fetch = fetch): Promise<number> {
  const version = tag.replace(/^v/, "");
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
    if (!res.ok) throw new ReleaseError(`${what}: HTTP ${res.status} ${await res.text()}`);
    return await res.json();
  };

  /** The commit a tag peels to, following annotated tag objects; "" when the tag is absent. */
  const peel = async (): Promise<string> => {
    const ref = await gh(`/git/ref/tags/${encodeURIComponent(tag)}`);
    if (ref.status === 404) return "";
    let obj = (await json(ref, `GET tag ${tag}`)).object as { type: string; sha: string };
    for (let depth = 0; obj.type === "tag"; depth++) {
      if (depth > 8) throw new ReleaseError(`tag ${tag}: more than 8 nested tag objects`);
      obj = (await json(await gh(`/git/tags/${obj.sha}`), `GET tag object ${obj.sha}`)).object;
    }
    if (obj.type !== "commit") throw new ReleaseError(`tag ${tag} points at a ${obj.type}`);
    return obj.sha;
  };

  try {
    // 0. The registry has the version.
    const jsr = jsrVersionUrl(denoJson.name, version);
    let onJsr = false;
    for (let i = 1; i <= env.tries && !onJsr; i++) {
      try {
        onJsr = (await call(f, `${jsr}?cb=release-${i}`, {
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        })).status === 200;
      } catch {
        // A timeout or network error is one more failed attempt.
      }
      if (!onJsr && i < env.tries) {
        console.log(`  JSR has no ${version} yet (attempt ${i}), retrying in ${env.waitS}s`);
        await sleep(env.waitS);
      }
    }
    if (!onJsr) {
      throw new ReleaseError(`JSR does not serve ${denoJson.name}@${version}; no page made`);
    }
    console.log(`JSR serves ${denoJson.name}@${version}`);

    // 1. The tag exists and peels to this run's commit — before ANY write.
    const tagged = await peel();
    if (!tagged) {
      throw new ReleaseError(`tag ${tag} does not exist on GitHub (a POST would create it)`);
    }
    if (tagged !== env.sha) {
      throw new ReleaseError(`tag ${tag} peels to ${tagged}, not this run's commit ${env.sha}`);
    }
    console.log(`tag ${tag} → ${env.sha}`);

    // 2. The page, on the tag: one already there is done.
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

    // 3. Read back.
    const page = await json(
      await gh(`/releases/tags/${encodeURIComponent(tag)}`),
      `read back ${tag}`,
    );
    if (page.tag_name !== tag) throw new ReleaseError(`read back: page is for ${page.tag_name}`);
    if ((await peel()) !== env.sha) throw new ReleaseError(`read back: tag ${tag} moved`);
    console.log(`✅ Release ${tag} created by ${page.author?.login ?? "?"}: ${page.html_url}`);
    return 0;
  } catch (e) {
    const msg = e instanceof ReleaseError ? e.message : `network: ${(e as Error).message}`;
    console.log(`::error::release ${tag}: ${msg}`);
    return 1;
  }
}

if (import.meta.main) {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "oidc-check":
      process.exit(oidcCheck());
      break;
    case "mark-uploaded":
      process.exit(markUploaded());
      break;
    case "jsr-has": {
      if (!arg) break;
      const version = arg.replace(/^v/, "");
      try {
        const present = await jsrHas(version);
        console.log(`JSR ${present === "true" ? "already serves" : "does not serve"} ${version}`);
        process.exit(writeOutput(`present=${present}`));
      } catch (e) {
        console.error(`::error::${(e as Error).message}`);
        process.exit(1);
      }
    }
    case "provenance":
      if (!arg) break;
      process.exit(await provenance(arg.replace(/^v/, "")));
      break;
    case "release": {
      if (!arg) break;
      const e = process.env;
      const missing = ["GITHUB_REPOSITORY", "GITHUB_SHA", "GITHUB_TOKEN"].filter((k) => !e[k]);
      if (missing.length) {
        console.error(`::error::release needs ${missing.join(", ")}`);
        process.exit(2);
      }
      process.exit(
        await release(arg, {
          api: e.GITHUB_API_URL ?? "https://api.github.com",
          repo: e.GITHUB_REPOSITORY!,
          sha: e.GITHUB_SHA!,
          token: e.GITHUB_TOKEN!,
          tries: Number(e.RELEASE_JSR_TRIES ?? 12),
          waitS: Number(e.RELEASE_JSR_WAIT_S ?? 15),
        }),
      );
    }
  }
  console.error(
    "usage: publish-workflow.ts oidc-check | jsr-has <version> | mark-uploaded | provenance <version> | release <tag>",
  );
  process.exit(2);
}
