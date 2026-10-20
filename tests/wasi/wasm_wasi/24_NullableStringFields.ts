// sw120 (2026-10-19): a `string | null` FIELD holds null as the 0 pointer (the convention for
// pointer-valued fields). `{ s: null }` stored the TEXT "null", so `r.s === null` was false and
// `r.s ?? "none"` could not be tested (it was refused). With it, a string field assignment
// (`p.s = "x"`) and a string field built at run time (`{ s: c ? null : "lo" }`) were refused: both
// were emitted as numbers.
type i32 = number;

interface Q {
  s: string | null;
  n: i32;
}
const q: Q = { s: "hi", n: 1 };
const r: Q = { s: null, n: 2 };
console.log(r.s === null, q.s === null, r.s !== null, q.s !== null);
console.log(q.s ?? "none", r.s ?? "none");
console.log(`[${r.s ?? "none"}] [${q.s ?? "x"}]`);
console.log(r.s, q.s);
console.log(`${r.s}|${q.s}`);
r.s = "set";
console.log(r.s, r.s === null);
q.s = null;
console.log(q.s, q.s === null);
const v: string = q.s ?? "dflt";
console.log(v);
let k: i32 = 3;
const w: Q = { s: k > 2 ? null : "lo", n: k };
console.log(w.s === null);
const z: Q = { s: null, n: k };
console.log(z.s === null, z.n);
function name(x: Q): string {
  return x.s ?? "anon";
}
console.log(name(q), name(r));

// a plain string field assigned, at the top level and in a function
interface A {
  s: string;
}
const a: A = { s: "x" };
a.s = "set";
a.s = a.s + "!";
function rename(p: A, t: string): void {
  p.s = t.toUpperCase();
}
rename(a, "bo");
console.log(a.s);
