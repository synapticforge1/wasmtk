// H12 sw18 / sw22 / sw23 (2026-09-30): console.log split an expression at the wrong character and
// handed one side an EMPTY operand (a compile error since the fallback stopped printing 0):
//   sw18: n << 2   split at the second `<` of `<<` (a comparison of `n <` and `2`)
//   sw22: a ** 2   split at one `*` of `**`
//   sw23: n * -2   split at the unary minus
// Found with them: -n + m was negated whole (-(n + m)), and an integer-only result (1 << n) or an
// i32 variable was left unconverted where the print expected a float (invalid modules).
import { i32, f64 } from "../../../src/wasmath.ts";

const n: i32 = 3;
const m: i32 = 5;
const a: f64 = 3;
const b: f64 = 1.5;

console.log(n << 2);
console.log(n << 2 < 20);
console.log(1 << n);
console.log("x" + (n << 1));
console.log(a ** 2);
console.log(2 * a ** 2);
console.log(a ** 2 + 1);
console.log(n * -2);
console.log(n - -2);
console.log(-n + m);
console.log(-n * 2.5);
console.log(b * -a);
console.log(1e-3 * 1000);
console.log("v:", n * -2, a ** 2);
console.log(n < m, n > m, m - n);

function scale(x: i32): f64 {
  const k: f64 = 0.5;
  // `-k * x`, not `x * -k`: an i32 left operand types the whole product (sw15, still open)
  console.log(x << 1, -x + 1, -k * x);
  return k ** 2;
}
console.log(scale(4));
