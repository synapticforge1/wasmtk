type i32 = number;
type f64 = number;
class Acc {
  total: f64 = 0;
  count: i32 = 0;
  log: string = "";
  add(x: f64): void {
    this.total += x;
    this.count++;
    this.log += "+";
  }
}
const a: Acc = new Acc();
a.add(1.5);
a.add(2.25);
console.log(a.total, a.count, a.log);
