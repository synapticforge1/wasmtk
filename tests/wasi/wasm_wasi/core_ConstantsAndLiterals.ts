export function isHello(a: string): boolean {
  return a == "hello";
}

import { i32 } from "../../../src/wasmath.ts";
export function isFortyTwo(a: i32): boolean {
  return a === 42;
}

console.log(isHello("hello")); // true
console.log(isHello("world")); // false
console.log(isFortyTwo(42)); // true
console.log(isFortyTwo(100)); // false