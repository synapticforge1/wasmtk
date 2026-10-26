type i32 = number; type f64 = number;
class C {
  n: f64 = 4;
  mk(): f64 {
    const g = (x: f64): f64 => x + this.n;
    return g(1);
  }
}
const c: C = new C();
console.log(c.mk());
