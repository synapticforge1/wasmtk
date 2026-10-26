type i32 = number; type f64 = number;
function sum(...ns: f64[]): f64 {
  let t: f64 = 0;
  for (const n of ns) t += n;
  return t;
}
console.log(sum(1, 2.5));
