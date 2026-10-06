// 2026-10-06: f32 values in arrays and structs, and for-of over an array parameter.
//   sw43: an f32[] literal was written as 8-byte f64s into 4-byte slots, overrunning the next data
//         segment (a following "true" became NUL bytes); an element read back as its bit pattern.
//   ld18: an f32 struct field was loaded with i32.load (an invalid module), in wasic and console.
//   sw45: for-of over an array PARAMETER iterated the 8-byte header as elements ([1,2,3] → 7).
//   Also: an f32 in an f64 context (`const a: f64 = z + 1`) was never promoted.
// Only values exact in f32 are used: `const z: f32 = 0.1` prints 0.10000000149011612 in wasm and
// 0.1 in Deno BY DESIGN (the declared type decides; design-decisions.md).
type i32 = number;
type f32 = number;
type f64 = number;

interface P {
  x: f32;
  y: f64;
  n: i32;
}

const p: P = { x: 2.5, y: 1.5, n: 3 };
const xs: f32[] = [1.25, 2.5, 3.75];
const word: string = "true";
const z: f32 = 2.5;

const a: f64 = p.x + 1;
const b: f64 = z + 1;
console.log(a, b, word);
console.log(p.x, p.y, p.n, p.x + p.y);
p.x = 4.5;
console.log(p.x * 2, xs[1], xs.length);
xs[0] = 0.5;
console.log(xs[0] + xs[2]);

let sum: f32 = 0;
for (let i = 0; i < xs.length; i++) sum += xs[i];
console.log(sum);

const ys: f32[] = [];
ys.push(1.5);
ys.push(2.25);
console.log(ys[0], ys[1], ys.length, ys.indexOf(2.25));

function mk(): P {
  return { x: 0.75, y: 2, n: 1 };
}
const q: P = mk();
console.log(q.x * 2, q.x + q.y);

function totalF(v: f32[]): f32 {
  let t: f32 = 0;
  for (const e of v) t += e;
  return t;
}
function totalI(v: i32[]): i32 {
  let t: i32 = 0;
  for (const e of v) t += e;
  return t;
}
function totalD(v: f64[]): f64 {
  let t: f64 = 0;
  for (const e of v) t += e;
  return t;
}
const is: i32[] = [1, 2, 3];
const ds: f64[] = [1.25, 2.5, 3.0];
console.log(totalF(xs), totalI(is), totalD(ds));

const qs: P[] = [{ x: 1.5, y: 0, n: 0 }, { x: 2.5, y: 0, n: 0 }];
const qsum: f32 = qs[0].x + qs[1].x;
console.log(qs[1].x, qsum);
const k: i32 = Math.floor(p.x);
console.log(k);
