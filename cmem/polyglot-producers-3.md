# polyglot-producers — part 3 of 4

Continues [polyglot-producers.md](polyglot-producers.md) (split by size on 2026-11-20, letter H38). Sections:

- ADR: Go → wasm ingestion path — TinyGo producer, WASI-first, run via w

## ADR: Go → wasm ingestion path — TinyGo producer, WASI-first, run via wasmtk host (2026-06-03)

### Origin

The owner has a set of working PowerShell scripts that build/run Go→wasm via TinyGo (`tgo-wasic.ps1`
= `tinygo build -target=wasip1`; `tgo-run.ps1` = build wasip1 + `wasmtime run`; `tgo-modc.ps1` =
`-target=wasm` browser/`syscall/js`; `tgo-init-*.ps1` scaffold `go.mod`+`main.go`; `tgobuild.ps1` =
native `.exe`). Common flags: `-p 1 -no-debug -panic=trap`, local `TINYGO_CACHE`/`GOTMPDIR`. Intent:
fold this into wasmtk as the **Go producer**.

### Decision (scope approved by owner 2026-06-03)

Add a **TinyGo-based Go producer** to the congruent set (after TS/JS, Rust, Zig). Scope:

- **TinyGo is the canonical producer** (`-target=wasip1`); stdlib `GOOS=wasip1 go build` is a
  heavier optional fallback (full runtime/GC → large binaries), not the default.
- **WASI-first.** The browser `-target=wasm` (`syscall/js` + `wasm_exec.js` JS glue) path is **NOT
  WASI** and does not fit the WASI-host contract — defer it as a separate, lower-priority target.
  `tgo-modc.ps1`'s `-target=wasm` is therefore _not_ the `modc` analog.
- **`run` via wasmtk's own TS WASI host**, not wasmtime. TinyGo `-target=wasip1` emits a WASI P1
  core module importing `wasi_snapshot_preview1` — exactly the congruent contract — so `wasmtk run`
  hosts it directly. wasmtime stays an **optional** alternate host, not a hard dependency (the
  scripts' `wasmtime run` step is replaced by our executor).
- Native `tgobuild.ps1` (`.exe`) is **out of scope** (native, not wasm).

### Command surface (producer-plugin model)

(Original plan — superseded by the v1-shipped command table below, which folds in the owner's
`tgo-*.ps1` scripts literally. NOTE the divergence: "modc" in those scripts = the BROWSER
`-target=wasm` build, not a `//go:wasmexport` reactor/library. A real Go reactor/library for the
bindgen DLL model was deferred at v1 but is now **SHIPPED 2026-06-07** — `modc --lang=go` builds it
by default; the browser build moved to `--go-target=wasm`.)

### v1 SHIPPED 2026-06-06 (`src/gowasic.ts`) — full `tgo-*.ps1` command set

> **⚠ This table is the v1 (2026-06-06) snapshot. Three rows were SUPERSEDED on 2026-06-07 — see the
> UPDATE blocks below: `wasic --lang=go` REMOVED; `modc --lang=go` flipped browser→WASI reactor
> library (browser now `--go-target=wasm`); `init --lang=go` defaults to a wasm-library scaffold;
> `run` auto-detects Go.** The rows are kept as historical record; the current behavior is in the
> UPDATEs.

All five owner scripts folded into wasmtk via the `--lang=go` flag (path defaults to cwd):

(Table as a list — Command · Was · Does (v1; see UPDATEs for current):)

- `wasmtk init --lang=go [dir]` — Was: `tgo-init-wasi.ps1` — Does (v1; see UPDATEs for current): `go
  mod init <dir>` + `main.go` (v1: "WASI"; now a wasm-**library** scaffold)
- `wasmtk init --lang=go --go-target=wasm [dir]` — Was: `tgo-init-wasm.ps1` — Does (v1; see UPDATEs
  for current): `go mod init` + browser `syscall/js` `main.go`
- `wasmtk modc --lang=go [path]` — Was: `tgo-modc.ps1` — Does (v1; see UPDATEs for current): v1:
  `-target=wasm` browser + `wasm_exec.js`. **SUPERSEDED 2026-06-07 → WASI reactor library by
  default; browser via `--go-target=wasm`**
- `wasmtk run [--lang=go] <path>` — Was: `tgo-run.ps1` — Does (v1; see UPDATEs for current): build
  wasip1, then run it on wasmtk's WASI host. **`--lang=go` is now OPTIONAL** — `run` auto-detects Go
  (see UPDATE below)

**UPDATE 2026-06-07 — `wasmtk wasic --lang=go` REMOVED as a standalone command.** The direct Go→WASI
compile (was `tgo-wasic.ps1`, `tinygo build -target=wasip1`) is no longer a user-facing CLI option.
Rationale: a standalone Go WASI _executable_ isn't consumable by wasmtk's value-add pipeline — it
can't be merged (heap-using Go corrupts the shared heap; even leaf Go is only mergeable as an
import, not as a `_start` program) and a WASI command isn't a bindgen library either. The Go→wasip1
**build still exists** in `compileGoWasi(..., target: "wasip1")` and is invoked by **`run`** (with
or without `--lang=go`), which needs it to execute the module — that path is retained. `main.ts`'s
`wasic` case now intercepts `--lang=go` and prints a removal message pointing at `run --lang=go`
(exit 1), rather than compiling. `gowasic.ts` is unchanged (the function stays; only the CLI entry
was withdrawn). So the live Go CLI surface is **`init` / `modc` / `run`** (the `--lang=go` option
help now reads `(init/modc/run)`).

