// The console's join writer takes every element type but f64 / string as i32 (cbufJoinHelper):
// a boolean array prints 1 / 0, a bigint array reads 4-byte slots (`${gs}` of [1n, -2n] is "1,0"),
// a 2-D array prints its rows' addresses. Here: bs.join("|") prints "1|0"; the declaration is refused.
const bs: boolean[] = [true, false];
console.log(bs.join("|"));
