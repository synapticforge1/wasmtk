// `c.k + c.half()` (i32 field + f64 method) builds an invalid module, declaration and console alike.
type i32 = number; type f64 = number;
class C {
  k: i32;
  r: f64;
  constructor(k: i32, r: f64) { this.k = k; this.r = r; }
  half(): f64 { return this.r / 2; }
}
const c: C = new C(4, 3.5);
const v: f64 = c.k + c.half();
console.log(v);
