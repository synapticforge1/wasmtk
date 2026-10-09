// Every JavaScript Math member, compiled by wasic and run, against Deno on a battery of inputs.
// One program per member, so an unsupported member fails alone. Usage: deno run -A scan.ts <dir>
const dir = Deno.args[0];
const VALS = [
  "0", "-0", "0.5", "-0.5", "1", "-1", "1.5", "-1.5", "2", "2.5", "-2.5", "3", "3.7", "-3.7",
  "10", "100", "0.1", "1e-300", "5e-324", "1e300", "1e10", "2147483647", "-2147483648",
  "4294967295", "9007199254740993", "0.49999999999999994", "NaN", "Infinity", "-Infinity",
];
const PAIRS: Array<[string, string]> = [
  ["1", "2"], ["2", "1"], ["0", "-0"], ["-0", "0"], ["-1", "0"], ["2", "0.5"], ["-8", "1/3"],
  ["2", "10"], ["10", "-2"], ["0", "0"], ["NaN", "1"], ["1", "NaN"], ["Infinity", "-Infinity"],
  ["3", "4"], ["1e200", "1e200"], ["-2.5", "3"], ["2147483647", "2"], ["65536", "65536"],
  ["-1", "0.5"], ["1", "Infinity"], ["1.0000001", "1e8"],
];
const UNARY = [
  "abs", "acos", "acosh", "asin", "asinh", "atan", "atanh", "cbrt", "ceil", "clz32", "cos", "cosh",
  "exp", "expm1", "floor", "fround", "log", "log10", "log1p", "log2", "round", "sign", "sin", "sinh",
  "sqrt", "tan", "tanh", "trunc",
];
const BINARY = ["atan2", "pow", "imul", "max", "min", "hypot"];
const CONSTS = ["E", "LN10", "LN2", "LOG10E", "LOG2E", "PI", "SQRT1_2", "SQRT2"];

const run = async (cmd: string, args: string[]) => {
  const o = await new Deno.Command(cmd, { args, cwd: dir, stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, out: new TextDecoder().decode(o.stdout), err: new TextDecoder().decode(o.stderr) };
};

const progs: Array<[string, string[]]> = [];
for (const f of UNARY) progs.push([f, VALS.map((v) => `Math.${f}(${v})`)]);
for (const f of BINARY) progs.push([f, PAIRS.map(([a, b]) => `Math.${f}(${a}, ${b})`)]);
progs.push(["consts", CONSTS.map((c) => `Math.${c}`)]);
progs.push(["random", ["Math.random() >= 0 && Math.random() < 1"]]);

const rows: string[] = [];
for (const [name, exprs] of progs) {
  // Each value goes through a declared f64 first, so the argument is a runtime f64 (not folded).
  const lines = ["type f64 = number;"];
  exprs.forEach((e, i) => {
    const m = e.match(/^(Math\.\w+)\((.*)\)$/);
    if (!m) {
      lines.push(`console.log("${i}", ${e});`);
      return;
    }
    const args = m[2] ? m[2].split(/,\s*/) : [];
    args.forEach((a, k) => lines.push(`const a${i}_${k}: f64 = ${a};`));
    lines.push(`console.log("${i}", ${m[1]}(${args.map((_, k) => `a${i}_${k}`).join(", ")}));`);
  });
  const file = `m_${name}.ts`;
  await Deno.writeTextFile(`${dir}/${file}`, lines.join("\n") + "\n");
  const nat = await run("deno", ["run", file]);
  const c = await run("wasmtk", ["wasic", file]);
  if (c.code !== 0) {
    const why = (c.out + c.err).split("\n").find((l) => /⚠️|❌/.test(l))?.trim().slice(0, 90) ?? "";
    rows.push(`${name}\tCOMPILE-FAIL\t${why}`);
    continue;
  }
  const w = await run("wasmtk", ["run", file.replace(/\.ts$/, ".wasm")]);
  const a = nat.out.trim().split("\n"), b = w.out.trim().split("\n");
  const bad: string[] = [];
  a.forEach((l, k) => {
    if (l !== b[k]) bad.push(`${exprs[+l.split(" ")[0]] ?? k}: deno ${l.split(" ").slice(1).join(" ")} wasm ${(b[k] ?? "<none>").split(" ").slice(1).join(" ")}`);
  });
  rows.push(`${name}\t${bad.length === 0 ? "MATCH" : `DIFF ${bad.length}/${a.length}`}\t${bad.slice(0, 4).join(" | ")}`);
}
console.log(rows.join("\n"));
