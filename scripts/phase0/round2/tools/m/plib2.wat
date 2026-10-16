(module
  (memory 1)
  (func $get (result i32)
    i32.const 1024
    i32.load8_u offset=1)
  (export "get" (func $get))
  (export "memory" (memory 0))
  (data (i32.const 1024) "x(y"))
