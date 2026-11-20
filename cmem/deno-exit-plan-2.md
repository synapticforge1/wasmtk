# deno-exit-plan — part 2 of 2

Continues [deno-exit-plan.md](deno-exit-plan.md) (split by size on 2026-11-20, letter H38). Sections:

- Measured in S3D-ReportCompiler, NOT yet here (ledger C20, C21; recorde
- Ordering against other work

## Measured in S3D-ReportCompiler, NOT yet here (ledger C20, C21; recorded 2026-10-27)

Hypotheses for wasmtk until re-run here; full text `../S3D-ReportCompiler/cmem/bun-migration.md`
steps 1–4 (Deno 2.9.8, Bun 1.4.4). Each names the phase it bites and the check to run first.

- **C20 → P1, P7. `deno publish --config jsr.json` beside a `deno.json` silently rewrites import-map
  dependencies in the upload** to relative paths that cannot load, and still says "Successfully
  published". S3D measured it on trailing-slash entries (`"pkg/": "npm:pkg@x/"`) and, with deps only
  in `package.json`, on every bare dependency; the one clean variant was `jsr.json` carrying
  `imports` + `nodeModulesDir` with NO `deno.json` and no `--config`. wasmtk ships 7 import-map
  dependencies (no trailing-slash entry today) and plans exactly the `--config jsr.json` beside
  `deno.json` shape, so it is exposed. **Check:** publish each variant to a fake JSR on
  `127.0.0.1` (`JSR_URL=http://127.0.0.1:<port>/`, dummy `--token`, `--no-provenance`) and read the
  uploaded tarball's specifiers; positive control = today's upload equals what jsr.io serves for
  3.0.0. The release gate reads the UPLOAD, not the exit code.
- **C21 (1) → P8. With no `tasks` in `deno.json`, `deno task <name>` runs the `package.json` script
  of that name** — S3D's "does the old name still resolve?" probe of `deno task release` ran the
  real release. Never probe `deno task release` / `bump` (or the retired `publish`) that way here.
- **C21 (2) → P2, P6. `Deno.readTextFile` keeps a leading BOM**; `readFile(p, "utf8")` matches it, a
  `TextDecoder` port strips it (3 bytes). Use `readFile(p, "utf8")` in ports.
- **C21 (3) → P4. Bun 1.4.4 ships `bun fmt`** (`--check`; Prettier-style, so NOT `deno fmt`'s
  output — P4's byte-for-byte rule still holds); bare `bun fmt` formats every supported file,
  `cmem/` and test inputs included — name the paths. `bun lint` is still absent.
- **C21 (4) → P4. Biome's binaries are optional per-platform dependencies**: `omit=optional`
  installs a wrapper with no binary; `bunx @biomejs/biome@<pin>` works.
- **C21 (5) → P2. npm 12.2.0 (bundled with Node 24.21.0) refuses JSR's npm tarballs**
  (`EALLOWREMOTE`); `npm_config_allow_remote=all` for the install. Bites P2's
  `npm:@jsr/jrmarcum__binaryang` route on that Node line.
- **C21 (6) → `publish.yml` today. `deno publish` of an existing version SKIPS with exit 0**, so a
  re-run of the tag workflow (a moved `v*` tag; workspace `working-rules.md` § Git) carries on to
  "Create release branch" and "Create GitHub Release". UNMEASURED here what those two then do on a
  re-run; read them before any `v*` tag is moved. **Answered 2026-11-10 by design:** the release
  branch is gone (the version tag IS the release, owner, release-process.md) and the page is
  `scripts/publish-workflow.ts release` (H30, H32), which writes nothing already there (existing
  page = done; mock case B) and refuses a tag that no longer peels to the run's commit (case E;
  read-only on the real API: wrong commit → refused before any write); the `jsr` job's `jsr-has`
  skips an upload JSR already has.

## Ordering against other work

- The **3.0.0 release** is decided (MAJOR) and independent; releasing it BEFORE P1 keeps the
  release path as it is today. P1 then lands on a clean base.
- **binaryang** is mid-migration; P2's dependency route depends on how binaryang ships (JSR's npm
  layer now; npm itself only if the owner un-parks it).
- **universal-wasm-loader** is the owner's next project after binaryang (2026-10-12: "since wasm is
  not directly importable … our next project needs to be the universal wasm load project"), and
  **wasmtk's run-time `.wasm` loading goes through it** (owner, 2026-10-13; § "Loading `.wasm`"
  above). It lands before wasmtk's P2 / P6 touch those paths.
- The open compiler work (D3, D6, sw62, the loud rows) does not depend on this; P2–P6 change the
  harness around it, so finish an open compiler batch before starting a migration phase.

