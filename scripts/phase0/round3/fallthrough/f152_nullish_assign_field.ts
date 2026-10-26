type i32 = number; type f64 = number;
interface S { v: f64 | null }
const s: S = { v: null };
s.v ??= 4;
s.v ??= 9;
console.log(s.v);
