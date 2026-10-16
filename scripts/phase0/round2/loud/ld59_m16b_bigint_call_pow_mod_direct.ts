type i32 = number; type f64 = number;
function bg(): bigint { return 3n; }
const b: bigint = bg() ** 3n % 5n;
console.log(b);
console.log(bg() ** 3n % 5n);
