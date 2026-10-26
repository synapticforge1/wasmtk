type i32 = number;
type f64 = number;
const xs: i32[] = [1, 2, 3];
const r: f64 = xs.reduce((a: f64, x: i32): f64 => a + x * 0.5, 0);
console.log(r);
