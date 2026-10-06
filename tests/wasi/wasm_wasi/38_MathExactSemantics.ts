// wasm-math-plan.md Phase 1 (2026-10-06): Math functions with JavaScript's exact results.
//   sw38: Math.sign(NaN) was 1 and Math.sign(-0) was +0
//   sw39: Math.hypot overflowed at 1e200 and read only two arguments (now V8's algorithm, n-ary)
//   sw40: Math.round(0.49999999999999994) was 1 and Math.round(-0.4) was +0
//   ld15: a Math result in an i32 / f32 declaration built an invalid module
//   ld04: Math.max in an i32 console context called a helper nothing emitted
// A zero's sign is shown through `1 / x`: console.log(-0) itself is sw41 (the printer).
type i32 = number;
type f64 = number;

const nan: f64 = NaN;
const nz: f64 = -0;
const big: f64 = 1e200;
const tiny: f64 = 5e-324;
const inf: f64 = Infinity;

console.log(Math.sign(nan), Math.sign(-3.5), Math.sign(2), 1 / Math.sign(nz), 1 / Math.sign(0));
console.log(Math.hypot(big, big), Math.hypot(3, 4, 12), Math.hypot(1, 2, 3, 4), Math.hypot(-5));
console.log(Math.hypot(), Math.hypot(tiny, tiny), Math.hypot(inf, nan), Math.hypot(nan, 1));
console.log(Math.hypot(0.1, 0.2), Math.hypot(1e-200, 3e-200), Math.hypot(nz, 0));
console.log(Math.round(0.49999999999999994), Math.round(2.5), Math.round(-2.5), Math.round(-2.6));
console.log(1 / Math.round(-0.4), 1 / Math.round(-0.5), Math.round(4503599627370495.5));
console.log(Math.round(nan), Math.round(inf), Math.round(1.5), Math.round(-1.5));

// Integral results only: `const q: i32 = Math.sqrt(17)` is 4 in wasm and 4.123… in Deno BY DESIGN
// (the declared type decides; design-decisions.md § "Wasm types in TypeScript").
const y: f64 = 3.7;
const fl: i32 = Math.floor(y);
const ce: i32 = Math.ceil(y);
const tr: i32 = Math.trunc(-y);
const ro: i32 = Math.round(y);
const sq: i32 = Math.sqrt(16);
const sg: i32 = Math.sign(-y);
const hy: i32 = Math.hypot(3, 4);
console.log(fl, ce, tr, ro, sq, sg, hy);

function pick(a: i32, b: i32, c: i32): i32 {
  console.log(Math.max(a, b), Math.min(a, b), Math.abs(c));
  return Math.max(a, c);
}
console.log(pick(3, 9, -4));
