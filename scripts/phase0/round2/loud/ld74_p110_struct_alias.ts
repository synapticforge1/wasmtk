type i32 = number; type f64 = number;
interface P { x: i32; y: i32; }
const p: P = { x: 1, y: 2 };
const q: P = p;
q.x = 9;
const px: i32 = p.x;
console.log(px);
