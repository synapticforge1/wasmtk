(module
  (global $g (mut i32) (i32.const 0))
  (global $ver i32 (i32.const 3))
  (func $init (global.set $g (i32.const 42)))
  (start $init)
  (func (export "get") (result i32) (global.get $g))
  (export "version" (global $ver))
)
