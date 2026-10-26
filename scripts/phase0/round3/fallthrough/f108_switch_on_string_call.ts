type i32 = number; type f64 = number;
function name(): string { return "b"; }
let r: i32 = 0;
switch (name()) {
  case "a": r = 1; break;
  case "b": r = 2; break;
}
console.log(r);