**UPDATE 2026-06-07 — `wasmtk run` auto-detects Go (no `--lang=go` needed).** `run` now routes to
the Go build+run path when its target is (a) a `.go` file, or (b) a directory containing a `go.mod`.
The detection lives in `main.ts` (`isGoRunTarget()` — a `.go`-extension check + `rt.stat` go.mod
probe), deliberately NOT in `gowasic.ts`, so a plain `wasmtk run x.wasm` doesn't import the Go
producer module (which pulls in binaryen) just to decide; `gowasic.ts` is loaded lazily only once a
Go target is confirmed. The explicit `--lang=go` flag still works and is required only where
detection can't tell (e.g. a bare `wasmtk run` with no path → defaults to cwd, which the help guard
would otherwise treat as missing-target). Auto-detection is **`run`-only**; `init`/`modc` still
require `--lang=go`. Rationale (owner, 2026-06-07): when authoring a pure Go _module/library_, the
way to test it is to import it from a small `_start` driver and run that via WASI output — so `run`
is the natural Go entry point and should "just work" on Go source. Verified: `run hello.go`,
`run <dir-with-go.mod>` both build+run; non-Go `run` (.ts/.wasm) unaffected; a directory WITHOUT
go.mod is not treated as Go.

**UPDATE 2026-06-07 — `init` dir-creation bug FIXED + two-part "library + test-driver" workflow
verified, and the library-compile GAP confirmed.** Two related items from validating the owner's
real Go workflow (root `main.go` test-driver + a subfolder library package):

- **Bug fixed (`src/gowasic.ts scaffoldGoProject`):** `wasmtk init --lang=go <newdir>` failed with
  "No such cwd" — `go mod init` runs with `cwd: baseDir` but the scaffolder never created `baseDir`.
  Fixed by `rt.mkdir(baseDir, { recursive: true })` before `go mod init`. Verified: init into a
  non-existent dir now scaffolds `go.mod` + `main.go`.
- **Scaffold templates now teach exports (2026-06-07).** Both Go scaffold templates in `gowasic.ts`
  (`MAIN_GO_LIBRARY` / `MAIN_GO_BROWSER` — renamed later that day from `MAIN_GO_WASI` /
  `MAIN_GO_WASM`; see follow-up (3) below) include a commented `//go:wasmexport` example function
  (`add` / `square`) plus guidance (directive goes on the line directly above `func`, no blank line;
  only annotated funcs are exported; use WASM-friendly numeric/bool types). The WASI template frames
  `func main` as the test harness (runs under `wasmtk run`, DCE'd from a library build — ties to the
  single-file pattern above). Verified: both scaffolds are gofmt-clean and build — WASI `run` prints
  `add(2,3)=5`; browser `modc` produces a module that actually exports `square` (confirms
  `//go:wasmexport` works on `-target=wasm` too).
- **Workflow HALF 1 (test loop) — WORKS today.** Project = `go.mod` + root `main.go`
  (`package main`, imports the subpackage `mod/mathlib`, runs assertions) + `mathlib/mathlib.go`
  (`package mathlib`, exported funcs). `wasmtk run <projdir>` auto-detects the go.mod, builds the
  root driver → wasip1, runs it → all checks PASS. This is the developer's "test the library before
  shipping it" loop, flagless.
