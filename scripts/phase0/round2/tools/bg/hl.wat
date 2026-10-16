(module
  (type (;0;) (func (param i32)))
  (type (;1;) (func (result i32)))
  (import "env" "display_showValue" (func (;0;) (type 0) (param i32)))
  (func (;1;) (type 0) (param i32)
    (call 0
      (i32.mul
        (local.get 0)
        (i32.const 2))))
  (func (;2;) (type 1) (result i32)
    (i32.const -1))
  (memory (;0;) 2)
  (global (;0;) (mut i32) (i32.const 260))
  (export "memory" (memory 0))
  (export "__heap_ptr" (global 0))
  (export "go" (func 1))
  (export "big" (func 2)))
