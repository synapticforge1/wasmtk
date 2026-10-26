type i32 = number; type f64 = number;
function k(a: i32, b: i32): i32 {
  switch (a) {
    case 1:
      switch (b) {
        case 1: return 11;
        default: break;
      }
      return 10;
    default: return 0;
  }
}
console.log(k(1, 1), k(1, 2), k(2, 1));
