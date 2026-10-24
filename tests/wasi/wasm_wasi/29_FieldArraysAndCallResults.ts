// ld103, ld104, ld105 (found 2026-10-22 with ld100, FIXED 2026-10-23). ld103: an ARRAY field's
// push / length / index through `this` and a class instance (an interface struct's push too) was
// refused: a class field `items: T[]` was a plain i32. ld104: a field of a method call's result,
// `c.bump().n`, chained and in console.log (a boolean printed 1, an f64 was an invalid module).
// ld105: `.length` of a filter / map result, as a declaration and in console.log.
type i32 = number;
type f64 = number;

class Bag {
  items: i32[] = [];
  vals: f64[];
  tags: string[] = [];
  constructor() {
    this.vals = [];
  }
  add(x: i32): Bag {
    this.items.push(x);
    this.vals.push(x * 1.5);
    this.tags.push("t" + x);
    return this;
  }
  count(): i32 {
    return this.items.length;
  }
  last(): f64 {
    return this.vals[this.vals.length - 1];
  }
}
const b: Bag = new Bag();
b.add(3).add(4);
b.add(5);
b.items.push(6);
b.tags.unshift("first");
console.log(b.count(), b.items.length, b.items[3], b.vals[0], b.last(), b.tags.length);

class Stack<T> {
  items: T[];
  constructor() {
    this.items = [];
  }
  push(x: T): void {
    this.items.push(x);
  }
  pop(): void {
    this.items.pop();
  }
  top(): T {
    return this.items[this.items.length - 1];
  }
}
const s: Stack<i32> = new Stack<i32>();
s.push(7);
s.push(8);
s.push(9);
s.pop();
const t: Stack<f64> = new Stack<f64>();
t.push(1.5);
console.log(s.items.length, s.top(), t.items.length, t.top());

interface Box {
  vals: i32[];
}
const bx: Box = { vals: [] };
bx.vals.push(9);
bx.vals.push(10);
console.log(bx.vals.length, bx.vals[1]);

class Counter {
  n: i32 = 0;
  w: f64 = 0.5;
  on: boolean = false;
  bump(): Counter {
    this.n += 1;
    this.w = this.w * 2;
    this.on = !this.on;
    return this;
  }
}
function make(): Counter {
  return new Counter();
}
const c: Counter = new Counter();
const v: i32 = c.bump().n;
const w: f64 = c.bump().w;
console.log(v, w, c.bump().n, c.bump().bump().n, c.bump().n * 2 + 1);
console.log(c.bump().w, c.bump().on, make().n, make().w, make().bump().w, make().bump().bump().n);

class Acc<T> {
  total: T;
  n: i32;
  constructor(start: T) {
    this.total = start;
    this.n = 0;
  }
  add(x: T): Acc<T> {
    this.total += x;
    this.n = this.n + 1;
    return this;
  }
}
const a: Acc<i32> = new Acc<i32>(0);
const f: Acc<f64> = new Acc<f64>(0.25);
console.log(a.add(5).total, a.add(2).n, a.add(1).add(1).n, f.add(1.5).total);

const xs: i32[] = [3, 1, 4, 1, 5];
const m: i32 = xs.filter((x: i32) => x > 1).length;
console.log(m, xs.filter((x: i32) => x > 1).length);
console.log("kept", xs.filter((x: i32) => x > 1).length, "of", xs.length);
const fs: f64[] = [1.5, 2.5];
console.log(fs.filter((q: f64) => q > 2).length, xs.map((x: i32) => x * 2).length);
