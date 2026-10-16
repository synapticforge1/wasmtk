type i32 = number; type f64 = number;
const xs: i32[] = [1, 2, 3, 4, 5, 6];
const r: i32 = xs.filter((x: i32): boolean => x % 2 === 0).map((x: i32): i32 => x * x).reduce((a: i32, b: i32): i32 => a + b, 0);
console.log(r);
