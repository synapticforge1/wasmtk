type i32 = number; type f64 = number;
const fa: Float64Array = new Float64Array(2);
fa[1] = 2.25;
const ia: Int32Array = new Int32Array(2);
ia[1] = -3;
const c: f64 = ia[1] + fa[1];
console.log(c);
