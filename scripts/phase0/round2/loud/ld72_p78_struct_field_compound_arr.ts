type i32 = number; type f64 = number;
interface P { x: i32; y: f64; }
const ps: P[] = [{ x: 1, y: 0.5 }, { x: 2, y: 1.5 }];
ps[1].x += 5;
ps[0].y *= 4;
const a: i32 = ps[1].x;
const b: f64 = ps[0].y;
console.log(a, b);
