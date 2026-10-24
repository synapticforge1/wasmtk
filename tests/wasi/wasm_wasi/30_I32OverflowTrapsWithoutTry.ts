// @expect-fail: run-wasm
// sw119 (owner, 2026-10-24): in a program with NO exception handling of its own (no try / catch,
// no throw), a store into an i32 slot that does not fit writes "RangeError: the result of '*' does
// not fit an i32 (wasMath's i32.mul wraps it)" to stderr and traps: the same message and a
// non-zero exit as the RangeError, and the module needs no exception handling (wazero at its
// defaults refuses a module with a tag). Deno prints 4294967296: the wasm run is EXPECTED to fail.
type i32 = number;

const m: i32 = 65536;
console.log("before");
const sq: i32 = m * m;
console.log(sq);
