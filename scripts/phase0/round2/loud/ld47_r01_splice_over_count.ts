type i32 = number;
const a: i32[] = [1, 2, 3, 4, 5];
a.splice(3, 10);
console.log(a.length);
console.log(a.join(","));
