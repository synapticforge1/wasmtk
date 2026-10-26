type i32 = number; type f64 = number;
function h(b?: f64): string {
  return `b=${b}`;
}
console.log(h());
