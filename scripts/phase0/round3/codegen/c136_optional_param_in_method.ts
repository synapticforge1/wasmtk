type i32 = number;
class K {
  m(a: i32, b?: i32): string {
    return b === undefined ? "none" : "got " + b;
  }
}
const k: K = new K();
const r1: string = k.m(1);
const r2: string = k.m(1, 0);
console.log(r1, r2);
