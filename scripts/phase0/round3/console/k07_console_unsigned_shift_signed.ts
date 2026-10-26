// console.log(b >>> 0) prints the signed value; `const v: f64 = b >>> 0` prints 4294967293.
type i32 = number;
const b: i32 = -3;
console.log(b >>> 0);
