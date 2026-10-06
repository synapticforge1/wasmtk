type f32 = number;
type f64 = number;
interface P { x: f32; y: f64; }
const p: P = { x: 2.5, y: 1.5 };
const a: f64 = p.x + 1;
console.log(a);
