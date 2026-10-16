(module
  (type (;0;) (func (param i32) (result i32)))
  (func $getb (type 0) (param $i i32) (result i32)
    local.get $i
    i32.const 300
    i32.add
    i32.load8_u)
  (memory (;0;) 1)
  (export "getb" (func 0))
  (export "memory" (memory 0))
  (data (;0;) (offset (i32.const 300)) "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKL"))
