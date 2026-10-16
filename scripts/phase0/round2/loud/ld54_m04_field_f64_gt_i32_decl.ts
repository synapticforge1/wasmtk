type i32 = number; type f64 = number;
interface P { x: f64; n: i32 }
const p: P = { x: 2.5, n: 3 };
const a: boolean = p.x > p.n;
console.log(a);
