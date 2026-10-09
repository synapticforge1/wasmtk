// sw46 (2026-10-06): a function named `main` made `_start` a bare `call $main`, so EVERY other
// top-level statement was dropped (and a top-level `main()` call was stripped by the parser):
// `console.log("before"); main(); console.log("after")` printed only main's own output, and a
// top-level array declared beside main was never initialised. The top level now runs as written.
// main prints nothing AFTER its await: async bodies run eagerly through an await (a documented v1
// limit, async-design.md §2.A), so that output would interleave differently from V8.
import { i32 } from "../../../src/wasmath.ts";

const total: i32[] = [1, 2, 3];
console.log("before main", total.length);

async function step(n: i32): Promise<i32> {
  return n * 10;
}

async function main(): Promise<void> {
  // sw47 (found with sw46): a top-level array read in a function's console.log printed 0.
  console.log("main ran", total[1], total.length);
  const v: i32 = await step(4);
  if (v !== 40) console.log("unexpected", v);
}

function helper(): i32 {
  return total[0] + total[1];
}

main();
console.log("after main", total[2], helper());
