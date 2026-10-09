// `f() ?? d` on a `T | null` function never took d (a call on the left of ?? was taken as never
// null), and `return v` of a null nullable local reported a value.
type i32 = number;
function none(): i32 | null { return null; }
function pass(): i32 | null { const v: i32 | null = null; return v; }
console.log(none() ?? -1, pass() ?? -2);
