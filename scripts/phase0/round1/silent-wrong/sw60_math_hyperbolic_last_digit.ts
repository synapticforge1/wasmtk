// acosh / asinh / cosh / sinh differ from V8 in the last digit (1-2 ulp): different algorithms.
type f64 = number;
const two: f64 = 2;
const h: f64 = 1.5;
const ten: f64 = 10;
console.log(Math.acosh(two), Math.asinh(h), Math.cosh(ten), Math.sinh(two));
