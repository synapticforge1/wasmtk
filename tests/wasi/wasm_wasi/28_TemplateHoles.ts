// ld107, ld111 (found 2026-10-23, FIXED the same day). ld107: an arrow inside a template's
// `${…}` was never lifted (templates were opaque to the arrow finder). ld111: a template nested in
// a hole was "Unsupported expression", and a one-statement body returning one was cut at the
// inner backtick (`splitStmts` skipped to the NEXT backtick). The arrow finder must still leave
// `=>` in a template's text, in a string inside a hole, and after a `//` inside a template alone.
type i32 = number;
const xs: i32[] = [3, 1, 4, 1, 5];
const n: i32 = 2;
const who: string = "z";
console.log(`kept ${xs.filter((x: i32) => x > 2).length}`);
console.log(`a => b, ${n} => ${n + 1}`);
console.log(`${n > 1 ? "x => y" : "no"} and ${xs.filter((x: i32) => x > n).length}`);
console.log(`url: http://e.com/${n} // not a comment ${xs.map((x: i32) => x * 2).length}`);
const s: string = `outer {${n}} ${xs.filter((x: i32) => x === 1).length}`;
console.log(s);
function f(): void {
  console.log(`in f: ${xs.filter((x: i32) => x < 4).length} of ${xs.length}`);
}
f();
const t: string = `outer ${`inner ${n}`} and ${`deep ${`x${who}`}`}!`;
console.log(t, `a${`b${n}`}c`);
class P {
  v: string = "";
  set(u: string): void {
    this.v = u;
  }
}
const p: P = new P();
p.set(`m ${`k${n}`}`);
console.log(p.v);
function g(): string {
  return `r${`q${who}`}`;
}
function h(): string {
  const u: string = `r${`q${who}`}`;
  return u;
}
console.log(g(), h());
