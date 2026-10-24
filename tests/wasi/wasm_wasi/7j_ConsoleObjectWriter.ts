// ld45 (2026-10-24): a whole struct, class instance or struct array as a console.log argument
// prints as Deno prints it (util.inspect's layout: one line within 80 columns, else one entry
// per line; arrays grouped into columns past 6 entries; depth 4, then [Object]).
// sw134: an array declared from a call, `const pts: Pt[] = many(3)`, forgot its element struct
// (`pts[2].x` refused, the whole array printed pointers). sw135: a top-level object literal
// written over several lines was registered empty and printed zeros.
type i32 = number;
type f64 = number;
type f32 = number;
type i64 = bigint;
enum Color { Red, Green, Blue }
interface P {
  x: i32;
  y: f64;
}
interface Named {
  name: string;
  ok: boolean;
  big: i64;
  neg: f64;
}
interface Outer {
  id: i32;
  inner: P;
  label: string;
}
interface Pix {
  c: Color;
  a: f32;
}
interface Doc {
  title: string;
  body: string;
  words: string[];
}
interface L5 { v: i32; }
interface L4 { a: L5; }
interface L3 { a: L4; }
interface L2 { a: L3; }
interface L1 { a: L2; }
interface L0 { a: L1; }
interface WithArr {
  name: string;
  nums: i32[];
  tags: string[];
}
class Shape {
  kind: string;
  constructor(kind: string) {
    this.kind = kind;
  }
}
class Circle extends Shape {
  r: f64;
  constructor(r: f64) {
    super("circle");
    this.r = r;
  }
}
class Empty {}
class Bag {
  items: i32[] = [];
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
function mk(n: i32): P {
  return { x: n, y: n * 0.5 };
}
function many(n: i32): P[] {
  const out: P[] = [];
  for (let i: i32 = 0; i < n; i++) out.push({ x: i, y: 1 });
  return out;
}
function show(p: P): void {
  console.log("in show", p);
}

const p: P = { x: 1, y: 2.5 };
console.log(p);
const nm: Named = { name: `it's "q"`, ok: true, big: 12n, neg: -0 };
console.log(nm);
const o: Outer = { id: 7, inner: { x: 3, y: 4.25 }, label: "outer label" };
console.log(o);
const long: Named = { name: "a fairly long string value that pushes the line", ok: false, big: 1n, neg: 3.5 };
console.log(long);
const s: Shape = new Circle(2);
console.log(s);
const e: Empty = new Empty();
console.log(e);
const px: Pix = { c: Color.Blue, a: 1.5 };
console.log(px);
const ps: P[] = [{ x: 1, y: 1.5 }, { x: 2, y: 2.5 }];
console.log(ps);
const nine: P[] = [];
for (let i: i32 = 0; i < 9; i++) nine.push({ x: i, y: i * 0.5 });
console.log(nine);
console.log("p is", p, "and", ps.length);
const d: Doc = {
  title: "t  two",
  body: "line one is here\nline two is a fair bit longer than the first\nand a third line to end",
  words: ["it's", "a \"q\"", "tab\there"],
};
console.log(d.title, d.words.length);
console.log(d);
const deep: L0 = { a: { a: { a: { a: { a: { v: 1 } } } } } };
console.log(deep);
const w: WithArr = { name: "w", nums: [1, 2, 3], tags: ["a", "b"] };
console.log(w);
const w2: WithArr = { name: "w", nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27], tags: [] };
console.log(w2);
const b: Bag = new Bag("bag");
for (let i: i32 = 0; i < 120; i++) b.items.push(i);
console.log(b);
console.log(mk(3));
console.log(mk(4), "and", [s, e]);
console.error(mk(6));
const pts: P[] = many(3);
console.log(pts[2].x, pts);
console.log(many(0));
show(mk(9));
