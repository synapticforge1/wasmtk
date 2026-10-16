type i32 = number; type f64 = number;
const t: string = "a-b-c";
const sp: string[] = t.split("-");
const n: i32 = sp.length;
const s1: string = sp[1];
console.log(n, s1);
console.log(sp.join("|"));
