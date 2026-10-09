// sin / cos / tan of a large argument, and pow / expm1 / cosh / sinh, trapped
// ("float unrepresentable in integer range"): range reduction truncates to i32.
type f64 = number;
const big: f64 = 1e10;
const nb: f64 = -2.5;
const three: f64 = 3;
console.log(Math.sin(big), Math.cos(big), Math.tan(big));
console.log(Math.pow(nb, three), Math.expm1(big), Math.cosh(big), Math.sinh(big));
