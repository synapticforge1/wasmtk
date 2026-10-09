// A closure that mutates a captured f64 (a local or a parameter) changes a COPY: the box is a
// 4-byte i32 cell, so an f64 is never boxed. `add(1.25)` twice gives 1.75 1.75, not 1.75 3.
type f64 = number;
function acc() {
  let s: f64 = 0.5;
  return { add: (x: f64) => { s += x; return s; } };
}
const a: { add: (x: f64) => f64 } = acc();
console.log(a.add(1.25), a.add(1.25));
