const s: string = "abc";
const p: string[] = s.split("");
console.log(p.length);
console.log(p.join("-"));
const q: string[] = s.split("x");
console.log(q.length);
