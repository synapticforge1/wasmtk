type i32 = number; type f64 = number;
interface P { x: f64 }
const p: P = { x: 1.5 };
let r: i32 = 0;
switch (p.x) {
  case 1: r = 1; break;
  case 1.5: r = 2; break;
  default: r = 3;
}
console.log(r);
