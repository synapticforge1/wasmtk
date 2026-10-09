// A struct literal containing `null`, pushed into a struct array, did not compile (the literal
// was not "constant", and the runtime path's temp local was undeclared there).
type i32 = number;
interface Rec { a: i32 | null; b: i32 }
function main(): void {
  const recs: Rec[] = [];
  recs.push({ a: null, b: 2 });
  console.log(recs[0].b);
}
main();
