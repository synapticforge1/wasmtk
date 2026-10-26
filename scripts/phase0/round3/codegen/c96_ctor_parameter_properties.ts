type i32 = number;
class Pt {
  constructor(public x: i32, public y: i32) {}
  sum(): i32 {
    return this.x + this.y;
  }
}
const p: Pt = new Pt(3, 4);
console.log(p.x, p.y, p.sum());
