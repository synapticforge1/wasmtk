type i32 = number; type f64 = number;
function f(k: i32): i32 {
  let r: i32 = 0;
  switch (k) {
    case 1: r = 1; break;
    default: r = 9;
    case 2: r = r + 2; break;
  }
  return r;
}
console.log(f(1), f(2), f(5));
