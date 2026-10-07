type i32 = number;
function counter(): () => i32 {
  let c: i32 = 0;
  return () => {
    c++;
    return c;
  };
}
const f: () => i32 = counter();
console.log(f(), f());
