// @expect-fail: run-wasm
// sw119 (the owner's rule 4 of 2026-10-19; on by default 2026-10-24): storing JavaScript's result
// of `+ - *` into a slot declared i32 throws a RangeError when it does not fit ("the result of '*'
// does not fit an i32 (wasMath's i32.mul wraps it)"); so do `x += …` and `++` / `--` past the
// limit. JavaScript has no i32, so Deno prints 4294967296 here: the wasm run is EXPECTED to fail.
// Before sw119 the store wrapped silently to 0. Deliberate wrapping is wasMath's i32.add / i32.mul.
type i32 = number;

const m: i32 = 65536;
let caught: i32 = 0;
try {
  const sq: i32 = m * m;
  console.log(sq);
} catch (e) {
  if (e instanceof RangeError) caught++;
}
let j: i32 = 2147483647;
try {
  j++;
} catch (e) {
  if (e instanceof RangeError) caught++;
}
let k: i32 = 2147483647;
try {
  k += 1;
} catch (e) {
  if (e instanceof RangeError) caught++;
}
console.log("caught", caught);
// uncaught: the run ends with the RangeError
const again: i32 = m * m;
console.log(again);
