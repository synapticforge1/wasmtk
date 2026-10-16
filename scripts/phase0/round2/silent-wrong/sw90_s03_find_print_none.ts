type i32 = number;
const a: i32[] = [-1, 2, 3];
const f: i32 | undefined = a.find((x: i32): boolean => x < 0);
console.log(f);
const g: i32 | undefined = a.find((x: i32): boolean => x > 9);
console.log(g === undefined ? "none" : "found");
