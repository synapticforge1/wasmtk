type i32 = number; type f64 = number;
let a: f64 = 0;
let b: f64 = 4;
a ||= 3;
b &&= 8;
console.log(a, b);
