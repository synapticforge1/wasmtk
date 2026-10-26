type i32 = number; type f64 = number;
enum D { Up = "UP", Down = "DOWN" }
function lbl(d: D): string { return "dir:" + d; }
console.log(lbl(D.Down));
