;; Fixture for tests/wast_runner_tests.ts: custom-page-sizes lowering (2026-09-30).
;; V8 does not implement custom page sizes. With `lowerCustomPageSizes`, the runner lowers a module
;; V8 refuses for that reason and runs it; without it, the module is an engine skip.

(module
  (memory 0 (pagesize 1))
  (func (export "size") (result i32) (memory.size))
  (func (export "grow") (param i32) (result i32) (memory.grow (local.get 0)))
  (func (export "load") (param i32) (result i32) (i32.load8_u (local.get 0)))
)

(assert_return (invoke "size") (i32.const 0))
(assert_return (invoke "grow" (i32.const 3)) (i32.const 0))
(assert_return (invoke "size") (i32.const 3))
;; Byte 3 is past a 3-byte memory: out of bounds, and it must trap as that KIND.
(assert_trap (invoke "load" (i32.const 3)) "out of bounds memory access")

;; A validity question: NEVER lowered (lowering could make an invalid module valid). 2 is a power
;; of two the proposal does not allow (only 1 and 65536), so the module is INVALID; binaryang's
;; validator decides it with or without the option. (A page size of 3 is MALFORMED text, a parse
;; error, which is `assert_malformed` in the spec's own file.)
(assert_invalid (module (memory 0 (pagesize 2))) "invalid custom page size")
