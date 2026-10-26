type i32 = number; type f64 = number;
const fs: (() => f64)[] = [];
for (let i: i32 = 0; i < 3; i++) {
  fs.push(() => i * 10);
}
console.log(fs[0](), fs[2]());
