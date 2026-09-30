type i32 = number;
function count(s: string): i32 { return s.length; }
const names: string[] = ["a", "bcd", "efgh"];
const w: string = "xy";
console.log(count(w) + count(names[2]));
console.log(count("abc") + count(w));
