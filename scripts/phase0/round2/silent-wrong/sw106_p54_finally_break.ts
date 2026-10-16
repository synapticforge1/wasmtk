type i32 = number; type f64 = number;
let log: i32 = 0;
for (let i: i32 = 0; i < 3; i++) {
  try {
    if (i === 1) continue;
    if (i === 2) break;
    log += 1;
  } finally {
    log += 10;
  }
}
console.log(log);
