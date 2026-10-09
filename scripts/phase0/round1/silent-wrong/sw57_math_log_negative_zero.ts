// Math.log / log10 / log2 of a negative number gave 0; JavaScript gives NaN.
type f64 = number;
const x: f64 = -2.5;
console.log(Math.log(x), Math.log10(x), Math.log2(x));
