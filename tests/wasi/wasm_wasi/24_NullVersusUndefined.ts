// sw123 (2026-10-22): a nullable number's one flag held null and undefined alike, so an undefined
// value printed `null` and `n === null` of an undefined `n` was true. The flag is now a kind (0 a
// value, 1 null, 2 undefined): printing, `===` and `!==` tell them apart, `==`, `??` and truth
// tests treat both as nullish. Covered: literals, reassignment, find() and an out-of-range read
// (undefined), functions declared `T | undefined` and `T | null`.
type i32 = number;
type f64 = number;
const n: i32 | undefined = undefined;
const m: i32 | null = null;
let k: i32 | null | undefined = 5;
console.log(n);
console.log(m);
console.log(n, m, k);
console.log(`${n}|${m}`);
console.log(n === undefined, n === null, n == null, m === null, m === undefined, m == undefined);
k = undefined;
console.log(k, k === undefined, k ?? 9);
k = null;
console.log(k, k === null, k === undefined);
const xs: i32[] = [1, 2];
const found: i32 | undefined = xs.find((x: i32): boolean => x > 5);
console.log(found, found === undefined, found === null);
const a5: i32 | undefined = xs[5];
console.log(a5, a5 === undefined, xs[5] === null);
function pick(f: boolean): i32 | undefined {
  if (f) return 3;
  return undefined;
}
function pickN(f: boolean): f64 | null {
  if (f) return 1.5;
  return null;
}
const p: i32 | undefined = pick(false);
const q: f64 | null = pickN(false);
console.log(p, q, p === undefined, q === null, p === null);
