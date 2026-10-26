t43 SILENT-WRONG (jstyper)

A function whose body has a comment containing an apostrophe (`// it's the count`) is dropped
from the output with no warning, though calc.d.ts declares it.

Command (in this folder):
  W jstyper calc.js ; type calc.ts

Expected: calc.ts contains `export function label(n: i32): i32 { ... }` (or a warning).
Observed: exit 0, "wrote calc.ts"; calc.ts has only add and tail; `label` is gone, no message.

Root: src/jstyper.ts:59-83 extractBraceBlock tracks quotes but not comments, so the `'` in the
comment opens a "string" that never closes; it returns null and parseJsFunctions skips the
function silently (:105-106 `if (!body) continue;`).
