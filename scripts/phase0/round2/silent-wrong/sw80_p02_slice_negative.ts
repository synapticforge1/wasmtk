type i32 = number;
const a: i32[] = [1, 2, 3, 4, 5];
const b: i32[] = a.slice(-2);
console.log(b.length);
console.log(b.join(","));
