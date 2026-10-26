(module
  (memory 1)
  (func $init (i32.store (i32.const 64) (i32.const 42)))
  (start $init)
  (func (export "get") (result i32) (i32.load (i32.const 64)))
)
