type i32 = number; type f64 = number;
class C {
  static base: f64 = 10;
  static plus(x: f64): f64 { return this.base + x; }
}
console.log(C.plus(5));
