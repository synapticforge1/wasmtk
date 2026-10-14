// sw62 (2026-10-13): a console line longer than the 128-byte gather scratch overwrote the data
// after it, so a LATER line printed fragments. Every case here is longer than 128 bytes and is
// followed by a line whose literal text it used to corrupt.
import { i32 } from "../../../src/wasmath.ts";

// eight long floats (the original find)
console.log(Math.E, Math.LN10, Math.LN2, Math.LOG10E, Math.LOG2E, Math.PI, Math.SQRT1_2, Math.SQRT2);
console.log(1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 0.7071067811865476, 8.8);

// a 200-character string, then a label and numbers
let s: string = "";
for (let i: i32 = 0; i < 20; i++) s = s + "0123456789";
console.log("long:", s);
const label: string = "after";
console.log(label, 42, "end");

// a long joined array, then another line
const arr: i32[] = [];
for (let i: i32 = 0; i < 40; i++) arr.push(i * 1000);
console.log("joined", arr.join(","));
console.log(label, 7, true, "done");

// many short pieces whose total passes 128 bytes, booleans and strings mixed
const t: boolean = true;
console.log(label, t, label, 123456789, label, false, label, 3.14159, label, s.length, label, t, label);
console.log("last line intact");
