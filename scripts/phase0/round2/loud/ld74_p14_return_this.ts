type i32 = number; type f64 = number;
class C {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
  bump(): C {
    this.x += 1;
    return this;
  }
}
const c: C = new C(1);
c.bump().bump();
const v: i32 = c.x;
console.log(v);
