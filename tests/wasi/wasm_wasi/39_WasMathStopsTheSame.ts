// @expect-exit: 1  (wasMath: where wasm TRAPS, the TypeScript THROWS, so both stop at the same line)
// Deno throws RangeError("integer divide by zero"); wasm traps on i32.div_s. The wasi suite
// requires the same exit code from both and the same output before the stop.
import { i32 } from "../../../src/wasmath.ts";

const a: i32 = 7;
const zero: i32 = 0;
console.log("before", i32.div(a, 2));
console.log("never printed", i32.div(a, zero));
console.log("after");
