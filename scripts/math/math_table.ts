// Every Math member of Deno, on chosen test inputs: Deno's result vs wasic's, one
// program per (member, input) so a crash costs only its own row. Prints a markdown table.
// Usage: bun scripts/math/math_table.ts <scratch dir>
// The reference column stays `deno run`: it is a V8 oracle, and JavaScriptCore's Math differs
// from V8's (cmem/deno-exit-plan.md M4); it moves with the engine oracle (P6).
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const dir = process.argv[2]!;
// member → inputs; each input is a list of argument expressions (f64 values).
const CASES: Record<string, string[][]> = {
  abs: [["-2.5"], ["-0"], ["NaN"], ["-2147483648"]],
  acos: [["0.5"], ["1"], ["-1"], ["2"]],
  acosh: [["1"], ["2"], ["100"], ["0.5"]],
  asin: [["0.5"], ["1"], ["-0"], ["2"]],
  asinh: [["1.5"], ["0.1"], ["-0"], ["1e300"]],
  atan: [["1"], ["-0"], ["Infinity"], ["1e10"]],
  atan2: [["1", "2"], ["0", "-0"], ["-1", "-0"], ["Infinity", "Infinity"]],
  atanh: [["0.5"], ["-0"], ["1"], ["2"]],
  cbrt: [["27"], ["-8"], ["2"], ["-0"]],
  ceil: [["1.2"], ["-1.5"], ["-0.5"], ["1e300"]],
  clz32: [["1"], ["0"], ["4294967295"], ["0.5"]],
  cos: [["0"], ["1"], ["NaN"], ["1e10"]],
  cosh: [["0"], ["2"], ["10"], ["1000"]],
  exp: [["1"], ["-1"], ["710"], ["-Infinity"]],
  expm1: [["1e-10"], ["1"], ["-0"], ["1e10"]],
  f16round: [["1.337"], ["65520"], ["5e-8"], ["-0"]],
  floor: [["1.7"], ["-1.2"], ["-0"], ["0.49999999999999994"]],
  fround: [["0.1"], ["1.337"], ["3.4e39"], ["5e-324"]],
  hypot: [["3", "4"], ["1e200", "1e200"], ["Infinity", "NaN"], ["-3", "-0"]],
  imul: [["3", "4"], ["2147483647", "2"], ["-5", "12"], ["4294967295", "5"]],
  log: [["1"], ["10"], ["0"], ["-1"]],
  log10: [["1000"], ["2"], ["0"], ["-1"]],
  log1p: [["1e-10"], ["1"], ["-1"], ["-2"]],
  log2: [["8"], ["3"], ["0"], ["-1"]],
  max: [["1", "2"], ["0", "-0"], ["NaN", "1"], ["-Infinity", "-1"]],
  min: [["1", "2"], ["0", "-0"], ["NaN", "1"], ["Infinity", "1"]],
  pow: [["2", "10"], ["2", "0.5"], ["-2.5", "3"], ["1", "NaN"]],
  random: [[]],
  round: [["2.5"], ["-2.5"], ["0.49999999999999994"], ["-0.4"]],
  sign: [["3"], ["-3"], ["-0"], ["NaN"]],
  sin: [["1"], ["-0"], ["3.141592653589793"], ["1e10"]],
  sinh: [["1"], ["2"], ["-0"], ["1000"]],
  sqrt: [["2"], ["16"], ["-1"], ["-0"]],
  sumPrecise: [["[0.1, 0.2, 0.3]"], ["[1e20, 0.1, -1e20]"]],
  tan: [["1"], ["-0"], ["0.7853981633974483"], ["1e10"]],
  tanh: [["1"], ["-0"], ["20"], ["-Infinity"]],
  trunc: [["2.7"], ["-2.7"], ["-0.5"], ["1e300"]],
};
const CONSTS = ["E", "LN10", "LN2", "LOG10E", "LOG2E", "PI", "SQRT1_2", "SQRT2"];

// Asynchronous, so the batches of eight below really run in parallel.
const run = (cmd: string, args: string[]) =>
  new Promise<{ code: number; out: string; err: string }>((resolve) => {
    // `shell` on Windows: the installed `wasmtk` is a .cmd shim, which only a shell can start.
    const p = spawn(cmd, args, { cwd: dir, shell: process.platform === "win32" });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => resolve({ code: 1, out: out.trim(), err: err + String(e) }));
    p.on("close", (code) => resolve({ code: code ?? 1, out: out.trim(), err }));
  });

type Job = { label: string; file: string; src: string };
const jobs: Job[] = [];
for (const [fn, inputs] of Object.entries(CASES)) {
  inputs.forEach((args, i) => {
    const lines = ["type f64 = number;"];
    let call: string;
    if (fn === "random") {
      call = "Math.random()";
      lines.push(`const r: f64 = ${call};`, `console.log(r >= 0 && r < 1 ? "in [0, 1)" : "OUT OF RANGE");`);
    } else if (fn === "sumPrecise") {
      call = `Math.sumPrecise(${args[0]})`;
      lines.push(`const xs: f64[] = ${args[0]};`, `console.log(Math.sumPrecise(xs));`);
    } else {
      args.forEach((a, k) => lines.push(`const a${k}: f64 = ${a};`));
      call = `Math.${fn}(${args.join(", ")})`;
      lines.push(`console.log(Math.${fn}(${args.map((_, k) => `a${k}`).join(", ")}));`);
    }
    jobs.push({ label: `${fn}\t${call}`, file: `t_${fn}_${i}.ts`, src: lines.join("\n") + "\n" });
  });
}
jobs.push({
  label: "constants\tMath.E … Math.SQRT2",
  file: "t_consts.ts",
  src: `console.log(${CONSTS.map((c) => `Math.${c}`).join(", ")});\n`,
});

const cell = async (j: Job): Promise<string> => {
  await writeFile(`${dir}/${j.file}`, j.src);
  const nat = await run("deno", ["run", j.file]);
  const c = await run("wasmtk", ["wasic", j.file]);
  let wasm: string;
  if (c.code !== 0) {
    const why = (c.out + "\n" + c.err).split("\n").find((l) => /^error\[|⚠️|❌/.test(l)) ?? "";
    wasm = `COMPILE ERROR (${
      why.replace(/^error\[[\w-]+\]:\s*/, "").replace(/^\s*(⚠️|❌)\s*/, "").replace(/^wasic:\s*/, "").slice(0, 60)
    })`;
  } else {
    const w = await run("wasmtk", ["run", j.file.replace(/\.ts$/, ".wasm")]);
    wasm = w.code === 0 ? w.out : `CRASH (${(w.out + w.err).match(/(RuntimeError|CompileError)[^@\n]*/)?.[0]?.slice(0, 60) ?? "exit " + w.code})`;
  }
  const same = nat.out === wasm;
  return `${j.label}\t${nat.out}\t${wasm}\t${same ? "same" : "DIFFERENT"}`;
};

const rows: string[] = [];
for (let i = 0; i < jobs.length; i += 8) {
  rows.push(...await Promise.all(jobs.slice(i, i + 8).map(cell)));
}
console.log(rows.join("\n"));
