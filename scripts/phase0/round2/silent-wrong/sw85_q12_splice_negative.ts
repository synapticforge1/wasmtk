type i32 = number;
const a: i32[] = [1, 2, 3, 4, 5];
a.splice(-2, 1);
console.log(a.join(","));
