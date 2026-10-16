type i32 = number; type f64 = number;
let log: i32 = 0;
function f(x: i32): i32 {
  try {
    return x;
  } finally {
    log += 100;
  }
}
const a: i32 = f(1);
console.log(a, log);
