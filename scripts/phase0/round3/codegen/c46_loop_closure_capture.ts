type i32 = number;
function build(): i32 {
  const fs: (() => i32)[] = [];
  for (let i = 0; i < 3; i++) {
    fs.push(() => i * 10);
  }
  let t: i32 = 0;
  for (let k = 0; k < fs.length; k++) t = t * 100 + fs[k]();
  return t;
}
console.log(build());
