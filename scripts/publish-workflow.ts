/**
 * The logic of publish.yml's checks, so the workflow's `run:` steps only launch commands
 * (workspace `working-rules.md` § Tooling rule 1: a CI `run:` block launches; its logic is
 * TypeScript; rule 2: no `deno eval "…"`). Moved here 2026-10-27 from inline shell + `deno eval`.
 *
 * Usage:
 *   bun scripts/publish-workflow.ts oidc-check            # the PREREQUISITE: OIDC env present?
 *   bun scripts/publish-workflow.ts provenance <version>  # the OUTCOME: JSR recorded a Rekor entry?
 *
 * Both steps were kept as they were in the shell, message for message; `provenance` polls 12
 * times, 15 s apart (override with PROVENANCE_TRIES / PROVENANCE_WAIT_S for a local check).
 */
import denoJson from "../deno.json" with { type: "json" };

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

// The OIDC step only proves the PREREQUISITE was met. It passed on every release from v1.11.3
// onward while JSR recorded NO provenance at all (rekorLogId null; v1.11.2 was the last version
// that had one) — ten releases of false assurance. JSR's `rekorLogId` is the only evidence.
async function provenance(version: string): Promise<number> {
  const pkg = denoJson.name;
  const scope = pkg.slice(0, pkg.indexOf("/")).replace(/^@/, "");
  const name = pkg.slice(pkg.indexOf("/") + 1);
  const url = `https://api.jsr.io/scopes/${scope}/packages/${name}/versions/${version}`;
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
      const res = await fetch(`${url}?cb=${runId}-${i}`, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      if (res.ok) body = await res.text();
    } catch {
      // A network error is one more failed attempt, as `curl -sf … || true` was.
    }
    const rekor = jsrRekor(body);
    if (rekor) {
      console.log(`✅ Provenance recorded — Rekor log ID: ${rekor}`);
      return 0;
    }
    console.log(`  attempt ${i}: no provenance yet, retrying in ${waitS}s`);
    await new Promise((r) => setTimeout(r, waitS * 1000));
  }
  console.log(
    `::error::${pkg}@${version} was published WITHOUT provenance (no Sigstore/Rekor entry). The last outage (v1.11.3 to v2.0.0, 2026-07-08 to 07-30) was SCOPE-WIDE, outside this repo: every @jrmarcum publish in that window lacked provenance (measured 2026-10-23, cmem/design-decisions.md). Check other packages' recent publishes before looking for a cause here; the OIDC step above only proves the token prerequisite.`,
  );
  return 1;
}

const [cmd, arg] = process.argv.slice(2);
switch (cmd) {
  case "oidc-check":
    process.exit(oidcCheck());
    break;
  case "provenance":
    if (!arg) break;
    process.exit(await provenance(arg.replace(/^v/, "")));
}
console.error("usage: publish-workflow.ts oidc-check | provenance <version>");
process.exit(2);
