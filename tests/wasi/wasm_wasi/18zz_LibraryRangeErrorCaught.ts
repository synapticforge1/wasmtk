// sw119 (2026-10-24): a merged library's checked i32 store throws a RangeError the program catches,
// with its kind and message (wasmmerge maps the library's exception tag and kind onto the
// program's), and a data-less library stays data-less (its message is built when thrown), so the
// merge relocates none of its constants (sw138). Self-checking via trap-on-failure.
//
// @test-pipeline
// @step modc ../wasm_wasi_bundle/i32check_bundle/sq_lib_modc.ts
// @step wasic ../wasm_wasi_bundle/i32check_bundle/main_wasic.ts
// @step run ../wasm_wasi_bundle/i32check_bundle/main_wasic.wasm
