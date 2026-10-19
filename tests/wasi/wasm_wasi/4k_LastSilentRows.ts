// Audit round 2 (2026-10-19), the last ungrouped silent rows:
//   sw97  a parenthesised float operand took the CONTEXT's type: `(z / 2) === (z / 2.5)` compared
//         truncated i32s in a boolean declaration (true);
//   sw99  `a?.b ?? d` with `a` null read through the null pointer: 0, not d;
//   sw100 `.length` of a string-valued call in a sum (`s.toUpperCase().length + t.length`) printed
//         2 for 5 (and was refused in a declaration, ld58);
//   sw101 an Int32Array element plus a Float64Array element truncated the float;
//   sw108 a top-level string-enum-typed variable printed its tag (`1` for `DOWN`);
//   sw121 a struct VARIABLE as an element of a struct-array literal was a zeroed struct.
type i32 = number;
type f64 = number;

const z: f64 = 3.0;
const d: boolean = (z / 2) === (z / 2.5);
console.log(d);
console.log((z / 2) === (z / 2.5));
const e: boolean = (z * 0.5) < (z * 0.6);
console.log(e);
const nan: f64 = 0 / 0;
console.log((nan + 1) < (z + 1), (z + 1) >= (z - 1));

interface In { z: f64 }
interface Out { inner: In | null }
const o2: Out = { inner: null };
const o3: Out = { inner: { z: 4.5 } };
const b: f64 = o2.inner?.z ?? -1;
console.log(b);
console.log(o2.inner?.z ?? -1, o3.inner?.z ?? -1);
interface N { v: i32; next: N | null; }
function nextVal(n: N): i32 {
  return n.next?.v ?? -1;
}
const n2: N = { v: 2, next: null };
const n1: N = { v: 1, next: n2 };
console.log(nextVal(n1), nextVal(n2));

const s: string = "abc";
const t: string = "de";
console.log(s.toUpperCase().length + t.length);
const len2: i32 = t.length + s.toUpperCase().length;
const len1: i32 = s.toUpperCase().length;
console.log(len1, len2);

const fa: Float64Array = new Float64Array(2);
fa[1] = 2.25;
const ia: Int32Array = new Int32Array(2);
ia[1] = -3;
const c: f64 = ia[1] + fa[1];
console.log(c);

enum Dir { Up = "UP", Down = "DOWN" }
const dir: Dir = Dir.Down;
console.log(dir);
function showDir(): void {
  console.log(dir, Dir.Up);
}
showDir();

interface P { n: i32; s: string; t: string }
const p: P = { n: 2, s: "aa", t: "bbb" };
const ps: P[] = [p, { n: 0, s: "c", t: "d" }];
console.log(ps[0].n, ps[0].s, ps[0].t, ps[1].s);
p.n = 9;
console.log(ps[0].n, ps.length);
function f(): void {
  const q: P = { n: 4, s: "qq", t: "r" };
  const qs: P[] = [{ n: 1, s: "x", t: "y" }, q];
  console.log(qs[1].n, qs[1].s, qs[0].s);
}
f();
