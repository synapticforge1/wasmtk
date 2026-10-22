// ld95 (2026-10-22): a LITERAL array of functions, `const ops: Op[] = [add, mul]` (an alias
// array, or `Array<(…) => T>`), was no function array: `const f: Op = ops[i]` was "Unsupported
// function-typed initialiser" and `console.log(ops[0](1, 2))` a console refusal. It is the empty
// function array and one push per element (Phase 44's form); an element is called through a local
// or directly, `ops[1](5, 6)`, in a declaration and in console.log.
type i32 = number;
type f64 = number;
type Op = (a: f64, b: f64) => f64;
function add(a: f64, b: f64): f64 {
  return a + b;
}
function mul(a: f64, b: f64): f64 {
  return a * b;
}
const ops: Op[] = [add, mul];
function applyAll(x: f64, y: f64): f64 {
  let s: f64 = 0;
  for (let i: i32 = 0; i < ops.length; i++) {
    const f: Op = ops[i];
    s += f(x, y);
  }
  return s;
}
console.log(applyAll(3, 4), ops.length);
const first: f64 = ops[0](1, 2);
console.log(first, ops[1](5, 6));
function neg(n: i32): i32 {
  return -n;
}
function dbl(n: i32): i32 {
  return n * 2;
}
const unary: Array<(n: i32) => i32> = [neg, dbl, neg];
let acc: i32 = 3;
for (let i: i32 = 0; i < unary.length; i++) {
  const u: (n: i32) => i32 = unary[i];
  acc = u(acc);
}
console.log(acc, unary[1](21));
