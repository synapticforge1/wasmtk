// A top-level boolean constant read inside a function is refused (2026-10-15; the same on main).
type i32 = number;
const useTri: boolean = true;
const k: i32 = 4;
function run(): i32 {
  if (useTri) return k * 2;
  return k;
}
console.log(run());
