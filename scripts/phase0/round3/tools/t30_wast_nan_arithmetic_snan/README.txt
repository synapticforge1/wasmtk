t30  SILENT-WRONG  wast: `nan:arithmetic` passes on a SIGNALLING NaN result (false pass)

Command (from this directory; BASE = the audit-base snapshot):
  deno run -A --config BASE/deno.json BASE/main.ts wast nan_arith.wast

Expected: both assertions FAIL (the spec's arithmetic NaN has the quiet bit set; the results are
  sNaNs, f32 0x7fa00000 and f64 0x7ff4000000000000). Oracle, `wasmtime wast nan_arith.wast`:
  "result 0 didn't match / expected arith-nan / 0x7fc***** / actual NaN / 0x7fa00000", exit 1.
Observed: "pass=2 fail=0 skip=0", "✅ wast: 1 file(s) — 2 passed", exit 0.

Root cause: src/wast.ts:611-615 `needsTrampoline` routes only `nan:0x…` literals (and v128 /
either) through the bit-exact trampoline. A `nan:arithmetic` / `nan:canonical` EXPECTATION goes
through the direct JS call (wast.ts:1498 runAction) and `resultMatches` (wast.ts:536-552) reads
the result's bits from a JS number; V8 quiets the sNaN on the way out (f32 also widens to f64), so
the quiet-bit test at wast.ts:552 sees a quiet NaN. `nan:canonical` is not affected (quieting an
sNaN never yields the canonical pattern), only `nan:arithmetic`.
