type i32 = number; type f64 = number;
function nm(): string { return "abc"; }
const s: string = "abd";
const a: boolean = nm() < s;
console.log(a);
console.log(nm() < s);
