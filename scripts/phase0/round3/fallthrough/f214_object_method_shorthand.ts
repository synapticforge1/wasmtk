type i32 = number; type f64 = number;
interface Calc { k: f64; f(x: f64): f64 }
const c: Calc = { k: 2, f(x: f64): f64 { return x * 2; } };
console.log(c.f(4));
