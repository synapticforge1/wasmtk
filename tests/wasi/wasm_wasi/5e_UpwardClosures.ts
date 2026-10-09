// The "Escape" Test
import { i32 } from "../../../src/wasmath.ts";
function createScaler(multiplier: i32) {
  return (val: i32) => val * multiplier; 
}

console.log(createScaler(2)(5)); // Output: 10