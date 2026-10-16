type i32 = number; type f64 = number;
function maxOf<T>(a: T, b: T, gt: (x: T, y: T) => boolean): T {
  return gt(a, b) ? a : b;
}
const a: i32 = maxOf<i32>(3, 9, (x: i32, y: i32): boolean => x > y);
const b: f64 = maxOf<f64>(2.5, -1.5, (x: f64, y: f64): boolean => x > y);
console.log(a, b);
