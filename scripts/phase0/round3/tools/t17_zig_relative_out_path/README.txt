t17 SILENT-WRONG  Zig with a RELATIVE -o writes beside the source and reports (and runs) the file at the given path
This is sw117 (fixed for Go 2026-10-19, gowasic.ts:205 `resolve(...)`) still present in Zig.
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory; needs zig)

Command (layout: zprog/hello.zig, and two empty dirs zout/ and zprog/zout/):
  W wasic prog.ts -o zout/hello.wasm         (an OLDER artifact at the given path)
  W run zprog/hello.zig -o zout/hello.wasm

Expected: "fresh build" (hello.zig built to ./zout/hello.wasm and run).
Observed: "✅ Zig → wasm (wasm32-wasi program): zout/hello.wasm (307 bytes)" then
"hello from prog": the stale module was reported and RUN, exit 0. Zig wrote its output to
zprog/zout/hello.wasm. Without a stale file the same command fails loudly ("unable to open
output directory 'zout'" when zprog/zout is missing, or "could not be read").
`build` and `modc` take the same path.

Root cause: src/zigwasic.ts:144 `out = opts.outPath ?? …` is not resolved; :166-167 passes
`-femit-bin=${out}` with `cwd: baseDir`, while report() (:115) reads `out` from the process cwd.
