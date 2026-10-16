type i32 = number; type f64 = number;
interface N { v: i32; next: N | null; }
function nextVal(n: N): i32 {
  return n.next?.v ?? -1;
}
const n2: N = { v: 2, next: null };
const n1: N = { v: 1, next: n2 };
const a: i32 = nextVal(n1);
const b: i32 = nextVal(n2);
console.log(a, b);
