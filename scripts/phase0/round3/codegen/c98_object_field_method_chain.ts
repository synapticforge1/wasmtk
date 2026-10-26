type i32 = number;
class Inner {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
  get(): i32 {
    return this.v + 1;
  }
}
class Outer {
  inner: Inner;
  constructor(v: i32) {
    this.inner = new Inner(v);
  }
}
const o: Outer = new Outer(5);
const o2: Outer = new Outer(50);
const r: i32 = o.inner.get();
const s: i32 = o2.inner.get();
console.log(r, s);
