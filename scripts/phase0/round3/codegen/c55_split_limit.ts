type i32 = number;
const s: string = "a-b-c-d";
const p: string[] = s.split("-", 2);
const n: i32 = p.length;
console.log(n, p.join("+"));
