t32  LOUD (false failure)  wast: `(assert_return (get …) (f32.const nan:0x…))` fails on a
CORRECT signalling-NaN global

Command (from this directory):
  deno run -A --config BASE/deno.json BASE/main.ts wast get_payload_ok.wast

Expected: both assertions PASS (the globals hold exactly nan:0x200000 / nan:0x4000000000000).
  Oracle `wasmtime wast get_payload_ok.wast`: exit 0.
Observed: "pass=0 fail=2", two "assert_return mismatch", "❌ … (execution assertion failures)",
  exit 1.

Root cause: the trampoline that carries NaN payloads bit-exactly is used only for `invoke`
(src/wast.ts:1458 `head(action) === "invoke" && needsTrampoline(…)`). A `get` goes through
runAction (wast.ts:1343-1345, `g.value`, a JS number: V8 quiets the sNaN) and resultMatches
(wast.ts:536-540) compares against bits built from a JS number too, so the payloads disagree.
(The same path also gives t30's false pass for `get` + nan:arithmetic.)
