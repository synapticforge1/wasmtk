(module
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add)
  (func $add64 (param $a i64) (param $b i64) (result i64)
    local.get $a
    local.get $b
    i64.add)
  (func $fooBar (result i32) i32.const 1)
  (func $foo_bar (result i32) i32.const 2)
  (export "add" (func $add))
  (export "add64" (func $add64))
  (export "fooBar" (func $fooBar))
  (export "foo_bar" (func $foo_bar)))
