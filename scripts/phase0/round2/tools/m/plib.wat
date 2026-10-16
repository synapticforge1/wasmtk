(module
  (memory 1)
  (func $get (result i32)
    i32.const 1024
    i32.load8_u offset=1)
  (func $twice (param $a i32) (result i32)
    local.get $a
    i32.const 2
    i32.mul)
  (export "get" (func $get))
  (export "twice" (func $twice))
  (export "double" (func $twice))
  (export "memory" (memory 0))
  (data (i32.const 1024) "x(y"))
