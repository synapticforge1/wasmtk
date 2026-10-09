// H12, 2026-10-09 (sw51, option A by the owner): a `number | null` (or `boolean | null`) element
// of a tuple, or field of an interface or class, carries a null FLAG word beside it, the model
// nullable locals use (`$x__null`). Null was stored as 0, so a real 0 read as null:
//   [0, 2.5] destructured, `v ?? -1`          → -1 (TypeScript 0)
//   { a: null } then `r.a ?? -1`              → 0  (TypeScript -1), and `r.a === null` false
//   { a: 0 }    then `r.a === null`           → true
// Found with it and fixed: `console.log(v === null)` for a nullable local holding 0 printed
// `true`; a nullable local printed `0` (not `null`) unless it was console.log's only argument,
// and inside a template or concat; `f() ?? d` on a `T | null` function ignored d.
type i32 = number;
type f64 = number;
type NT = [i32 | null, f64];
interface Rec { a: i32 | null; b: i32; c: f64 | null }

class Box {
  v: i32 | null;
  w: f64 | null;
  constructor(z: boolean) {
    if (z) {
      this.v = 0;
      this.w = null;
    } else {
      this.v = null;
      this.w = 2.5;
    }
  }
  get(): i32 {
    return this.v ?? -1;
  }
}

function mk(k: i32): NT {
  if (k === 0) return [null, 1.5];
  return [0, 2.5];
}
function show(k: i32): void {
  const t: NT = mk(k);
  const [v, r]: NT = t;
  console.log("tuple-ret", v ?? -1, r, v === null);
}
function mkRec(n: i32): Rec {
  return { a: n > 0 ? n : 0, b: 1, c: null };
}
function mkNullRec(): Rec {
  return { a: null, b: 2, c: 0 };
}
function pick(r: Rec): i32 | null {
  return r.a;
}

function main(): void {
  // tuples: returned, declared
  show(0);
  show(1);
  const lt: NT = [null, 3.5];
  const lt2: NT = [0, 4.5];
  console.log("tuple-lit", lt[0] ?? -1, lt2[0] ?? -1, lt[0] === null, lt2[0] === null);

  // interface values: static, runtime, returned, spread
  const s0: Rec = { a: 0, b: 1, c: 0 };
  const s1: Rec = { a: null, b: 1, c: null };
  console.log("static", s0.a ?? -1, s1.a ?? -1, s0.c ?? -1, s1.c ?? -1, s0.a === null, s1.a === null);
  const n: i32 = 4;
  const d1: Rec = { a: n, b: n, c: null };
  console.log("runtime", d1.a ?? -1, d1.c ?? -1.5, d1.c === null);
  const r1: Rec = mkRec(0);
  const r2: Rec = mkNullRec();
  console.log("ret-obj", r1.a ?? -1, r1.c ?? -1, r2.a ?? -1, r2.c ?? -1);
  const sp: Rec = { ...s1, b: 9 };
  console.log("spread", sp.a ?? -1, sp.b);

  // field writes
  const w: Rec = { a: 5, b: 0, c: 1.5 };
  w.a = null;
  console.log("write-null", w.a ?? -1, w.a === null);
  w.a = 0;
  console.log("write-0", w.a ?? -1, w.a === null);
  w.a = null;
  w.a = w.b;
  console.log("write-copy", w.a ?? -1);
  w.c = s1.c;
  console.log("write-from-null-field", w.c ?? -2, w.c === null);
  const k: Rec = { a: null, b: 0, c: 0 };
  k.a = 7;
  k.b++;
  console.log("write-then-inc", k.a ?? -1, k.b);

  // a field's null travels to a local and out of a function
  const pv: i32 | null = s1.a;
  const pz: i32 | null = s0.a;
  console.log("let-from-field", pv ?? -1, pz ?? -1);
  console.log("ret-field", pick(s1) ?? -1, pick(s0) ?? -1);

  // classes and struct arrays
  const bz: Box = new Box(true);
  const bn: Box = new Box(false);
  console.log("class", bz.get(), bn.get(), bz.v === null, bn.v === null, bz.w ?? -1, bn.w ?? -1);
  const recs: Rec[] = [];
  recs.push({ a: null, b: 2, c: 0 });
  recs.push({ a: 0, b: 3, c: 0 });
  console.log("array", recs[0].a ?? -1, recs[1].a ?? -1, recs[0].a === null);

  // printing and string building
  const nl: i32 | null = null;
  const zl: i32 | null = 0;
  console.log(nl);
  console.log(nl, zl, 1, nl === null, zl === null);
  console.log(`nl=${nl}`, s1.a, s0.a, s1.c, s0.c);
  const t1: string = `nl=${nl} zl=${zl}`;
  const t2: string = "a=" + s1.a + " c=" + d1.c;
  const t3: string = String(nl);
  console.log(t1, t2, t3);
}

main();
