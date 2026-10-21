// Audit round 2 (2026-10-20), loud rows that built INVALID modules (an operand of one type where
// another was expected, rejected only when the module was instantiated):
//   ld54  a struct field / 2-D element in mixed i32 / f64 arithmetic, comparison and Math.max;
//   ld55  console `-ia[0]` (f64.neg of an i32) and a row's `.length` in a sum;
//   ld56  console `ia[1] + fa[1]` (an i32 add of an f64 element);
//   ld57  a getter returning f64 compared inside a method (`this.area > 10`);
//   ld59  console bigint: a bigint-returning call with literals, `-arr[0]` of a bigint[];
//   ld60  `Number(s)` of a string (its pointer was taken as the number);
//   ld61  console `arr.reduce(…)` of an f64[] (printed through the i32 printer);
//   ld63  console `nm() < s`, a string-returning call compared with a string.
type i32 = number;
type f64 = number;

interface P {
  x: f64;
  n: i32;
}
const p: P = { x: 1.5, n: 3 };
const a1: f64 = p.n * p.x;
const a2: boolean = p.x > p.n;
const a3: f64 = Math.max(p.n, p.x);
console.log(a1, a2, a3, Math.max(p.n, p.x));
const m: f64[][] = [[1.5, 2], [3, 4.5]];
const im: i32[][] = [[1, 2], [3, 4]];
const eq: boolean = m[1][0] === im[1][0];
console.log(eq);

const ia: i32[] = [3, 4];
console.log(-ia[0]);
const rows: i32 = m[0].length + m.length;
console.log(rows, m[0].length + m.length);

const fa: Float64Array = new Float64Array(2);
fa[1] = 2.25;
const ta: Int32Array = new Int32Array(2);
ta[1] = -3;
console.log(ta[1] + fa[1]);

class Box {
  w: f64;
  h: f64;
  constructor(w: f64, h: f64) {
    this.w = w;
    this.h = h;
  }
  get area(): f64 {
    return this.w * this.h;
  }
  isBig(): boolean {
    return this.area > 10;
  }
}
const bx: Box = new Box(2.5, 3);
const big: boolean = bx.isBig();
console.log(big, new Box(1, 2).isBig());

function bg(): bigint {
  return 3n;
}
const bm: bigint = bg() ** 3n % 5n;
console.log(bm, bg() ** 3n % 5n);
const barr: bigint[] = [5n, 7n];
console.log(`${-barr[0]}`);

const ns: string = "3.75";
const nv: f64 = Number(ns);
console.log(nv, Number(ns), Number(" 12 ") + 1, Number(""), Number("12px"), Number("0x1f"));
console.log(Number("-Infinity"), Number("1e3"), Number(".5"), Number("."));

const fr: f64[] = [3, 1.5, 4];
const sum: f64 = fr.reduce((s: f64, v: f64): f64 => s + v, 0);
console.log(sum, fr.reduce((s: f64, v: f64): f64 => s + v, 0));

function nm(): string {
  return "abc";
}
const sv: string = "abd";
const lt: boolean = nm() < sv;
console.log(lt, nm() < sv, sv < nm());
