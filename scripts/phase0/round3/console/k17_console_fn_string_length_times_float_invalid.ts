// Inside a function, console.log(s.length * 0.5) (or `s.length + x`, `p.s.length + s.length`) builds
// an invalid module: the string local's `.length` operand is `(local.get $s_len)`, an i32, inside an
// f64 op. At top level it is right, and the declaration is right in both.
function main(): void {
  const s: string = "ab";
  console.log(s.length * 0.5);
}
main();
