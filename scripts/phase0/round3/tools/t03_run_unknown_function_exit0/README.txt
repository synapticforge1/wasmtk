t03 SILENT-WRONG  `wasmtk run lib.wasm <name> args` with a name the library does not export exits 0, prints nothing
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm lib.wat -o lib.wasm      (or: W convert lib.wat)
  W run lib.wasm addd 1 2           (typo for add)

Expected: as `W mod lib.wasm addd 1 2` does: "no exported function named addd", exit 1.
Observed: no output, exit 0. (`W run lib.wasm` with no function also prints nothing, exit 0.)

Root cause: src/utils.ts:313-333: when `exports[name]` is not a function the library-call branch
is skipped and control falls to :335, `_initialize || _start`; a library has neither, so the
run ends with nothing done and exit 0.
