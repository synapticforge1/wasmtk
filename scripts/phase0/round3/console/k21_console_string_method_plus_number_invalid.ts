// console.log(c.tag() + a) — a string-returning METHOD concatenated with a number — fails to
// assemble ("expected 1 elements on the stack"); the declaration is refused with "Unsupported".
type i32 = number;
class C {
  name: string;
  constructor(name: string) { this.name = name; }
  tag(): string { return "<" + this.name + ">"; }
}
const c: C = new C("cc");
const a: i32 = 7;
console.log(c.tag() + a);
