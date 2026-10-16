type i32 = number; type f64 = number;
class A {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
  get double(): i32 {
    return this.x * 2;
  }
}
class B extends A {
  constructor(x: i32) {
    super(x + 100);
  }
}
const b: B = new B(1);
const d: i32 = b.double;
console.log(d);
