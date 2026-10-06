type f64 = number;
const h: f64 = 0.49999999999999994; const q: f64 = -0.4;
console.log(Math.round(h));
// `1 / x` shows the sign of a zero; console.log(-0) itself is sw41 (the printer).
console.log(1 / Math.round(q));
