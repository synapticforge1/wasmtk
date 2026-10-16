type i32 = number; type f64 = number;
const x: i32 = 1;
let seen: i32 = 0;
if (x > 0) {
  const x: i32 = 50;
  seen = x;
}
console.log(x, seen);
