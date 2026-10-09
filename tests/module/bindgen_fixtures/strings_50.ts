// bindgen_strings_50: string param + string return functions for bindgen test
// deno-lint-ignore-file
import { i32 } from "../../../src/wasmath.ts";

export function greet(name: string): string {
  return "Hello, " + name + "!";
}

export function shout(msg: string): string {
  return msg + msg;
}

export function strLen(s: string): i32 {
  return s.length;
}
