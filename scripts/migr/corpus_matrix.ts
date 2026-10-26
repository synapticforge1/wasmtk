/**
 * corpus_matrix.ts — Deno-exit plan P0's measurement harness (2026-10-26), also the owner's
 * number-type measurement (design-decisions.md, direction of 2026-10-26).
 *
 * For every program in a corpus directory (a COPY of it, in a work dir; the repo is never written):
 *   ref     run the TypeScript itself on each reference runtime (Deno, Bun, Node 24)
 *   compile `wasmtk wasic` it (the repo's main.ts through Deno: the CLI is a Deno program until P2)
 *   wasm    run the module through scripts/migr/wasi_host.ts on each runtime
 * and record stdout, exit code, module size and run time. `--mode number` first rewrites the copy to
 * plain TypeScript numbers: every `i32` / `u32` / `f32` / `f64` type becomes `number`, `i64` / `u64`
 * become `bigint`, their `type X = …` aliases are dropped; a program importing wasMath is skipped
 * (wasMath goes away with the hints).
 *
 * Usage (Bun):
 *   bun scripts/migr/corpus_matrix.ts --mode typed|number --out <file.json>
 *       [--root tests/wasi] [--sub wasm_wasi] [--filter <regex>] [--jobs 6]
 *   bun scripts/migr/corpus_matrix.ts --summary <file.json> [<other.json>]   (print / compare)
 */
import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";

const REPO = resolve(import.meta.dir, "..", "..");
const HOST = join(REPO, "scripts", "migr", "wasi_host.ts");
const arg = (k: string, d?: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

type Run = { code: number; out: string; ms: number; err?: string };
type Rec = {
  file: string;
  skipped?: string;
  /** `// @allow-output-diff`: a documented deviation the wasi suite does not compare */
  allowDiff?: boolean;
  ref: Record<string, Run>;
  compile?: { ok: boolean; ms: number; size: number; err?: string };
  wasm: Record<string, Run>;
};

function run(cmd: string, args: string[], cwd: string, ms = 60_000): Promise<Run> {
  return new Promise((done) => {
    const t0 = performance.now();
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (err += b));
    const timer = setTimeout(() => p.kill(), ms);
    p.on("close", (code) => {
      clearTimeout(timer);
      const t = performance.now() - t0;
      // stderr kept short: the first lines say why a compile or a run failed
      const e = err.replace(/\r\n/g, "\n").trim().split("\n").slice(0, 6).join("\n");
      done({
        code: code ?? -1,
        out: out.replace(/\r\n/g, "\n"),
        ms: Math.round(t),
        ...(code !== 0 && e ? { err: e } : {}),
      });
    });
    p.on("error", () => done({ code: -2, out: "", ms: 0 }));
  });
}

const RUNTIMES: Record<string, (f: string) => [string, string[]]> = {
  deno: (f) => ["deno", ["run", "-A", f]],
  bun: (f) => ["bun", [f]],
  node24: (f) => ["fnm", ["exec", "--using=24", "node", f]],
};

