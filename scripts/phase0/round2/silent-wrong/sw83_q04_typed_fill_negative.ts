type i32 = number;
const t: Int32Array = new Int32Array(5);
t.fill(7, -2);
console.log(t[0]);
console.log(t[4]);
