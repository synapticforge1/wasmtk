type i32 = number; type f64 = number;
const n: i32 = 3; const m: i32 = 5;
// Owner ruling 2026-09-30: a bare `m / n` of i32s truncates BY DESIGN; only the explicitly
// declared f64 destination below must divide as floats (1.6666666666666667).
const r: f64 = m / n;
console.log(r);
