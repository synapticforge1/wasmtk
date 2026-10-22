type i32 = number;
const grid: i32[][] = [[1, 2], [3, 4]];
const useTri: boolean = true;
function cell(r: i32, c: i32): i32 {
  return grid[r][c];
}
function pick(): i32 {
  if (useTri) return 3;
  return 4;
}
console.log(cell(1, 0), pick());
