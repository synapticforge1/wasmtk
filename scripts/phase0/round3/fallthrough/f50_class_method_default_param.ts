type i32 = number; type f64 = number;
class A {
  k: f64 = 2;
  m(x: f64, y: f64 = 3): f64 { return this.k * x + y; }
}
const a: A = new A();
console.log(a.m(1), a.m(1, 1));
