type i32 = number; type f64 = number;
class A {
  m(x?: f64): f64 { return x ?? -1; }
}
const a: A = new A();
console.log(a.m(), a.m(2));
