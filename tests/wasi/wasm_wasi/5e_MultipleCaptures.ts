//Multiple captures
import { i32, f64 } from "../../../src/wasmath.ts";
function multiCapture(a: i32, b: f64) {
  return (val: i32) => (val + a) * b;
}

console.log(multiCapture(2, 3.5)(4)); // Output: 21