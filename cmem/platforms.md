# platforms.md — wasmtk's support matrix

The standard is the workspace's `../workspace/cmem/platforms.md` (owner, 2026-11-17; 🔒 for the
TypeScript projects, 2026-11-19, letter H39: test per ENGINE, not per platform; every OS call in
`host.ts`; OS testing concerns `host` alone). This file holds wasmtk's own matrix and notes.
Machine names and paths are in the gitignored `cmem/local/`, never here.

## How wasmtk is tested (tier 1: per engine)

- **What wasmtk computes** (the compilers, the merge and bundle paths, the wast runner) is pure
  TypeScript, and the modules it writes are the same bytes on every OS. It is tested once per
  ENGINE on one machine: the full gate (workflow.md § The full gate).
- **Every call to the system** — files (written atomically; a device in place), folders, temp
  folders, paths, the environment, the arguments, the streams, exit, and starting other programs
  (the producer toolchains, the engines in the cross-check) — is in **`src/host.ts`**.
  `deno task check-host` (`scripts/check-host.ts`) fails when any other file of `main.ts` / `src/`
  imports a runtime's file, path or process module, names `Deno` / `Bun` / `process` / `require`,
  or branches on `host.build`; its `--self-test` has a case per rule and four mutants of the real
  tree. On the pre-host tree (2026-11-20) it found 61 calls: 12 imports, 49 global uses.
- **OS-specific testing is `host`'s alone:** `wasmtk --self-check` tries every operation `host`
  uses on the machine it runs on, in a temp folder it removes, and prints `ok` / `FAIL` per step
  (exit 1 on a failure; a step that cannot apply says why). It is run on an OS when that machine
  is at hand, and again only when `src/host.ts` or the pinned runtime changes; a release that
  changed neither carries the last result forward.
- **Not covered by `host`:** the producer toolchains themselves (Go / TinyGo, Zig, Rust through
  rsxtk) and the engines of the cross-check (wasmtime, wasmer, wazero) are the user's installs;
  their suites skip a missing tool and never fail for it.

## Engines

(Table as a list — engine · runtime · status · measured:)

- V8 — runtime: Deno 2.9.8 — status: `tested` — measured: 2026-11-20, win-x64: the full gate (wasi
  509/509, golden 568, wast 64,506 / 0 / 16, cross-check 1374) and `--self-check`
- JavaScriptCore — runtime: Bun 1.4.4 — status: `pending` — measured: the product resolves its
  dependencies through deno.json's import map, which Bun does not read (deno-exit-plan.md P2);
  `src/host.ts` has the Bun branches. The repo's scripts already run on Bun
- V8 — runtime: Node — status: `pending` — measured: deno-exit-plan.md (M1: Node LTS); not run

## Platforms

| platform | status | tested on |
| --- | --- | --- |
| `win-x64` | `tested` | Windows 11 Pro (dev machine), Deno 2.9.8: full gate + `--self-check`, every step ok, 2026-11-20 |
| `win-arm64` | `runtime` | no platform-specific code outside `host`, and `host` passed on Windows (win-x64) |
| `linux-x64` | `pending` | `--self-check` not yet run on Linux (WSL Ubuntu is at hand) |
| `linux-arm64` | `pending` | `host` not yet run on Linux |
| `mac-x64` | `pending` | no machine yet (the owner's Intel Mac) |
| `mac-arm64` | `pending` | no machine yet |

A pure-source package (JSR): no per-platform build, so no target name and no glibc / musl build;
the baseline in the workspace file does not apply. "Tested on" names a role (the dev machine), the
machine itself is in `cmem/local/`. Every platform-specific setting in code carries its IDs in a
comment (`[win-x64, win-arm64]`, six in `src/host.ts`, 2026-11-20): search for the ID.

## win-x64

- **Writing to a device under explicit permissions.** The installed `wasmtk` runs with
  `--allow-write` (not `-A`), and Deno's permission check refuses a bare device name: `NUL` → os
  error 87; `\\.\NUL` works, and truncating it is "Incorrect function". `src/host.ts`
  `writeAtomic` maps a Windows device name to its `\\.\` form and opens it for writing only
  (`isDevicePath`). Found by `--self-check` on 2026-11-20 (`wasmtk convert x.wat -o NUL` failed
  the same way); regression cases in `tests/outpath_tests.ts` § H39. With `-A` the bare name works,
  so a run from source does not show it.
- **A just-closed file can be busy for milliseconds** (os error 32, an indexer, an AV scanner, a
  child that just exited): `retryOnSharingViolation` in `src/host.ts` retries the write and the
  rename for ~1.2 s, that error only.
- **Launchers are `.cmd` files**, other OSes get a `#!/bin/sh` script with mode 755
  (`writeLauncher`); the console is switched to UTF-8 with `SetConsoleOutputCP` (`setupConsole`,
  owner decision M7).
- **Paths compare case-insensitively** (`samePath`, the input-overwrite guard of sw113).
