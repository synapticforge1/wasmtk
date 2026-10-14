// sw69 (2026-10-13): array and struct literals laid out at compile time read each element with
// `parseFloat(e) || 0` / `parseInt(e, 10) || 0`, so anything but a plain decimal became 0 or a
// wrong number: NaN, -0, Math.PI, 0x10, a variable, an expression; `true` in a boolean[] was 0;
// a bigint past 2^31 lost its high word; a string[] literal that is pushed to held "" for each
// element; a module-level struct literal (and an array of them) held 0 / false for any field that
// was not a plain literal. Found with it: a boolean[] element printed 1 / 0, and
// `flags[0] === false` in console.log was an invalid module.
import { f64, i32 } from "../../../src/wasmath.ts";

const k: i32 = 5;

// numeric arrays, module level
const v: f64[] = [NaN, -0, Math.PI, 1e3, -2.5e-3, Infinity];
console.log(v[0], v[1], v[2], v[3], v[4], v[5]);
const w: i32[] = [k, k + 1, 0x10, -0b11, -2147483648];
console.log(w[0], w[1], w[2], w[3], w[4]);
const b: bigint[] = [9007199254740993n, -5n, 4611686018427387904n];
console.log(b[0], b[1], b[2]);
const m: i32[][] = [[k, 2], [k * 3, 4]];
console.log(m[0][0], m[1][0], m[1][1]);
let sum: f64 = 0;
for (const x of v) if (x === x) sum = sum + x;
console.log(sum);

// booleans: the values, their printing, a comparison, a template
const flags: boolean[] = [true, false, k > 3];
console.log(flags[0], flags[1], flags[2], flags[1] === false);
console.log(`t=${flags[0]} f=${flags[1]}`);
const grid: boolean[][] = [[true, false], [k < 3, true]];
console.log(grid[0][0], grid[1][0]);

// a string[] literal that is pushed to (so built at run time), with an escape
const names: string[] = ["a", "b\tc"];
names.push("d");
console.log(names[0], names[1], names[2], names.length);

// function level
function f(n: i32): void {
  const y: i32[] = [n * 2, 0b101, n];
  const z: f64[] = [n * 0.25, -0];
  y.push(1);
  console.log(y[0], y[1], y[2], y[3], z[0], z[1]);
}
f(k);

// struct literals: module level, an array of them, a dynamic array of them, function level
interface P {
  x: i32;
  y: f64;
  ok: boolean;
}
const a: P = { x: k, y: Math.PI, ok: k > 3 };
console.log(a.x, a.y, a.ok);
const c: P = { x: 0x10, y: -0, ok: true };
console.log(c.x, c.y, c.ok);
const ps: P[] = [{ x: k + 1, y: NaN, ok: false }, { x: 2, y: 0.5, ok: true }];
console.log(ps[0].x, ps[0].y, ps[0].ok, ps[1].x);
const qs: P[] = [{ x: k, y: 1.5, ok: true }];
qs.push({ x: 3, y: 4.5, ok: false });
console.log(qs.length, qs[0].x, qs[0].y, qs[1].x);
function g(n: i32): void {
  const r: P = { x: n * 2, y: n * 0.5, ok: n > 1 };
  const rs: P[] = [{ x: n + 1, y: n * 0.25, ok: false }];
  rs.push(r);
  console.log(r.x, r.y, r.ok, rs[0].x, rs[0].y, rs[1].x);
}
g(k);
const big: i32 = 1e3;
console.log(big, "after");
