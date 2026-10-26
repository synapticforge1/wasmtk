type i32 = number; type f64 = number;
const xs: i32[] = [3, 2, 1, 0, 5];
let i: i32 = 0;
let v: i32 = 0;
let s: i32 = 0;
while ((v = xs[i++]) !== 0) s += v;
console.log(s, i);
