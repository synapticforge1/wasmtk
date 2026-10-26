type i32 = number; type f64 = number;
function mk(): () => f64 {
  let c: f64 = 0;
  return () => { c += 1; return c; };
}
const a = mk();
const b = mk();
a(); a();
console.log(a(), b());
