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
