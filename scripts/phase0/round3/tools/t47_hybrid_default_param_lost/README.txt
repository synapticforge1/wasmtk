t47 SILENT-WRONG (hybrid)

A `// @wasm` function with a default parameter: the host call that omits it passes `undefined`
through the binding, the wasm sees 0.

Command (in this folder):
  deno run app.ts                       -> 8 / 15
  W hybrid app.ts --auto ; deno run --allow-read app_runner.ts   -> undefined / 5
  (also without --auto: the // @wasm on addd routes it)

Expected: addd(5) = 15.
Observed: 5, exit 0. The only message is "'addd' forced // @wasm but parameter type 'i32 = 10'
may not be wasic-compatible", and the build then reports done; the core compiled fine and
its WIT says `addd: func(a: s32, b: s32)`.

Root: src/hybrid.ts:388-461 rewriteWasmCalls rewrites `addd(5)` to `lib.addd(5)` without
supplying the default; the binding (bindgen) passes `undefined` -> 0. A routed function's
defaults are not carried to the host side (nor is the function refused).
