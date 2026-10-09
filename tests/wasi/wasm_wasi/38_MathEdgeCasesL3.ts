// wasMath L3 (2026-10-09): the math library's edge cases, and wasMath's "CR, in both".
//   sw57: Math.log / log2 / log10 of a negative number was -Infinity (JavaScript: NaN)
//   sw58: Math.sin(-0) / Math.tan(-0) was +0
//   sw59: Math.pow(1, NaN), pow(-1, ±Infinity), pow(NaN, 0): JavaScript's special cases
//   sw61: Math.sin(1e18) was 5.98e27 (Cody–Waite past its range; now Payne–Hanek)
//   ld28: trig of 1e300, pow / cosh / sinh / expm1 of huge arguments TRAPPED
//   ld33: Math.atan2(0.5, 1e-310) HUNG
//   ld27: Math.clz32 / Math.imul of an f64 built an invalid module (JavaScript: ToInt32)
//   sw60: f64.acosh(2) & co. are correctly rounded in Deno too (V8's Math.acosh(2) is 1 ulp off,
//         so plain Math is NOT compared on those inputs; design-decisions.md "CR, in both")
import { f64, i32 } from "../../../src/wasmath.ts";

const neg: f64 = -2.5;
const nz: f64 = -0;
const one: f64 = 1;
const mone: f64 = -1;
const nan: f64 = NaN;
const inf: f64 = Infinity;
const big: f64 = 1e200;
const b10: f64 = 1e10;
const sub: f64 = 1e-310;
const half: f64 = 0.5;
console.log(Math.log(neg), Math.log2(neg), Math.log10(neg), Math.log(nz));
console.log(Math.sin(nz), Math.tan(nz), Math.cos(nz));
console.log(Math.pow(one, nan), Math.pow(mone, inf), Math.pow(one, inf), Math.pow(nan, 0), Math.pow(one, 2.5));
console.log(Math.pow(big, big), Math.pow(-big, 3), Math.pow(big, -big), Math.pow(-1e-200, 3e200));
console.log(Math.cosh(b10), Math.sinh(-b10), Math.sinh(b10));
console.log(Math.expm1(-b10), Math.expm1(-2147483648), Math.expm1(-40.5));
console.log(Math.atan2(half, sub), Math.atan2(-half, -sub), Math.atan2(half, -sub));

// Huge trig arguments: Payne–Hanek reduction, correctly rounded (checked against a BigInt oracle)
const e18: f64 = 1e18;
const e300: f64 = 1e300;
const ne22: f64 = -1e22;
const hard: f64 = 5.319372648326541e255; // 6381956970095103·2^797: x mod π/2 ≈ 4.7e-19
console.log(Math.sin(e18), Math.cos(e300), Math.tan(ne22), Math.sin(-e300));
console.log(Math.sin(hard), Math.cos(hard));
const s1: f64 = Math.sin(e18);
const c1: f64 = Math.cos(ne22);
console.log(s1, c1);

// ToInt32 for clz32 / imul
const a: f64 = 4294967295;
const b: f64 = 3;
const w: f64 = -2147483649.7;
const k: i32 = 7;
console.log(Math.clz32(a), Math.imul(a, b), Math.clz32(half), Math.clz32(nan), Math.imul(w, k));
const z1: i32 = Math.clz32(a);
const m1: i32 = Math.imul(w, b);
const z2: i32 = Math.clz32(k);
console.log(z1, m1, z2, Math.clz32(4294967295), Math.imul(4294967295, 5), Math.clz32(0.5));

// wasMath: the same correctly rounded value in Deno and in wasm
const two: f64 = 2;
const hundred: f64 = 100;
const ten: f64 = 10;
console.log(f64.acosh(two), f64.acosh(hundred), f64.asinh(1.5), f64.asinh(0.1), f64.asinh(1e300));
console.log(f64.cosh(ten), f64.sinh(two), f64.sin(e18), f64.cos(hard), f64.pow(1.1, 1.1));
