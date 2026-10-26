// console.log(p.s < s) — a string field compared with a string variable — fails in the assembler.
interface P { s: string }
const p: P = { s: "pq" };
const s: string = "ab";
console.log(p.s < s);
