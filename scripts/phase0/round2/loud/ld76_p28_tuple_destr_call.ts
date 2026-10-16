type i32 = number; type f64 = number;
function mm(a: i32, b: i32): [i32, i32] {
  if (a < b) return [a, b];
  return [b, a];
}
const [lo, hi]: [i32, i32] = mm(8, 2);
console.log(lo, hi);
