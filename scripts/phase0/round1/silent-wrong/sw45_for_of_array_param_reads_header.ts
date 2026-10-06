type i32 = number;
function total(v: i32[]): i32 {
  let t: i32 = 0;
  for (const e of v) t += e;
  return t;
}
const is: i32[] = [1, 2, 3];
console.log(total(is));
