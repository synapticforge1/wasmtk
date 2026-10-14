// sw70 (2026-10-13): a function's local array with the same name as a module-level array was
// initialized with `global.set` (isModuleGlobalArr saw only the name), so the MODULE array was
// replaced by the local's and the local itself read address 0. Before the fix this printed
// "0 0 0 0" for the module array and "[]" at the end.
import { i32 } from "../../../src/wasmath.ts";

const a: i32[] = [1, 2, 3];
const items: i32[] = [];

// a local `a`, empty then pushed
function make(): i32[] {
  const a: i32[] = [];
  a.push(10);
  a.push(20);
  return a;
}
// the module arrays, read and pushed from a function
function readModule(): i32 {
  items.push(a[0] + a[2]);
  return a[1];
}
// a parameter named like a module array
function param(a: i32[]): i32 {
  a.push(5);
  return a.length;
}
// a local `items` from a literal, then pushed
function literal(): i32 {
  const items: i32[] = [7, 8];
  items.push(9);
  return items[2] + items.length;
}

const m: i32[] = make();
console.log(a[0], a[1], a[2], a.length);
console.log(m[0], m[1], m.length);
console.log(readModule(), items[0], items.length);
console.log(param(m), m.length, a.length);
console.log(literal(), items.length);
console.log(a);
