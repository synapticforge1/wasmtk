// Self-checking driver for a merged library's RangeError (sw119, 2026-10-24): the library's checked
// i32 store throws wasic's exception, which wasmmerge maps onto THIS program's tag and kind, so the
// program catches it as a RangeError, with its message. Before the mapping the merged module
// referenced a tag it did not have (an invalid module). Trap-on-failure.
type i32 = number;
import { divByYear, sq } from "./sq_lib_modc.wasm";

const guard: i32[] = [0];
function check(cond: i32): void {
  if (cond === 0) {
    const x: i32 = guard[5000000]; // OOB read -> trap -> nonzero exit
    console.log(x);
  }
}

check(sq(3) === 9 ? 1 : 0);
check(divByYear(800) === 70 ? 1 : 0);
let caught: i32 = 0;
let named: i32 = 0;
try {
  sq(65536);
} catch (e) {
  if (e instanceof RangeError) caught = 1;
  const msg: string = e.message;
  if (msg.startsWith("the result of '*'")) named = 1;
}
check(caught);
check(named);
console.log("library RangeError OK");
