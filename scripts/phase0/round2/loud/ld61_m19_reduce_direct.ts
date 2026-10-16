type i32 = number; type f64 = number;
const arr: f64[] = [3, 1.5, 4];
const a: f64 = arr.reduce((s: f64, v: f64): f64 => s + v, 0);
console.log(a);
console.log(arr.reduce((s: f64, v: f64): f64 => s + v, 0));
