type i32 = number;
const a: i32[] = [1, 2];
const v: i32 | undefined = a[5];
console.log(v === undefined);
