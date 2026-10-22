// Audit round 2 (2026-10-22), loud rows that refused valid statements and expressions:
//   ld71  `++x` / `x--` as a VALUE (console.log(++n), `while (m-- > 0)`, `const a = x++`): a number
//         local or module global, f64 and bigint included;
//   ld72  compound assignment and `++` / `--` on an ELEMENT or an element's field (`arr[i] += 10`,
//         `arr[0]++`, `ps[1].x += 5`, `fs[0] **= 3`, a string element's `+= "!"`); an index with a
//         side effect is refused rather than evaluated twice;
//   ld73  a one-line `do { … } while (…);`, and a brace-less `do x; while (…);`;
//   ld78  a default that reads an earlier parameter (`b: i32 = a * 2`), and a `for` header with
//         two declarations and two updates (`let i = 0, j = 10; …; i++, j--`).
type i32 = number;
type f64 = number;

let g: i32 = 10;
function bump(): i32 {
  return g++ + ++g;
}
interface P {
  x: i32;
  y: f64;
}
function h(a: i32, b: i32 = a * 2, c: i32 = a + b): i32 {
  return a * 100 + b * 10 + c;
}
function main(): void {
  let n: i32 = 5;
  console.log(++n, n++, n, n--, --n);
  let f: f64 = 1.5;
  const a: f64 = f++;
  const b: f64 = --f;
  console.log(a, b, f, f++ * 2, f);
  let big: bigint = 5n;
  const bb: bigint = big++;
  console.log(bb, big, --big);
  console.log(bump(), g);
  let m: i32 = 3;
  let s: i32 = 0;
  while (m-- > 0) s += m;
  console.log(s, m);

  const xs: i32[] = [1, 2, 3, 4];
  let i: i32 = 0;
  xs[i++] = 9;
  xs[i] += 5;
  xs[2]++;
  --xs[3];
  console.log(xs.join(","), i, `${i--}|${i}`);
  const ps: P[] = [{ x: 1, y: 0.5 }, { x: 2, y: 1.5 }];
  ps[1].x += 5;
  ps[0].y *= 4;
  ps[0].x--;
  const ss: string[] = ["a", "b"];
  ss[1] += "!";
  ss[0] = ss[0] + ss[1] + "?";
  const fs: f64[] = [2, 3];
  fs[0] **= 3;
  fs[1] -= 0.5;
  console.log(ps[1].x, ps[0].y, ps[0].x, ss.join(","), fs.join(","));

  let k: i32 = 0;
  do { k += 4; } while (k < 10);
  do k++; while (k < 13);
  console.log(k);
  let t: i32 = 0;
  for (let p: i32 = 0, q: i32 = 6; p < q; p += 2, q--) t += p * q;
  for (let u: i32 = 1, v: i32 = u * 2; u < 4; u++) t += v;
  console.log(t);
}
main();
console.log(h(1), h(1, 5), h(2, 3, 4));
