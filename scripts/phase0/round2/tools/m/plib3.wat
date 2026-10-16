(module
  (func $twice (param $a i32) (result i32)
    local.get $a
    i32.const 2
    i32.mul)
  (export "twice" (func $twice))
  (export "double" (func $twice)))
