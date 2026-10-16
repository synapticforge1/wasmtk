type i32 = number; type f64 = number;
class P {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
  twice(): i32 {
    return this.v * 2;
  }
}
const ps: P[] = [new P(1), new P(2), new P(3)];
let s: i32 = 0;
for (let i: i32 = 0; i < ps.length; i++) {
  s += ps[i].twice();
}
let t: i32 = 0;
for (const p of ps) {
  t += p.v;
}
console.log(s, t);
