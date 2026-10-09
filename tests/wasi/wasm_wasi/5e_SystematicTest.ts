// Phase_5e_Upward.ts
import { i32 } from "../../../src/wasmath.ts";
function createMultiplier(x: i32) {
  // Returning the closure - x must persist on the heap
  return (y: i32) => x * y;
}

export function _start(): void {
  const triple: (y: i32) => i32 = createMultiplier(3);
  const result: i32 = triple(10);
  console.log(result); // Expected: 30
}

_start();