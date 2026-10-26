// console.log of `<i32-returning method> + <f64>` truncates (charCodeAt, indexOf, a class method).
// The declaration `const v: f64 = s.charCodeAt(0) + x` is right (99.5).
type f64 = number;
const s: string = "ab";
const x: f64 = 2.5;
console.log(s.charCodeAt(0) + x);
