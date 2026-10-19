// Audit round 2 (2026-10-19): the edge cases of the array / string methods, as JavaScript.
//   sw86 `charCodeAt` out of range is NaN (it was -1);
//   sw88 `split("")` splits into characters (it was the whole string as one part);
//   sw89 `reduce` without an initial value starts from element 0 (it started at 0: a product was 0);
//   sw90 `find` reports found / not found by a flag, not a sentinel (a found -1 read as undefined);
//   sw93 `x.toString(radix)` of an f64 converts as V8 (`255.5` → `ff.8`; it was truncated), and
//        ld51 `(2 ** 32).toString(16)` no longer traps;
//   sw94 `includes(NaN)` is true on an f64 array (SameValueZero); `indexOf(NaN)` stays -1.
type i32 = number;
type f64 = number;

const s: string = "AB";
const c: f64 = s.charCodeAt(5);
console.log(c);
const d: f64 = s.charCodeAt(1);
console.log(d);

const w: string = "abc";
const p: string[] = w.split("");
console.log(p.length, p.join("-"));
const q: string[] = w.split("x");
console.log(q.length);
const e: string = "";
const pe: string[] = e.split("");
console.log(pe.length);

const a: i32[] = [5, 2, 8];
const m: i32 = a.reduce((acc: i32, x: i32): i32 => acc > x ? acc : x);
console.log(m);
const prod: i32 = a.reduce((acc: i32, x: i32): i32 => acc * x);
console.log(prod);
const withInit: i32 = a.reduce((acc: i32, x: i32): i32 => acc + x, 100);
console.log(withInit);
const fs: f64[] = [1.5, 2.5, 4];
const fp: f64 = fs.reduce((acc: f64, x: f64): f64 => acc * x);
console.log(fp);

const xs: i32[] = [1, 3, 5];
const f: i32 | undefined = xs.find((x: i32): boolean => x > 10);
const miss: boolean = f === undefined;
const fi: i32 = xs.findIndex((x: i32): boolean => x > 10);
console.log(miss, fi);
const ys: i32[] = [-1, 2, 3];
const g: i32 | undefined = ys.find((x: i32): boolean => x < 0);
console.log(g);
const h: i32 | undefined = ys.find((x: i32): boolean => x > 9);
console.log(h === undefined ? "none" : "found");

const n: i32 = -255;
const hx: string = n.toString(16);
console.log(hx);
const vals: f64[] = [255.5, -255.5, 0.1, 1 / 3, 0, -0, 4294967296, 1e21, 123456789.987654321, 2.5e-10, 0.5, 1.75];
for (let k: i32 = 0; k < vals.length; k++) {
  const v: f64 = vals[k];
  const r16: string = v.toString(16);
  const r2: string = v.toString(2);
  const r36: string = v.toString(36);
  const r7: string = v.toString(7);
  console.log(r16, r2.length, r36, r7);
}
const nan: f64 = 0 / 0;
const sn: string = nan.toString(16);
const inf: f64 = 1 / 0;
const si: string = inf.toString(2);
const big: f64 = 2 ** 60;
const sb: string = big.toString(16);
console.log(sn, si, sb);

const fa: f64[] = [1, nan, 3];
console.log(fa.includes(nan), fa.includes(3), fa.includes(4));
const ni: i32 = fa.indexOf(nan);
console.log(ni);
