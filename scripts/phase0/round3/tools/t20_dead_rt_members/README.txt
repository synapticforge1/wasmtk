t20 DEAD  rt.env.set and rt.stderr.write (async) have no caller
rt.ts is not a published entry point (deno.json "exports" does not list it), so an unused member
is dead, not API.

Grep (over BASE/src, BASE/main.ts, BASE/tests, BASE/scripts, *.ts):
  rt\.env\.set        -> 0 matches   (defined src/rt.ts:147-148)
  rt\.stderr\.write\( -> 0 matches   (defined src/rt.ts:182-188; writeSync is the one used)
For contrast: rt.stdout.write( 1 (wasmbundle prompt), rt.stdin.read( 1, rt.chmod 1, rt.realPath 2.

Also verified: RtCommand.spawn() ignores `cwd` and `env` on Deno (src/rt.ts:244-248) and `cwd` on
Bun, but no caller of spawn passes either (rustwasic.ts:61, utils.ts:240), so it is latent, not a
live defect.

Round-2 dead / stale items re-checked and STILL PRESENT (not new): main.ts:475-478 (`wast`'s
unreachable `!target`, now at these lines), utils.ts:252-269 (Javy interception), :276-284
(console.log UTF-16 shim), unused getImportInfo / v128 / funcref / externref / applyNames
(utils.ts:34, :52-59), utils.ts:188 fd_stat_put, wasmmerge.ts:141 stale comment, main.ts:174 /
:246 the same value computed twice.
