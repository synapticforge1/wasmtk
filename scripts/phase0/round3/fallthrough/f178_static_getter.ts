type i32 = number; type f64 = number;
class C {
  static get two(): f64 { return 2; }
}
console.log(C.two * 3);
