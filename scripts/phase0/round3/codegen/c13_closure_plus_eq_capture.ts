type i32 = number;
function counter(start: i32): () => i32 {
  let n: i32 = start;
  return () => {
    n += 1;
    return n;
  };
}
const c1: () => i32 = counter(0);
c1();
const y: i32 = c1();
console.log(y);
