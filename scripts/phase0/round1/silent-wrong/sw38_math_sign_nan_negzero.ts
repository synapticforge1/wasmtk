type f64 = number;
const nan: f64 = NaN; const nz: f64 = -0;
console.log(Math.sign(nan));
// `1 / x` shows the sign of a zero; console.log(-0) itself is sw41 (the printer).
console.log(1 / Math.sign(nz));
