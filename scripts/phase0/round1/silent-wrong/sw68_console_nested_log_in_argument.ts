// A console.log whose ARGUMENT calls a function that itself prints: the nested line rewrites the
// shared gather cursor (iovBase+4) and buffer, so the outer line loses what it had built.
// Deno: "inner 4" / "outer: 0.25 end". wasm: "inner 4" / "inner 40.25 end".
// (Found fixing sw62, 2026-10-13; the same before it, through the fixed scratch.)
type i32 = number;
type f64 = number;
function scale(x: i32): f64 {
  console.log("inner", x);
  return 0.25;
}
console.log("outer:", scale(4), "end");
