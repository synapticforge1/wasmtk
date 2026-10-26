// Phase 48 bug fix (2026-10-26, audit round 3): switch keeps SOURCE order, nests, and compares
// a case's VALUE.
//   sw149  a `default` that is not last was moved last, changing what falls into what
//   sw150  a nested switch's `case` lines became cases of the outer switch; its closing `}` was
//          dropped and its `break`s taken as the outer case's
//   sw151  `case RED:` (a const string) compared the text "RED"
//   sw152  a switch on a float EXPRESSION truncated it (1.2 matched `case 1`)
type i32 = number;
type f64 = number;

function defaultMiddle(k: i32): i32 {
  let r: i32 = 0;
  switch (k) {
    case 1: r = 1; break;
    default: r = 9;
    case 2: r = r + 2; break;
  }
  return r;
}
console.log(defaultMiddle(1), defaultMiddle(2), defaultMiddle(5));

function defaultFirst(k: i32): i32 {
  let r: i32 = 0;
  switch (k) {
    default: r += 5;
    case 1: r += 1;
  }
  return r;
}
console.log(defaultFirst(1), defaultFirst(7));

enum K { A, B, C }
function enumDefaultMiddle(k: K): i32 {
  let r: i32 = 0;
  switch (k) {
    case K.A: r = 1;
    default: r += 10;
    case K.C: r += 100;
  }
  return r;
}
console.log(enumDefaultMiddle(K.A), enumDefaultMiddle(K.B), enumDefaultMiddle(K.C));

function nestedReturn(a: i32, b: i32): i32 {
  switch (a) {
    case 1:
      switch (b) {
        case 1: return 11;
        default: break;
      }
      return 10;
    default: return 0;
  }
}
console.log(nestedReturn(1, 1), nestedReturn(1, 2), nestedReturn(2, 1));

function nestedBreak(a: i32, b: i32): i32 {
  let r: i32 = 0;
  switch (a) {
    case 1:
      switch (b) {
        case 1: r += 1; break;
        case 2: r += 2; break;
      }
      r += 10;
      break;
    case 2:
      r = 50;
      break;
  }
  return r;
}
console.log(nestedBreak(1, 1), nestedBreak(1, 2), nestedBreak(2, 2), nestedBreak(3, 3));

const RED: string = "red";
function constCase(s: string): i32 {
  switch (s) {
    case RED: return 1;
    case "blue": return 2;
    default: return 0;
  }
}
console.log(constCase("red"), constCase("RED"), constCase("blue"));

function half(n: f64): f64 {
  return n / 2;
}
const x: f64 = 0.6;
let r1: i32 = 0;
switch (x * 2) {
  case 1: r1 = 1; break;
  default: r1 = 3;
}
let r2: i32 = 0;
switch (half(3)) {
  case 1: r2 = 1; break;
  default: r2 = 9;
}
console.log(r1, r2);
