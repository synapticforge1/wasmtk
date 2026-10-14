// sw66 (2026-10-13): console.log of an array VARIABLE printed its address; only a call's returned
// array was printed. sw67: every array printed on one line; Deno and Node use util.inspect's
// layout (one line within 80 columns, else aligned columns past 6 items, else one per line, at
// most 100 items then "... N more items"). Typed arrays read their own element width.
import { f64, i32 } from "../../../src/wasmath.ts";

const top: i32[] = [1, 2, 3];
const empty: i32[] = [];

function make(n: i32, step: i32): i32[] {
  const out: i32[] = [];
  for (let i: i32 = 0; i < n; i++) out.push(i * step + 1);
  return out;
}
function makeF(n: i32): f64[] {
  const out: f64[] = [];
  for (let i: i32 = 0; i < n; i++) out.push(i * 0.37 - 3.0);
  return out;
}
function show(p: i32[]): void {
  console.log("param:", p);
}

// variables: module, local, parameter, empty, beside other arguments
console.log(top);
console.log("top =", top, "end");
console.log(empty);
console.log("empty", empty);
show(top);
function local(): void {
  const l: i32[] = [4, 5, 6];
  l.push(7);
  console.log(l);
}
local();

// layout: grouped columns, a 7-item group, one per line, the 100-item cut
console.log(make(40, 1000));
console.log(make(7, 1));
console.log(make(26, 3));
console.log(make(101, 1));
console.log(make(150, 7));
const big: i32[] = make(30, -77777);
console.log("big:", big);
console.log(makeF(12));
const fz: f64[] = [];
fz.push(0.5);
fz.push(-1.0 * 0.0);
fz.push(1e21);
fz.push(1.5e-7);
console.log(fz);

// typed arrays: each element width, and the "Name(n) " prefix counted in the layout
const i8: Int8Array = new Int8Array(4);
i8[0] = -5;
i8[1] = 100;
i8[2] = -128;
i8[3] = 7;
console.log(i8);
const u16: Uint16Array = new Uint16Array(3);
u16[0] = 65535;
u16[1] = 1;
u16[2] = 300;
console.log(u16);
const f32: Float32Array = new Float32Array(3);
f32[0] = 0.1;
f32[1] = -2.5;
f32[2] = 3;
console.log(f32);
const i32a: Int32Array = new Int32Array(30);
for (let i: i32 = 0; i < 30; i++) i32a[i] = i * i * 31;
console.log(i32a);
const u32: Uint32Array = new Uint32Array(2);
u32[0] = 4000000000;
u32[1] = 5;
console.log(u32);
const f64a: Float64Array = new Float64Array(2);
f64a[0] = 1.25;
f64a[1] = -0.5;
console.log(f64a);
console.log("after");
