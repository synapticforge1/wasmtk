t15 SILENT-WRONG  wasmbundle writes over one of its INPUTS (default `combined.wasm`, or any -o)
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory; on copies)

Command:
  wat2wasm counter.wat -o combined.wasm
  wat2wasm startmem.wat -o startmem.wasm
  W wasmbundle combined.wasm startmem.wasm         (no -o: the default output is combined.wasm)

Expected: refused as sw113 refuses it for every other writer ("the output … is the input file;
pass -o"), an explicit -o included.
Observed: "✅ 2 module(s) bundled → combined.wasm", exit 0; combined.wasm's hash changed
(D3AEA632… -> EF65CE40…): the input library is replaced by the bundle.
`W wasmbundle a.wasm b.wasm -o a.wasm` does the same.

Root cause: src/wasmbundle.ts:405 writes outputPath with no assertNotInput / samePath check
against `inputs`; main.ts:504 defaults it to combined.wasm. sw113's list of writers did not
include wasmbundle.
