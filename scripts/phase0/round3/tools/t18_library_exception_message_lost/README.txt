t18 LOUD (misleading message)  a library function's thrown error prints "[object WebAssembly.Exception]"
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  W modc thr.ts
  W mod thr.wasm boom 5          (throw new Error("too big: " + x))
  W mod thr.wasm sq 100000       (sw119's checked i32 store: a RangeError)
  W run thr.wasm boom 5

Expected: the message, as `run` prints it for a program's uncaught throw
("error: Uncaught (in Wasm) Error: too big: 5"); the library exports __exn_tag (ld114), so it
is readable.
Observed: "❌ mod error: [object WebAssembly.Exception]" (both), "❌ Run error: [object
WebAssembly.Exception]"; exit 1. The reason (which error, which operator) is lost.

Root cause: src/utils.ts:475-478 callExport's catch prints `${err}`; src/utils.ts:329 the run
library-call branch calls the export outside the try at :337-394 that decodes __exn_tag, so it
reaches the generic catch at :396-399.
