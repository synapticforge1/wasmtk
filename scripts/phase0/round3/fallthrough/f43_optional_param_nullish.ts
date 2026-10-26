type i32 = number; type f64 = number;
function h(a: f64, b?: f64): f64 {
  return a + (b ?? 100);
}
console.log(h(2), h(2, 0));
