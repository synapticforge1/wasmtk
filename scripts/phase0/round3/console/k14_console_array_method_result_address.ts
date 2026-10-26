// console.log of an array METHOD's result (slice, map, concat; a string array's slice too) prints
// an address; the same array in a variable prints as Deno.
type i32 = number;
const xs: i32[] = [3, 1, 4];
console.log(xs.slice(1));
