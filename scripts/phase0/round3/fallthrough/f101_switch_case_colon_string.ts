type i32 = number; type f64 = number;
function k(s: string): i32 {
  switch (s) {
    case "a:b": return 1;
    case "a": return 2;
    default: return 3;
  }
}
console.log(k("a:b"), k("a"), k("z"));
