type i32 = number; type f64 = number;
function area(w: f64, h?: f64): f64 {
  return w * (h ?? w);
}
console.log(area(3), area(3, 2));
