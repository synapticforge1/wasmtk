// Audit round 2 (2026-10-19): an array spread literal builds a NEW array from every part, in order.
//   sw77 a plain element was dropped (`[...a, ...b, 5]`, `[0, ...a, 7]`);
//   sw78 `[...a]` WAS `a`, so a push or a store through the copy changed `a`;
//   sw79 a spread of string arrays copied 4-byte slots, not (ptr, len) pairs.
// Also: an element holding `]` (`b[0]`) cut the literal short, so it was not seen as a spread.
type i32 = number;
type f64 = number;

const a: i32[] = [1, 2];
const b: i32[] = [3, 4];
const c: i32[] = a.concat(b);
console.log(c.length, c.join("-"));
const d: i32[] = [...a, ...b, 5];
console.log(d.join("-"));
const e: i32[] = [0, ...a, 9, ...b, 5];
console.log(e.length, e.join("-"));
const nums: i32[] = [4, 5, 6];
nums.push(0);
nums.pop();
const merged: i32[] = [0, ...nums, 7];
const ml: i32 = merged.length;
const m4: i32 = merged[4];
console.log(ml, m4);

// a copy, not an alias
const src: i32[] = [1, 2, 3];
const copy: i32[] = [...src];
copy.push(4);
copy[0] = 99;
src[1] = 50;
console.log(src.length, src.join("-"), copy.join("-"));

// elements that contain brackets
const f: i32[] = [b[0], ...a, b[1] * 10];
console.log(f.join("-"));

// f64, strings, growth past the first capacity, an empty source, a dynamic source
const fs: f64[] = [1.5, 2.25];
const g: f64[] = [0.5, ...fs, 3.75];
console.log(g.length, g[0], g[1], g[3]);
const s1: string[] = ["x", "y"];
const s2: string[] = ["z"];
const s3: string[] = [...s1, ...s2];
console.log(s3.length, s3[0], s3[1], s3[2]);
const w: string = "w";
const s4: string[] = ["q", ...s1, w, "end"];
console.log(s4.length, s4[0], s4[1], s4[2], s4[3], s4[4]);
const big: i32[] = [...a, ...b, ...a, ...b, ...a, 1, 2, 3];
console.log(big.length, big[12]);
const empty: i32[] = [];
const h: i32[] = [...empty, 4];
console.log(h.length, h[0]);
const dyn: i32[] = [];
for (let i: i32 = 0; i < 20; i++) {
  dyn.push(i);
}
const k: i32[] = [...dyn, -1];
console.log(k.length, k[19], k[20]);

// inside a function, mixing a local and a module array
function inFn(): void {
  const loc: i32[] = [8, 9];
  const m: i32[] = [...loc, ...a];
  console.log(m.join("-"));
}
inFn();
