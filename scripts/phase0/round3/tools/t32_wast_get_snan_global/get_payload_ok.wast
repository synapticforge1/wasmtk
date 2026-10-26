;; A `get` of a float global holding a signalling NaN, checked against the SAME payload: must PASS.
(module
  (global (export "g32") f32 (f32.const nan:0x200000))
  (global (export "g64") f64 (f64.const nan:0x4000000000000))
)
(assert_return (get "g32") (f32.const nan:0x200000))
(assert_return (get "g64") (f64.const nan:0x4000000000000))
