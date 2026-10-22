// ld100 (2026-10-22): generic classes, `class Box<T>` / `new Box<i32>(7)`, were "Unsupported
// statement". Each `Name<args>` use is a monomorphized copy, `Name_args`. Found with it, both the
// same on main: ld101, a class with a STRING field took no string constructor argument (refused)
// and laid the field out as one word (the next field sat on its length: "hihihih"); ld102, a
// method returning a string, called in console.log, was an invalid module.
type i32 = number;
type f64 = number;
class Pair<A, B> {
  a: A;
  b: B;
  constructor(a: A, b: B) {
    this.a = a;
    this.b = b;
  }
  first(): A {
    return this.a;
  }
  second(): B {
    return this.b;
  }
}
class Acc<T> {
  total: T;
  n: i32;
  constructor(start: T) {
    this.total = start;
    this.n = 0;
  }
  add(x: T): Acc<T> {
    this.total += x;
    this.n += 1;
    return this;
  }
}
class Named {
  label(): string {
    return "named";
  }
}
class Tagged<T> extends Named {
  v: T;
  constructor(v: T) {
    super();
    this.v = v;
  }
}
function swapSum(p: Pair<i32, f64>): f64 {
  return p.a + p.b;
}
function makePair(x: i32): Pair<i32, f64> {
  return new Pair<i32, f64>(x, x * 0.5);
}
const p: Pair<i32, f64> = new Pair<i32, f64>(3, 1.5);
const q: Pair<string, i32> = new Pair<string, i32>("hi", 7);
const f: i32 = p.first();
const s: f64 = p.second();
const w: string = q.first();
console.log(f, s, w, q.second(), swapSum(p));
const mp: Pair<i32, f64> = makePair(5);
console.log(mp.a, mp.b);
const ac: Acc<f64> = new Acc<f64>(0.5);
ac.add(1.5).add(2.5);
console.log(ac.total, ac.n);
const t: Tagged<i32> = new Tagged<i32>(9);
console.log(t.v, t.label());

class Item {
  name: string;
  qty: i32;
  constructor(name: string, qty: i32) {
    this.name = name;
    this.qty = qty;
  }
  title(): string {
    return this.name + " x" + this.qty;
  }
  rename(n: string): void {
    this.name = n;
  }
}
const it: Item = new Item("bolt", 12);
console.log(it.name, it.qty, it.title());
it.rename("nut");
const tt: string = it.title();
console.log(tt);
const nm: Named = new Named();
console.log(nm.label() + "!");
