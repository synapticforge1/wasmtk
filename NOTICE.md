# NOTICE

wasmtk is licensed under either of the MIT License ([LICENSE-MIT](LICENSE-MIT)) or the Apache
License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE)), at your option.

## Third-party code included in wasmtk

### fdlibm (Sun Microsystems)

`src/wasm/mathlib.wat` (compiled into `src/wasm/mathlib.wasm` and `src/wasm/mathlib_bytes.ts`,
which the package ships) adapts the trigonometric kernels (`__kernel_sin`, `__kernel_cos`), the
2/π chunk table used for argument reduction, and the `atan` polynomial coefficients of fdlibm.
fdlibm carries this notice, preserved here as it requires:

> Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
>
> Developed at SunSoft, a Sun Microsystems, Inc. business.
> Permission to use, copy, modify, and distribute this
> software is freely granted, provided that this notice
> is preserved.

## Dependencies (not included in the package)

wasmtk's dependencies are resolved from their registries when wasmtk is installed and carry their
own licence files and notices; none of their code is copied into this package. The recorded
inventory, with each licence, is [licences.json](licences.json), checked by
`bun scripts/check-licences.ts`.
