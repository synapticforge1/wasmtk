// Math.sin(-0) and Math.tan(-0) gave 0; JavaScript keeps -0.
type f64 = number;
const z: f64 = -0;
console.log(Math.sin(z), Math.tan(z));
