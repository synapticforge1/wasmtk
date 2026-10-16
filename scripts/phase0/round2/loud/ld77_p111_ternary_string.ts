type i32 = number; type f64 = number;
function grade(n: i32): string {
  return n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : "F";
}
const a: string = grade(95);
const b: string = grade(85);
const c: string = grade(10);
console.log(a + b + c);
