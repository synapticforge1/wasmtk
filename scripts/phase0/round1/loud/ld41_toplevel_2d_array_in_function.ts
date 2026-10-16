// A top-level 2D array read inside a function is refused (2026-10-15; the same on main).
type i32 = number;
const grid: i32[][] = [[1, 2], [3, 4]];
function cell(r: i32, c: i32): i32 {
  return grid[r][c];
}
console.log(cell(0, 1), grid[1][1]);
