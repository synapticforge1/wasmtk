// A whole string / boolean / bigint array as a console.log argument is REFUSED ("printing a whole
// string[] array is not supported yet; print its elements"). Before sw66 these printed their
// address, or (a returned array) their element bits as i32 numbers. Deno prints
// [ "a", "b" ] / [ true, false ] / [ true ] / [ 1n, 2n ]: wasic needs writers for these elements
// (strings quoted as util.inspect quotes them; scripts/console/inspect_array_ref.ts has the rule).
// (Opened with the sw66 fix, 2026-10-13.)
type i32 = number;
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
