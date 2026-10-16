type i32 = number; type f64 = number;
const m: f64[][] = [[1.5, 2], [3, 4.5]];
const im: i32[][] = [[1, 2], [3, 4]];
const d: boolean = m[1][0] === im[1][0];
console.log(d);
