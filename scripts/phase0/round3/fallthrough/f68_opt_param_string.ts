type i32 = number; type f64 = number;
function h(s?: string): string {
  return s ?? "none";
}
console.log(h(), h("x"));
