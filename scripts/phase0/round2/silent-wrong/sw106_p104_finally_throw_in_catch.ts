type i32 = number; type f64 = number;
let log: i32 = 0;
try {
  try {
    throw new Error("a");
  } catch (e) {
    log += 1;
    throw new Error("b");
  } finally {
    log += 10;
  }
} catch (e2) {
  log += 100;
}
console.log(log);
