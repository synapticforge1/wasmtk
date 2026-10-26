type i32 = number; type f64 = number;
interface P { name: string }
const p: P = { name: "bo" };
let r: i32 = 0;
switch (p.name) {
  case "bo": r = 1; break;
  default: r = 2;
}
console.log(r);