- **Workflow HALF 2 (compile a Go library to a wasm library) — ✅ NOW WIRED (2026-06-07; was the
  long-deferred reactor/library item).** `modc --lang=go` now builds a **WASI reactor library** by
  default (`-target=wasip1 -buildmode=c-shared`): no `_start`, exports the `//go:wasmexport`
  functions + runtime, callable via `wasmtk mod`/bindgen — the Go analog of TS `modc` (library
  mode). The browser build (`-target=wasm`, syscall/js + `wasm_exec.js`) is now **opt-in via
  `--go-target=wasm`**. See the dedicated "UPDATE 2026-06-07 — `modc --lang=go` = reactor library"
  section below for the full implementation + the `_initialize` fix it required. (Historical: before
  this, `modc --lang=go` built browser-only and rejected library packages with _"expected main
  package to have name 'main'"_.)
- **Path forward CONFIRMED at the toolchain level.** Direct
  `tinygo build -target=wasip1
  -buildmode=c-shared -scheduler=none` of a `package main` with empty
  `func main()` + `//go:wasmexport` funcs produces a 9.5 KB **reactor library** exporting the funcs
  (`add`/`isLeap`) + `_initialize` + `malloc`/`free`/`realloc`/`calloc` + `memory`, with one wasi
  import (`random_get`). So TinyGo 0.41 fully supports the reactor/library build; wasmtk just needs
  a build mode wired to it. IMPORTANT shape note tying back to the mergeability matrix above: this
  c-shared reactor **exports its own dlmalloc heap and uses `memory.grow` (count=1)** → it is the
  **standalone/bindgen "DLL" shape (own memory, host-loaded), NOT a mergeable leaf**. A _mergeable_
  Go library would instead need to be allocation-free + `-target=wasm-unknown` (no wasi import, no
  allocator) — the leaf case proven mergeable in the matrix above. So the deferred feature really
  has two sub-targets: (a) reactor `c-shared`/`wasip1` library for the bindgen/host DLL model (heap
  OK), and (b) `wasm-unknown` allocation-free leaf for the wasmmerge model.
- **VERIFIED 2026-06-07 — single-file "library + tests in one `main.go`" works via DCE.** A single
  `package main` file can hold BOTH the `//go:wasmexport` library functions AND a `func main` test
  harness, and the two build modes cleanly separate them:
  - **Command build** (`-target=wasip1`, what `wasmtk run` does) → `func main` is `_start` → the
    test harness runs. The `//go:wasmexport` funcs are also present (harmless). So
    `wasmtk run <onefile.go>` runs the tests today, no changes.
  - **Reactor/library build** (`-target=wasip1 -buildmode=c-shared`) → `func main` is NOT a root, so
    TinyGo's dead-code elimination strips `main` and everything reachable only from it. Proven: a
    constant placed only in the test harness (`222000`) was ABSENT from the library build while the
    library constant (`111000`) remained; `main`/`selfCheck` were not exported; and even the
    `println` `fd_write` import was gone. The library exported only the two `//go:wasmexport`
    funcs + runtime (`_initialize`/`malloc`/`free`/`memory`/fmin-fmax).
  - Export control is automatic: **only `//go:wasmexport` functions are user-exported**, regardless
    of what else is in the file. The one authoring rule: keep test-only helpers OUT of the exported
    call graph (don't let an exported func call a test helper), else DCE keeps it.
  - **Implication for the deferred feature (NOW IMPLEMENTED 2026-06-07 — see the next UPDATE):**
    this is the ideal Go DLL authoring ergonomic — one file, `wasmtk run` to test, build to ship. It
    needed the **reactor (`-buildmode=c-shared`) build mode** (at the time of writing
    `modc --lang=go` still built `-target=wasm` browser); wiring that reactor-library mode into
    `modc --lang=go` is exactly what was done next, turning this pattern into a wasmtk command. The
    clean-library result itself is a TinyGo guarantee (DCE), confirmed above.

**UPDATE 2026-06-07 — `modc --lang=go` = WASI reactor library (Option A, IMPLEMENTED) + the
`_initialize` fix it required.** Closes the HALF 2 gap above. Triggered by the owner hitting it: a
browser module built by `modc --lang=go` couldn't be called (`wasmtk mod main.wasm square` →
`WebAssembly.instantiate(): Import #2 "gojs": module is not an object or function`). Root cause: the
browser (`-target=wasm`) module imports `gojs` (TinyGo's syscall/js bridge that only `wasm_exec.js`
in a real browser supplies); wasmtk's hosts provide WASI + `env`, not `gojs`. The deeper mismatch:
TS `modc` = a clean library (no `_start`, no WASI imports — wasic emits no runtime), but
`modc --lang=go` was mapped to TinyGo's browser target → a browser app with `_start` + `gojs`, not a
library.

**Design decision (owner-approved):** make `modc --lang=go` build the **WASI reactor library** by
default — the Go analog of TS `modc` library mode — and move the browser build behind
`--go-target=wasm`. Caveat captured: Go's mandatory runtime means even this library is NOT as bare
as the TS one — it carries `_initialize` (runtime init), one WASI import (`random_get`), and runtime
`malloc`/`free`. (The truly-bare option, `wasm-unknown` with no WASI, is allocation-free-only — the
**mergeable-leaf sub-target, ✅ WIRED 2026-07-08** as `modc --lang=go --go-target=wasm-unknown` →
`buildGoLeaf`; reactor is still the general default.)

**Mergeable Go leaf (`--go-target=wasm-unknown`, 2026-07-08).** TinyGo's freestanding `wasm-unknown`
target produces a module with **0 imports and no `memory.grow`** (no WASI, no scheduler, no runtime
allocator) — so a pure-compute Go library `wasmmerge`s into a wasic/`wasmbundle` build like a Zig
`FixedBufferAllocator` leaf, resolving the "Go allocating silently corrupts" gate by simply not
allocating. `buildGoLeaf` (`src/gowasic.ts`) builds `tinygo build -target=wasm-unknown -no-debug
-opt=z` (+ passthrough shim + binaryen-ts `-Oz` when no real wasm-opt; NO asyncify — a leaf has no
goroutine scheduler). The one merge-integration fix: TinyGo guards every export on a runtime-init
flag its `_initialize` sets, so `mergeOneWasmImport` now injects `(call $<prefix>__initialize)` at the
top of `_start` and floors the merged memory at 2 pages (the flag lives at the fixed page-1 address
65536). CAVEAT: that hardcoded address means the host must not use page 1 — fine for typical small
hosts; large-memory hosts should stay on the reactor/bindgen path. Verified `tests/go_merge_tests.ts`
(7/7): a Go leaf (`addi`/`muli`/`clampi`) merged into a wasic program computes correct results.

**Implementation:**

- `src/gowasic.ts`: `GoTarget` gained `"reactor"` → `-target=wasip1 -buildmode=c-shared` (both the
  real-wasm-opt and shim+`-scheduler=none` paths add `-buildmode=c-shared`; `buildWithStd` adds it
  for `GOOS=wasip1` too — std Go 1.24+ supports `//go:wasmexport` in c-shared). Report label "wasip1
  c-shared library".
- `main.ts`: `modc --lang=go` → `target: goBrowser ? "wasm" : "reactor"` where
  `goBrowser = --go-target=wasm`. Help text + the `--go-target` option updated (now `(init/modc)`).
- **`_initialize` fix (`src/utils.ts`) — required, or reactor exports trap.** A reactor must run
  `_initialize` (Go runtime/heap/stack/globals setup) before any export, else exports trap
  (`unreachable`). `callExport` (`wasmtk mod`) and `runWasi`'s named-export path now call
  `exports._initialize()` (if present) right after instantiation, before the target function. No-op
  for non-reactor modules (wasic/modc TS libraries have no `_initialize`). `callExport` also gained
  the same Phase-40 `env` Proxy as `runWasi` (unlisted `env` imports → no-op stubs) for robustness —
  note this does NOT provide `gojs`, so browser modules remain (correctly) un-hostable.
- Empirically proven the bug + fix: reactor `square(12)` trapped without `_initialize`, returned
  `144` after it.

**Verified end-to-end (2026-06-07):** `init` Go lib → `modc --lang=go` builds a 9.8 KB reactor
library (no `_start`, exports `add`, has `_initialize`, no `gojs`) → `wasmtk mod golib.wasm add 2 3`
→ **5**. Browser opt-in `modc --lang=go --go-target=wasm` → browser module + `wasm_exec.js`.
`run --lang=go` still builds+runs the command test harness. TS `modc` library regression:
`wasmtk mod addts.wasm addts
2 3` → 5 (the `_initialize`/proxy changes are a no-op for runtime-free
TS). Merge slice `^(18|38)` 14/14 (run-path edits in `utils.ts` don't disturb normal running). So
the full Go DLL loop is live: **one `main.go` (`//go:wasmexport` funcs + `func main` tests) →
`wasmtk run` to test → `wasmtk modc
--lang=go` to ship the callable library** (`func main`/tests
DCE-stripped from the library).

**Follow-ups from the default flip (2026-06-07):** (1) A browser-style `main.go` (imports
`syscall/js`) fails the default library build — `syscall/js` only has Go files for the browser
(`GOOS=js`) target, so wasip1/reactor reports _"build constraints exclude all Go files in
.../syscall/js"_. Rather than surface the raw error, `gowasic.ts` now appends an actionable hint
(`goBuildHint`): "use `--go-target=wasm` for a browser module, or remove `syscall/js` for a
library." Wired into all three build-error sites (real-wasm-opt, shim, std-go). (2) The browser
**scaffold's own printed Build hint** was corrected to
`wasmtk modc --lang=go <dir> --go-target=wasm` (it previously said plain `modc`, which now builds a
library and fails on the syscall/js scaffold). (3) **`init
--lang=go` now defaults to a wasm LIBRARY
scaffold** (owner, 2026-06-07): since the Go producer's primary output is a wasm library
(`modc --lang=go`), init shouldn't require a flag for it. `GoScaffold` renamed `"wasi"|"wasm"` →
`"library"|"browser"`; templates renamed `MAIN_GO_WASI`→`MAIN_GO_LIBRARY` (now frames `add` as "an
EXPORTED library function" + a PASS/FAIL self-test `main`), `MAIN_GO_WASM`→ `MAIN_GO_BROWSER`.
Default messaging "Initializing Go wasm library project"; post-init guidance prints both **Test**
(`wasmtk run --lang=go <dir>`) and **Build** (`wasmtk modc --lang=go <dir>`). Browser project still
opt-in via `--go-target=wasm`. All verified: init (no flag) → run PASS → modc library →
`wasmtk mod lib.wasm add 2 3` → 5; browser opt-in scaffolds + builds; gofmt-clean.

`--go-runtime=tinygo` (default) / `std` (stdlib `go`: `GOOS=wasip1` for the `run` build, `GOOS=js`
for the browser modc). All builds use `-p 1 -no-debug -panic=trap` + local
`TINYGO_CACHE`/`GOTMPDIR`, matching the scripts. Input may be a `.go` file, a dir, or omitted (cwd);
a dir builds package `.` → `<dir>.wasm` (needs `cwd` on `rt.Command` — added to `rt.ts`, now `host.Command` in `src/host.ts`).
`tgobuild.ps1` (native `.exe`) is out of scope.

NOTE on `modc` (⚠ **v1/2026-06-06 — SUPERSEDED 2026-06-07**: `modc --lang=go` now builds a WASI
reactor library by default and the Go reactor/library is **shipped**, not deferred; browser is
`--go-target=wasm`. See the "UPDATE 2026-06-07 — `modc --lang=go` = WASI reactor library" section
above. The v1 text is kept for history.): in the owner's scripts "modc" = the BROWSER `-target=wasm`
build (NOT the wasmtk TS-library/reactor sense). So `modc --lang=go` produces a browser module
(syscall/js, needs `wasm_exec.js` + a browser) — `wasmtk run` can't host it. A genuine Go
_library/reactor_ (`//go:wasmexport`, no `_start`, for the bindgen DLL model) is still **deferred**
(with Go string/aggregate bindgen → ABI forward-alignment). `deno.json` exports `./gowasic`.
`main.ts` branches `init`/`modc`/`run` on `--lang=go` (and intercepts `wasic --lang=go` with a
removal message → `run`; see UPDATE 2026-06-07 above) (+ allows an omitted positional target → cwd).
Verified end-to-end (TinyGo 0.41.1 / Go 1.26): init(wasi+wasm), `run --lang=go` (builds 90 KB
wasip1 + prints output), modc browser (10 KB) + `wasm_exec.js` copied. Fixture:
`tests/go_fixtures/hello.go` (NOT auto-run — needs TinyGo).

