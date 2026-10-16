type i32 = number;
const a: i32[] = [1];
a.pop();
const p: i32 | undefined = a.pop();
console.log(p === undefined);
console.log(a.length);
