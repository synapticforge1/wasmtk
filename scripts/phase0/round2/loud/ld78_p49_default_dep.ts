type i32 = number; type f64 = number;
function f(a: i32, b: i32 = a * 2): i32 {
  return a + b;
}
const r1: i32 = f(1);
const r2: i32 = f(1, 5);
console.log(r1, r2);
