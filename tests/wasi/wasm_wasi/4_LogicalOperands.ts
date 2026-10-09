// H12, 2026-10-09 (sw49): `a && b` / `a || b` give one of the OPERANDS, as in JavaScript.
//   Two numbers give a number: `x || 7` is 7 for x = 0 (it was `true`, or an invalid module).
//   A boolean mixed with a number prints what JavaScript prints: `!a && b` is 0, not `true`.
//   The left side is evaluated once; conditions keep the boolean short-circuit.
import { i32, f64 } from "../../../src/wasmath.ts";

let calls: i32 = 0;
function bump(v: i32): i32 {
  calls++;
  return v;
}

function main(): void {
  const a: i32 = 0;
  const one: i32 = 1;
  const b: i32 = 0;
  const z: i32 = 4;
  const h: f64 = 0.5;
  const nz: f64 = 0;
  const t: boolean = true;
  const f: boolean = false;

  const y: i32 = a || 7;
  const w: i32 = z && 9;
  const q: f64 = h || 2.5;
  console.log(y, w, q);
  console.log(a || 7, z && 9, h && 3, a && 9);

  // a boolean mixed with a number, each order
  console.log(!a && b, !one && b, t || z, f || z, z && t, a && t, z || f, a || f);
  console.log(`x=${!a && b}`);

  // chains and nesting
  console.log(a || b || 3, a || (z && 6), (z && 0) || 8, z && z && 5);

  // the left side runs once
  console.log(bump(0) || bump(5), calls);

  // floats and bigints
  console.log(h || 2.5, nz || 2.5, h && 3, nz && 3, z || h);
  const big: bigint = 0n;
  const big2: bigint = 7n;
  console.log(big || big2, big2 && 9n);

  // inside arithmetic and strings
  const r: i32 = (a || 7) + 1;
  const m: f64 = (nz || 1.5) * 2;
  const s1: string = `v=${a || 7}`;
  const s2: string = "w=" + (z && 9);
  console.log(r, m, s1, s2);

  // conditions are unchanged
  let k: i32 = 0;
  while (k < 3 && (k || 1)) k++;
  if (a || z) console.log("cond ok");
  const flag: boolean = a > 0 || z > 3;
  console.log(k, flag, t && f);
}

main();
