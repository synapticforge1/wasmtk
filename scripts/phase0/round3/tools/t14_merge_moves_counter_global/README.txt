t14 SILENT-WRONG  wasmbundle / merge sets EVERY mutable i32 global of a non-wasic module to 131072
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm counter.wat -o counter.wasm
  W mod counter.wasm next                    -> 1
  W wasmbundle counter.wasm -o cb.wasm
  W mod cb.wasm next                         -> 131073

counter.wat: (global $n (mut i32) (i32.const 0)); next() increments and returns it.

Expected: 1 (the global's initial value kept; it is a counter, not a heap cursor).
Observed: 131073, exit 0, no notice.

Root cause: src/wasmmerge.ts:1087-1092: when no wasic allocator was unified, ANY global whose
form contains "(mut i32)" has its initial value replaced by 2*65536, on the theory that it is a
private bump pointer. That was fixed for the unified case (comment at :1075-1085, the
0-sentinel bug) but not for this branch. A stack pointer (Zig / TinyGo `__stack_pointer`) is the
intended target; a counter, flag or sentinel is corrupted.
