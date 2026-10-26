t06 SILENT-WRONG  `dync x.ts -o x.ts` writes the module over its own source, exit 0
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory; work on a copy)

Command:
  copy prog.ts prog2.ts
  W dync prog2.ts -o prog2.ts

Expected: refused as wasic and modc refuse it ("the output 'prog2.ts' is the input file; pass
another -o", exit 1; measured on the same input: both do).
Observed: "✅ dync (own dynamic runtime): prog2.ts", exit 0; prog2.ts is now 37,798 bytes of wasm
(starts 00 61 73 6D); the source is gone. A WAT is written beside it as prog2.ts.wat.

Root cause: src/dync.ts:47 takes outPath as given; it compiles the generated driver
(`<name>.__dync.ts`) to wasmOut at :80, so compileWasiTs's own input check compares against the
driver, never the user's source. sw113's assertNotInput (src/outpath.ts) is not called here.
