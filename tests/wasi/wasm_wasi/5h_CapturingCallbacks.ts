// ld96 (2026-10-22): an array-method callback that CAPTURES a variable was an invalid module (its
// closure-factory call went into the table as a name), then refused. A `_cl` helper calls it
// through its environment; a local the arrow mutates lives in a box (it updated a copy), and a
// top-level number is the module global the arrow writes. Covered: forEach, map, filter, reduce,
// some, findIndex, an index parameter. And forEach / some / every / findIndex over a string[]
// (no capture: a closure's trampoline passes one word per parameter, so not a string's two).
type i32 = number;
type f64 = number;
const ns: i32[] = [1, 2, 3, 4];
let sum: i32 = 0;
ns.forEach((x: i32): void => { sum += x; });
console.log(sum);
function report(v: i32[]): i32 {
  let n: i32 = 0;
  v.forEach((x: i32): void => {
    n += x * 10;
  });
  return n;
}
console.log(report(ns));
function scaled(v: f64[], k: f64): f64[] {
  return v.map((x: f64): f64 => x * k);
}
const src: f64[] = [1, 2, 3];
const sc: f64[] = scaled(src, 2.5);
console.log(sc[0], sc[2], sc.length);
function above(v: i32[], lim: i32): i32 {
  const big: i32[] = v.filter((x: i32): boolean => x > lim);
  return big.length;
}
console.log(above(ns, 2));
function total(v: i32[], bias: i32): i32 {
  return v.reduce((a: i32, b: i32): i32 => a + b + bias, 0);
}
console.log(total(ns, 1));
function anyOver(v: i32[], lim: i32): boolean {
  return v.some((x: i32): boolean => x > lim);
}
console.log(anyOver(ns, 3), anyOver(ns, 9));
function firstOver(v: i32[], lim: i32): i32 {
  return v.findIndex((x: i32): boolean => x > lim);
}
console.log(firstOver(ns, 2));
function withIndex(v: i32[], k: i32): i32 {
  let acc: i32 = 0;
  v.forEach((x: i32, i: i32): void => {
    acc += x * i * k;
  });
  return acc;
}
console.log(withIndex(ns, 2));

const names: string[] = ["ann", "bo", "cyrus"];
names.forEach((s: string) => console.log(s + "!"));
names.forEach((s) => console.log(s.toUpperCase(), s.length));
console.log(names.some((s: string): boolean => s.length > 4), names.every((s: string): boolean => s.length > 1));
console.log(names.findIndex((s: string): boolean => s === "bo"));
function shout(v: string[]): void {
  v.forEach((s) => {
    console.log(s + "?");
  });
}
shout(names);
