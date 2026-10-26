type i32 = number;
class C {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
}
function make(v: i32): C {
  return new C(v);
}
const a: C = make(1);
const b: C = make(2);
b.v += 5;
console.log(a.v, b.v);
