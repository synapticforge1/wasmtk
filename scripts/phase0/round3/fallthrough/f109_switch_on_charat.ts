type i32 = number; type f64 = number;
const s: string = "xyz";
let r: i32 = 0;
switch (s.charAt(1)) {
  case "x": r = 1; break;
  case "y": r = 2; break;
}
console.log(r);
