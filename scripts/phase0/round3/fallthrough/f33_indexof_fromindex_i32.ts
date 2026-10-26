type i32 = number; type f64 = number;
const xs: i32[] = [4, 5, 4, 5];
const p: i32 = xs.indexOf(4, 1);
console.log(p, xs.includes(4, 3));
