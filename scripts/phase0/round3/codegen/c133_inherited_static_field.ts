type i32 = number;
class Base {
  static count: i32 = 3;
  static twice(): i32 {
    return Base.count * 2;
  }
}
class Derived extends Base {}
const a: i32 = Derived.count;
const b: i32 = Derived.twice();
console.log(a, b);
