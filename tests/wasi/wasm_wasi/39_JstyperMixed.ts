// Phase 39 — jstyper mixed-type output
// Represents typed .ts with i32, f64, string, and bool function params/returns
import { i32, f64 } from "../../../src/wasmath.ts";
type bool = boolean;

function clamp(v: f64, lo: f64, hi: f64): f64 {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function countDigits(n: i32): i32 {
  if (n === 0) return 1;
  let count: i32 = 0;
  let x: i32 = n < 0 ? -n : n;
  while (x > 0) {
    count = count + 1;
    x = i32.div(x, 10);
  }
  return count;
}

function inRange(v: f64, lo: f64, hi: f64): bool {
  return v >= lo && v <= hi;
}

console.log(clamp(5.0, 0.0, 3.0));      // 3
console.log(clamp(-1.0, 0.0, 10.0));    // 0
console.log(clamp(7.0, 0.0, 10.0));     // 7
console.log(countDigits(0));            // 1
console.log(countDigits(12345));        // 5
console.log(countDigits(9));            // 1
console.log(inRange(5.0, 0.0, 10.0));  // true
console.log(inRange(15.0, 0.0, 10.0)); // false
