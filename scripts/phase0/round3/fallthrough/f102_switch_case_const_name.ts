type i32 = number; type f64 = number;
const RED: string = "red";
function k(s: string): i32 {
  switch (s) {
    case RED: return 1;
    default: return 0;
  }
}
console.log(k("red"), k("RED"));
