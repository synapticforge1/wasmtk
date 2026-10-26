t08 SILENT-WRONG  bindgen accepts `u32` / `u64` but returns the value SIGNED
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm u32lib.wat -o u32lib.wasm
  wasm-tools component wit u32lib.wit        (valid WIT, exit 0)
  W bindgen u32lib.wit
  deno run -A use_u32.ts

u32lib.wit: export big: func() -> u32;     (the module returns i32.const -1)

Expected: big() = 4294967295 (a u32 lifts as unsigned), or a refusal of u32.
Observed: "big() = -1"; bindgen exit 0.

Root cause: src/bindgen.ts:67-79 parseWitType maps u8/u16/u32/char to "s32" and u64 to "s64",
so the signedness is lost; :611-615 returns the raw value. The doc comment at :76 says "all
marshal as a plain JS number", true for parameters, wrong for a result >= 2^31.
