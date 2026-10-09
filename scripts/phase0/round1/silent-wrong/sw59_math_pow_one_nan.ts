// Math.pow(1, NaN) gave 1 (C's pow); JavaScript gives NaN.
type f64 = number;
const one: f64 = 1;
const nan: f64 = NaN;
console.log(Math.pow(one, nan));
