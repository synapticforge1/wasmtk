// sw44 (2026-10-06): an awaited rejection keeps WHAT was rejected. `Promise.reject("rej")` is a
// string, so the caught value is not an Error (it was `instanceof Error` = true at compile time).
// Kept apart from 15_ThrownKind.ts: with an async main() in a file, the other top-level
// statements are dropped (sw46, open).
import { i32 } from "../../../src/wasmath.ts";

async function main(): Promise<void> {
  try {
    const x: i32 = await Promise.reject("rej");
    console.log("unreached", x);
  } catch (e) {
    console.log("async", String(e), e instanceof Error);
    console.log(`tmpl ${e}`);
  }
}
main();
