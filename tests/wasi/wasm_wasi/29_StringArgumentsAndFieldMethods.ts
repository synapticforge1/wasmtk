// ld106, ld108 (found 2026-10-23, FIXED the same day). ld106: a template or a concatenation as a
// method's, a constructor's or `super`'s string argument was "Unsupported string expression".
// ld108: an array FIELD's other methods (join, indexOf, includes, reduce, sort, splice, …) were
// refused. Found with them: a string method with `(` in an argument fell to the i32 path in
// console.log (an invalid module), and with a template argument it printed "" for it (silent).
type i32 = number;

class Pair {
  a: string;
  b: string;
  constructor(a: string, b: string) {
    this.a = a;
    this.b = b;
  }
  join(x: string, y: string): string {
    return x + this.a + y + this.b;
  }
}
class Named extends Pair {
  constructor(n: string) {
    super(`<${n}>`, n + "!");
  }
}
const who: string = "z";
const k: i32 = 4;
const p: Pair = new Pair(`${who}${k}`, who + "-" + who);
console.log(p.a, p.b, p.join(`[${k}]`, "(" + who + ")"), p.join("(", ")"));
const nm: Named = new Named(`n${k}`);
console.log(nm.a, nm.b);
function inner(): void {
  const q: Pair = new Pair(`in${k}`, "" + who);
  console.log(q.join(`x`, `${q.a}|`));
}
inner();

class Bag {
  items: i32[] = [];
  names: string[] = [];
  add(x: i32, n: string): void {
    this.items.push(x);
    this.names.push(n);
  }
  has(x: i32): boolean {
    return this.items.includes(x);
  }
  where(x: i32): i32 {
    return this.items.indexOf(x);
  }
  big(): i32 {
    return this.items.filter((v: i32) => v > 2).length;
  }
  total(): i32 {
    return this.items.reduce((a: i32, v: i32) => a + v, 0);
  }
  label(): string {
    return this.names.join("+");
  }
}
const b: Bag = new Bag();
b.add(3, "c");
b.add(1, "a");
b.add(4, "d");
b.add(5, "e");
console.log(b.has(4), b.has(9), b.where(4), b.big(), b.total(), b.label());
console.log(b.names.join("|"), b.items.indexOf(5), b.items.includes(1));
b.items.sort((x: i32, y: i32) => x - y);
console.log(b.items.join(","));
b.items.reverse();
b.items.splice(1, 1);
b.items.splice(0, 0, 9, 8, 7, 6, 5, 4, 3, 2);
console.log(b.items.length, b.items.join(","));
const total2: i32 = b.items.filter((v: i32) => v % 2 === 0).length + b.items.indexOf(9);
console.log(total2, `${b.names.join("")}!`);
