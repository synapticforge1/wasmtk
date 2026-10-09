// These TRAP ("float unrepresentable in integer range"), measured one call per program
// (2026-10-09): sin/cos/tan(1e300), pow(1e200, 1e200), expm1(-1e10), cosh/sinh(1e10).
// Correct at the same time: sin/cos at ±2^31, pow(-2.5, 3), expm1(1e10), cosh/sinh(1000).
// The first trap ends the program, so only the first line runs.
type f64 = number;
const huge: f64 = 1e300;
console.log(Math.sin(huge));
