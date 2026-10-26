type i32 = number; type f64 = number;
class Q { x: f64 = 1; }
const q: Q = new Q();
const s: string = "q=" + q;
console.log(s);
