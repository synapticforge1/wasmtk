// A closure that mutates a captured PARAMETER (or an f64 local) still copies it: the change is
// lost after each call. sw32's box covers declared i32 / bool locals only.
type i32 = number;
function adder(base: i32) {
  return { add: (x: i32) => { base += x; return base; } };
}
const ad: { add: (x: i32) => i32 } = adder(100);
console.log(ad.add(1), ad.add(2));
