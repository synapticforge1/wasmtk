type i32 = number; type f64 = number;
let a: i32 = 0;
let b: i32 = (a = 3, a + 4);
console.log(a, b);
