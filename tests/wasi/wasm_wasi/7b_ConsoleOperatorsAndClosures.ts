// H12, 2026-10-06:
//   sw20: console `%` used rem_u: -7 % 4 printed 1 (JavaScript: -3)
//   ld02: console `%` of an f64 emitted `f64.rem`, which does not exist (an invalid module)
//   sw25: a ternary between booleans printed 1 / 0, not true / false
//   sw24: a string literal's escapes were decoded twice: "C:\\tmp" printed C:<TAB>mp
//   sw32: a closure that mutates its captured i32 lost the change after every call: a counter
//         returned 1, 1, 1 (the captured value was copied, not boxed, unless two arrows shared it)
import { i32, f64 } from "../../../src/wasmath.ts";

const x: i32 = -7;
const y: f64 = 7.5;
const z: f64 = -7.5;
console.log(x % 4, 7 % -4, x % -4);
console.log(y % 2, z % 2, y % 0.5);

const n: i32 = 5;
const m: i32 = -2;
const flag: boolean = false;
function pos(v: i32): boolean {
  return v > 0;
}
console.log(n > 0 ? true : false, m > 0 ? true : false);
console.log(n > 0 ? m < 0 : flag, flag ? true : !flag);
console.log("v:", n > 3 ? pos(m) : pos(n), n > 0 ? 1 : 0);

const ok: boolean = n > 2;
console.log("C:\\tmp");
console.log("a\\nb", n, "back\\slash\\");
console.log(ok ? "C:\\x" : "D:\\y");
console.log("tab\there", "quote\"q");

function mk() {
  let count: i32 = 0;
  return { inc: () => { count++; return count; } };
}
const k: { inc: () => i32 } = mk();
console.log(k.inc(), k.inc());
console.log(k.inc());
function mk2() {
  let c: i32 = 10;
  return { up: () => { ++c; return c; } };
}
const k2: { up: () => i32 } = mk2();
console.log(k2.up(), k2.up());
