t04 SILENT-WRONG  `mod` / `run lib fn` do not check the argument COUNT: a missing argument is 0, an extra one is dropped
(Related to the known finding (b), negative numbers dropped by parseArgs: this row is the missing
check that makes (b) silent, and it fires without any negative number.)
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm lib.wat -o lib.wasm
  W mod lib.wasm add 5          -> 5, exit 0
  W mod lib.wasm add 1 2 3      -> 3, exit 0
  W run lib.wasm add 5          -> 5, exit 0

Expected: "add takes 2 arguments, 1 given" (and 3 given), exit 1. exportCallArgs already reads
the export's parameter types, so it knows the count.
Observed: as above; the JS call passes undefined (-> 0) or ignores the extra.

Root cause: src/utils.ts:490-518 exportCallArgs loops over `params` (the arguments given), never
comparing params.length with types.length.
