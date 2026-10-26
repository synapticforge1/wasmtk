t31  SILENT-WRONG  wast: the known-unbuilt allowance is keyed by BASENAME, so any user file named
like a vendored corpus file inherits its ceiling (exit 0, ✅, with an unbuilt module)

Command (from this directory):
  deno run -A --config BASE/deno.json BASE/main.ts wast table_user/table.wast

Input: table_user/table.wast is a user's own file (not the vendored corpus) whose one module does
  not build (a custom page size; the same module tests/wast_cli_tests.ts uses as "mine.wast",
  which exits 1).
Expected: exit 1, "not on the known-unbuilt list" (the owner's rule 3, ld88: an unbuilt module not
  on the known list fails the run). The list describes the VENDORED corpus files
  (tests/module/wasm_wast/testsuite-main), per src/wast_known_unbuilt.ts:3-12.
Observed: "⚠ table.wast: … unbuilt-modules=1", then "✅ wast: 1 file(s) — 0 passed, 0 failed,
  1 skipped, 1 unbuilt modules", exit 0. The same content saved as mine.wast exits 1.

Root cause: src/wast.ts:1932-1935 looks the ceiling up by `r.file.split(/[\\/]/).pop()` (the
basename) only; nothing checks that the file is the vendored corpus file. 21 basenames are
affected (table.wast, memory64.wast, exact.wast, custom-page-sizes.wast, … with ceilings 1–16).
