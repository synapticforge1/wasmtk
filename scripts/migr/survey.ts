/**
 * survey.ts — Deno-exit plan P0's runtime survey (2026-10-26): where the repo still depends on a
 * runtime's own API. Counts lines using `Deno.*` / `Bun.*`, `jsr:` / `npm:` specifiers in source,
 * `Deno.test`, and `enum` / `namespace` (not erasable: Node's type stripping refuses them), per
 * area. `upstream/` (the gitignored binaryang checkout) and `node_modules/` are excluded — the
 * 2026-10-13 survey that counted them was wrong by two orders of magnitude.
 *
 * Usage: bun scripts/migr/survey.ts [--json <out>]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";

const REPO = resolve(import.meta.dir, "..", "..");
const AREAS: Record<string, (p: string) => boolean> = {
  shipped: (p) => p === "main.ts" || /^src\/[^/]+\.ts$/.test(p) || /^src\/wasm\/[^/]+\.ts$/.test(p),
  scripts: (p) => p.startsWith("scripts/") && !p.startsWith("scripts/phase0/"),
  "test harnesses": (p) => /^tests\/[^/]+_tests\.ts$/.test(p),
};
const PATTERNS: Record<string, RegExp> = {
  "Deno.*": /\bDeno\.\w+/,
  "Bun.*": /\bBun\.\w+/,
  "Deno.test": /\bDeno\.test\(/,
  "jsr:/npm: specifier": /["'](jsr|npm):/,
  "enum / namespace": /^\s*(export\s+)?(const\s+)?(enum|namespace)\s+\w+/,
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["upstream", "node_modules", ".git", ".golden"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|mts|mjs|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(REPO).map((f) => relative(REPO, f).replaceAll("\\", "/"));
const report: Record<string, Record<string, { lines: number; files: number }>> = {};
for (const [area, inArea] of Object.entries(AREAS)) {
  report[area] = {};
  const inFiles = files.filter(inArea);
  for (const [name, re] of Object.entries(PATTERNS)) {
    let lines = 0, fileHits = 0;
    for (const f of inFiles) {
      const n = readFileSync(join(REPO, f), "utf8").split("\n").filter((l) => re.test(l)).length;
      lines += n;
      if (n) fileHits++;
    }
    report[area][name] = { lines, files: fileHits };
  }
  report[area]["(files in area)"] = { lines: 0, files: inFiles.length };
}
for (const [area, rows] of Object.entries(report)) {
  console.log(area);
  for (const [k, v] of Object.entries(rows)) {
    console.log(`  ${k.padEnd(22)} ${String(v.lines).padStart(5)} lines in ${v.files} file(s)`);
  }
}
const i = process.argv.indexOf("--json");
if (i >= 0) writeFileSync(process.argv[i + 1]!, JSON.stringify(report, null, 1));
