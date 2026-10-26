type i32 = number; type f64 = number;
class A {
  n: f64 = 0;
  set v(x: f64) { this.n = x; }
}
class B extends A {
  set v(x: f64) { this.n = x * 100; }
}
function put(a: A): void { a.v = 3; }
const b: B = new B();
put(b);
console.log(b.n);
