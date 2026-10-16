type i32 = number; type f64 = number;
class Shape {
  area(): f64 {
    return 0;
  }
}
class Sq extends Shape {
  s: f64;
  constructor(s: f64) {
    super();
    this.s = s;
  }
}
const q: Sq = new Sq(3);
const a: f64 = q.s;
console.log(a);
