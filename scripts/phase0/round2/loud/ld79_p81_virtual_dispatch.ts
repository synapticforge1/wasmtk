type i32 = number; type f64 = number;
class Shape {
  w: f64;
  constructor(w: f64) {
    this.w = w;
  }
  area(): f64 {
    return 0;
  }
}
class Sq extends Shape {
  constructor(w: f64) {
    super(w);
  }
  area(): f64 {
    return this.w * this.w;
  }
}
const shapes: Shape[] = [new Sq(2), new Shape(5), new Sq(3)];
let tot: f64 = 0;
for (const s of shapes) {
  tot += s.area();
}
console.log(tot);
