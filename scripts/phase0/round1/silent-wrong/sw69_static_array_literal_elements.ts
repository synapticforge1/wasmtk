// A STATIC array literal is encoded into the data section with `parseFloat(e) || 0` /
// `parseInt(e, 10) || 0` per element (allocArrayData), so any element that is not a plain decimal
// number becomes 0 or a wrong number: NaN, -0, Math.PI, a hex or binary literal, a variable, an
// expression. Module level and function level alike.
// Deno: "NaN -0 3.141592653589793 1000" / "5 6 16 7" / "10 5"
// wasm: "0 0 0 1000"                   / "0 0 0 7"  / "0 0"
// (Found fixing sw66, 2026-10-13.)
type i32 = number;
type f64 = number;
const k: i32 = 5;
const v: f64[] = [NaN, -0, Math.PI, 1e3];
console.log(v[0], v[1], v[2], v[3]);
const w: i32[] = [k, k + 1, 0x10, 7];
console.log(w[0], w[1], w[2], w[3]);
function f(): void {
  const y: i32[] = [k * 2, 0b101];
  console.log(y[0], y[1]);
}
f();
