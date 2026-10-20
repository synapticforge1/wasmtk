// Owner's rule 1 of 2026-10-19 (sw95): an out-of-range ARRAY read is `undefined`, as a string's
// is. `a[5] === undefined` was false, `a[k] ?? 42` ignored the 42, and console.log printed
// whatever memory followed the array. A float index keeps D3's conversion.
type i32 = number;
type f64 = number;

const a: i32[] = [1, 2];
const v: i32 | undefined = a[5];
console.log(v === undefined);
const w: i32 | undefined = a[1];
console.log(w === undefined, w);
console.log(a[5] === undefined, a[1] === undefined, a[-1] === undefined, a[2] !== undefined);
console.log(a[5]);
console.log(a[0], a[2]);
const k: i32 = 7;
console.log(a[k] ?? 42, a[0] ?? 42);
console.log(a.at(5), a.at(-1), a.at(-3), a.at(1) === undefined, a.at(9) === undefined);

const fs: f64[] = [1.5, 2.5];
console.log(fs[3], fs[1], fs[9] === undefined);
const zs: f64[] = [-0, 1e21, 0.1 + 0.2, -1.5e-7, 255];
console.log(zs[0], zs[1], zs[2], zs[3], zs[4], zs[5]);
const bs: boolean[] = [true, false];
console.log(bs[0], bs[1], bs[2]);

const d: i32[] = [];
d.push(4);
console.log(d[0], d[1], d[1] !== undefined);
const t: Int32Array = new Int32Array(3);
console.log(t[3] === undefined, t[2] === undefined);

function g(i: i32): i32 | undefined {
  return a[i];
}
const r1: i32 | undefined = g(1);
const r2: i32 | undefined = g(9);
console.log(r1, r2 === undefined);
