type i32 = number; type f64 = number;
interface Q { s: string | null }
const q: Q = { s: "hi" };
console.log(q.s ?? "none");
console.log(`${q.s ?? "none"}`);
