// console.log(v === null) for a nullable local holding 0 printed `true`: the console compared
// the VALUE with 0 instead of reading the local's `__null` flag (wasic's own `if` was right).
type i32 = number;
const v: i32 | null = 0;
console.log(v === null);
