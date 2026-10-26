type i32 = number;
const s: string = String.fromCharCode(72, 105, 33);
const c: i32 = "AZ".charCodeAt(1) - "AZ".charCodeAt(0);
const t: string = String.fromCharCode(65 + c);
console.log(s, c, t);
