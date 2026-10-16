// H12 rows fixed 2026-10-15, 2D arrays declared from something other than a literal:
//   ld11  `const d: i32[][] = m` (another 2D array's name) built an invalid module
//   ld12  a 2D PARAMETER, `rows: i32[][]`, was no array at all, so `d[1][2]` was refused
//   sw31  `const d: i32[][] = mk()` (a call) read zeros (loud since 2026-09-30)
//   sw73  a function's local 2D array named like a top-level one made the top-level one read
//         as zeros (it became a module global that _start initialised as a local); silent
//   and   `d[1][0] + rows[0][1]` was read as ONE 2D access with the index `0] + rows[0][1`
import { f64, i32 } from "../../../src/wasmath.ts";

function t(rows: i32[][]): i32 {
  const d: i32[][] = rows;
  return d[1][0] + rows[0][1] + d.length;
}
function mk(): i32[][] {
  const m: i32[][] = [[1], [2, 3]];
  return m;
}
function fsum(g: f64[][]): f64 {
  let s: f64 = 0;
  for (let i: i32 = 0; i < g.length; i++) {
    for (let j: i32 = 0; j < g[i].length; j++) s = s + g[i][j];
  }
  return s;
}
const m: i32[][] = [[7, 8], [9]];
const d2: i32[][] = m;
const k: i32[][] = mk();
const fg: f64[][] = [[0.5, 1.25], [2]];
console.log(t(m), d2[0][1] + d2[1][0], k[1][1], k.length);
console.log(d2[1][0], fsum(fg), t([[1, 2], [3, 4, 5]]));
d2[0][0] = 70;
console.log(m[0][0], d2[0][0]);
