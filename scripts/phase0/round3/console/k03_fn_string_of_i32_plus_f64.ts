// Inside a function, String(i32 + f64) converts an i32 sum ("9" for "9.5"); at top level it is right.
// The same in a template stored to a string: `const s: string = `${a + x}`` is "9" in a function.
type i32 = number; type f64 = number;
function main(): void {
  const a: i32 = 7;
  const x: f64 = 2.5;
  console.log(String(a + x));
}
main();
