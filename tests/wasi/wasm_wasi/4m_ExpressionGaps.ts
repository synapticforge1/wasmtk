// Audit round 2 (2026-10-22), loud rows that refused valid expressions:
//   ld66  `1e-7 * 1.5`: the scanner split at the exponent's `-`;
//   ld67  console `n ** 2` of an i32 n (`**` is a float);
//   ld68  console `typeof b0 === "boolean"` (a compile-time boolean);
//   ld69  console `x > 1 || s === "q"` (split at the `===` before the `||`);
//   ld70  `users[0].name.length`, a string field of an element;
//   ld43  `("pre" + s).length`, a parenthesised concatenation;
//   ld38  Number.prototype.toFixed, exact as JavaScript's: `(1.005).toFixed(2)` is "1.00" (1.005 is
//         a little below it), ties take the larger n, |x| >= 1e21 is String(x).
type i32 = number;
type f64 = number;

const e: f64 = 1e-7 * 1.5;
console.log(e, 1e-7 * 1.5, 2.5e+3 - 1, 4E-2 + 1);

const n: i32 = -7;
const b: f64 = n ** 2;
console.log(b, n ** 2, n ** 3);

const b0: boolean = true;
const c: boolean = typeof b0 === "boolean";
console.log(c, typeof b0 === "boolean", typeof n === "string");

const x: f64 = 1.5;
const s: string = "abd";
const o: boolean = x > 1 || s === "q";
console.log(o, x > 1 || s === "q", x < 1 && s === "abd", x > 1 && s === "abd");

interface U {
  name: string;
}
const users: U[] = [{ name: "ann" }, { name: "bo" }];
const ul: i32 = users[0].name.length;
console.log(ul, users[1].name.length);

console.log(("pre" + s).length, (s + s).length);

const xs: f64[] = [1.005, 2.5, 1.45, 0.5, -1.5, -0.0001, 0, 3.14159, 123.456, 1e-10, 99.995, 1e21, -2.345, 10.235];
for (let i: i32 = 0; i < xs.length; i++) {
  const v: f64 = xs[i];
  console.log(v.toFixed(0), v.toFixed(1), v.toFixed(2), v.toFixed(5), v.toFixed(20));
}
const nan: f64 = NaN;
const inf: f64 = -Infinity;
const y: f64 = 3.14159;
const t: string = y.toFixed(2);
console.log(nan.toFixed(2), inf.toFixed(1), t, t.length, `v=${y.toFixed(3)}`, "s:" + y.toFixed());
const k: f64 = 7;
console.log((k / 3).toFixed(4), Math.PI.toFixed(10));
