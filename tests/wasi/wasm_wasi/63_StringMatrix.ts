// ld94 (2026-10-22): a 2D STRING array, `string[][]`, was refused everywhere ("Unsupported
// expression: \"a\""): the 2D builder had no string element. Each element is a (ptr, len) pair as
// in a 1D string array: read, written, measured (a row's length, an element's length), printed,
// concatenated, used in a template, from a function, a parameter and a function's own array. A
// comma inside a string element stays text.
type i32 = number;
const names: string[][] = [["ann", "bo"], ["cy", "d,e", "f"]];
console.log(names[1][0] + names[0][1]);
console.log(names.length, names[1].length, names[1][1].length);
const s: string = names[1][2];
console.log(s, `${names[0][0]}!`);
names[0][1] = "zed";
console.log(names[0][1]);
function at(r: i32, c: i32): string {
  return names[r][c];
}
function count(): i32 {
  let n: i32 = 0;
  for (let r: i32 = 0; r < names.length; r++) n += names[r].length;
  return n;
}
console.log(at(1, 1), count());
function local(): string {
  const g: string[][] = [["x", "y"]];
  const who: string = "me";
  g[0][1] = who;
  return g[0][0] + g[0][1];
}
console.log(local());
function joinRow(g: string[][], r: i32): string {
  let out: string = "";
  for (let c: i32 = 0; c < g[r].length; c++) out += g[r][c];
  return out;
}
const grid: string[][] = [["a", "b", "c"], ["d"]];
console.log(joinRow(grid, 0), joinRow(grid, 1));
