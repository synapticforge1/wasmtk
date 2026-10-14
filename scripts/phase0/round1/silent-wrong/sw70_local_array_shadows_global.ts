// A function's local array with the SAME NAME as a module-level array: its initialization writes
// the module global (`global.set $a (call $__malloc ...)`), while the pushes and the return use
// the uninitialized local (0), so the module array is replaced by an empty one, and the function
// works on whatever an array at address 0 reads as.
// Deno: "1 2 3" / "10 20". wasm: "0 0 0" / "10 20" (larger programs print garbage: sw66's probe).
// (Found fixing sw66, 2026-10-13.)
type i32 = number;
const a: i32[] = [1, 2, 3];
function make(): i32[] {
  const a: i32[] = [];
  a.push(10);
  a.push(20);
  return a;
}
const m: i32[] = make();
console.log(a[0], a[1], a[2]);
console.log(m[0], m[1]);
