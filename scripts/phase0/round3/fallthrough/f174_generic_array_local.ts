type i32 = number; type f64 = number;
const xs: Array<f64> = [1.5, 2.5];
let t: f64 = 0;
for (const x of xs) t += x;
console.log(t);
