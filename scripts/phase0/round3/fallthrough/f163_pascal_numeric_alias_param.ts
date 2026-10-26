type i32 = number; type f64 = number;
type Score = number;
function bump(s: Score): Score { return s + 0.5; }
console.log(bump(2));
