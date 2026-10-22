// sw128 (2026-10-22, found with ld96): an inline array literal passed to an `f64[]` parameter was
// laid out as i32 words, so `first([1, 2, 3])` read garbage (`4.24e-314`), even `[1.5, 2, 3]`. It
// is now built at the parameter's element type, from a statement, an expression and console.log.
type i32 = number;
type f64 = number;
function first(v: f64[]): f64 {
  return v[0] + v[2];
}
console.log(first([1, 2, 3]), first([1.5, 2, 3]));
const r: f64 = first([0.25, 0, 4]);
console.log(r);
function len(v: f64[]): i32 {
  return v.length;
}
let n: i32 = 0;
n = len([1, 2, 3, 4]);
console.log(n);
