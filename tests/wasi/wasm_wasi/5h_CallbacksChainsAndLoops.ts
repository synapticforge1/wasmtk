// Audit round 2 (2026-10-22), loud rows that refused valid callback and loop forms:
//   ld78  a chain ending in reduce, `xs.filter(…).map(…).reduce(…, 0)` (top level, and on an f64[]
//         parameter); a function array through a local of an alias type (`const f: Fn = fns[i]`);
//   ld91  a block-bodied arrow callback over several lines (`xs.forEach((x) => {` … `});`), at top
//         level and in a function on a parameter (a body line without its `;` too);
//   ld92  an expression-bodied arrow whose body is `console.log(…)`, annotated `: void` or not;
//   ld93  `for (const s of names)` over a string-array literal at top level;
//   ld97  an untyped callback over an f64[] took i32 parameters: "function signature mismatch";
//   ld98  an f64 call through a function variable in console.log: an invalid module;
//   ld99  array methods on a numeric array PARAMETER (`v.reduce(…)`, `v.forEach(…)`) were refused.
type i32 = number;
type f64 = number;
type Fn = () => i32;
type Op = (a: f64, b: f64) => f64;

const xs: f64[] = [1, 2, 3, 4, 5, 6];
const ns: i32[] = [1, 2, 3, 4, 5, 6];
const names: string[] = ["ann", "bo", "cy"];

// ld78: chains ending in reduce / find / every / some / indexOf
const total: f64 = xs.filter((x) => x % 2 === 0).map((x) => x * 10).reduce((a, b) => a + b, 0);
console.log(total);
const r: i32 = ns.filter((x: i32): boolean => x % 2 === 0).map((x: i32): i32 => x * x).reduce((a: i32, b: i32): i32 => a + b, 0);
console.log(r);
const at12: i32 = ns.map((x: i32): i32 => x * 3).indexOf(12);
const has5: boolean = ns.filter((x: i32): boolean => x > 2).some((x: i32): boolean => x === 5);
console.log(at12, has5);

function sumSquaresOfOdd(v: f64[]): f64 {
  return v.filter((x) => x % 2 === 1).map((x) => x * x).reduce((a, b) => a + b, 0);
}
function sumOf(v: f64[]): f64 {
  return v.reduce((a, b) => a + b, 0);
}
console.log(sumSquaresOfOdd(xs), sumOf(xs));

// ld97: an untyped callback over an f64[]
const halves: f64[] = xs.map((x) => x / 2);
const big: f64[] = xs.filter((x) => x > 2.5);
console.log(halves[0], halves.length, big.length);

// ld78: a function array called through a local of an alias type
const fns: Fn[] = [];
fns.push((): i32 => 1);
fns.push((): i32 => 2);
let s: i32 = 0;
for (let i: i32 = 0; i < fns.length; i++) {
  const f: Fn = fns[i];
  s += f();
}
console.log(s);
const ops: Array<Op> = [];
ops.push((a: f64, b: f64): f64 => a * b);
const g: Op = ops[0];
console.log(g(2.5, 4));

// ld91: a multi-line arrow callback (a callback that captures a variable is refused: ld96)
xs.forEach((x) => {
  const twice: f64 = x * 2;
  if (x > 5) {
    console.log("big", x, twice);
  }
});

function report(v: i32[]): void {
  v.forEach((x: i32): void => {
    console.log("report", x)
  });
}
report(ns);

// ld92: an expression-bodied console arrow
ns.forEach((x: i32): void => console.log(x));
xs.forEach((x) => console.log("x is", x));

// ld93: for…of over a string-array literal
for (const name of names) {
  console.log(name, name.length);
}
