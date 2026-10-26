type i32 = number;
class V {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
  add(o: V): V {
    return new V(this.x + o.x);
  }
}
const a: V = new V(1);
const b: V = new V(10);
const c: V = new V(100);
const v1: V = a.add(b);
const v2: V = a.add(c);
console.log(v1.x, v2.x);
