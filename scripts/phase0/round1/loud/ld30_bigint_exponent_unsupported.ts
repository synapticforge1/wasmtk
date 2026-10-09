// bigint `**` is unsupported: "cannot emit the expression 'a ** 3n' as i64".
const a: bigint = 7n;
console.log(a ** 3n);
