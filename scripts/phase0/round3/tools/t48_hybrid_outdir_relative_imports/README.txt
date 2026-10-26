t48 LOUD (hybrid -o)

With `-o <dir>` the runner is written into <dir> but keeps the source's relative imports
verbatim, so it cannot load them.

Command (in this folder):
  mkdir out
  W hybrid calc.ts -o out ; deno run --allow-read out/calc_runner.ts

Expected: a runner that works from out/ (imports rewritten relative to out/), as hybrid's
"done — run with: deno run --allow-read out\calc_runner.ts" promises.
Observed: hybrid exit 0 and "done"; running it: Module not found ".../out/helper.ts", exit 1.
(Also: `-o newdir` that does not exist fails "cannot find the path ... writefile", where modc
creates its -o directory.)

Root: src/hybrid.ts:846-855 writes remainingSrc (generateRunner, :642-686) into outDir without
rebasing relative import specifiers; :701 / :744 never create outDir.
