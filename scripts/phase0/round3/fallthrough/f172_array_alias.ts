type i32 = number; type f64 = number;
type Vec = f64[];
function first(v: Vec): f64 { return v[0]; }
const a: Vec = [2.5, 3];
console.log(first(a));
