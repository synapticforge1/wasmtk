// `xs.indexOf(v) + x` (an f64 x) builds an invalid module, in console.log and in a declaration.
type i32 = number; type f64 = number;
const xs: i32[] = [3, 1, 4];
const x: f64 = 0.5;
const v: f64 = xs.indexOf(4) + x;
console.log(v);
