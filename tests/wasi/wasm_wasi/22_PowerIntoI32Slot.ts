// Review B3 (2026-11-20): `a ** 2` with an i32 operand in an i32 slot (a return, a declaration)
// built an invalid module while wasic reported success. It is JavaScript's result through the
// checked store, as `+ - *` (sw119).
type i32 = number;
type f64 = number;

function sq(a: i32): i32 {
  return a ** 2;
}
console.log(sq(7), sq(-3));
function cube(a: i32): f64 {
  return a ** 3;
}
console.log(cube(4));
const k: i32 = 5;
const p: i32 = k ** 3;
console.log(p, k ** 2);
function show(a: i32): void {
  console.log(a ** 2, a ** 0.5);
}
show(9);
// Review RB2 (2026-11-20): `x **= n` on an i32 stored the f64 power: an invalid module reported as
// success. Each type keeps its own: i32 through the checked store, f64 as it is.
function sqIn(a: i32): i32 {
  let x: i32 = a;
  x **= 2;
  return x;
}
console.log(sqIn(5), sqIn(-6));
let fl: f64 = 3;
fl **= 0.5;
console.log(fl);
