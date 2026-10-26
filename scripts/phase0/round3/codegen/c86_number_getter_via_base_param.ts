type i32 = number;
class Base {
  get n(): i32 {
    return 1;
  }
}
class Derived extends Base {
  get n(): i32 {
    return 2;
  }
}
function show(b: Base): i32 {
  return b.n * 10;
}
const d: Derived = new Derived();
const s: i32 = show(d);
console.log(s);
