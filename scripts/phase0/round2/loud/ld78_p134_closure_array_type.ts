type i32 = number; type f64 = number;
type Fn = () => i32;
const fns: Fn[] = [];
fns.push((): i32 => 1);
fns.push((): i32 => 2);
let s: i32 = 0;
for (let i: i32 = 0; i < fns.length; i++) {
  const f: Fn = fns[i];
  s += f();
}
console.log(s);
