type i32 = number; type f64 = number;
function h(b?: i32): i32 {
  return b ?? 7;
}
console.log(h());
