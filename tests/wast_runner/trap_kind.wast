;; Fixture for tests/wast_runner_tests.ts: the TRAP KIND check (2026-09-30).
;; Each assertion's outcome is known in advance; the test asserts the runner scores it so.

(module
  (memory 1)
  (table 3 funcref)
  (func (export "oob") (result i32) (i32.load (i32.const 65536)))
  (func (export "unreach") (result i32) (unreachable))
  (func (export "div") (param i32) (result i32) (i32.div_s (i32.const 1) (local.get 0)))
  (func (export "call-empty") (result i32) (call_indirect (result i32) (i32.const 2)))
)

;; PASS: a genuine out-of-bounds load, for the spec's out-of-bounds message.
(assert_trap (invoke "oob") "out of bounds memory access")
;; FAIL: `unreachable` is the wrong kind for that message (binaryang 1.8.0's lowering did this).
(assert_trap (invoke "unreach") "out of bounds memory access")
;; PASS: the right kind for its message.
(assert_trap (invoke "div" (i32.const 0)) "integer divide by zero")
;; PASS: the spec interpreter's prefix rule: "uninitialized element 2" is "uninitialized element".
(assert_trap (invoke "call-empty") "uninitialized element 2")
;; SKIP: a message with no mapping is never scored as a pass.
(assert_trap (invoke "unreach") "a trap message no mapping knows")
