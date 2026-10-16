type i32 = number;
const n: f64 = 0 / 0;
const a: f64[] = [1, n, 3];
console.log(a.includes(n));
const i: i32 = a.indexOf(n);
console.log(i);
