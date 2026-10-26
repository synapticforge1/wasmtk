type i32 = number; type f64 = number;
function h(b?: f64): f64 {
  const v: f64 = b ?? 100;
  return v;
}
console.log(h());
