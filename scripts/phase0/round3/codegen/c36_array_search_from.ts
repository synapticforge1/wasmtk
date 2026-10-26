type i32 = number;
const a: i32[] = [1, 2, 3, 1, 2, 3];
const i1: i32 = a.indexOf(2, -3);
const i2: i32 = a.lastIndexOf(1, -4);
const b1: boolean = a.includes(1, 4);
const i3: i32 = a.indexOf(3, 10);
const j: string = a.join();
console.log(i1, i2, b1, i3, j);
