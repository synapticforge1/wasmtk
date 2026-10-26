t46 SILENT-WRONG (hybrid --auto, modc); root shared with the compiler

A function with typed parameters and NO return annotation is routed by `hybrid --auto`, and the
compiler builds it as a VOID function, so the runner gets `undefined`.

Commands (in this folder):
  deno run app.ts                       -> 8 / 15
  W hybrid app.ts --auto ; deno run --allow-read app_runner.ts   -> undefined / 5
  (the 5 is t47)
  W modc plainlib.ts ; type plainlib.wit   -> `export dbl: func(a: s32);` (no result), exit 0
  W mod plainlib.wasm dbl 4                -> prints nothing, exit 0
  W wasic plain.ts                         -> "type mismatch: expected 1 elements on the stack
                                               but got 0", exit 1 (loud in program mode)

Expected: 8 (the return type inferred as i32, or the function refused / kept in the host).
Observed: `undefined`, hybrid exit 0.

Root: src/hybrid.ts:100 / :109-119 analyzeSignature treats a missing return type as routable;
the compiler (wasic.ts, outside this audit's scope) gives an unannotated function a void result:
silent in library mode, an invalid module in program mode.
