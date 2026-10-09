// bigint bitwise (& | ^) and shifts (<< >>) build an INVALID module: i32.and / i32.shl are
// handed an i64, in console arguments and in declarations alike.
const a: bigint = 7n;
const s: bigint = a << 2n;
const x: bigint = a & 3n;
console.log(s, x);
