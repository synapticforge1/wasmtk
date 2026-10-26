type i32 = number; type f64 = number;
let c: i32 = 0;
for (const ch of "hello") {
  if (ch === "l") c++;
}
console.log(c);
