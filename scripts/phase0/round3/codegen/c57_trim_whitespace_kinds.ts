type i32 = number;
const s: string = "\t\n\r\v\f x y \n";
const t: string = s.trim();
const n: i32 = t.length;
const u: string = s.trimEnd();
const m: i32 = u.length;
console.log("[" + t + "]", n, m);
