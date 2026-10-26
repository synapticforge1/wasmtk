t12 SILENT-WRONG  wasmbundle (and the wasic merge, same function) drops a module's `(start …)`
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm startmem.wat -o startmem.wasm
  W mod startmem.wasm get                    -> 42
  W wasmbundle startmem.wasm -o smb.wasm      (exit 0, "1 module(s) bundled")
  W mod smb.wasm get                         -> 0

startmem.wat: a start function stores 42 at address 64; get() loads it.

Expected: 42 from the bundle (the start function kept and run, e.g. called from a synthesized
start), or a refusal ("a merged module's start function is not supported").
Observed: 0, exit 0. `wasm-tools print smb.wasm` has no start section; the init function is gone.

Root cause: src/wasmmerge.ts:1109 "Everything else (table, elem, tag, etc.) — skip": a `start`
form is dropped without a notice, and its function, unexported, is never called.
