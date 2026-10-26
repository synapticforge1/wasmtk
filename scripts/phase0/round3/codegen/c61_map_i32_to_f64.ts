type i32 = number;
type f64 = number;
const xs: i32[] = [1, 2, 3];
const ys: f64[] = xs.map((x: i32): f64 => x * 2.5);
console.log(ys[0], ys[1], ys[2], ys.join(","));
