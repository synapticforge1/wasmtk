// H12 loud rows fixed 2026-10-15:
//   ld07  `const r: string = s + n + 1` was refused: `+` groups from the left, and `s + n` is a
//         string concatenation, which the split did not recognise (a literal-led chain worked)
//   ld08  `x.toString()` of an i64 built an invalid module; of a boolean, it now prints true/false
//   ld13  `const b: string[] = a` at top level emitted `a;` and was refused
import { f64, i32 } from "../../../src/wasmath.ts";

const s: string = "n";
const n: i32 = 4;
const x: f64 = 2.5;
const r1: string = s + n + 1;
const r2: string = "a" + n + x;
const r3: string = n + 1 + s;
const r4: string = s + x + n + "!";
console.log(r1, r2, r3, r4);

const big: bigint = 5000000000n;
const flag: boolean = n > 3;
const t1: string = n.toString();
const t2: string = x.toString();
const t3: string = big.toString();
const t4: string = flag.toString();
console.log(t1, t2, t3, t4, t3.length);
console.log(n.toString(), x.toString(), big.toString(), flag.toString());
console.log(n.toString() + 1, "b=" + big.toString(), t1.indexOf(n.toString()));

function second(xs: string[]): string {
  const ys: string[] = xs;
  return ys[1];
}
const a: string[] = ["x", "y"];
const b: string[] = a;
console.log(second(a), b[1], b.length);
