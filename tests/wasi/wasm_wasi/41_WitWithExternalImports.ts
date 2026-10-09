// Phase 41: WIT generation includes Phase 40 external imports alongside exports.
// deno-lint-ignore-file
import { i32, f64 } from "../../../src/wasmath.ts";

declare const host: {
  log(ptr: i32): void;
  getTime(): i32;
};

export function logMessage(ptr: i32): void {
  host.log(ptr);
}

export function currentTime(): i32 {
  return host.getTime();
}

console.log(100);
