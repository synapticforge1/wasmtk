// Owner's rule 2 of 2026-10-19 (sw87): a JavaScript method does what JavaScript intends, so a
// bare `sort()` of numbers compares them as STRINGS ([10, 9, 1, 100] → 1,10,100,9). It sorted
// numerically. A comparator still decides the order.
type i32 = number;
type f64 = number;

const a0: i32[] = [10, 9, 1, 100];
a0.sort();
console.log(a0.join(","));
const a: i32[] = [10, 9, 1, 100, -5, -40, 0, 2];
a.sort();
console.log(a.join(","));
const f: f64[] = [2.5, 10, -0.5, 1e21, 0.1, 3];
f.sort();
console.log(f.join(","));
const b: i32[] = [3, 1, 2];
const c: i32[] = b.sort();
console.log(c.join(","), b.join(","));
const n: i32[] = [30, 4, 200];
n.sort((x: i32, y: i32): i32 => x - y);
console.log(n.join(","));
