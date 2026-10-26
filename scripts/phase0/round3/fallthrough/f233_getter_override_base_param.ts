type i32 = number; type f64 = number;
class A {
  get v(): f64 { return 1; }
}
class B extends A {
  get v(): f64 { return 2; }
}
function read(a: A): f64 { return a.v; }
console.log(read(new B()));
