type i32 = number;
export class Vec {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
}
function mk(n: i32): Vec {
  return new Vec(n * 2);
}
export { mk };
