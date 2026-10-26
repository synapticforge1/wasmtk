type i32 = number;
class Base {
  v: i32 = 0;
  set val(x: i32) {
    this.v = x;
  }
}
class Derived extends Base {
  set val(x: i32) {
    this.v = x * 100;
  }
}
function setIt(b: Base): void {
  b.val = 3;
}
const d: Derived = new Derived();
setIt(d);
console.log(d.v);
