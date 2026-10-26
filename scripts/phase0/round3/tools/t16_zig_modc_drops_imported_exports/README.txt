t16 SILENT-WRONG  `modc x.zig`: an `export fn` in an imported file is dropped once the root file has one
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory; needs zig)

Command:
  W modc main.zig
  W info main.wasm

main.zig: comptime { _ = @import("more.zig"); }  export fn add(...)
more.zig: export fn mul(...)

Expected: main.wasm exports add and mul (Zig exports both; the module doc says the -rdynamic
fallback exists exactly because exports can live in imported files).
Observed: modc exits 0, "✅ Zig → wasm (wasm32-freestanding library + binaryen -Oz)"; info lists
only add(i32, i32) -> i32. mul is gone, no message; main.wit lists only add.

Root cause: src/zigwasic.ts:96-105 scanExportFns reads the ROOT file only; :156-159 passes
`--export=add` alone, and -rdynamic is used only when the root has no `export fn` at all.
