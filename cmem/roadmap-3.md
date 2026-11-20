# roadmap — part 3 of 5

Continues [roadmap.md](roadmap.md) (split by size on 2026-11-20, letter H38). Sections:

- Prioritized execution order (set 2026-06-03) (continued)

## Prioritized execution order (set 2026-06-03) (continued, 2)

**Gating summary:** 51 → (13, 14). 52 + 53 COMPLETE; ABI forward-alignment (return side) COMPLETE
2026-06-15; **#13 async track COMPLETE + PUBLISHED as v1.8.0 (2026-06-22)** (13.1a–13.5: full v1
Promise API surface + hybrid lift; suite 317/317; README async surface documented — see lines ~197/
834/1010 of README.md and `CHANGELOG.md`); **#12 loaders — COMPLETE 2026-06-24: all 10
universalWasmLoader ports IMPLEMENTED on SPEC-3.0.0 AND PUBLISHED to their registries** (`-js`→JSR,
`-v`→VPM, `-zig`→zigistry, `-py`→PyPI, `-rs`→crates.io, `-go`→pkg.go.dev, `-dart`→pub.dev,
`-dotnet`→NuGet, `-jvm`→Maven Central, `-c`→vcpkg) — see vision.md. (Remaining #12 polish: SPEC §10
loader-cap propagation, if still open.) **#14 own dynamic runtime — COMPLETE 2026-06-24, NO deferred
pieces.** The whole arc shipped (value model → interpreter → `any` integration → host↔core
marshalling incl. functions → bounded-memory mark-sweep GC → hybrid recycling allocator →
functions-as-`any` producer+proxy+pin, in v1.9.0) — and **Phase 2 (host→core callbacks) SHIPPED
2026-06-24**: a JS function passed INTO the core as `any` is called back via an `env.__host_call`
import (bindgen host-fn table + `dynMakeHostFn`); verified `applyTwice(n=>n+1,10)=12` /
`combine((a,b)=>a*b,6,7)=42` (bindgen `testIntegrationHostFn`). Surfaced+fixed a real wasmmerge bug
(non-WASI imports were spliced after function defs → malformed/OOB; see compiler-bugs.md).
**functions-as-`any` is now bidirectional.** Phase 2 is marshalling, so it does NOT retire `javyc`
(that's the separate Route A track). **`dynrt` is now the PRIMARY dynamic engine; `javyc` is the
FALLBACK.** **Retiring `javyc` from the codebase is a SEPARATE, larger track — FULLY SCOPED in
[dynrt-design.md](dynrt-design.md) "javyc retirement — scoped task breakdown":** `javyc` is now a
thin wrapper around the external Javy/QuickJS CLI whose ONLY wiring is the standalone `wasmtk
javyc`
command (hybrid `--auto` uses dynrt+host, not Javy). Two routes — **Route A (coverage):** grow
`dynrt` via **2e (language: for/for-of/switch/try-catch/arrow/object+array+template
literals/classes/ generators/async — ~10 increments) + 2f (dynamic stdlib + prototype/`this`;
several BRIDGE the existing JSON/Set/Map/RegExp capability libs — ~9 increments) + 2h
(full-dynamic-compile entry + a Javy-parity conformance gate + delete `src/javyc.ts`)** — comparable
in size to the #13 async track; **Route B (policy):** declare full-arbitrary-JS→WASM out of scope
and drop `wasmtk javyc` + the Javy dependency in one small PR (2h only). **The 2g GC prerequisite is
already DONE. ROUTE A CHOSEN (owner, 2026-06-24)** — build order starts at 2e.1 control flow (full
sequence in dynrt-design.md). The other remaining work is the deferred **P2 container** (embed
component type — a terminal wrap; **deferred WAITING FOR BROWSER-NATIVE WASI P2 / Component Model
support** — until browsers load components natively, P1-core stays the browser-compatible artifact
and a P2 wrap buys browser consumers nothing); **#12 loaders COMPLETE 2026-06-24 — all 10 ports
published** (SPEC §10 loader-cap propagation COMPLETE across all 10 ports 2026-07-05); **Go
bindgen** string/aggregate host marshalling **✅ SHIPPED 2026-07-08** (fully canonical vs wasmtime —
existing bindgen marshals TinyGo unchanged; the only fix was SPEC §10 in the bindgen loader), the
**asyncify pass in binaryen-ts + goroutine Go wiring** (✅ **COMPLETE end-to-end 2026-07-08** — the
pass's in-wasm asyncify-import mode shipped in binaryen-ts 1.4.1, and wasmtk's `--lang=go` now
builds goroutine code with `-scheduler=asyncify` + a passthrough shim + `binaryenAsyncify`
(binaryen-ts Asyncify+`-Oz`) → goroutines run with NO external binaryen;
`tests/go_asyncify_tests.ts` `sum: 30`), and the field-reshaping **utility-types** batch — ✅ **DONE
2026-07-08** (`Partial`/`Readonly`/`Required`/`NonNullable`/`Pick`/`Omit`/`Record` shipped in Phase
51.4; `ReturnType`/`Parameters` added via `expandFnUtilityTypes`; `Exclude`/`Extract` deferred — need
string-literal-union types; `51_UtilityTypes.ts`).


