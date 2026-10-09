// Core_Globals.ts
import { i32, f64 } from "../../../src/wasmath.ts";
const PI: f64 = 3.14159;
let counter: i32 = 0;

export function _start(): void {
  counter = counter + 1;
  console.log(PI);
  console.log(counter);
}

_start();