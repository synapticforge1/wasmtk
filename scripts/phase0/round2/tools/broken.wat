(module
  (func $f (result i32)
    i32.const 1
    i32.bogus_op)
  (export "f" (func $f)))
