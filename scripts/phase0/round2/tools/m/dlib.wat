(module
  (memory 1)
  (func $getb (param $i i32) (result i32)
    local.get $i
    i32.const 300
    i32.add
    i32.load8_u)
  (export "getb" (func $getb))
  (export "memory" (memory 0))
  (data (i32.const 300) "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKL"))
