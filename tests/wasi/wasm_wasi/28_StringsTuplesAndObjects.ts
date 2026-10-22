// Audit round 2 (2026-10-22), loud rows that refused valid string, tuple and object forms:
//   ld76  a tuple holding a string (`[string, f64]`, its element in a template too); destructuring
//         from a CALL, a tuple (`const [lo, hi]: [i32, i32] = mm(8, 2)`) and an object
//         (`const { x, y }: V = mk(4)`, renamed bindings too), at top level and in a function;
//   ld77  a nested string conditional (`n >= 90 ? "A" : n >= 80 ? "B" : …`, split at the FIRST `?`);
//         a string literal on the left of a comparison (`"abc" > "ab"`); an object literal with a
//         function field (`const add: Op = { run: (a, b) => a + b }`, captures included);
//   ld80  `splice` as a value (the removed elements), array and string `lastIndexOf`,
//         `(e as Error).message`, `substring` (clamped, swapped when start > end).
type i32 = number;
type f64 = number;

interface V {
  x: i32;
  y: f64;
}
interface Op {
  name: string;
  run: (a: i32, b: i32) => i32;
}
function mk(a: i32): V {
  return { x: a, y: a * 1.5 };
}
function mm(a: i32, b: i32): [i32, i32] {
  if (a < b) return [a, b];
  return [b, a];
}
function grade(n: i32): string {
  return n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : "F";
}
function inner(m: i32): i32 {
  const local: Op = { name: "m", run: (a: i32, b: i32): i32 => a - b + m };
  return local.run(10, 4);
}
function local(): void {
  const { x: px, y: py }: V = mk(-2);
  const [lo, hi]: [i32, i32] = mm(9, 4);
  const ys: i32[] = [1, 2, 3, 4, 5, 6];
  const r1: i32[] = ys.splice(-2);
  const r2: i32[] = ys.splice(1, 1, 70, 80);
  console.log(px, py, lo, hi, r1.join(","), r2.join(","), ys.join(","));
}

const mix: [string, f64] = ["pi", 3.25];
const nm: string = mix[0];
console.log(nm, mix[1], nm.length, `${mix[0]}!`);
const [lo0, hi0]: [i32, i32] = mm(8, 2);
const { x, y }: V = mk(4);
const { x: px0, y: py0 }: V = mk(-2);
console.log(lo0, hi0, x, y, px0, py0);

console.log(grade(95), grade(85), grade(72), grade(10));
const t: string = 5 > 3 ? "x" : 2 > 1 ? "y" : "z";
const s: string = "Hello, World, Hello";
console.log(t, "abc" > "ab", "a" < "b", "b" <= "a", s < "a");
const k: i32 = 10;
const add: Op = { name: "add", run: (a: i32, b: i32): i32 => a + b };
const kop: Op = { name: "k", run: (a: i32, b: i32): i32 => a * b + k };
console.log(add.run(3, 4), add.name, kop.run(2, 3), inner(100), inner(1));

const xs: i32[] = [5, 1, 4, 1, 3, 1];
const r0: i32[] = xs.splice(-3, 10);
console.log(r0.join(","), xs.join(","), r0.length);
const ws: string[] = ["a", "b", "c", "d"];
const wr: string[] = ws.splice(1, 2, "z");
console.log(wr.join(","), ws.join(","));
const qs: i32[] = [7, 1, 7, 2, 7];
console.log(qs.lastIndexOf(7), qs.lastIndexOf(7, 3), qs.lastIndexOf(7, -2), qs.lastIndexOf(9));
console.log(s.lastIndexOf("Hello"), s.lastIndexOf("o"), s.lastIndexOf("o", 5), s.lastIndexOf("zz"), s.lastIndexOf(""));
console.log(s.substring(7, 3), s.substring(-2, 4), s.substring(4), s.substring(5, 99), s.substring(3, 3));
try {
  throw new Error("boom");
} catch (e) {
  const m: string = (e as Error).message;
  console.log(m, m.length);
}
local();
