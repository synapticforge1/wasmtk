type i32 = number;
const a: i32[] = [1, 2, 3];
const b: i32[] = [...a];
b.push(4);
b[0] = 99;
console.log(a.length);
console.log(a[0]);
