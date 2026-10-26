t02 SILENT-WRONG  wasic's own .wit (modc / wasic of a .ts) uses WIT keywords as bare identifiers
(The code is in src/wasic.ts generateWit; it may also belong to the compiler auditor's area.)
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  W modc kw.ts
  wasm-tools component wit kw.wit

kw.ts:  export function list(type: i32, from: i32): i32 { return type + from; }

Expected: a .wit that parses (`%list`, `%type`, `%from`), or a refusal.
Observed: modc exits 0, "WIT: ./kw.wit". The file says
  export list: func(type: s32, from: s32) -> s32;
wasm-tools: "expected an identifier or string, found keyword `list`" (exit 1). Parameter names
`type` and `from` are keywords too (the same error once the export is renamed).
bindgen reads this file without complaint, so the defect shows only to a real WIT consumer.

Root cause: src/wasic.ts:25422 (export name), :25428 / :25431 / :25434 (parameter names) and
:25395 / :25400 (package / world) write toKebabCase(name) with no keyword escape.
