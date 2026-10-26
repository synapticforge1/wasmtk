const s: string = "abcabc";
const a: boolean = s.includes("a", 1);
const b: boolean = s.startsWith("ca", 2);
const c: boolean = s.endsWith("ab", 5);
const d: boolean = s.includes("a", 4);
console.log(a, b, c, d);
