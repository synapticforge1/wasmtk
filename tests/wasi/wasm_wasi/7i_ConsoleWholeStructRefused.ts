// @expect-fail: compile
// sw127 (2026-10-22, found with ld45): a whole struct as a console argument printed its ADDRESS,
// `260` for native TS's `{ x: 1, y: 2.5 }`. Refused at compile time ("printing a whole struct is
// not supported yet; print its fields") until console has an object writer (ld45).
type i32 = number;
type f64 = number;
interface P {
  x: i32;
  y: f64;
}
const p: P = { x: 1, y: 2.5 };
console.log(p);
