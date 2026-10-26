type i32 = number; type f64 = number;
interface O { a: f64; b: f64 }
const o: O = { a: 1, b: 2 };
let s: string = "";
for (const k in o) s += k;
console.log(s);
