// Phase 9 bug fix (2026-10-26, audit round 3): every `new` makes a FRESH object.
//   sw141  each `new C(…)` site was ONE static block laid out at compile time, so objects made
//          in a loop, a factory, or a method returning `new` were the same object
//   sw142  a class variable reassigned still read its first object's fields
type i32 = number;

class P {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
}
const ps: P[] = [];
for (let i = 0; i < 3; i++) {
  ps.push(new P(i * 10));
}
let s: string = "";
for (const p of ps) s += p.x + ",";
console.log(s, ps[0].x, ps[2].x);

function build(): i32 {
  const qs: P[] = [];
  for (let i = 0; i < 3; i++) {
    const q: P = new P(i + 1);
    qs.push(q);
  }
  return qs[0].x * 100 + qs[1].x * 10 + qs[2].x;
}
console.log(build(), build());

class C {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
}
function make(v: i32): C {
  return new C(v);
}
const a: C = make(1);
const b: C = make(2);
b.v += 5;
console.log(a.v, b.v);

function collect(): i32 {
  let first: C = new C(0);
  let last: C = new C(0);
  for (let i = 1; i <= 3; i++) {
    const n: C = new C(i);
    if (i === 1) first = n;
    last = n;
  }
  return first.v * 10 + last.v;
}
console.log(collect());

let r: C = new C(1);
const t: C = new C(2);
r = t;
t.v = 9;
console.log(r.v, t.v);

class V {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
  add(o: V): V {
    return new V(this.x + o.x);
  }
}
const v0: V = new V(1);
const v1: V = v0.add(new V(10));
const v2: V = v0.add(new V(100));
const v3: V = v1.add(new V(8));
console.log(v1.x, v2.x, v3.x);
