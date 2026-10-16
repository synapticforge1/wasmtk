type i32 = number; type f64 = number;
let total: i32 = 0;
for (let i: i32 = 0; i < 3; i++) {
  let acc: i32 = 0;
  acc += i;
  acc += 10;
  total += acc;
}
console.log(total);
