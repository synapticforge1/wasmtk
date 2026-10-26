type i32 = number; type f64 = number;
class C {
  n: f64 = 7;
  getter(): () => f64 {
    const m: f64 = this.n;
    return (): f64 => m + 1;
  }
}
const c: C = new C();
const g: () => f64 = c.getter();
console.log(g());
