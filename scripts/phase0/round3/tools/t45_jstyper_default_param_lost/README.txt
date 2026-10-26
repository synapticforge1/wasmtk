t45 SILENT-WRONG (jstyper)

A JS default parameter value is discarded: `function add(a, b = 10)` with
`declare function add(a: i32, b?: i32): i32` becomes `function add(a: i32, b?: i32): i32`.

Command (in this folder):
  deno run use_js.mjs                   -> 15
  W jstyper calc.js
  W wasic use.ts ; W run use.wasm

Expected: 15 (`= 10` kept: `b: i32 = 10`).
Observed: calc.ts has `b?: i32` and no default; use.wasm prints 5. Exit 0 throughout.

Root: src/jstyper.ts:248-262 builds the parameter list from the .d.ts only; the JS parameter
text (`b = 10`, parsed at :103) is thrown away.
