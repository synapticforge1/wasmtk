type i32 = number; type f64 = number;
let log: i32 = 0;
function f(x: i32): i32 {
  try {
    if (x > 5) throw new Error("big");
    log += 1;
    return x;
  } catch (e) {
    log += 10;
    return -1;
  } finally {
    log += 100;
  }
}
const a: i32 = f(1);
const b: i32 = f(9);
console.log(a, b, log);
