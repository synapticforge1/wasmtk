type i32 = number;
function f(a: i32, b?: i32): i32 {
  return a + (b ?? 100);
}
console.log(f(1), f(1, 0));
