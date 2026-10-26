type i32 = number; type f64 = number;
let a: f64 = 1;
let b: f64 = 2;
[a, b] = [b, a];
console.log(a, b);
