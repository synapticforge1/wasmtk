type i32 = number;
export function sq(x: i32): i32 {
  return x * x;
}
export function boom(x: i32): i32 {
  if (x > 1) throw new Error("too big: " + x);
  return x;
}
