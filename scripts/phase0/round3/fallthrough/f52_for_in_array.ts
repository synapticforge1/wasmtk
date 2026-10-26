type i32 = number; type f64 = number;
const xs: f64[] = [7, 8, 9];
let s: string = "";
for (const k in xs) s += k;
console.log(s);
