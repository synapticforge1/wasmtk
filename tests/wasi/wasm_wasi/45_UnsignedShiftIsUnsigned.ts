// Review B5 (2026-11-20): `x >>> 0` is JavaScript's UNSIGNED 32-bit number. Printed, and used in
// arithmetic, it was the signed i32 it is held in (`(-1) >>> 0` printed -1).
type i32 = number;
type f64 = number;

const x: i32 = -1;
console.log(x >>> 0);
console.log(-1 >>> 0);
const a: i32 = 7;
console.log(-a >>> 0, x >>> 1, 8 >>> 1);
console.log(`v=${x >>> 0}`);
function h(s: i32): i32 {
  return s >>> 3;
}
console.log(h(64));
const s: f64 = (x >>> 0) + 1;
console.log(s);
console.log((x >>> 0) + 1);
function twice(n: i32): f64 {
  return (n >>> 0) * 2;
}
console.log(twice(-2));
// Review RB3 (2026-11-20): compared or taken `%`, the `>>>` value was still the signed i32:
// `(n >>> 0) > 5` of n = -1 was false, `(x >>> 0) % 10` was -1.
function big(n: i32): boolean {
  return (n >>> 0) > 5;
}
console.log(big(-1), big(3));
function rem(n: i32): i32 {
  return (n >>> 0) % 10;
}
console.log(rem(-1), rem(-7));
if ((x >>> 0) > 5) console.log("gt");
else console.log("le");
console.log((x >>> 0) % 10, ((x >>> 0) % 7) > 2, (x >>> 0) === (x >>> 0), 10 % (x >>> 28));
// Re-review 2 of RB3: `%=` by a `>>>` value, and a `%` of two unsigned values (up to 2³² − 1),
// printed and compared, were the signed i32 (`7 %= (-1 >>> 0)` gave 0; JavaScript's is 7).
let j: i32 = 7;
j %= x >>> 0;
console.log(j);
const m7: i32 = -7;
console.log((m7 >>> 0) % (x >>> 0), ((m7 >>> 0) % (x >>> 0)) > 5, ((m7 >>> 0) % 7) % 4);
