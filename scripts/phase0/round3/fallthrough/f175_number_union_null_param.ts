type i32 = number; type f64 = number;
function f(x: f64 | undefined): f64 { return x ?? 7; }
console.log(f(undefined), f(2));
