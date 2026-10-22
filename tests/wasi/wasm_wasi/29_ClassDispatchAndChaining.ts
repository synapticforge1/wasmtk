// Audit round 2 (2026-10-22), class rows:
//   ld74  an inherited getter; `return this` and a chained call on the result; a method returning a
//         string; `super()` when the base has no constructor; a struct alias's field store; an
//         abstract class whose base method calls an abstract one (generic classes are ld100, open);
//   ld79  `for…of` over a class array (`p.v`, `s.area()`) and over a struct array;
//   sw126 a base method calling an overridden one through `this`, or a call on a base-typed
//         parameter, ran the BASE's version: "1 0" for JavaScript's "10 9".
type i32 = number;
type f64 = number;

class A {
  x: i32;
  constructor(x: i32) {
    this.x = x;
  }
  get double(): i32 {
    return this.x * 2;
  }
  name(): string {
    return "A" + this.x;
  }
}
class B extends A {
  constructor(x: i32) {
    super(x + 100);
  }
}
const b: B = new B(1);
const bd: i32 = b.double;
const bn: string = b.name();
console.log(bd, bn);

class Counter {
  n: i32;
  constructor(n: i32) {
    this.n = n;
  }
  bump(): Counter {
    this.n += 1;
    return this;
  }
  label(): string {
    return "n=" + this.n;
  }
}
const c: Counter = new Counter(1);
c.bump().bump();
const again: Counter = c.bump();
const cn: i32 = again.n;
const cl: string = c.bump().label();
console.log(cn, cl);

class Base {
  hello(): i32 {
    return 7;
  }
}
class Kid extends Base {
  k: i32;
  constructor(k: i32) {
    super();
    this.k = k;
  }
}
const kid: Kid = new Kid(3);
const kk: i32 = kid.k;
console.log(kk, kid.hello());

interface P {
  x: i32;
  y: i32;
}
const p: P = { x: 1, y: 2 };
const q: P = p;
q.x = 9;
const px: i32 = p.x;
const qy: i32 = q.y;
console.log(px, qy);

abstract class Animal {
  abstract legs(): i32;
  describe(): i32 {
    return this.legs() * 10;
  }
}
class Dog extends Animal {
  legs(): i32 {
    return 4;
  }
}
class Bird extends Animal {
  legs(): i32 {
    return 2;
  }
}
const d: Dog = new Dog();
const bird: Bird = new Bird();
const r1: i32 = d.describe();
const r2: i32 = bird.describe();
console.log(r1, r2);

class Shape {
  w: f64;
  constructor(w: f64) {
    this.w = w;
  }
  area(): f64 {
    return 0;
  }
  describe(): f64 {
    return this.area() + 1;
  }
}
class Sq extends Shape {
  constructor(w: f64) {
    super(w);
  }
  area(): f64 {
    return this.w * this.w;
  }
}
function areaOf(s: Shape): f64 {
  return s.area();
}
const sq: Sq = new Sq(3);
const sd: f64 = sq.describe();
const sa: f64 = areaOf(sq);
console.log(sd, sa);

const shapes: Shape[] = [new Sq(2), new Shape(5), new Sq(3)];
let tot: f64 = 0;
for (const s of shapes) {
  tot += s.area();
}
console.log(tot);

class Pt {
  v: i32;
  constructor(v: i32) {
    this.v = v;
  }
}
const ps: Pt[] = [new Pt(1), new Pt(2), new Pt(3)];
let t: i32 = 0;
for (const it of ps) {
  t += it.v;
}
console.log(t);

interface Item {
  qty: i32;
  price: f64;
}
const items: Item[] = [{ qty: 2, price: 1.5 }, { qty: 1, price: 4 }];
let cost: f64 = 0;
for (const item of items) {
  cost += item.qty * item.price;
}
console.log(cost);
