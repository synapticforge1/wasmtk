// Math.clz32 / Math.imul with an f64 argument built an invalid module: no ToInt32 conversion.
type f64 = number;
const a: f64 = 4294967295;
const b: f64 = 3;
console.log(Math.clz32(a), Math.imul(a, b));
