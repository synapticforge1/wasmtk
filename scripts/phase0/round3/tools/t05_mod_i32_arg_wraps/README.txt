t05 SILENT-WRONG  `mod` / `run lib fn`: an i32 parameter silently truncates a fraction and wraps an out-of-range value
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm lib.wat -o lib.wasm
  W mod lib.wasm add 1.5 2          -> 3        (1.5 became 1)
  W mod lib.wasm add Infinity 1     -> 1        (Infinity became 0)
  W mod lib.wasm add 4294967297 1   -> 2        (2^32+1 became 1)
All exit 0.

Expected: refused, as the same function does for an i64 parameter ("'1.5' is not an integer
(parameter 1 is i64)", ld87) and as the owner's sw119 rule refuses a value that does not fit an
i32 slot.
Observed: as above.

Root cause: src/utils.ts:509-515: only the i64 branch checks for an integer; every other type is
`Number(p)`, which the JS-to-wasm call converts with ToInt32.
