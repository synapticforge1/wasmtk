// H12, 2026-10-09 (sw48): a closure that mutates a captured PARAMETER keeps the change, as a
// captured local does since sw32: `adder(100)` then `.add(1)`, `.add(2)` gives 101 103 (was
// 101 102). The parameter is moved into a heap cell on entry; the factory's own reads of it, before
// the closure is made, still see the value.
import { i32 } from "../../../src/wasmath.ts";

function adder(base: i32) {
  return { add: (x: i32) => { base += x; return base; } };
}

function counter(start: i32) {
  const twice: i32 = start * 2;
  console.log("twice", twice);
  return { next: () => { start++; return start; } };
}

const ad: { add: (x: i32) => i32 } = adder(100);
console.log(ad.add(1), ad.add(2));
const ad2: { add: (x: i32) => i32 } = adder(5);
console.log(ad2.add(10), ad.add(3));

const c: { next: () => i32 } = counter(7);
console.log(c.next(), c.next(), c.next());
