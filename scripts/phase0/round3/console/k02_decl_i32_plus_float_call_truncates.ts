// A declaration `i32 + <float call>` (or `+ (x)`, `+ Math.sqrt(2)`) is computed as i32.
// console.log of the same expression is right (7.5).
type i32 = number; type f64 = number;
function hf(v: f64): f64 { return v / 2; }
const a: i32 = 7;
const v: f64 = a + hf(1);
console.log(v);
