(module
  (global $n (mut i32) (i32.const 0))
  (func (export "next") (result i32)
    (global.set $n (i32.add (global.get $n) (i32.const 1)))
    (global.get $n))
)