// ── the plain-number rewrite ──────────────────────────────────────────────────────────────────────
const TYPE_NAMES: Record<string, string> = {
  i32: "number",
  u32: "number",
  f32: "number",
  f64: "number",
  i64: "bigint",
  u64: "bigint",
};
/** Rewrite type tokens outside strings and comments; a namespace use (`i32.add`) is left alone. */
export function toPlainNumbers(src: string): string {
  src = src.replace(/\btype\s+(i32|u32|f32|f64|i64|u64)\s*=\s*\w+\s*;?/g, "");
  // Most of the corpus imports its type NAMES from wasMath (`import { i32 } from ".../wasmath.ts"`);
  // with plain numbers that import goes. A program that CALLS wasMath is skipped instead (CALLS_WASMATH).
  src = src.replace(
    /^\s*import\s+(type\s+)?\{[^}]*\}\s*from\s*["'][^"']*wasmath(\.ts)?["'];?[^\n]*$/gim,
    "",
  );
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i]!, n = src[i + 1];
    if (c === "/" && n === "/") {
      const e = src.indexOf("\n", i);
      const j = e < 0 ? src.length : e;
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (c === "/" && n === "*") {
      const e = src.indexOf("*/", i + 2);
      const j = e < 0 ? src.length : e + 2;
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const m = /^(i32|u32|f32|f64|i64|u64)\b/.exec(src.slice(i, i + 4));
    const prev = src[i - 1] ?? " ";
    if (
      m && !/[\w$.]/.test(prev) && !/^\s*\./.test(src.slice(i + m[1]!.length, i + m[1]!.length + 3))
    ) {
      out += TYPE_NAMES[m[1]!];
      i += m[1]!.length;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** A call of a wasMath function (`i32.add(…)`, `f64.toI32(x)`): such a program has no plain-number form. */
const CALLS_WASMATH = /\b(i32|u32|f32|f64|i64|u64)\.\w+\s*\(/;

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listTs(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

async function measure(): Promise<void> {
  const mode = arg("mode", "typed")!;
  const outPath = resolve(arg("out", `matrix_${mode}.json`)!);
  const root = resolve(REPO, arg("root", "tests/wasi")!);
  const sub = arg("sub", "wasm_wasi")!;
  const filter = arg("filter") ? new RegExp(arg("filter")!) : null;
  const jobs = Number(arg("jobs", "6"));
  // The copy keeps the repo's layout (`<work>/tests/wasi/…` beside `<work>/src`), so a program's
  // relative import of `../../../src/wasmath.ts` still resolves.
  const work = mkdtempSync(join(tmpdir(), `wtkmx_${mode}_`));
  const copyRoot = join(work, relative(REPO, root));
  cpSync(root, copyRoot, { recursive: true });
  cpSync(join(REPO, "src"), join(work, "src"), { recursive: true });
  if (mode === "number") {
    for (const f of listTs(copyRoot)) writeFileSync(f, toPlainNumbers(readFileSync(f, "utf8")));
  }
  const dir = join(copyRoot, sub);
  const files = readdirSync(dir).filter((n) => n.endsWith(".ts") && (!filter || filter.test(n)))
    .sort();
  console.log(`${mode}: ${files.length} programs, work dir ${work}`);

  const recs: Rec[] = [];
  let next = 0, done = 0;
  async function worker() {
    while (next < files.length) {
      const name = files[next++]!;
      const f = join(dir, name);
      const src = readFileSync(f, "utf8");
      const rec: Rec = { file: name, ref: {}, wasm: {} };
      if (/@allow-output-diff/.test(src)) rec.allowDiff = true;
      if (/@test-pipeline/.test(src)) rec.skipped = "pipeline";
      else if (mode === "number" && CALLS_WASMATH.test(src)) rec.skipped = "calls wasMath";
      if (!rec.skipped) {
        for (const [rt, mk] of Object.entries(RUNTIMES)) {
          const [c, a] = mk(name);
          rec.ref[rt] = await run(c, a, dir);
        }
        const wasmFile = name.replace(/\.ts$/, ".mx.wasm");
        const t0 = performance.now();
        const comp = await run(
          "deno",
          [
            "run",
            "-A",
            "--config",
            join(REPO, "deno.json"),
            join(REPO, "main.ts"),
            "wasic",
            name,
            "-o",
            wasmFile,
          ],
          dir,
          180_000,
        );
        const ok = comp.code === 0 && existsSync(join(dir, wasmFile));
        rec.compile = {
          ok,
          ms: Math.round(performance.now() - t0),
          size: ok ? statSync(join(dir, wasmFile)).size : 0,
        };
        if (!ok) {
          rec.compile.err = (comp.out + "\n" + (comp.err ?? "")).split("\n").find((l) =>
            /error\[|❌|Unsupported|error:/.test(l)
          )
            ?.trim().slice(0, 160) ?? `exit ${comp.code}`;
        } else {for (const [rt, mk] of Object.entries(RUNTIMES)) {
            const [c, a] = mk(HOST);
            rec.wasm[rt] = await run(c, [...a, wasmFile], dir);
          }}
      }
      recs.push(rec);
      if (++done % 25 === 0) console.log(`  ${done} / ${files.length}`);
    }
  }
  await Promise.all(Array.from({ length: jobs }, worker));
  recs.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(outPath, JSON.stringify({ mode, date: new Date().toISOString(), recs }, null, 1));
  rmSync(work, { recursive: true, force: true });
  summary(outPath);
}

const same = (a?: Run, b?: Run) => !!a && !!b && a.code === b.code && a.out === b.out;
function stats(path: string) {
  const { mode, recs } = JSON.parse(readFileSync(path, "utf8")) as { mode: string; recs: Rec[] };
  const run = recs.filter((r) => !r.skipped);
  const compiled = run.filter((r) => r.compile?.ok);
  const s = {
    mode,
    programs: recs.length,
    skipped: recs.length - run.length,
    measured: run.length,
    compiled: compiled.length,
    wasmMatchesDeno: compiled.filter((r) => same(r.wasm.deno, r.ref.deno)).length,
    // the explained differences, so two runs compare like for like
    needsHostImports:
      compiled.filter((r) => r.wasm.deno?.code === 2 && r.wasm.deno.out === "").length,
    allowedDiff: compiled.filter((r) => r.allowDiff && !same(r.wasm.deno, r.ref.deno)).length,
    wasmSameOnAllRuntimes:
      compiled.filter((r) => same(r.wasm.deno, r.wasm.bun) && same(r.wasm.deno, r.wasm.node24))
        .length,
    bunRefMatchesDeno: run.filter((r) => same(r.ref.bun, r.ref.deno)).length,
    nodeRefMatchesDeno: run.filter((r) => same(r.ref.node24, r.ref.deno)).length,
    wasmBytes: compiled.reduce((n, r) => n + r.compile!.size, 0),
    wasmRunMs: compiled.reduce((n, r) => n + (r.wasm.deno?.ms ?? 0), 0),
    recs,
  };
  return s;
}
function summary(a: string, b?: string): void {
  const s = stats(a);
  const { recs: _r, ...rest } = s;
  console.log(rest);
  if (!b) return;
  const t = stats(b);
  const { recs: _t, ...rest2 } = t;
  console.log(rest2);
  // per program: where the two modes differ in correctness against Deno
  const byName = new Map(t.recs.map((r) => [r.file, r]));
  const fixed: string[] = [], broke: string[] = [], sizes: [string, number, number][] = [];
  for (const r of s.recs) {
    const o = byName.get(r.file);
    if (!o || r.skipped || o.skipped) continue;
    const okA = !!r.compile?.ok && same(r.wasm.deno, r.ref.deno);
    const okB = !!o.compile?.ok && same(o.wasm.deno, o.ref.deno);
    if (!okA && okB) fixed.push(r.file);
    if (okA && !okB) broke.push(`${r.file}: ${o.compile?.ok ? "output differs" : o.compile?.err}`);
    if (r.compile?.ok && o.compile?.ok) sizes.push([r.file, r.compile.size, o.compile.size]);
  }
  const ratio = sizes.reduce((n, [, x, y]) => n + y, 0) /
    Math.max(1, sizes.reduce((n, [, x]) => n + x, 0));
  console.log(`\nboth compiled: ${sizes.length}; size ${t.mode}/${s.mode} = ${ratio.toFixed(3)}`);
  console.log(`right in ${t.mode} only: ${fixed.length}`);
  for (const f of fixed.slice(0, 40)) console.log("  + " + f);
  console.log(`right in ${s.mode} only: ${broke.length}`);
  for (const f of broke.slice(0, 80)) console.log("  - " + f);
}

if (arg("summary")) {
  summary(resolve(arg("summary")!), process.argv[process.argv.indexOf("--summary") + 2]);
} else await measure();
