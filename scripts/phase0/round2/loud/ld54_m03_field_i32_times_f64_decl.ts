type i32 = number; type f64 = number;
interface P { x: f64; n: i32 }
const p: P = { x: 1.5, n: 3 };
const a: f64 = p.n * p.x;
console.log(a);
