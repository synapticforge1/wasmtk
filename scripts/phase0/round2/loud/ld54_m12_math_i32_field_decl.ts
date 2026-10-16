type i32 = number; type f64 = number;
interface P { x: f64; n: i32 }
const p: P = { x: -2.7, n: 9 };
const c: f64 = Math.max(p.n, p.x);
console.log(c);
console.log(Math.max(p.n, p.x));
