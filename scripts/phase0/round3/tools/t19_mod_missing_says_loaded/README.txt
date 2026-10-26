t19 LOUD (misleading message)  `mod <file>` with no function prints "✅ Module loaded" before loading anything
W = deno run -A --config BASE/deno.json BASE/main.ts

Command:
  W mod missing.wasm

Expected: only the error, exit 1.
Observed:
  ✅ Module loaded. To call a function, use: wasmtk mod missing.wasm <function> [args...]
  ❌ Info error: NotFound: The system cannot find the file specified. (os error 2): readfile 'missing.wasm'
exit 1 (correct), but the first line claims success for a file that does not exist (also for a
file that is not wasm).

Root cause: main.ts:454-457 prints the success line, then calls showInfo, which does the loading.
