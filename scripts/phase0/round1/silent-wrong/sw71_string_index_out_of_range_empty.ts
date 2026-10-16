// An out-of-range string index gives "" where JavaScript gives undefined (found fixing ld34,
// 2026-10-15). A fractional index (s[1.5]) is the owner's question under D3, so it is not here.
type i32 = number;
const s: string = "hello";
const far: i32 = 10;
console.log(s[far]);
const a: string = s[far];
console.log(a);
