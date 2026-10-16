type i32 = number; type f64 = number;
interface H { big: bigint }
const h: H = { big: 12n };
const d: bigint = -h.big;
console.log(d);
console.log(-h.big);
