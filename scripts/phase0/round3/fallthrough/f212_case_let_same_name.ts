type i32 = number; type f64 = number;
function f(k: i32): f64 {
  switch (k) {
    case 1: {
      return 1;
    }
  }
  let x: f64 = 2;
  {
    let x: f64 = 3;
    x += 1;
  }
  return x;
}
console.log(f(2));
