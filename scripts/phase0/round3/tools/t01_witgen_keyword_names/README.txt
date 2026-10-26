t01 SILENT-WRONG  witgen writes a .wit that no WIT parser accepts when an export is named with a WIT keyword
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  W convert lib.wat            (lib.wat exports add, list, record)
  wasm-tools component wit lib.wit

Expected: the export named `list` written as `%list` (WIT's escape for a keyword), or listed
under "// skipped" as witgen does for any other name it cannot express. The .wit parses.
Observed: convert exits 0 and prints "WIT (wat2wasm, core types): lib.wit". The file contains
  export list: func() -> s32;
  export record: func(p0: f64) -> f64;
and wasm-tools rejects it: "expected an identifier or string, found keyword `list`" (exit 1).
The same applies to the package/world name: a file named list.wasm writes `package local:list;`
and `world list {`.

Root cause: src/witgen.ts:33 WIT_ID accepts any kebab word, keywords included; :119 writes the
export without `%`; :136 / :138 the package and world. Every path that calls emitWitBeside is
affected (convert x.wat, wasic x.wat, wasmbundle, zig / go modc).
