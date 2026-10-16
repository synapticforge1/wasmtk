type i32 = number; type f64 = number;
const xs: i32[] = [10, 20, 30];
const ys: i32[] = xs.map((x: i32, i: i32): i32 => x + i);
const zs: i32[] = xs.filter((x: i32, i: i32): boolean => i !== 1);
const y2: i32 = ys[2];
const zl: i32 = zs.length;
const z1: i32 = zs[1];
console.log(y2, zl, z1);
