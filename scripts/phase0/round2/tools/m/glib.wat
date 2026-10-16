(module
  (memory 1)
  (global $cursor (mut i32) (i32.const 1024))
  (func $put (param $v i32) (result i32)
    global.get $cursor
    local.get $v
    i32.store
    global.get $cursor
    i32.const 4
    i32.add
    global.set $cursor
    global.get $cursor)
  (export "put" (func $put))
  (export "memory" (memory 0)))
