t13 SILENT-WRONG  wasmbundle drops every non-function export (a global here) without a word
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm startlib.wat -o startlib.wasm
  W wasmbundle startlib.wasm -o sb.wasm
  wasm-tools print sb.wasm

startlib.wat exports the function `get` and the global `version`.

Expected: the bundle exports `version` too, or a notice / refusal that it was dropped (the
sw111 rule: a bundle must not lose an export).
Observed: "✓ startlib.wasm: 1 export(s): get" and "1 export(s)"; sb.wasm exports only memory and
get. exit 0.

Root cause: src/wasmmerge.ts:205-213 extractExportNames matches only `(export "x" (func N))`;
:976 drops every export form; exported globals / tables / tags have no path to the bundle.
(The same startlib also shows t12 and t14: its start-set global reads 131072 in the bundle.)
