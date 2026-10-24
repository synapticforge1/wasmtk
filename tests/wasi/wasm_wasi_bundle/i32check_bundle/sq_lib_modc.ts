type i32 = number;

/** @export */
export function sq(x: i32): i32 {
  // sw119: JavaScript's x * x, stored into the i32 result: a RangeError when it does not fit
  return x * x;
}

/** @export */
export function divByYear(days: i32): i32 {
  // a constant a merge must not take for a data pointer: this library has NO data (its RangeError
  // message is built when thrown), so nothing here is relocated (sw138)
  return days % 365;
}
