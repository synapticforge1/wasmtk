type i32 = number; type f64 = number;
interface Op {
  name: string;
  run: (a: i32, b: i32) => i32;
}
const add: Op = { name: "add", run: (a: i32, b: i32): i32 => a + b };
const mul: Op = { name: "mul", run: (a: i32, b: i32): i32 => a * b };
const r1: i32 = add.run(3, 4);
const r2: i32 = mul.run(3, 4);
console.log(r1, r2);
