type i32 = number; type f64 = number;
type Dir = "up" | "down";
function f(d: Dir): string { return d === "up" ? "U" : "D"; }
console.log(f("up"), f("down"));
