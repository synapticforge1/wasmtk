// `x | 0` on an f64 out of the i32 range trapped; JavaScript's ToInt32 wraps (4294967298.7 → 2).
type i32 = number;
type f64 = number;
const huge: f64 = 4294967298.7;
const t: i32 = huge | 0;
console.log(t);
