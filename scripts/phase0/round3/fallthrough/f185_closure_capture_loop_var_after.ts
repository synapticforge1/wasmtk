type i32 = number; type f64 = number;
let fns: (() => f64)[] = [];
let k: f64 = 1;
const g = (): f64 => k * 10;
k = 5;
console.log(g());
