const s: string = "abc";
const a: string = s.replace("b", "$&$&");
const b: string = s.replace("b", "$$");
const c: string = s.replace("b", "[$`|$']");
const d: string = "a.b.c".replaceAll(".", "$&$&");
console.log(a, b, c, d);
