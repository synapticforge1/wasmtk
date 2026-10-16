type i32 = number; type f64 = number;
let m: i32 = 3;
let s: i32 = 0;
while (m-- > 0) {
  s += m;
}
console.log(s, m);
