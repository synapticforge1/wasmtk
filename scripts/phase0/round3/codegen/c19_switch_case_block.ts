type i32 = number;
function cls(n: i32): i32 {
  let r: i32 = 0;
  switch (n) {
    case 3: {
      r += 100;
      break;
    }
    default:
      r += 1000;
  }
  return r;
}
console.log(cls(3), cls(4));
