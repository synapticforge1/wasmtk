// Math.* with a bigint argument: TypeScript rejects it and Deno throws
// "TypeError: Cannot convert a BigInt value to a number"; wasic compiled it and printed 4.
// (The @ts-ignore only lets the runtimes be compared.)
const b: bigint = 16n;
// @ts-ignore: deliberate, see above
console.log(Math.sqrt(b));
