(module
  (type (;0;) (func (param i32) (result i32)))
  (func (;0;) (type 0) (param i32) (result i32)
    (i32.load8_u
      (i32.add
        (local.get 0)
        (i32.const 300))))
  (func (;1;) (type 0) (param i32) (result i32)
    (i32.load8_u
      (i32.add
        (local.get 0)
        (i32.const 300))))
  (memory (;0;) 1)
  (export "memory" (memory 0))
  (export "getb" (func 0))
  (export "getc" (func 1))
  (data (;0;) (offset (i32.const 300)) "zyxwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcbazyxwvutsrqpo"))
