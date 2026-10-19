// Audit round 2 (2026-10-19): `let` / `const` are scoped to their block, as JavaScript.
//   sw104 at the top level, a declaration inside a block (a loop or if body) became a module global
//         and its line was dropped: not re-initialised on each pass, and an inner `const x`
//         replaced the outer `x`;
//   sw105 inside a function, a block's `const x` overwrote the outer `x` (locals are flat by name).
// A shadowing declaration now gets its own name for its block; nothing else is renamed.
type i32 = number;
type f64 = number;

// top level: re-initialised on every pass
let total: i32 = 0;
for (let i: i32 = 0; i < 3; i++) {
  let acc: i32 = 0;
  acc += i;
  acc += 10;
  total += acc;
}
console.log(total);
let out: i32 = 0;
for (let i: i32 = 0; i < 4; i++) {
  if (i % 2 === 0) {
    let flag: i32 = 1;
    out += flag;
    flag = 100;
  }
}
console.log(out);
let hits: i32 = 0;
outer: for (let i: i32 = 0; i < 3; i++) {
  let j: i32 = 0;
  while (j < 5) {
    j++;
    if (j === 2) continue outer;
    hits++;
  }
}
console.log(hits);
let count: i32 = 0;
while (count < 3) {
  let step: i32 = 1;
  step += count;
  count += step;
}
console.log(count);

// top level: shadowing
const x: i32 = 1;
let seen: i32 = 0;
if (x > 0) {
  const x: i32 = 50;
  seen = x;
}
console.log(x, seen);
const xs: i32[] = [1, 2, 3];
let sum: i32 = 0;
for (let r: i32 = 0; r < 3; r++) {
  const xs: i32[] = [];
  xs.push(r);
  xs.push(r * 10);
  sum += xs.length + xs[1];
}
console.log(sum, xs.length);
const name: string = "top";
for (let r: i32 = 0; r < 2; r++) {
  let name: string = "loop";
  name = name + r;
  console.log(name);
}
console.log(name);

// in a function
function main(): void {
  const x: i32 = 1;
  let seen: i32 = 0;
  if (x > 0) {
    const x: i32 = 50;
    seen = x;
  }
  console.log(x, seen);
}
main();
interface P {
  x: i32;
  y: i32;
}
function f(): void {
  const x: i32 = 1;
  const s: string = "outer";
  if (x > 0) {
    const x: i32 = 2;
    const s: string = "inner";
    const p: P = { x: x * 10, y: x };
    const q: P = { x, y: 7 };
    console.log(`in: ${x} ${s} ${p.x} ${p.y} ${q.x} ${q.y}`);
    if (x === 2) {
      const x: i32 = 3;
      console.log("deep", x);
    }
    console.log("mid", x);
  }
  console.log("out", x, s);
  const i: i32 = 100;
  for (let i: i32 = 0; i < 2; i++) {
    console.log("loop", i);
  }
  console.log("i", i);
  if (i > 0) {
    const t: i32 = 5;
    console.log("t", t);
  }
  if (i > 0) {
    const t: i32 = 6;
    console.log("t", t);
  }
}
f();
// a block declaration shadowing a PARAMETER
function g(n: i32): i32 {
  let acc: i32 = 0;
  for (let k: i32 = 0; k < n; k++) {
    const n: i32 = k * 2;
    acc += n;
  }
  return acc + n;
}
console.log(g(4));
