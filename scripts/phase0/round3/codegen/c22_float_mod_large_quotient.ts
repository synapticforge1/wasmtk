type f64 = number;
const x: f64 = 1e17;
const y: f64 = 7;
const z: f64 = 0.1;
const a: f64 = x % y;
const b: f64 = 1e300 % z;
console.log(a, b);
