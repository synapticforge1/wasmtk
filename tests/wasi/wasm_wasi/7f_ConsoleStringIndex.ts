// ld34 (2026-10-15): a string indexed inside console.log, `s[i]`, was refused ("cannot emit the
// expression 's[i]' as f64") for every index type, while `const ch: string = s[i]` compiled. The
// console now builds the character with wasic's string resolver, as the declaration does.
// sw71 (2026-10-15): an index out of range gives undefined, as in JavaScript (it gave ""), and the
// owner's rule the same day: a FLOAT index is a compile error (typed_decl_tests asserts it).
import { i32 } from "../../../src/wasmath.ts";

const s: string = "hello";
const i: i32 = 1;
const pos: i32 = 2;
console.log(s[i]);
console.log(s[i + 1], s[pos]);
console.log("x" + s[pos], `<${s[0]}>`);
function at(t: string, p: i32): void {
  console.log(t[p], t[p + 1]);
}
at(s, 3);
let word: string = "abc";
for (let k: i32 = 0; k < 3; k++) console.log(k, word[k]);
word = "xyz";
console.log(word[2]);

const far: i32 = 10;
const neg: i32 = -1;
console.log(s[far], s[neg], "x" + s[far], `<${s[far]}>`);
const a: string = s[far];
console.log(a, "y" + a, a === undefined, a !== undefined, s[far] === undefined, s[1] === undefined);
const b: string = s[1];
const ca: string = s.charAt(far); // charAt out of range is "", not undefined
console.log(b === undefined, b !== undefined, ca.length, ca === undefined);
function pick(t: string, j: i32): string {
  return t[j];
}
console.log(pick(s, 4), pick(s, 5));
