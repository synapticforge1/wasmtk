// Math.sin(1e18) gave 5.981619729467063e+27 (an impossible sine); Deno -0.9929693207404051.
// Range reduction loses the argument between 1e15 (right) and 1e300 (traps: ld28).
type f64 = number;
const x: f64 = 1e18;
console.log(Math.sin(x));
