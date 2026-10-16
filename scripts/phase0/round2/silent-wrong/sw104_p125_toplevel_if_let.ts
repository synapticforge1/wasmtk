type i32 = number; type f64 = number;
let out: i32 = 0;
for (let i: i32 = 0; i < 4; i++) {
  if (i % 2 === 0) {
    let flag: i32 = 1;
    out += flag;
    flag = 100;
  }
}
console.log(out);
