type i32 = number;
const a: i32[] = [5, 2, 8];
const m: i32 = a.reduce((acc: i32, x: i32): i32 => acc > x ? acc : x);
console.log(m);
const p: i32 = a.reduce((acc: i32, x: i32): i32 => acc * x);
console.log(p);
