// console.log of a concatenation LED by a struct's string field prints a pointer sum.
// The declaration `const v: string = p.s + 1` is right; console.log, a template and "<"+()+">" are not.
type i32 = number;
interface P { n: i32; s: string }
const p: P = { n: 5, s: "pq" };
console.log(p.s + 1);
