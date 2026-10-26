type i32 = number;
interface O {
  a: i32;
  b?: i32;
}
const o: O = { a: 1, b: 0 };
const p: O = { a: 1 };
const x: boolean = o.b === undefined;
const y: boolean = p.b === undefined;
console.log(x, y);
