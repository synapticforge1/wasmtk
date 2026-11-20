# vision — part 2 of 3

Continues [vision.md](vision.md) (split by size on 2026-11-20, letter H38). Sections:

- Projects
- Language Support Matrix

## Projects

### Project 1 — wasmtk (active)

**Repository:** `synapticforge1/wasmtk` (moved from `jrmarcum/wasmtk`, 2026-10-23; JSR scope stays `@jrmarcum`)
**Role:** TypeScript-to-WASM compiler; reference language pillar; polyglot build
orchestrator CLI

**Rust-side sibling toolkit:** `synapticforge1/rsxtk` (crates.io `rsxtk`, v0.4.4 / 2026-04-20,
MIT OR Apache-2.0) — *"A high-performance Rust WASM Toolkit for managing and running
WASI scripts, WAT, and WASM modules."* It is the **Rust producer's build+run driver**:
compiles Rust → `wasm32-wasip1` (+ `.cwasm` precompile), runs via wasmtime. No
WIT/bindgen/component yet (those stay wasmtk's). Distinct from the planned
`universalWasmLoader-rs` *library loader* — rsxtk is a build/run **CLI**. See
[polyglot-producers.md](polyglot-producers.md) § "Rust producer = rsxtk".

Current state: **All 50 phases complete; Stage 0 Canonical ABI alignment *partial* (see
[polyglot-producers.md](polyglot-producers.md) — `cabi_realloc` exported, but return side not yet
canonical; P1 core module + sidecar WIT, not a component);
Stage 0.5 (dual JSR /compat backends) substantively complete; Stage 0.6
(allocator unification in wasmmerge) complete; Stage 0.7 (all five Tier-1 stdlib
capabilities — `Set<i32>` + `Map<i32,i32>` + `JSON` shared-heap libraries + the
`Date` and `RegExp` leaf libraries) shipped, plus feature-level tree-shake (virtual
`wasmtk:<cap>` imports) and `wasmtk hybrid --auto` type-routing.** Historical baseline
under npm:wabt + npm:binaryen: 446/446 tests passing (2026-05-25; 270 wasic +
Go-by-Example + 103 bindgen + 73 jstyper). **Under the then-current (2026-06) dual JSR /compat
stack (`jsr:@jrmarcum/wabt-ts@^1.3.2/compat` +
`jsr:@jrmarcum/binaryen-ts@^1.3.5/compat`; both RETIRED 2026-10-26, letter H28 — the backend is
binaryang, pinned in `deno.json`):** the full `tests/wasi/wasm_wasi`
suite is **309/309** (`core_` 33/33), jstyper 73/73, and **bindgen 104/104** (Phase 53, 2026-06-15,
added `Number.parseInt`/`parseFloat` + multi-level interface inheritance; the ABI return side was
forward-aligned to callee-allocated + `cabi_post`, bindgen 103→104; pre-publish hardening
2026-06-12 added `15_ElseChainForms`; Phase 52, 2026-06-11,
added the leaf conveniences `void`/chained-assignment/`in`/`Array.from`-`of`-`isArray`/
`String.fromCodePoint` + 6 `52_*` tests; Phase 51, 2026-06-05/07,
added `instanceof` + 7 `51_*` tests, incl. the 3 class-construction-gap fixes; `51_ObjectSpread` (51.2)
+ `51_ParamDestructuring` + `51_NestedDestructuring` + `51_NestedTuple` (51.3) + `51_UtilityTypes`
(51.4) added 2026-06-07; `48_SingleLineBraceIf` was the single-line-brace-`if` regression added
2026-06-03). The 7
long-standing failures were all fixed 2026-06-02: `5e`/`19_*` via a wasic value-fallthru
rewrite, and `38_*` via the wabt-ts 1.3.1 hex-float-literal fix (the constants were being
encoded as 0). wabt-ts 1.3.0 had earlier recovered `15_panic` / `18_Multi-Scope`
(call-before-return encoder fix). Compiles
TypeScript to optimized WASM via WAT (assembled by `wabt-ts/compat`, the
JSR-native TypeScript port of wabt) and Binaryen `-Oz` (via `binaryen-ts/compat`,
the JSR-native TypeScript port of binaryen). Both compat modules deliberately
mirror their upstream npm shape so wasmtk's deno.json is the single switch point —
flipping back to `npm:wabt` / `npm:binaryen` is a one-line specifier change.
Generates WIT files alongside every compiled module (Phase 41). Phase 50
(`wasmtk bindgen`) generates typed TypeScript host binding files from WIT using
the Canonical ABI (`cabi_realloc`, out-parameter string returns). `wasmtk hybrid`
(prototype) splits a TypeScript file into a WASM core + TS runner.

Remaining additions scoped here:

- All five Tier-1 stdlib capabilities shipped (Set/Map/Date/JSON/RegExp); feature-level
  tree-shake (virtual `wasmtk:<cap>` imports), `hybrid --auto` type-routing, and the §7-#7
  kernel-scope decision (build wasmtk's own dynamic runtime) are all done (2026-06-02). The two
  remaining large tracks are **#5 Promise/async** and the **own dynamic runtime** build — see
  `stdlib-bundling-brief.md` / `roadmap.md`
- `wasmtk build` — polyglot build orchestration command (Stage 3)
- `wasmtk compose` — component composition wrapper (Stage 3)
- `wasmtk setup <language>` — language recipe installer (Stage 4)
- `wasmtk port <component> --to <language>` — porting scaffold (Stage 4)
- `[wasmtk]` section support in `pixi.toml` (Stage 3)

---

### Project 2 — universalWasmLoader (next active project)

**Repository:** `jrmarcum/universalWasmLoader`
**Role:** JS/TS host runtime; reference implementation of the loader spec

Current state: `wasm_import(path, importObject?)` handles Node, Deno, Bun, browsers,
and TypeScript via fetch + WebAssembly API.

The ABI translation reference is now available: `wasmtk/src/bindgen.ts` (Phase 50)
implements the Canonical ABI — string encoding via `cabi_realloc`, string returns via
the out-parameter convention (caller allocates an 8-byte return area via
`cabi_realloc(0,0,4,8)`, passes its address as the trailing arg, callee writes ptr+len),
bool normalization, numeric passthrough, and import callback wiring. universalWasmLoader
Stage 1 replicates this at runtime (reading WIT dynamically) rather than at compile time
(code generation).

Additions scoped here (Stage 1):

- `wit-parser.js` — regex-based WIT parser; same format wasmtk emits (see architecture.md)
- `abi.js` — ABI encode/decode utilities; primary `"component"` profile matches the
  Canonical ABI in `src/bindgen.ts` exactly (`cabi_realloc`, out-parameter string returns);
  `"raw"` profile for modules not following the Canonical ABI
- Updated `universal-wasm-loader.js` — WIT auto-detection, options interface, ABI
  translation layer, typed export proxy
- Updated `universal-wasm-loader.d.ts` — `WasmImportOptions`, generic return type
- `SPEC.md` — full cross-language specification
- Reference test suite — `.wasm` + `.wit` pairs compiled from wasmtk Phase 50 fixtures

---

### Project 3 — Cross-Language Loaders (new)

**Repositories:** separate repos per language under `jrmarcum/`
**Role:** Per-language host runtimes; each implements the UniversalWasmLoader Spec

**Local checkouts:** all loader repos live under
the sibling folder `../universalWasmLoader/` (each its own git
repo on `main`). Each carries its own portable `cmem/` memory (set up 2026-06-15) and a `cmem/INDEX.md`
with the same "update the project memory" / "look for code issues" triggers as wasmtk.

| Repo                         | Language            | Underlying Runtime | Distribution     |
|------------------------------|---------------------|--------------------|------------------|
| `universalWasmLoader-js`     | TypeScript / JS     | WebAssembly (host) | JSR (+ npm compat) |
| `universalWasmLoader-rs`     | Rust                | wasmtime crate     | crates.io        |
| `universalWasmLoader-py`     | Python              | wasmtime-py        | PyPI             |
| `universalWasmLoader-go`     | Go                  | wazero (native Go; owner-DECIDED default) | pkg.go.dev |
| `universalWasmLoader-jvm`    | Java / Kotlin       | Chicory            | Maven Central    |
| `universalWasmLoader-dotnet` | C# / .NET           | Wasmtime (.NET)    | NuGet            |
| `universalWasmLoader-dart`   | Dart (web-first)    | browser WASM (js_interop) | pub.dev   |
| `universalWasmLoader-c`      | C (Zig/V/Julia)     | wasmtime C API     | header-only      |

Julia uses this loader via Julia's `ccall` FFI to the wasmtime C API — no separate
Julia-specific repo is planned. Julia is Tier 3 (community-contributed or long-term).

### Loader runtime + WASI strategy (owner decisions 2026-06-15)

**Principle: native/server runtimes use wasmtime (engine + built-in WASI + Component-Model-ready);
web/browser runtimes use the host's `WebAssembly` + a hand-rolled minimal WASI-P1 shim.** wasmtime is
preferred for native because it's the de-facto reference runtime, has full built-in WASI, and is the
Component Model runtime. **Exception — `-go` (owner DECISION 2026-09-20): wazero is the
`-go` loader default, because it is native Go** (pure-Go, no cgo, no native lib to distribute). This
supersedes the 2026-06-15 call for **wasmtime-go** (CGO + native lib, chosen then for speed); wazero
is what shipped and it stays.

**SPEC §10 producer-model loader caps (`_initialize` call + minimal WASI-P1 shim) are COMPLETE in ALL
10 ports as of 2026-07-05** — see the ✅ WASI-source column. `-rs` deviated from the originally-planned
`wasmtime-wasi`/`WasiP1Ctx` approach: to avoid changing `Store<()>` → `Store<WasiP1Ctx>` (and pulling
in `wasmtime-wasi`), it hand-rolls a `func_wrap` shim on the existing `Store<()>` instead — same
minimal-invasiveness reasoning as the web ports, just for a different constraint.

| Port(s) | Engine | WASI source (§10.2) |
| --- | --- | --- |
| `-rs` | wasmtime crate | **hand-rolled `func_wrap` shim on `Store<()>`** (no `wasmtime-wasi` dep — chosen for minimal invasiveness; `cc8a5f7`) ✅ |
| `-py` | wasmtime-py | `linker.define_wasi()` + `WasiConfig().inherit_stdout/stderr` on the `Store` (`a51c8da`) ✅ |
| `-go` | **wazero — the DECIDED default** (native Go: pure-Go, no cgo — `c7d9bb0`); supersedes the 2026-06-15 wasmtime-go decision | wazero built-in (`wasi_snapshot_preview1.Instantiate`) ✅ |
| `-c`/`-cpp`, **Zig** | wasmtime C API (Zig via `@cImport`, cleanest) | wasmtime built-in (`wasi_config_new` + `wasmtime_context_set_wasi`) ✅ |
| `-dotnet` | Wasmtime NuGet | wasmtime built-in (`DefineWasi` + `SetWasiConfiguration`) ✅ |
| `-js` | host `WebAssembly` (Deno/Node/browser) | hand-rolled shim (`wasi.js`) ✅ |
| `-dart` **web** | browser `WebAssembly` (js_interop) | hand-rolled shim (`lib/src/wasi.dart`, from Dart closures via `.toJS`; `985039f`) ✅ |
| `-dart` **native** *(future 2nd backend)* | wasmtime C API via `dart:ffi` | wasmtime built-in |
| `-jvm` | **Chicory** (no wasmtime JVM embedding) | `chicory-wasi` (`WasiPreview1` → `toHostFunctions()`; `1e1ecb8`) ✅ |

**Outliers are intentional:** JS and Dart-web can't reach wasmtime (browser/JS host) → host
`WebAssembly` + hand-roll; the JVM has no official wasmtime embedding → pure-Java Chicory + `chicory-wasi`.

**JVM engine decision (owner, 2026-06-15): keep Chicory** over the two alternatives, because the loader
is a drop-in Maven library that must "just work" on any JVM: (a) **Chicory** is pure-Java (one jar, no
native lib, runs on any JVM) and its bytecode-compiler mode (`chicory-compiler`, WASM→JVM bytecode) is
fast *everywhere*; (b) **GraalWasm** is fast *only* with the Graal JIT (on GraalVM) and falls back to a
slower Truffle interpreter on stock HotSpot, plus a heavy polyglot dependency — best only for
GraalVM-centric consumers; (c) **`libwasmtime` via the Java FFM API (Panama, JDK 22+)** would put the
JVM on real wasmtime (peak speed, principle-consistent) but re-introduces the per-platform native-lib
distribution cost (same as dart-ffi) and a JDK-22 floor — a "maybe later if JVM speed becomes
critical," not now. (`-go` now lands the same way: the 2026-06-15 reasoning picked wasmtime-go for
speed, but the owner has since DECIDED on wazero because it is native Go — the portable engine wins
there too.)

**Dart is dual-backend** (the only language spanning both worlds): the current **web** backend is a
native-Dart impl over browser `WebAssembly` (js_interop), and a future **native** backend would use
`dart:ffi` → the wasmtime C API (Dart VM / Flutter desktop+mobile). Selected via conditional imports.
NOTE: Dart-web *could* instead interop-call the published `-js` loader directly, but that re-adds a JS
dependency and only works on web — so the native-Dart web impl we built is preferred; FFI/wasmtime is
native-only (`dart:ffi` is unavailable on the web). **`dart:ffi`→wasmtime native backend + `libwasmtime`
distribution (bundled per-platform binaries / native-assets) is a tracked FUTURE track**, not part of
the §10 propagation (which is now COMPLETE for the web backend — the native backend will inherit
wasmtime's built-in WASI when it ships).

### Per-language publishing / versioning (owner guidance 2026-06-15)

Each loader repo publishes to its language's registry with its own version scheme — there is no
shared `deno task` mechanism across them (only `-js` is a Deno project). Set up a bump+publish flow
per repo when it's ready to release; `-js` is the reference (`deno task bump` → `deno task publish` →
tag `vX.Y.Z` → GitHub Action `deno publish` with provenance).

(Table as a list — Repo · Registry · Version lives in · Bump / publish:)

- `-js` — Registry: JSR — Version lives in: `deno.json` `version` — Bump / publish: ✅ `deno task
  bump` / `deno task publish` — **PUBLISHED 1.0.8** (provenance, score 100)
- `-rs` — Registry: crates.io — Version lives in: `Cargo.toml` `version` — Bump / publish: ✅
  run:-only workflow + `scripts/bump.sh`/`release.sh` (2026-06-15). Secret: `CARGO_REGISTRY_TOKEN`
- `-py` — Registry: PyPI — Version lives in: `pyproject.toml` `version` — Bump / publish: ✅
  implemented **AND PUBLISHED to PyPI** (2026-06-22). run:-only workflow + `pixi run
  bump`/`scripts/release.sh`; secret `PYPI_API_TOKEN` (project-scoped)
- `-go` — Registry: pkg.go.dev — Version lives in: **git tag `vX.Y.Z`** (no version file) — Bump /
  publish: ✅ implemented (wazero, SPEC 3.0.0, 7/7 tests; commit `c7d9bb0`) — **NOT yet published**:
  `git tag vX.Y.Z` + push → proxy auto-indexes (no tag yet)
- `-jvm` — Registry: Maven Central — Version lives in: `build.gradle.kts` `version` — Bump /
  publish: ✅ run:-only workflow + `./gradlew bump`. Secrets: `MAVEN_CENTRAL_USERNAME/PASSWORD` +
  `GPG_PRIVATE_KEY/GPG_PASSPHRASE`; needs `io.github.jrmarcum` namespace verification
- `-dotnet` — Registry: NuGet — Version lives in: `.csproj` `<Version>` — Bump / publish: ✅
  implemented (Wasmtime, SPEC 3.0.0, 7/7 tests; commit `98dcf2f`) — **NOT yet published**: `dotnet
  pack` + `dotnet nuget push` (no tag/CI yet)
- `-dart` — Registry: pub.dev — Version lives in: `pubspec.yaml` `version` — Bump / publish: ✅
  run:-only workflow + `scripts/bump.dart`/`release.sh`. Secret: `PUB_DEV_CREDENTIALS` (from `dart
  pub login`)
- `-c` (C/C++) — Registry: **vcpkg** ([vcpkg.io](https://vcpkg.io/en/)) — Version lives in:
  `vcpkg.json` `version` — Bump / publish: ✅ implemented (header + `ports/` + tests). Publish = a
  vcpkg **port** (`portfile.cmake` + `vcpkg.json`) PR'd to `microsoft/vcpkg` or served from a custom
  registry; the portfile fetches the repo at a tagged ref
- `-zig` — Registry: **zigistry** ([zigistry.dev](https://zigistry.dev/)) — Version lives in:
  `build.zig.zon` `.version` — Bump / publish: ✅ implemented **AND PUBLISHED to zigistry**
  (2026-06-22; own repo `build.zig`/`src/`, indexed by zigistry.dev from the tagged GitHub repo)
- `-v` (vlang) — Registry: **VPM** (V package manager) — Version lives in: `v.mod` `version` — Bump
  / publish: ✅ implemented **AND PUBLISHED** to VPM (own repo: `uwl/` + `v.mod`)

**Maturity (updated 2026-06-22): ALL TEN ports are now real implementations on SPEC 3.0.0** (canonical
callee-allocated string returns + `cabi_post`) — **no stubs remain.** `-js` (reference), `-rs`, `-py`,
`-jvm`, `-dart`, `-c`, `-zig`, `-v`, `-go`, **and `-dotnet`**. Verified against their own test suites
where run: `-js` 24/24, `-rs` `cargo test` 24/24, `-jvm` `./gradlew test` 24/24, `-py` 3 string tests
pass + 13 unrelated pre-existing `.wat`-harness failures, `-dart` `dart test -p chrome` 7/7 in real
Chrome, `-go` 7/7, `-dotnet` 7/7. The remaining #12 gap is **publishing only** — most ports are built
but not yet pushed to their registries:

- **PUBLISHED (4):** `-js` (`@jrmarcum/universal-wasm-loader@1.0.8` on JSR, score 100, provenance
  true); `-v` (vlang) on **VPM**; `-zig` on **zigistry** (owner-confirmed 2026-06-22); `-py` on
  **PyPI** (owner-confirmed 2026-06-22).
- **Completed, NOT yet published (6):** `-rs` (crates.io — `run:`-only CI wired, awaiting
  `CARGO_REGISTRY_TOKEN`); `-go` (pkg.go.dev — needs a `vX.Y.Z` git tag; commit `c7d9bb0`); `-dart`
  (pub.dev — workflow + `scripts/bump.dart` present, no tag); `-dotnet` (NuGet — `.csproj` +
  `Loader.cs`/`Callbacks.cs`/`InstancePool.cs`/`WasmModule.cs`/`Wit.cs`, commit `98dcf2f`, no tag);
  `-jvm` (Maven Central — `run:`-only workflow + **local tags `v0.1.0`/`v0.1.1`/`v0.1.2`**, but per
  owner NOT yet live on Maven Central; pending `io.github.jrmarcum` namespace verification + GPG/
  Sonatype secrets); `-c` (vcpkg — header + `ports/` + tests; needs a port PR / tagged ref).

**`-dotnet`** is implemented **on Wasmtime** (the `.NET` runtime decision is now realized — it had a
`*`-footnote "no `.csproj` yet — stub" that is now obsolete). **`-go` is on wazero by owner
decision** (native Go: pure-Go, no cgo) — it shipped ahead of the 2026-06-15 wasmtime-go call, and
that call is now superseded; no swap to wasmtime-go is planned.
`-dart` is **web-first** (`dart:js_interop` over browser `WebAssembly`; runtime decision RESOLVED
2026-06-15 — a native `dart:ffi` backend is a possible future add). `-c` ships the
`universal_wasm_loader.h` header + vcpkg `ports/` + `tests/`; `-zig` is its own repo
(`build.zig`/`build.zig.zon` + `src/`, vendored `wasmtime.dll`), no longer folded under `-c`. **C/Zig
publishing RESOLVED (owner, 2026-06-15):**
C/C++ → **vcpkg** (vcpkg.io); Zig → **zigistry.dev**. (Both are git-tag/source-fetch ecosystems rather
than upload-a-blob registries — vcpkg via a port that fetches a tagged ref, zigistry via GitHub
indexing of `build.zig.zon`.)

**CI workflow constraint — `run:`-only (learned the hard way 2026-06-15).** The loader repos' org
restricts GitHub Actions to **`jrmarcum`-owned actions**, so any third-party `uses:` step
(`actions/checkout`, `denoland/setup-deno`, …) makes the workflow end in **`startup_failure`** — no
step runs, nothing reaches JSR, yet a local `deno task publish` still creates the tag + GitHub release
(so it *looks* published on GitHub but is absent on the registry). `universalWasmLoader-js` v1.0.6 hit
exactly this when its `publish.yml` was (incorrectly) switched to `actions/checkout@v4` +
`denoland/setup-deno@v2` to "match wasmtk"; reverted to **`run:`-only** steps (`git clone` +
curl-install Deno) and v1.0.8 then published cleanly **with provenance**. So when wiring publish CI for
the other ports, use **`run:`-only** workflows in these repos. (NOTE the asymmetry: the **wasmtk** repo
itself currently DOES allow external `uses:` — its 1.7.0 published with provenance via
`actions/checkout@v4` + `setup-deno@v2` — i.e. the restriction is per-repo, not blindly org-wide.
Verify a repo's Actions policy before assuming either way.)

**`-js` PUBLISHED:** `@jrmarcum/universal-wasm-loader@1.0.8` is live on JSR (package renamed
2026-06-15 from `@jrmarcum/universalwasmloader-js`; `deno.json name` must equal the JSR package name),
**JSR score 100** — `hasProvenance: true`, `percentageDocumentedSymbols: 1.0`.

Every loader exposes the same conceptual API in its language's idiom:

```typescript
// JS/TS   → wasm_import("./module.wasm")
// Python  → wasm_import("./module.wasm")
// Rust    → wasm_import("./module.wasm").await?
// C       → wasm_import("./module.wasm", &exports)

// Go      → WasmImport("./module.wasm")
// Java    → WasmImport.load("./module.wasm")
```

All pass the same reference test suite defined in the spec.

---

### Project 4 — UniversalWasmLoader Spec (new, lives in Project 2 repo)

**File:** `SPEC.md` in `jrmarcum/universalWasmLoader`

**Role:** The cross-language contract that all loaders implement

Sections:

1. **Core interface** — function signature, options shape, return type contract
2. **WIT auto-detection** — path convention, fallback behavior
3. **ABI profiles** — `component` (canonical), `raw`, and future named profiles
4. **Canonical ABI definition** — string params via `cabi_realloc`, string returns via
   out-parameter, bool as i32 0/1, numerics direct
5. **Language port requirements** — what a port MUST implement to be conformant
6. **Reference test suite** — list of test cases with expected inputs/outputs
7. **Versioning** — spec version, compatibility guarantees

---

### Project 5 — Polyglot Build Orchestrator (new, extends wasmtk CLI)

**Lives in:** `synapticforge1/wasmtk` as additional CLI commands

**Role:** The pixi-aware project manager that ties all components together

The `[wasmtk]` section of `pixi.toml` defines components, interfaces, and composition
wiring. wasmtk reads this section and orchestrates the build:

```toml
[project]
name = "my-polyglot-app"
channels = ["conda-forge"]
platforms = ["win-64", "linux-64", "osx-64"]

[dependencies]
rust = ">=1.75"

[pypi-dependencies]
componentize-py = "*"

[tasks]
build = "wasmtk build"
test  = "wasmtk test"
run   = "wasmtk run"

[wasmtk.components]
api    = { language = "typescript", source = "src/api/",    wit = "interfaces/api.wit"    }
ingest = { language = "python",     source = "src/ingest/", wit = "interfaces/ingest.wit" }
engine = { language = "rust",       source = "src/engine/", wit = "interfaces/engine.wit" }
legacy = { language = "c",          source = "src/legacy/", wit = "interfaces/legacy.wit" }

[wasmtk.composition]
ingest -> engine
engine -> api
legacy -> engine

[wasmtk.host]
runtime = "deno"
loader  = "universalWasmLoader"
```

`wasmtk build` reads this manifest, invokes the correct compiler per language, validates
WIT interfaces, composes components, and produces the final `app.wasm`.

---

## Language Support Matrix

| Language    | Compiler Path                            | Component Support       | Recipe Priority |
|-------------|------------------------------------------|-------------------------|-----------------|
| TypeScript  | wasmtk wasic                             | Full (Phase 41 WIT)     | Tier 1          |
| Rust        | wasmtk --lang=rust (init/initmod/modc/build/run/add/remove/list/fmt/clean → rsxtk) | Producer ✅ 2026-06-07 (delegates to rsxtk); bindgen deferred | Tier 1 |
| Python      | componentize-py                          | Full                    | Tier 1          |
| Go          | wasmtk --lang=go (init/modc/run; TinyGo/std; modc→wasm library) | Producer v1 ✅ 2026-06-06; reactor library ✅ 2026-06-07; string/aggregate bindgen deferred | Tier 2 |
| Zig         | wasmtk --lang=zig (init/modc/run; zig build-exe) | Producer ✅ 2026-06-07 (library + wasi program); bindgen deferred | Tier 2 |
| Java/Kotlin | TeaVM or GraalVM                         | Limited                 | Tier 3          |
| V           | v -os wasm                               | Basic                   | Tier 3          |
| Julia       | ccall to wasmtime C API                  | None native             | Tier 3          |

Julia hosts WASM via `ccall` into the wasmtime C API. No Julia-specific loader repo is
planned — Julia consumers use `universalWasmLoader-c` directly.

Tier 1 languages ship with the first build orchestrator release. Tier 2 follow in
subsequent releases. Tier 3 are community-contributed or long-term.

---

