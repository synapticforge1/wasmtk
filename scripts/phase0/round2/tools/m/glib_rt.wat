(module
  (type (;0;) (func (param i32) (result i32)))
  (func $put (type 0) (param $v i32) (result i32)
    global.get 0
    local.get $v
    i32.store
    global.get 0
    i32.const 4
    i32.add
    global.set 0
    global.get 0)
  (memory (;0;) 1)
  (global $cursor (mut i32) (i32.const 1024))
  (export "put" (func 0))
  (export "memory" (memory 0)))
