// ld10 / ld14 (2026-10-15): at TOP level, an array with an inline element type,
// `Array<{ a: i32; b: f64 }>`, was taken for a function-pointer array, so `recs.push({ … })` was
// refused; and `const t = recs[i]` (or a union element, `const n: TreeItem = xs[i]`) was not a
// struct. Also: two inline element types of the same variable name shared one struct (now one per
// shape), and `t.a + t.b` (an i32 field plus an f64 one) added as i32.
import { f64, i32 } from "../../../src/wasmath.ts";

function f(): i32 {
  const recs: Array<{ a: i32; b: i32 }> = [];
  recs.push({ a: 3, b: 4 });
  return recs[0].a + recs[0].b;
}
const recs: Array<{ a: i32; b: f64 }> = [];
recs.push({ a: 1, b: 2.5 });
recs.push({ a: 10, b: 0.25 });
const t: { a: i32; b: f64 } = recs[1];
console.log(f(), recs.length, recs[0].a, recs[0].b, t.a + t.b);
function total(): f64 {
  let s: f64 = 0;
  for (let i: i32 = 0; i < recs.length; i++) s = s + recs[i].b;
  return s;
}
console.log(total());

interface Leaf {
  type: "leaf";
  weight: i32;
}
interface Inner {
  type: "inner";
  count: i32;
}
type TreeItem = Leaf | Inner;
const xs: TreeItem[] = [];
xs.push({ type: "leaf", weight: 3 });
xs.push({ type: "inner", count: 5 });
let s: i32 = 0;
for (let i: i32 = 0; i < xs.length; i++) {
  const n: TreeItem = xs[i];
  if (n.type === "leaf") {
    s = s + n.weight;
  } else {
    s = s + n.count;
  }
}
console.log(s);
