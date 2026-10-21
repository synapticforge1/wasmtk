// Audit round 2 (2026-10-20), loud rows that trapped or built invalid modules in array / string
// methods:
//   ld48  pop() / shift() of an empty array trapped (JavaScript: undefined; a dropped one does
//         nothing);
//   ld49  an f64 comparator in sort() was called as returning i32 (a signature mismatch);
//   ld50  flat() of a 1-D array emitted nothing (it is a copy);
//   ld52  string[].sort() called an undefined $__str_cmp;
//   ld53  s.at(10) read past the text, and a `string | undefined` local was undeclared;
//   ld64  a `string | null` local was undeclared and printed as a number;
//   ld75  a callback taking the index, `(x, i) => …`, was called with the element only, and a
//         generic function's callback parameter took the signature of its LAST instance.
type i32 = number;
type f64 = number;

const a: i32[] = [1];
a.pop();
a.pop();
const p: i32 | undefined = a.pop();
console.log(p === undefined, a.length);
const q: i32[] = [7, 8];
const q1: i32 | undefined = q.shift();
q.shift();
q.shift();
console.log(q1, q.length);

const b: f64[] = [0.5, 0.25, 0.75];
b.sort((x: f64, y: f64): f64 => x - y);
console.log(b.join(","));

const fl: i32[] = [1, 2, 3];
const fc: i32[] = fl.flat();
fc[0] = 9;
console.log(fc.length, fl[0], fc[0]);

const ws: string[] = ["pear", "apple", "fig"];
ws.sort();
const w0: string = ws[0];
const w2: string = ws[2];
console.log(w0, w2);

const s: string = "abc";
const c: string | undefined = s.at(10);
const d: string | undefined = s.at(-1);
console.log(c === undefined, d === undefined, d, c);
console.log(`[${s.at(5)}]`);

let ns: string | null = null;
console.log(ns, ns === null);
ns = "";
console.log(ns === null);
ns = "x";
console.log(ns, ns === null);

const xs: i32[] = [10, 20, 30, 40];
xs.forEach((x: i32, i: i32): void => { console.log(i, x); });
const mi: i32[] = xs.map((x: i32, i: i32): i32 => x + i);
const fi: i32[] = xs.filter((x: i32, i: i32): boolean => i !== 1);
console.log(mi.join(","), fi.join(","));
const ix: i32 = xs.findIndex((x: i32, i: i32): boolean => i === 2);
const ev: boolean = xs.every((x: i32, i: i32): boolean => x > i);
const sm: boolean = xs.some((x: i32, i: i32): boolean => i > 2);
console.log(ix, ev, sm);

function maxOf<T>(x: T, y: T, gt: (u: T, v: T) => boolean): T {
  return gt(x, y) ? x : y;
}
const mx: i32 = maxOf<i32>(3, 9, (u: i32, v: i32): boolean => u > v);
const mf: f64 = maxOf<f64>(2.5, -1.5, (u: f64, v: f64): boolean => u > v);
console.log(mx, mf);
