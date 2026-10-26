type i32 = number; type f64 = number;
const x: f64 = 0.6;
let r: i32 = 0;
switch (x * 2) {
  case 1: r = 1; break;
  default: r = 3;
}
console.log(r);
