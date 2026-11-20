# roadmap — part 5 of 5

Continues [roadmap.md](roadmap.md) (split by size on 2026-11-20, letter H38). Sections:

- TypeScript feature gaps compilable later (now scheduled — see "Priorit

## TypeScript feature gaps compilable later (now scheduled — see "Prioritized execution order")

Utility types (`Partial`/`Record`/…), destructuring in params, `Number.parseInt`/`parseFloat`, `in`
operator, nested destructuring. As of 2026-06-03 these are no longer unscheduled — they are
sequenced into **Phases 51–53** above (foundational subset gates the async + own-runtime tracks).
Done so far: **Phase 51 COMPLETE** (`instanceof` + object spread + param/nested destructuring +
utility types) and **Phase 52 COMPLETE 2026-06-11** (`void` / chained assignment / `in` /
`Array.from`-`of`-`isArray` / `String.fromCodePoint`). A **pre-publish hardening pass (2026-06-12)**
then made the emitter's terminal "give-up" fallbacks record a diagnostic (abort) instead of silently
emitting `0`/`""` — which surfaced + FIXED a real latent bug (brace-less / single-line-braced `else`
chains after a single-line `if` were dropped; regression `15_ElseChainForms`), plus
`instanceof
<built-in>` and dead-code/orphaned-module removal, then a console.log comparison fix
pass (findTopLevelOp paren-tail bug + string ===/!== operands + member-target chained assignment).
Suite **309/309**, bindgen 104/104, jstyper 73/73. **Phase 53 COMPLETE 2026-06-15**
(`Number.parseInt`/`parseFloat` + bare forms; multi-level interface inheritance, declaration-order
independent). **ABI forward-alignment (return side) COMPLETE 2026-06-15.** **#12 loaders — COMPLETE
2026-06-24: all 10 universalWasmLoader ports
(`-js`/`-rs`/`-py`/`-jvm`/`-dart`/`-c`/`-zig`/`-v`/`-go`/`-dotnet`) implemented on SPEC-3.0.0 AND
PUBLISHED to their registries** (JSR / crates.io / PyPI / Maven Central / pub.dev / vcpkg / zigistry
/ VPM / pkg.go.dev / NuGet). **#13 async COMPLETE + PUBLISHED as wasmtk v1.8.0 (2026-06-22; suite
317/317). #14 own dynamic runtime COMPLETE + PUBLISHED (v1.9.0 + Phase 2 in v1.10.0).** Remaining:
the deferred P2 container (browser-native WASI P2 gating); ~~Go bindgen aggregate marshalling~~ (✅
SHIPPED 2026-07-08 — canonical; SPEC §10 bindgen-loader fix); ~~the binaryen-ts asyncify pass +
--lang=go wiring~~ (✅ COMPLETE 2026-07-08 — in-wasm asyncify-import mode in binaryen-ts 1.4.1 +
`gowasic` wiring → goroutine Go with no external binaryen; `tests/go_asyncify_tests.ts`); ~~the
optional utility-types batch~~ (✅ DONE 2026-07-08 — core + `ReturnType`/`Parameters`;
`Exclude`/`Extract` deferred); and the completed **Route A (javyc retirement — v1.11.1)**. Optional #12 polish (SPEC §10
loader-cap propagation) is now COMPLETE across all 10 loader ports (2026-07-05). Full analysis in
CLAUDE.md § "TypeScript Feature Gap Analysis".

**Code-audit sweep 2026-07-08 (three fan-out passes, all suites green — binaryen-ts 401/401, wasi
375/375, bindgen 142, go_bindgen 7/7, hybrid 8/8).** Alongside the Go-bindgen + backend-bump work, a
comprehensive audit of the fresh asyncify/Go/WIT/hybrid/bindgen surface (and this session's own
fixes) found + FIXED: a binaryen-ts `call_indirect` eval-order miscompile + a dropped-`unreachable`
in Flatten; the lossy WIT kebab↔camel round-trip breaking capital-heavy exports (`parseHTML`) in
both the merge overlay and bindgen; and the `hybrid` scanners not being regex/template-aware. Plus
robustness/fail-loud conversions: asyncify now ensures-a-memory / honors `import-globals` / rejects
multi-memory / accepts newline+legacy-alias lists; WIT types fail loud on unknown/aggregate; the
gowasic wasm-opt shim is runtime-agnostic (Bun-safe). New `tests/hybrid_tests.ts` + `kebabcase_50`
bindgen fixture + binaryen-ts asyncify option/memory tests. Details: compiler-bugs.md § "Code-audit
sweep (2026-07-08)", design-decisions.md (hybrid/producer/WIT invariants), binaryen-ts
`cmem/passes.md`.


