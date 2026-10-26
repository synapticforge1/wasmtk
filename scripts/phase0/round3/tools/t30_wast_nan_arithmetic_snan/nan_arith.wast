;; f32 / f64 results that are SIGNALLING NaNs (quiet bit clear). The spec's nan:arithmetic
;; requires the quiet bit SET, so both assertions must FAIL.
(module
  (func (export "snan32") (result f32) (f32.const nan:0x200000))
  (func (export "snan64") (result f64) (f64.const nan:0x4000000000000))
)
(assert_return (invoke "snan32") (f32.const nan:arithmetic))
(assert_return (invoke "snan64") (f64.const nan:arithmetic))
