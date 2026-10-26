(module
  (func (export "add") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add)
  (func (export "list") (result i32) i32.const 7)
  (func (export "record") (param f64) (result f64) local.get 0)
)
