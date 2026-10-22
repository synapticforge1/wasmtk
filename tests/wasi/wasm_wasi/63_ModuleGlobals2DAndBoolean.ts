// Audit round 2 (2026-10-22), loud rows that refused valid module-level variables in a function:
//   ld41  a top-level 2D array (`f64[][]`, `i32[][]`, `Array.from({ length: N }, () => [])`) read,
//         written, measured, pushed into and printed inside a function; a function's own 2D array
//         of the same name still shadows it;
//   ld42  a top-level `boolean` read inside a function (`if (useTri)`), toggled there, and printed
//         as `true` / `false` from both a function and the top level.
type i32 = number;
type f64 = number;

const grid: f64[][] = [[1, 2, 3], [4, 5, 6]];
const m: i32[][] = [[1, 2], [3, 4], [5, 6]];
const buckets: i32[][] = Array.from({ length: 3 }, () => []);
const useTri: boolean = true;
const verbose: boolean = false;
let flag: boolean = false;

function at(r: i32, c: i32): f64 {
  return grid[r][c];
}

function setAt(r: i32, c: i32, v: f64): void {
  grid[r][c] = v;
}

function rowSum(r: i32): f64 {
  let s: f64 = 0;
  for (let c: i32 = 0; c < grid[r].length; c++) s += grid[r][c];
  return s;
}

function total(): i32 {
  let s: i32 = 0;
  for (let r: i32 = 0; r < m.length; r++) {
    for (let c: i32 = 0; c < m[r].length; c++) s += m[r][c];
  }
  return s;
}

function bump(r: i32): void {
  m[r][0] = m[r][0] * 10;
}

function put(v: i32): void {
  buckets[v % 3].push(v);
}

function shadow(): i32 {
  const m: i32[][] = [[7]];
  return m[0][0];
}

function shape(n: i32): i32 {
  if (useTri) return n * (n + 1);
  return n * n;
}

function toggle(): boolean {
  flag = !flag;
  return flag;
}

function mode(): string {
  return verbose ? "loud" : "quiet";
}

function show(): void {
  console.log(m);
  console.log(flag, verbose, useTri && !verbose);
}

console.log(at(0, 0), at(1, 2));
setAt(1, 1, 50);
console.log(at(1, 1), rowSum(1), grid.length, grid[1][1]);
console.log(total());
bump(1);
console.log(m[1][0], total(), shadow());
for (let i: i32 = 0; i < 7; i++) put(i);
console.log(buckets[0].length, buckets[1].length, buckets[2][1]);
console.log(shape(4), mode());
console.log(toggle(), toggle(), flag);
show();
toggle();
show();
console.log(m);
