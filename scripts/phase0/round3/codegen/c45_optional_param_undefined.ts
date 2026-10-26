type i32 = number;
function f(a: i32, b?: i32): i32 {
  if (b === undefined) return a * 100;
  return a + b;
}
console.log(f(3), f(3, 0));
