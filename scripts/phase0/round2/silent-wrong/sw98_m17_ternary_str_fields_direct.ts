type i32 = number; type f64 = number;
interface P { n: i32; s: string; t: string }
const p: P = { n: 2, s: "aa", t: "bbb" };
console.log(p.n > 1 ? p.s : p.t);
console.log(`${p.n > 1 ? p.s : p.t}`);
