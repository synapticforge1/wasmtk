type i32 = number; type f64 = number;
function mk(): readonly f64[] { return [1.5, 2]; }
const r: f64[] = mk() as f64[];
console.log(r[0]);
