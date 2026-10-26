type i32 = number; type f64 = number;
function half(n: f64): f64 { return n / 2; }
let r: i32 = 0;
switch (half(3)) {
  case 1: r = 1; break;
  default: r = 9;
}
console.log(r);
