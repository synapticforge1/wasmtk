// H12, 2026-10-09 (sw53): a closure that changes a captured f64 (a local or a parameter) keeps
// the change. The heap cell was i32-only, so an f64 was never boxed and each call changed a copy:
// `add(1.25)` twice gave 1.75 1.75, not 1.75 3. The cell is 8 bytes now; a boxed f64 parameter
// keeps its value and its cell goes in a shadow local.
import { i32, f64 } from "../../../src/wasmath.ts";

function acc() {
  let s: f64 = 0.5;
  return { add: (x: f64) => { s += x; return s; } };
}

function fromParam(total: f64) {
  const half: f64 = total / 2;
  console.log("half", half);
  return { add: (x: f64) => { total += x; return total; } };
}

function stepper(v: f64) {
  return { up: () => { v++; return v; } };
}

function setter() {
  let cur: f64 = 1.5;
  return { set: (x: f64) => { cur = x * 2; return cur; } };
}

function two(n: f64) {
  return { inc: () => { n += 0.25; return n; }, get: () => n };
}

function adder(base: i32) {
  return { add: (x: i32) => { base += x; return base; } };
}

const a: { add: (x: f64) => f64 } = acc();
console.log(a.add(1.25), a.add(1.25));
const p: { add: (x: f64) => f64 } = fromParam(3);
console.log(p.add(0.5), p.add(0.5));
const st: { up: () => f64 } = stepper(0.5);
console.log(st.up(), st.up());
const se: { set: (x: f64) => f64 } = setter();
console.log(se.set(1.25), se.set(0.5));
const tw: { inc: () => f64; get: () => f64 } = two(1);
console.log(tw.inc(), tw.inc(), tw.get());
const ad: { add: (x: i32) => i32 } = adder(100);
console.log(ad.add(1), ad.add(2));
