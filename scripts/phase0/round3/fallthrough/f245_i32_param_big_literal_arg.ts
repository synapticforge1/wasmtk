type i32 = number; type f64 = number;
function id(x: i32): i32 { return x; }
console.log(id(2147483648));
