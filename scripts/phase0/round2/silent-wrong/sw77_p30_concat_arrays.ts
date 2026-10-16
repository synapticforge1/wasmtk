type i32 = number;
const a: i32[] = [1, 2];
const b: i32[] = [3, 4];
const c: i32[] = a.concat(b);
console.log(c.length);
console.log(c.join("-"));
const d: i32[] = [...a, ...b, 5];
console.log(d.join("-"));
