type i32 = number; type f64 = number;
const xs: f64[] = [1.5, 2.5, 3.5, 4.5];
const a: f64[] = xs.slice(1, -1);
const al: i32 = a.length;
const a0: f64 = a[0];
console.log(al, a0);
