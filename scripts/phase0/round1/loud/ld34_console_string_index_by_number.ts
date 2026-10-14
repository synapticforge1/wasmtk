// console.log(s[pos]) with pos: number (an f64) is refused: "console argument: cannot emit the
// expression 's[pos]' as f64". `const ch: string = s[pos]` compiles; Deno prints "e".
type f64 = number;
const s: string = "hello";
const pos: f64 = 1;
console.log(s[pos]);
