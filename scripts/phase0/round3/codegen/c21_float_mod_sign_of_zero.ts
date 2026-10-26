type f64 = number;
// JavaScript: the result of % has the sign of the dividend, -0 included.
const nz: f64 = -0;
const five: f64 = 5;
const m: f64 = -10;
const b: f64 = nz % five;
const c: f64 = m % five;
console.log(b, c);
