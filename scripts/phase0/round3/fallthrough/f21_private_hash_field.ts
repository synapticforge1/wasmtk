type i32 = number; type f64 = number;
class P {
  #n: f64 = 3;
  bump(): f64 { this.#n += 1; return this.#n; }
}
const p = new P();
p.bump();
console.log(p.bump());
