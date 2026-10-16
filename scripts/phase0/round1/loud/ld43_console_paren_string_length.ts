// `.length` of a parenthesised string expression in console.log is refused (2026-10-15).
const s: string = "str";
console.log(("pre" + s).length);
