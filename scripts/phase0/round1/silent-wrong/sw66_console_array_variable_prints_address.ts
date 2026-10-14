// console.log of an ARRAY VARIABLE prints its memory address (`260`), not `[ 1, 2, 3 ]`, for every
// element type, at top level or in a function. Only a function call's returned array becomes an
// array printout (parseSingleArg's `arrptr`); a variable falls through to the integer path.
// `arr.join("-")` is right. (Found fixing sw62, 2026-10-13; the same on main.)
type i32 = number;
const lit: i32[] = [1, 2, 3];
console.log(lit);
console.log("lit", lit);
const n: number[] = [1.5, 2];
console.log(n);
