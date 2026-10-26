t09 SILENT-WRONG  bindgen drops a function whose WIT name is %-escaped (`export %list: …`)
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm u32lib.wat -o u32lib.wasm
  wasm-tools component wit u32lib.wit        (valid WIT, exit 0)
  W bindgen u32lib.wit
  deno run -A use_u32.ts

u32lib.wit: export %list: func() -> s32;

Expected: ModuleExports has list(), calling the module's `list` export (7).
Observed: "list in binding: undefined"; no message, bindgen exit 0. (`%` is the only legal way to
write a keyword-named function, so fixing t01 / t02 by escaping would make bindgen drop those
functions.)

Root cause: src/bindgen.ts:146 the export / import regex takes the name as `[\w-]+`, which cannot
match `%list`, so the declaration is skipped. :134 (the multi-value guard) has the same pattern.
