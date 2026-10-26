// Inside a function, `const t: string = `${-a}`` builds an invalid module; console.log(`${-a}`) is right.
type i32 = number;
function main(): void {
  const a: i32 = 7;
  const t: string = `${-a}`;
  console.log(t);
}
main();
