type i32 = number; type f64 = number;
enum K { A, B, C }
function g(k: K): i32 {
  let r: i32 = 0;
  switch (k) {
    case K.A: r = 1;
    default: r += 10;
    case K.C: r += 100;
  }
  return r;
}
console.log(g(K.A), g(K.B), g(K.C));
