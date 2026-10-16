type i32 = number; type f64 = number;
interface P { x: f64; ok: boolean }
const ps: P[] = [{ x: 1.5, ok: true }, { x: -0.5, ok: false }];
const b: boolean = ps[1].ok || ps[0].x > 1;
console.log(b);
console.log(ps[1].ok || ps[0].x > 1);
