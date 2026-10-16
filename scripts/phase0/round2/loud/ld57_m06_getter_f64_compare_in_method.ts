type i32 = number; type f64 = number;
class Box {
  w: f64; h: f64;
  constructor(w: f64, h: f64) { this.w = w; this.h = h; }
  get area(): f64 { return this.w * this.h; }
  isBig(): boolean { return this.area > 10; }
}
const bx: Box = new Box(2.5, 3);
const c: boolean = bx.isBig();
console.log(c);
