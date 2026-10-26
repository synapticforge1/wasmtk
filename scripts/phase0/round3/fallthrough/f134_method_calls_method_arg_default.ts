type i32 = number; type f64 = number;
class C {
  add(a: f64, b: f64 = 1): f64 { return a + b; }
  twice(a: f64): f64 { return this.add(a) + this.add(a, 5); }
}
const c: C = new C();
console.log(c.twice(1));
