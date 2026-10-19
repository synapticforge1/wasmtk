// Audit round 2, sw106 (2026-10-19): `finally` runs on EVERY way out of try / catch, as JavaScript.
// It ran only on fall-through and on an uncaught throw from the try body; a `return`, `break` or
// `continue` jumped past it, and so did a throw from the catch body. A return's value is evaluated
// before the finally runs; nested finally blocks run innermost first; a loop INSIDE the try does
// not run the finally on its own break.
type i32 = number;
type f64 = number;

// a throw from catch
let log: i32 = 0;
try {
  try {
    throw new Error("a");
  } catch (e) {
    log += 1;
    throw new Error("b");
  } finally {
    log += 10;
  }
} catch (e2) {
  log += 100;
}
console.log(log);

// return from try and from catch
log = 0;
function f(x: i32): i32 {
  try {
    if (x > 5) throw new Error("big");
    log += 1;
    return x;
  } catch (e) {
    log += 10;
    return -1;
  } finally {
    log += 100;
  }
}
const a: i32 = f(1);
const b: i32 = f(9);
console.log(a, b, log);

// break / continue out of try
log = 0;
for (let i: i32 = 0; i < 3; i++) {
  try {
    if (i === 1) continue;
    if (i === 2) break;
    log += 1;
  } finally {
    log += 10;
  }
}
console.log(log);

// nested: innermost first
log = 0;
function nested(): i32 {
  try {
    try {
      return 1;
    } finally {
      log = log * 10 + 2;
    }
  } finally {
    log = log * 10 + 3;
  }
}
console.log(nested(), log);

// the return value is taken before the finally runs
log = 0;
function valueFirst(): i32 {
  let v: i32 = 5;
  try {
    return v;
  } finally {
    v = 99;
    log += 1;
  }
}
console.log(valueFirst(), log);

// a loop inside the try breaks without running the finally
log = 0;
function innerLoop(): i32 {
  try {
    for (let i: i32 = 0; i < 10; i++) {
      if (i === 3) break;
      log += 1;
    }
    return log;
  } finally {
    log += 100;
  }
}
console.log(innerLoop(), log);

// labeled continue / break across a finally
log = 0;
outer: for (let i: i32 = 0; i < 3; i++) {
  for (let j: i32 = 0; j < 3; j++) {
    try {
      if (j === 1) continue outer;
      if (i === 2) break outer;
      log += 1;
    } finally {
      log += 10;
    }
  }
}
console.log(log);

// f64, void and string results
function half(x: f64): f64 {
  try {
    if (x < 0) throw new Error("neg");
    return x / 2;
  } catch (e) {
    return -1.5;
  } finally {
    log += 1000;
  }
}
console.log(half(3), half(-1), log);
let hits: i32 = 0;
function voidRet(n: i32): void {
  try {
    if (n > 0) return;
    hits += 1;
  } finally {
    hits += 10;
  }
}
voidRet(1);
voidRet(0);
console.log(hits);
function sign(n: i32): string {
  try {
    if (n > 0) return "pos";
    return "nonpos";
  } finally {
    hits += 100;
  }
}
console.log(sign(1), sign(0), hits);

// continue in a while loop; finally-only with the throw caught outside
let w: i32 = 0;
while (w < 5) {
  try {
    w++;
    if (w % 2 === 0) continue;
    hits += 1000;
  } finally {
    hits += 1;
  }
}
console.log(hits);
try {
  try {
    throw new Error("x");
  } finally {
    hits += 5;
  }
} catch (e) {
  hits += 50;
}
console.log(hits);
