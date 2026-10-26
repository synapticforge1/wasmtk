type i32 = number; type f64 = number;
const xs: f64[] = [5, 6, 7];
const r: f64 = xs.reduce((acc: f64, v: f64, i: i32): f64 => acc + v * i, 0);
console.log(r);
