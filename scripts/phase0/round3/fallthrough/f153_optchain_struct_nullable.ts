type i32 = number; type f64 = number;
interface N { v: f64 }
function g(n: N | null): f64 { return n?.v ?? -1; }
const x: N = { v: 3 };
console.log(g(x), g(null));
