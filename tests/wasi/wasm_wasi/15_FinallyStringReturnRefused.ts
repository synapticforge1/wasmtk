// @expect-fail: compile
// sw106 (2026-10-19): a string-returning function hands its result back through two globals, and
// a `finally` that calls another string-returning function would overwrite them before the caller
// reads them. That combination is refused at compile time. Native TS prints "x a".
function other(): string {
  return "a";
}
let seen: string = "";
function f(): string {
  try {
    return "x";
  } finally {
    seen = other();
  }
}
const r: string = f();
console.log(r, seen);
