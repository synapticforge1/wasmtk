type i32 = number;
function pair() {
  let v: i32 = 10;
  return { up: () => { ++v; return v; }, get: () => v };
}
const p: { up: () => i32; get: () => i32 } = pair();
console.log(p.up(), p.get());
