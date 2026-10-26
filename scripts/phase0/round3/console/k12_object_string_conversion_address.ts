// A struct in string conversion ("" + p, `${p}`) is its address, not "[object Object]",
// in a declaration and in console.log alike.
type i32 = number;
interface P { n: i32 }
const p: P = { n: 5 };
const s: string = "" + p;
console.log(s);
