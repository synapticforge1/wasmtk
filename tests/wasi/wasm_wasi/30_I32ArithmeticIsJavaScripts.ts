// sw119 (the owner's rule 4 of 2026-10-19; on by default 2026-10-24): `+ - *` of i32s give
// JavaScript's result. Printed, compared or kept in a number, that is the exact value (it wrapped:
// `65536 * 65536` printed 0); ToInt32 (`| 0`, `>>> 0`) wraps it as JavaScript does; only a STORE
// into an i32 slot that does not fit throws (30_I32OverflowThrows). Every line here prints what
// Deno prints.
type i32 = number;
type f64 = number;

const m: i32 = 65536;
const big: i32 = 2147483647;
const small: i32 = -2147483648;

// printed: console.log's own operators, templates and concatenation
console.log(m * m);
console.log("sq", m * m, big + 1, small - 1);
console.log(`t ${m * m} ${big + 1} ${(big + 1) * 2}`);
console.log("c " + (m * m));

// compared: a side that is a `+ - *` chain compares the exact values
if (big + 1 > big) console.log("bigger");
const ok: boolean = m * m > 0;
console.log(ok, big - -1 > 0, small - 1 < small);

// kept in a number
const f: f64 = m * m;
console.log(f);
function mul(a: i32, b: i32): f64 {
  return a * b;
}
console.log(mul(m, m), mul(big, 2));

// ToInt32 wraps JavaScript's value, as `| 0` means (the hash idiom)
function hash(s: string): i32 {
  let h: i32 = 0;
  for (let i: i32 = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}
console.log(hash("hello world, a longer string"));
console.log(((m * m) | 0) + 1, (m * m) >>> 0, (big + 1) | 0);

// in range, an i32 slot keeps its value; a zero product of a negative is -0 as a number
const s: i32 = m * 2 - 5;
let k: i32 = 5;
k += 3;
k *= 2;
k -= 1;
let j: i32 = 2147483646;
j++;
let n: i32 = -2147483647;
n--;
console.log(s, k, j, n);
const z: i32 = 0;
const nz: i32 = -5;
console.log(z * nz);
