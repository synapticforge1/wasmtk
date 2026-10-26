type i32 = number; type f64 = number;
class P {
  x: f64 = 1;
  toString(): string { return "P(" + this.x + ")"; }
}
const p: P = new P();
console.log(`${p}`);
