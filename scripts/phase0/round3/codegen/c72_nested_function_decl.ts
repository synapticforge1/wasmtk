type i32 = number;
function outer(k: i32): i32 {
  function inner(x: i32): i32 {
    return x * k;
  }
  return inner(3) + inner(4);
}
console.log(outer(2), outer(10));
