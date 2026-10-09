// H12, 2026-10-06: precedence, grouping and typing of wasic's own operators.
//   sw10: -x + 5 was -(x + 5)            sw11: !a && b was !(a && b)
//   sw12: c1 ? A : c2 ? B : C grouped from the right end
//   sw13: 2 ** 3 + 1 was 2 ** (3 + 1)     sw14: "h=" + (n >> 1) printed h=true
//   sw15: i32 + f64 was typed from the left (1 + 2.5 = 3)
//   sw16: if (0.5) was false (the f64 condition was truncated)
//   sw17: a >> 2 << 1 was a >> (2 << 1); every same-precedence group now splits rightmost
import { i32, f64 } from "../../../src/wasmath.ts";

const x: i32 = 3;
const r10: i32 = -x + 5;
const r10b: i32 = -x * 2 - 1;
console.log(r10, r10b);

const a: i32 = 0;
const b: i32 = 0;
if (!a && b) console.log("11 yes");
else console.log("11 no");
const c: i32 = 1;
if (!a && c) console.log("11 both");

const s: i32 = -5;
const r12: i32 = s < 0 ? -1 : s > 0 ? 1 : 0;
const t: i32 = 0;
const r12b: i32 = t < 0 ? -1 : t > 0 ? 1 : 0;
console.log(r12, r12b);

const r13: f64 = 2 ** 3 + 1;
const r13b: f64 = 1 + 2 ** 3 * 2;
console.log(r13, r13b);

const n: i32 = 8;
const h: string = "h=" + (n >> 1);
console.log(h, "s=" + (n << 1));

const i: i32 = 1;
const f: f64 = 2.5;
const r15: f64 = i + f;
const r15b: f64 = i * 0.5;
console.log(r15, r15b);
if (i + 1 < f) console.log("15 lt");
else console.log("15 ge");

const half: f64 = 0.5;
const zero: f64 = 0;
if (half) console.log("16 half truthy");
if (zero) console.log("16 zero truthy");
else console.log("16 zero falsy");
const nan: f64 = NaN;
if (nan) console.log("16 nan truthy");
else console.log("16 nan falsy");
let w: f64 = 2.5;
let steps: i32 = 0;
while (w) {
  w = w > 1 ? w - 1 : 0;
  steps++;
}
console.log("16 steps", steps);

const sh: i32 = 64;
console.log(sh >> 2 << 1, sh << 1 >> 3, 20 - 5 + 3, sh - 10 - 4);

// The same rules inside console.log, which has its own operator code (the parallel path).
console.log(-x + 5, -x * 2 - 1, 2 ** 3 + 1, 1 + 2 ** 3 * 2);
console.log(s < 0 ? -1 : s > 0 ? 1 : 0, t < 0 ? -1 : t > 0 ? 1 : 0);
console.log("h=" + (n >> 1), i + f, i * 0.5, i + 1 < f);
console.log(half ? "half truthy" : "half falsy", zero ? "zero truthy" : "zero falsy");
console.log(x !== 3, x != 2, x === 3);
