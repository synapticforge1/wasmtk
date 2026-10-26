(module
  (import "env" "log" (func $log (param i32 i32)))
  (memory (export "memory") 1)
  (data (i32.const 16) "hello")
  (func (export "go") (call $log (i32.const 16) (i32.const 5)))
)
