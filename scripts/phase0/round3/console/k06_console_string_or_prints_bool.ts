// console.log(e || s) of two strings prints 1 (and `s && e` prints 0); the declaration is refused.
const e: string = "";
const s: string = "ab";
console.log(e || s);
