type i32 = number; type f64 = number;
class A {
  name(): string {
    return "A";
  }
}
const a: A = new A();
const n: string = a.name();
console.log(n);
