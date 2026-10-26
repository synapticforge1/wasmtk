type i32 = number;
const a: i32[] = [1, 2];
const b: i32[] = [3];
const c: i32[] = a.concat(b, [7, 8]);
const l: i32 = a.at(-1) ?? -1;
console.log(c.join(","), l, Array.isArray(c));
