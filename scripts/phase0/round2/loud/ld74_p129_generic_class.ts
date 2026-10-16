type i32 = number; type f64 = number;
class Box<T> {
  v: T;
  constructor(v: T) {
    this.v = v;
  }
  get(): T {
    return this.v;
  }
}
const a: Box<i32> = new Box<i32>(7);
const b: Box<f64> = new Box<f64>(2.5);
const av: i32 = a.get();
const bv: f64 = b.get();
console.log(av, bv);
