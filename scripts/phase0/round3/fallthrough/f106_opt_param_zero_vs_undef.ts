type i32 = number; type f64 = number;
function h(b?: f64): f64 {
  return b === undefined ? 100 : b;
}
console.log(h(0));
