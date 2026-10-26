type i32 = number;
class P {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
}
function build(): i32 {
  const ps: P[] = [];
  for (let i = 0; i < 3; i++) {
    const p: P = new P(i + 1);
    ps.push(p);
  }
  return ps[0].x * 100 + ps[1].x * 10 + ps[2].x;
}
console.log(build());
