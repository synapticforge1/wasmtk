// H12 loud rows fixed 2026-10-15, all console.log arguments:
//   sw26  a parenthesised string ternary in a concat, `"x" + (a < b ? "lo" : "hi")`, was refused
//   ld06  `"ok: " + (a > b)` built an invalid module (the parenthesised operand took the numeric path)
//   ld05  `tag() + 7` was added as numbers (a string-returning call was not a concat operand)
//   ld03  `a < b` of two strings read `$a` as a number
//   ld23  `2 < 3 === true` compared two booleans as f64, an invalid module (also in declarations)
import { f64, i32 } from "../../../src/wasmath.ts";

function tag(): string {
  return "id";
}
const a: f64 = 3;
const b: f64 = 7;
const n: i32 = 4;
const x: f64 = 2.5;
const s: string = "n";
const names: string[] = ["ann", "bo"];
console.log("x" + (a < b ? "lo" : "hi"), (a < b ? "lo" : "hi") + "!");
console.log("ok: " + (a > b), "sum " + (a + b) + " prod " + (n * 3));
console.log((a + b), (n * 2), (s), ((a)), (a + 1) * (b - 1));
console.log(tag() + 7, 7 + tag(), s + n + 1, n + 1 + s, "a" + n + 1);
console.log(tag() + n + x, names[1] + n, s.toUpperCase() + n, String(n) + 2, n + x);

const p: string = "apple";
const q: string = "banana";
const r: string = "apple";
console.log(p < q, p > q, p <= r, p >= q, q >= p);
console.log("app" < p, p < "app", "lt: " + (p < q), n < 4);
if (p < q) console.log("ordered");

const ok: boolean = n > 2;
console.log(2 < 3 === true, n < 2 === false, x > 2 !== ok, ok === true, ok == !ok);
console.log(true === (n > 1), "b: " + (2 < 3 === true));
const e1: boolean = 2 < 3 === true;
const e2: boolean = x < 1 === ok;
console.log(e1, e2);
if (n > 1 === ok) console.log("same");
// `a || b` of two numbers is a number (sw49), so its equality stays numeric
const h: f64 = 0;
const e3: boolean = (h || 2.5) === 2.5;
console.log(e3);
