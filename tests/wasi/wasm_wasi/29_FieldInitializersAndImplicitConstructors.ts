// sw131, sw132 (silent, found 2026-10-23 with ld104; the same on main). sw131: a class's
// instance-field initialisers (`n: i32 = 7`) were dropped — every field started at 0 / "" / false,
// with or without a constructor. sw132: a DERIVED class without a constructor never ran its base's
// (`new D(4).x` was 0, not 40). Found with them: `super(name)` with a string argument passed one
// word (an invalid module).
type i32 = number;
type f64 = number;

class NoCtor {
  n: i32 = 7;
  w: f64 = 0.5;
  s: string = "hi";
  on: boolean = true;
}
class WithCtor {
  n: i32 = 7;
  w: f64 = 0.5;
  k: i32;
  constructor(k: i32) {
    this.k = k;
  }
}
function make(): NoCtor {
  return new NoCtor();
}
const a: NoCtor = new NoCtor();
const b: WithCtor = new WithCtor(3);
console.log(a.n, a.w, a.s, a.on, b.n, b.w, b.k);
const mk: NoCtor = make();
console.log(mk.n, mk.w, mk.s, mk.on);

class Base {
  x: i32;
  constructor(x: i32) {
    this.x = x * 10;
  }
}
class Derived extends Base {
  tag(): i32 {
    return this.x + 1;
  }
}
const d: Derived = new Derived(4);
console.log(d.x, d.tag());

class A {
  a: i32 = 1;
  base: i32 = 100;
  name: string;
  constructor(name: string) {
    this.name = name;
    this.base = this.base + 5;
  }
}
class B extends A {
  b: i32 = 2;
  twice: i32 = 0;
  constructor(name: string, k: i32) {
    super(name);
    this.twice = this.b * k;
  }
}
class C extends B {
  c: f64 = 3.5;
  items: i32[] = [];
}
const x: C = new C("cee", 4);
x.items.push(9);
x.items.push(8);
console.log(x.a, x.base, x.name, x.b, x.twice, x.c, x.items.length, x.items[1]);

class Over {
  v: i32 = 5;
  w: i32 = 6;
  constructor() {
    this.v = 50;
  }
}
const o: Over = new Over();
class P {
  n: i32 = 9;
}
class Q extends P {}
const q: Q = new Q();
console.log(o.v, o.w, q.n);

function build(): void {
  const y: C = new C("in", 2);
  const e: Derived = new Derived(2);
  console.log(y.twice, y.c, y.base, y.name, e.x, e.tag());
}
build();
