// ld34 (2026-10-15): a string indexed inside console.log, `s[i]`, was refused ("cannot emit the
// expression 's[i]' as f64") for every index type, while `const ch: string = s[i]` compiled. The
// console now builds the character with wasic's string resolver, as the declaration does.
import { f64, i32 } from "../../../src/wasmath.ts";

const s: string = "hello";
const i: i32 = 1;
const pos: f64 = 2;
console.log(s[i]);
console.log(s[i + 1], s[pos]);
console.log("x" + s[pos], `<${s[0]}>`);
function at(t: string, p: f64): void {
  console.log(t[p], t[p + 1]);
}
at(s, 3);
let word: string = "abc";
for (let k: i32 = 0; k < 3; k++) console.log(k, word[k]);
word = "xyz";
console.log(word[2]);
