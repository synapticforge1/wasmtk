type i32 = number; type f64 = number;
let x: i32 = 5;
const a: i32 = x++;
const b: i32 = ++x;
const c: i32 = x--;
console.log(a, b, c, x);
