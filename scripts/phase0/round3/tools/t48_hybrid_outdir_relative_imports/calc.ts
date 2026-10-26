import { greet } from "./helper.ts";
type i32 = number;

// @wasm
function add(a: i32, b: i32): i32 {
  return a + b;
}

console.log(greet(), add(2, 3));
