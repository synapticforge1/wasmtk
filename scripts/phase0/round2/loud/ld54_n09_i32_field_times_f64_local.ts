type i32 = number; type f64 = number;
interface P { n: i32 }
const p: P = { n: 3 };
const x: f64 = 1.5;
const a: f64 = p.n * x;
console.log(a);
