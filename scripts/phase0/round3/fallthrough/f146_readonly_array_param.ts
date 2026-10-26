type i32 = number; type f64 = number;
function sum(xs: readonly f64[]): f64 {
  let t: f64 = 0;
  for (const x of xs) t += x;
  return t;
}
const a: f64[] = [1, 2.5];
console.log(sum(a));
