// An object-literal arrow with a BLOCK body and no return annotation is typed i32 whatever it
// returns: a boolean prints as 1 / 0, an f64 is truncated (1.75 → 1). (An annotated return,
// `(x: f64): f64 => { … }`, is not parsed there at all: loud.)
type f64 = number;
function flagger(on: boolean) {
  return { flip: () => { on = !on; return on; } };
}
function acc() {
  let s: f64 = 0.5;
  return { add: (x: f64) => { s += x; return s; } };
}
const fl: { flip: () => boolean } = flagger(false);
console.log(fl.flip(), fl.flip());
const a: { add: (x: f64) => f64 } = acc();
console.log(a.add(1.25));
