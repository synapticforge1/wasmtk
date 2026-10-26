type i32 = number; type f64 = number;
function sum(xs: ReadonlyArray<f64>): f64 {
  let t: f64 = 0;
  for (let i: i32 = 0; i < xs.length; i++) t += xs[i];
  return t;
}
const a: f64[] = [1, 2.5];
console.log(sum(a));
