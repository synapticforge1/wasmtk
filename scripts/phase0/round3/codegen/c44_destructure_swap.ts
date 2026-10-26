type i32 = number;
let a: i32 = 1;
let b: i32 = 2;
[a, b] = [b, a];
const xs: i32[] = [5, 6, 7];
[xs[0], xs[2]] = [xs[2], xs[0]];
console.log(a, b, xs[0], xs[2]);
