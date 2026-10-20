/**
 * @module wast_known_unbuilt
 * @description The vendored spec corpus's files whose modules do not build TODAY, with how many
 * (the owner's rule 3 of 2026-10-19, ld88, option C: `wasmtk wast` exits 1 on an unbuilt module
 * that is not on a known-unbuilt list, and on a run that finds 0 files). Each count is a ceiling:
 * fewer unbuilt modules is progress and passes; more, or a file not listed, fails the run.
 *
 * These are toolchain / engine gaps, not wasmtk defects: proposals V8 runs only behind a flag
 * (custom descriptors, exact types, wide arithmetic), the custom-page-sizes proposal V8 does not
 * implement, and memories / tables above V8's limits. Measured 2026-10-19 on binaryang 1.12.1 with
 * Deno 2.9.7 (V8 15.0.245.2), tests/module/wasm_wast/testsuite-main. Re-measure after a backend
 * or Deno bump, and lower a count when a module starts to build.
 */
export const KNOWN_UNBUILT: Readonly<Record<string, number>> = {
  "memory64.wast": 2,
  "array_new_exact.wast": 1,
  "binary-descriptors.wast": 2,
  "br_on_cast.wast": 1,
  "br_on_cast_desc_eq.wast": 5,
  "br_on_cast_desc_eq_fail.wast": 5,
  "br_on_cast_fail.wast": 1,
  "descriptors.wast": 7,
  "exact-casts.wast": 3,
  "exact-func-import.wast": 8,
  "exact.wast": 16,
  "ref_cast_desc_eq.wast": 3,
  "ref_get_desc.wast": 7,
  "struct_new_desc.wast": 8,
  "custom-page-sizes-invalid.wast": 1,
  "custom-page-sizes.wast": 12,
  "memory_max.wast": 4,
  "memory_max_i64.wast": 4,
  "wide-arithmetic.wast": 2,
  "table.wast": 1,
  "table64.wast": 1,
};
