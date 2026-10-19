// @expect-fail: compile
// Audit round 2, sw77 (2026-10-19): a spread literal spreads array VARIABLES. Spreading another
// expression (a call here) is refused at compile time with a message that names it ("a spread of
// 'mk()' is not supported"). Native TS prints "1,2,3".
type i32 = number;
function mk(): i32[] {
  return [1, 2];
}
const a: i32[] = [...mk(), 3];
console.log(a.join(","));
