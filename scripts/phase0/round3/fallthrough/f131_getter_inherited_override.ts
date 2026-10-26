type i32 = number; type f64 = number;
class A {
  get v(): f64 { return 1; }
  show(): f64 { return this.v * 10; }
}
class B extends A {
  get v(): f64 { return 2; }
}
const b: B = new B();
console.log(b.show(), b.v);
