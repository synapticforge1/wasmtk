// wasMath L4 (2026-10-13): the operator bugs, each the same in Deno and in wasm.
//   ld29: `x | 0` (and every bitwise operator) applies ToInt32 to a float: it TRAPPED out of range
//   ld31: bigint `&` `|` `^` `<<` `>>` built an invalid module (i32 ops handed an i64); shifts follow
//         JavaScript (a negative count shifts the other way, a count of 64 or more fills)
//   ld30: bigint `**` was unsupported
//   sw64: `console.log(-a)` of a bigint dropped its `n`
//   u64:  a wasMath u64 of 2^63 or more printed as a negative number
import { f64, i32, i64, u64 } from "../../../src/wasmath.ts";

// ld29
const huge: f64 = 4294967298.7;
const neg: f64 = -2147483649.5;
const nan: f64 = NaN;
const frac: f64 = 3.9;
const k: i32 = 5;
const t: i32 = huge | 0;
const u: i32 = neg | 0;
const v: i32 = nan | 0;
const w: i32 = frac & 7;
const x: i32 = huge >> 1;
const y: i32 = k << 2;
console.log(t, u, v, w, x, y);
console.log(huge | 0, neg ^ 1, frac << 3, k | 2, ~frac);
const z: f64 = huge >>> 0;
console.log(z, neg >>> 0);

// ld31
const a: bigint = 7n;
const m: bigint = -20n;
const s1: bigint = a << 2n;
const s2: bigint = m >> 2n;
const s3: bigint = a & 3n;
const s4: bigint = a | 8n;
const s5: bigint = a ^ 5n;
const s6: bigint = m >> -2n;
const s7: bigint = m >> 100n;
console.log(s1, s2, s3, s4, s5, s6, s7);
console.log(a << 3n, m >> 1n, a & 6n, a | 16n, a ^ 2n, ~a);

// ld30
const p: bigint = a ** 3n;
const q: bigint = m ** 2n;
console.log(p, q, a ** 0n, 3n ** 20n);

// sw64
const b: bigint = -3n;
console.log(-a, a, -b, -(a + b), a * b, -a * 2n);
const c: bigint = -a;
console.log(c, `${-a}`, "v=" + -a);
function negate(n: bigint): bigint {
  console.log(-n, n << 1n, n ** 2n);
  return -n;
}
console.log(negate(a));

// u64 of 2^63 or more
const big: u64 = 18446744073709551615n;
const half: u64 = 9223372036854775808n;
const small: u64 = 42n;
const s: i64 = -1n;
console.log(big, half, small, s);
console.log(u64.div(big, 3n), u64.max(half, small), f64.toU64(1e19), u64.from(s));
console.log(`big=${big}`, "half=" + half);
function top(n: u64): u64 {
  console.log(n);
  return u64.div(n, 1n);
}
console.log(top(big));
const r: u64 = top(half);
console.log(r);
