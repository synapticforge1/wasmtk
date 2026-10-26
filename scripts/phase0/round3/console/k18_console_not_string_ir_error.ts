// console's unary `!` takes its operand as an i32 number: console.log(!s) of a string fails in the
// assembler ("local $s cannot be resolved"), and console.log(!x) of an f64 builds an invalid module
// (if[0] expected i32, found f64). The declarations `const v: boolean = !s` / `!x` are right.
const s: string = "ab";
console.log(!s);
