class Base {
  get name(): string {
    return "base";
  }
}
class Derived extends Base {
  get name(): string {
    return "derived";
  }
}
function show(b: Base): string {
  return b.name;
}
const d: Derived = new Derived();
const s: string = show(d);
console.log(s);
