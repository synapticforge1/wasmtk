// Audit round 2 (2026-10-19): relative indices and the edge arguments of the array / string
// helpers, as JavaScript. A negative index counts from the end, then clamps to [0, len]:
//   sw80 array slice, sw81 string slice, sw82 array fill, sw83 typed-array fill (they clamped a
//   negative index to 0); sw84 splice dropped its inserted items and removed ONE element without a
//   count; sw85 splice(-2, 1) removed the last element; ld47 an over-long count trapped;
//   sw91 replaceAll("", x) lost the original characters; sw92 an empty pad padded with memory bytes.
type i32 = number;
type f64 = number;

// slice
const a: i32[] = [1, 2, 3, 4, 5];
const a1: i32[] = a.slice(-2);
console.log(a1.length, a1.join(","));
const a2: i32[] = a.slice(-3, -1);
console.log(a2.join(","));
const a3: i32[] = a.slice(-100);
console.log(a3.length);
const xs: f64[] = [1.5, 2.5, 3.5, 4.5];
const xs1: f64[] = xs.slice(1, -1);
const xl: i32 = xs1.length;
const x0: f64 = xs1[0];
console.log(xl, x0);
const ss: string[] = ["p", "q", "r"];
const ss1: string[] = ss.slice(-2);
console.log(ss1.length, ss1[0], ss1[1]);
const w: string = "hello world";
const w1: string = w.slice(-5);
const w2: string = w.slice(2, -3);
console.log(w1);
console.log(w2);
const w3: string = w.slice(-4, -2);
console.log(w3);
const w4: string = w.slice(4, 2);
console.log("[" + w4 + "]");
console.log(w.slice(-2));

// fill
const f: i32[] = [1, 2, 3, 4, 5];
f.fill(0, -2);
console.log(f.join(","));
f.fill(9, 1, -1);
console.log(f.join(","));
const t: Int32Array = new Int32Array(5);
t.fill(7, -2);
console.log(t[0], t[3], t[4]);
const t2: Int32Array = new Int32Array(4);
t2.fill(3, -3, -1);
console.log(t2[0], t2[1], t2[2], t2[3]);

// splice
const s1: i32[] = [1, 2, 3, 4, 5];
s1.splice(2);
console.log(s1.length, s1.join(","));
const s2: i32[] = [1, 2, 3];
s2.splice(1, 0, 9);
console.log(s2.join(","));
const s3: i32[] = [1, 2, 3, 4, 5];
s3.splice(-2, 1);
console.log(s3.join(","));
const s4: i32[] = [1, 2, 3, 4, 5];
s4.splice(3, 10);
console.log(s4.length, s4.join(","));
const s5: i32[] = [1, 2, 3];
s5.splice(1, 1, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
console.log(s5.join(","));
const s6: f64[] = [1.5, 2.5, 3.5];
s6.splice(-1, 0, 9.25);
console.log(s6.join(","));
const s7: string[] = ["a", "b", "c"];
s7.splice(1, 1, "x", "y");
console.log(s7.length, s7[0], s7[1], s7[2], s7[3]);
const s8: i32[] = [1, 2, 3, 4];
s8.splice();
console.log(s8.join(","));
s8.splice(-10, 2);
console.log(s8.join(","));
s8.splice(1, -3, 5);
console.log(s8.join(","));
function inFn(): void {
  const b: i32[] = [10, 20, 30, 40];
  b.splice(-3, 2, 99);
  console.log(b.join(","));
}
inFn();
interface P {
  x: i32;
  y: i32;
}
const ps: P[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
let k: i32 = 5;
ps.splice(1, 0, { x: k, y: 6 });
console.log(ps.length, ps[0].x, ps[1].x, ps[1].y, ps[2].x);
const g: i32[] = [1, 2, 3, 4, 5];
function cut(): void {
  g.splice(-2, 1, 42, 43);
}
cut();
console.log(g.join(","));

// replaceAll with an empty pattern; an empty pad
const r1: string = "abc".replaceAll("", "-");
console.log(r1);
const r2: string = "xy".replaceAll("", "_");
console.log(r2);
const p1: string = "5".padStart(4, "");
console.log("[" + p1 + "]");
const p2: string = "7".padEnd(3, "");
console.log("[" + p2 + "]");
const p3: string = "7".padStart(3);
console.log("[" + p3 + "]");
