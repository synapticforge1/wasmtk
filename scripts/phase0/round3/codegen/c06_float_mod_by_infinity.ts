type f64 = number;
// JavaScript: x % ±Infinity is x for a finite x.
const inf: f64 = Infinity;
const five: f64 = 5;
const a: f64 = five % inf;
const b: f64 = -2.5 % inf;
console.log(a, b);
