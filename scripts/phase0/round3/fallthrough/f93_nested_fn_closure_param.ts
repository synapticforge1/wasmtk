type i32 = number; type f64 = number;
function outer(a: f64): f64 {
  function inner(b: f64): f64 { return a + b; }
  return inner(1) + inner(2);
}
console.log(outer(10));
