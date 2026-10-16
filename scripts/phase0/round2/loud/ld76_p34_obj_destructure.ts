type i32 = number; type f64 = number;
interface V { x: i32; y: f64; }
function mk(a: i32): V {
  return { x: a, y: a * 1.5 };
}
const { x, y }: V = mk(4);
const { x: px, y: py }: V = mk(-2);
console.log(x, y, px, py);
