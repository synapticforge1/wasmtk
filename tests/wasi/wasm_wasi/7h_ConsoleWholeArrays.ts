// ld37 (2026-10-15): a whole string, boolean or bigint array as a console.log argument was refused;
// it now prints as Deno prints it. Strings are quoted as util.inspect quotes them (the first of
// " ' ` the text does not hold, with \\ \n \t … escapes), and booleans and strings align LEFT when
// grouped into columns, numbers and bigints right. A string's width counts characters.
// ld44: a string push in a one-line loop at top level used an undeclared temporary.
import { i32 } from "../../../src/wasmath.ts";

const names: string[] = ["a", "b"];
console.log(names);
const flags: boolean[] = [true, false];
console.log(flags);
function mk(): boolean[] {
  const r: boolean[] = [true];
  return r;
}
console.log(mk());
const bs: bigint[] = [1n, 2n];
console.log(bs);
const quotes: string[] = ['say "hi"', "it's", 'both " and \'', "tab\there", "nl\nx", "back\\slash", ""];
console.log(quotes);
const many: string[] = ["alpha", "b", "gamma", "d", "epsilon", "f", "eta", "theta", "i", "kappa", "lambda", "mu"];
console.log(many);
const lots: boolean[] = [true, false, true, true, false, false, true, false, true, true, false];
console.log(lots);
const bigs: bigint[] = [1n, 22n, 333n, 4444n, 5n, 66n, 777n, 8888n, 9n, 10n];
console.log(bigs);
const grown: string[] = [];
for (let i: i32 = 0; i < 30; i++) grown.push("w" + i);
console.log(grown);
const accent: string[] = ["café", "naïve", "x"];
console.log(accent, names.length);
function words(): string[] {
  const w: string[] = ["one", "two"];
  return w;
}
console.log(words());
const empty: string[] = [];
console.log(empty);
