type i32 = number; type f64 = number;
let r: i32 = 0;
const k: i32 = 1;
switch (k) {
  case 1: {
    const t: i32 = 5;
    r = t;
  }
  case 2: {
    r += 1;
    break;
  }
}
console.log(r);
