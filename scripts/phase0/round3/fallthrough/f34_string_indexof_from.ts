type i32 = number; type f64 = number;
const s: string = "abcabc";
const i: i32 = s.indexOf("a", 1);
console.log(i, s.lastIndexOf("b", 3), s.includes("a", 4));
