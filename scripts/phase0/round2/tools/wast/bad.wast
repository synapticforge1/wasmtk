(module
  (func (export "f") (result i32)
    i32.const 1
    i32.bogus))
(assert_return (invoke "f") (i32.const 2))
(assert_return (invoke "f") (i32.const 1))
