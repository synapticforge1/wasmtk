// A long numeric array: Deno (and Node) print it over several aligned lines, six or more numbers
// per row when the one-line form passes ~72 characters; wasic's array writer always prints one
// line. The owner's M3 (2026-10-13) keeps the Deno / Node layout, so this is wasic's to match.
// (Found fixing sw62, 2026-10-13. Reachable today only through a function's returned array,
// since an array variable prints its address: sw66.)
type i32 = number;
function make(): i32[] {
  const a: i32[] = [];
  for (let i: i32 = 0; i < 40; i++) a.push(i * 1000);
  return a;
}
console.log(make());
