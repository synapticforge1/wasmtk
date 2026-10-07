// `a && b` / `a || b` give a BOOLEAN; JavaScript gives one of the operands: `!a && b` with b = 0
// is 0, `half && 1` is 1, `x || 7` with x = 0 is 7.
type i32 = number;
const a: i32 = 0;
const b: i32 = 0;
console.log(!a && b);
const x: i32 = 0;
const y: i32 = x || 7;
console.log(y);
