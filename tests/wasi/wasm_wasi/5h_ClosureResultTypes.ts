// H12, 2026-10-09 (sw52): an arrow in a returned object literal with no return annotation was
// typed i32 whatever it returned, so a boolean printed 1 / 0 and an f64 was truncated. Its result
// is now typed from what it returns, in the factory's scope.
import { i32, f64 } from "../../../src/wasmath.ts";

function flagger(on: boolean) {
  return { flip: () => { on = !on; return on; } };
}

function scaler(k: f64) {
  return { by: (x: f64) => { const r: f64 = x * k; return r; } };
}

function halfOf(v: f64) {
  return { get: (x: f64) => v + x / 2 };
}

function tester(limit: i32) {
  return { over: (x: i32) => x > limit };
}

function wide(base: bigint) {
  return { plus: (x: bigint) => { return base + x; } };
}

function count(start: i32) {
  return { next: () => { start++; return start; } };
}

const fl: { flip: () => boolean } = flagger(false);
console.log(fl.flip(), fl.flip());

const sc: { by: (x: f64) => f64 } = scaler(1.5);
console.log(sc.by(3), sc.by(0.25));

const hf: { get: (x: f64) => f64 } = halfOf(0.25);
console.log(hf.get(1));

const ts: { over: (x: i32) => boolean } = tester(10);
console.log(ts.over(11), ts.over(3));

const wd: { plus: (x: bigint) => bigint } = wide(40n);
console.log(wd.plus(2n));

const ct: { next: () => i32 } = count(1);
console.log(ct.next(), ct.next());
