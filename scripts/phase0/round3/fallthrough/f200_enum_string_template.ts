type i32 = number; type f64 = number;
enum D { Up = "UP" }
const d: D = D.Up;
const s: string = "d=" + d;
console.log(s, `${d}`);
