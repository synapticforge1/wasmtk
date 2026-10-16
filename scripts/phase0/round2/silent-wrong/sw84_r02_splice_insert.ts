type i32 = number;
const a: i32[] = [1, 2, 3];
a.splice(1, 0, 9);
console.log(a.join(","));
