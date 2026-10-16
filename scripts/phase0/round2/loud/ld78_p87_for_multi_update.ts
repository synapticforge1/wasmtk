type i32 = number; type f64 = number;
let s: i32 = 0;
for (let i: i32 = 0, j: i32 = 10; i < j; i++, j--) {
  s += j - i;
}
console.log(s);
