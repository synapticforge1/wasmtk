// Math.atan2 with a SUBNORMAL second argument loops forever in wasm (Deno: 1.5707963267948966).
// Found by the wasMath L2 battery (f64.atan2 lowers to Math.atan2), 2026-10-09. The verifier
// reports it as RUN-FAIL "HANG" after its time limit.
type f64 = number;
const y: f64 = 0.5;
const x: f64 = 1e-310;
console.log(Math.atan2(y, x));
