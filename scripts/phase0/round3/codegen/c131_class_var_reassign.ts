type i32 = number;
class C {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
}
let a: C = new C(1);
const b: C = new C(2);
a = b;
b.v = 9;
console.log(a.v, b.v);
