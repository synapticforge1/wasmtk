// Review B1 / B2 (2026-11-20): unary `-` and `!` on a MODULE-level f64. Both built an invalid module
// (`i32.sub` / `i32.eqz` of an f64) while wasic reported success; a parameter worked.
type f64 = number;
type i32 = number;

function neg(f: f64): i32 {
  return -f | 0;
}
console.log(neg(5.7), neg(-5.7));

let g: f64 = 5.7;
console.log(-g | 0);
console.log(-g);
const h: f64 = 2.75;
const k: i32 = -h | 0;
console.log(k);

const x: f64 = 2.75;
const z: f64 = 0;
const nz: f64 = -0;
console.log(!x, !z, !nz);
const b: boolean = !x;
console.log(b);
console.log(!g);
if (!z) console.log("z is falsy");
if (!x) console.log("never printed");
function not(v: f64): boolean {
  return !v;
}
console.log(not(0), not(3), not(NaN));
