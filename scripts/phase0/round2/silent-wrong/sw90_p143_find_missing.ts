type i32 = number; type f64 = number;
const xs: i32[] = [1, 3, 5];
const f: i32 | undefined = xs.find((x: i32): boolean => x > 10);
const ok: boolean = f === undefined;
const fi: i32 = xs.findIndex((x: i32): boolean => x > 10);
console.log(ok, fi);
