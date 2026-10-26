type i32 = number; type f64 = number;
let cmd: string = "go";
function run(): i32 {
  switch (cmd) {
    case "go": return 1;
    default: return 2;
  }
}
console.log(run());
