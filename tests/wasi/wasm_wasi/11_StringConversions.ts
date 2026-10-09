// H12, 2026-10-09: values converted to strings, and two value-typing slips.
//   sw06: `len=${s.length}` + "!" dropped the template part (built "!")
//   sw07: s.includes("b") printed 1         sw08: s.indexOf(String(n)) searched for ""
//   sw09: an array in a template or concat printed its pointer (v=260), not its join
//   sw19: x ?? 5 on an i32 0 gave 5          sw28: Math.max(a, b, c) ignored c
//   sw50: a bigint in a template, concat or String() kept its "n" (b=12n)
//   plus: a module array named bare inside a function compiled to a nonexistent local
import { i32, f64 } from "../../../src/wasmath.ts";

const g: i32[] = [7, 8];

function nz(x: i32): i32 {
  return x ?? 5;
}

function main(): void {
  // sw06
  const s: string = "hello";
  const r: string = `len=${s.length}` + "!";
  console.log(r);

  // sw07
  const t: string = "abc";
  console.log(t.includes("b"), t.startsWith("x"), t.endsWith("c"));
  const has: boolean = t.includes("c");
  console.log(`has=${has}`, "has=" + has);

  // sw08
  const n: i32 = 42;
  const u: string = "xx42";
  console.log(u.indexOf(String(n)), u.indexOf(String(4)));
  const w: f64 = 2.5;
  const ws: string = "a2.5b";
  console.log(ws.indexOf(String(w)), ws.includes(String(true)));

  // sw09
  const nums: number[] = [1, 2, 3];
  const ints: i32[] = [4, 5];
  console.log(`v=${nums}`, "i=" + ints, `${ints}!`);
  const a1: string = `v=${nums}`;
  const a2: string = "i=" + ints;
  const a3: string = `${ints}!`;
  const a4: string = ints + "?";
  const a5: string = `${ints.join("-")}|` + nums.join();
  const a6: string = String(nums);
  console.log(a1, a2, a3, a4, a5, a6);
  console.log(`g=${g}`, "g=" + g, g[1], g.length, g.join("-"));
  const a7: string = `g=${g}`;
  console.log(a7);

  // sw19
  console.log(nz(0), nz(3));

  // sw28
  const p: i32 = 1;
  const q: i32 = 5;
  const k: i32 = 9;
  const m: i32 = Math.max(p, q, k);
  const mn: i32 = Math.min(q, k, p);
  const fm: f64 = Math.max(1.5, 2.5, 0.5, 2.25);
  console.log(m, mn, fm, Math.max(p, q, k, 3), Math.min(2.5, 0.5, 1.5));

  // sw50
  const big: bigint = 12n;
  const b1: string = `b=${big}`;
  const b2: string = "b=" + big;
  const b3: string = String(big);
  console.log(b1, b2, b3, `b=${big}`, "b=" + big);
  console.log(big);
}

main();
