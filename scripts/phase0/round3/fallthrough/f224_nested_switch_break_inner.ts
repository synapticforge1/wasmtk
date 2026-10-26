type i32 = number; type f64 = number;
function k(a: i32, b: i32): i32 {
  let r: i32 = 0;
  switch (a) {
    case 1:
      switch (b) {
        case 1: r += 1; break;
        case 2: r += 2; break;
      }
      r += 10;
      break;
    case 2:
      r = 50;
      break;
  }
  return r;
}
console.log(k(1, 1), k(1, 2), k(2, 2), k(3, 3));
