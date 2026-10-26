type i32 = number; type f64 = number;
function f(k: i32): i32 {
  let r: i32 = 0;
  switch (k) {
    default: r += 5;
    case 1: r += 1;
  }
  return r;
}
console.log(f(1), f(7));
