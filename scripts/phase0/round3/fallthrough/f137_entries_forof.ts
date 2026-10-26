type i32 = number; type f64 = number;
const xs: f64[] = [5, 6];
let s: f64 = 0;
for (const [i, v] of xs.entries()) s += i * v;
console.log(s);
