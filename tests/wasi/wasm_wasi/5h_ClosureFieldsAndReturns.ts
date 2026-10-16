// H12 rows fixed 2026-10-15, closures:
//   ld22  a closure held in a returned object's field, `return { g: g }`, called as `rd.g()`
//   ld39  a local declared WITH its function type, `const g: () => i32 = () => r * 2`, inside a
//         function: the type's `=>` was taken for the arrow, which was never lifted
//   sw72  ...and that declaration then emitted nothing: a call through `g` reached table slot 0
//         (now any initialiser it cannot build is a compile error)
//   ld40  an arrow with nothing to capture in a returned object trapped "signature mismatch"
//   ld20  a function returning a BLOCK-bodied arrow, `return () => { c++; return c; };`
//   ld01  a function-typed variable from a ternary of functions, `useTri ? tri : dbl`, and a
//         top-level function-typed variable called inside console.log
import { f64, i32 } from "../../../src/wasmath.ts";

function reader() {
  let r: i32 = 5;
  const g: () => i32 = () => r * 2;
  const h: () => f64 = () => 1.5;
  return { g: g, h: h };
}
const rd: { g: () => i32; h: () => f64 } = reader();
console.log(rd.g(), rd.h());
const v: i32 = rd.g();
console.log(v + 1);

function inline() {
  let r: i32 = 7;
  return { g: (): i32 => r * 2, h: (): f64 => 0.5 };
}
const il: { g: () => i32; h: () => f64 } = inline();
console.log(il.g(), il.h());

function local(): i32 {
  let r: i32 = 5;
  const g: () => i32 = () => r * 2;
  return g() + 1;
}
console.log(local());

function counter(): () => i32 {
  let c: i32 = 0;
  return () => {
    c++;
    return c;
  };
}
function counter1(): () => i32 {
  let c: i32 = 10;
  return () => { c++; return c; };
}
function scaler(k: f64): (x: f64) => f64 {
  return (x: f64): f64 => {
    const out: f64 = x * k;
    if (out > 10) {
      return 10;
    }
    return out;
  };
}
const f: () => i32 = counter();
const g2: () => i32 = counter();
const f1: () => i32 = counter1();
const sc: (x: f64) => f64 = scaler(2.5);
console.log(f(), f(), g2(), f(), f1(), f1());
console.log(sc(2), sc(8));

function dbl(x: i32): i32 {
  return x * 2;
}
function tri(x: i32): i32 {
  return x * 3;
}
const useTri: boolean = true;
const fa: (x: i32) => i32 = dbl;
const op: (x: i32) => i32 = useTri ? tri : dbl;
const w: i32 = op(5);
console.log(w, fa(5), op(5), fa(2) + op(1), "r=" + op(3));
