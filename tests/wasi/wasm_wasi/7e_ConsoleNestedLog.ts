// sw68 (2026-10-13): a console.log whose ARGUMENT calls a function that itself prints. The nested
// line wrote the same cursor, buffer and iov area the outer line was being built in, so the outer
// line lost what it had: `console.log("outer:", scale(4), "end")` printed `inner 40.25 end`.
// Every argument is now evaluated, in order, before the line is built, as JavaScript does; a
// module variable read before a call that changes it keeps its earlier value (`2 12 12`).
import { f64, i32 } from "../../../src/wasmath.ts";

let calls: i32 = 0;
function scale(x: i32): f64 {
  console.log("inner", x);
  calls = calls + 1;
  return 0.25;
}
function name(n: i32): string {
  console.log("naming", n);
  return n > 1 ? "many" : "one";
}
function count(): i32 {
  console.log("counting");
  calls = calls + 10;
  return calls;
}
function list(): i32[] {
  console.log("listing");
  const r: i32[] = [1, 2];
  return r;
}

console.log("outer:", scale(4), "end");
console.log("a", name(2), "b", scale(1), calls);
console.log(calls, count(), calls);
console.log("x", list(), "y");
console.log(`t=${scale(2)} n=${name(1)}`);
function inFn(): void {
  console.log("fn:", count(), name(3));
}
inFn();
// a line longer than the fixed scratch, with the call in the middle
const big: string = "0123456789012345678901234567890123456789";
console.log(big, big, big, scale(9), big);
console.log("after");
