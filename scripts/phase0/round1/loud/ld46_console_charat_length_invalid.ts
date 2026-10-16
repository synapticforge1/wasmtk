// console.log of charAt(...).length builds an invalid module (2026-10-15; the same on main).
type i32 = number;
const s: string = "hello";
const far: i32 = 10;
console.log(s.charAt(far).length);
