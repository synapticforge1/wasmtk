type i32 = number; type f64 = number;
const xs: f64[] = [2.5];
let r: i32 = 0;
switch (xs[0]) {
  case 2: r = 1; break;
  default: r = 9;
}
console.log(r);
