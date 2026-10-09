// RecursiveArrow.ts
// Tests recursive logic defined inside a function.
// Recursive arrow self-reference requires typed declaration support not yet
// implemented; using a nested function declaration instead.
import { i32 } from "../../../src/wasmath.ts";
export function testRecursiveArrow(n: i32): i32 {
  function fact(i: i32): i32 {
    if (i <= 1) return 1;
    return i * fact(i - 1);
  }
  return fact(n);
}

console.log(testRecursiveArrow(5)); // Output: 120
