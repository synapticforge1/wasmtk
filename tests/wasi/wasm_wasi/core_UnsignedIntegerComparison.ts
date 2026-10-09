import { u32 } from "../../../src/wasmath.ts";
export function testGtU32(a: u32, b: u32): boolean {
  return a > b;
}

export function testLtU32(a: u32, b: u32): boolean {
  return a < b;
}

console.log(testGtU32(5, 3)); // true
console.log(testLtU32(5, 3)); // false