const a: string[] = ["x", "y"];
const b: string[] = ["z"];
const c: string[] = [...a, ...b];
console.log(c.length);
console.log(c.join(","));
