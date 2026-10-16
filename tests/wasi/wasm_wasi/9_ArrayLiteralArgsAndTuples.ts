// H12 rows fixed 2026-10-15:
//   sw30  an array literal as a call's argument inside console.log, `t([1, 2, 3])`, was refused
//         (the declaration from the parameter, `const d: i32[] = xs`, was already right)
//   ld09  a tuple returned from a ternary, `return a < b ? [a, b] : [b, a]`, did not compile;
//         built as one value its branches were ARRAYS, so `r[0]` read the array's length
//   and   ld19: `qs[0].x + qs[1].x` (struct-array element fields) was asked for as i32
import { f64, i32 } from "../../../src/wasmath.ts";

function total(xs: i32[]): i32 {
  const d: i32[] = xs;
  let s: i32 = 0;
  for (let i: i32 = 0; i < d.length; i++) s = s + d[i];
  return s;
}
const a: i32[] = [1, 2, 3];
console.log(total([1, 2, 3]), total(a), total([10]) + total([1, 1]));

function mm(p: i32, q: i32): [i32, i32] {
  return p < q ? [p, q] : [q, p];
}
function pick(f: boolean, x: f64): [f64, i32] {
  return f ? [x, 1] : [x * 2, 2];
}
const r: [i32, i32] = mm(8, 3);
const s2: [i32, i32] = mm(1, 9);
const pk: [f64, i32] = pick(false, 1.25);
console.log(r[0], r[1], s2[0], s2[1], pk[0], pk[1]);

interface P {
  x: f64;
  n: i32;
}
const qs: P[] = [{ x: 1.5, n: 2 }, { x: 2.5, n: 3 }];
const i: i32 = 1;
console.log(qs[0].x + qs[1].x, qs[0].n + qs[1].n, qs[0].n * 10, qs[1].x * 2);
console.log("s=" + (qs[0].x + qs[1].x), qs[0].x > qs[1].x, qs[i].x - qs[0].x);
