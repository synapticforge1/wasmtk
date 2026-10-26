type i32 = number;

function dbl(a: i32) {
  return a * 2;
}

// @wasm
function addd(a: i32, b: i32 = 10): i32 {
  return a + b;
}

console.log(dbl(4));
console.log(addd(5));
