type i32 = number;
class Base {
  get n(): i32 {
    return 1;
  }
  describe(): i32 {
    return this.n * 10;
  }
}
class Derived extends Base {
  get n(): i32 {
    return 2;
  }
}
const d: Derived = new Derived();
const r: i32 = d.describe();
console.log(r);
