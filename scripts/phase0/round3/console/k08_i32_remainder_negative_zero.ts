// An i32 `%` whose result is zero with a negative dividend is -0 in JavaScript; wasm prints 0
// (console.log and `const v: f64 = b % 3` alike). `b * 0` prints -0 correctly (sw119's f64 path).
type i32 = number;
const b: i32 = -3;
console.log(b % 3);
