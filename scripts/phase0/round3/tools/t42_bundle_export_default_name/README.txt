t42 LOUD (wasic) / silent broken bundle (tsbundle)

`export default <identifier>;` (default-exporting an already declared function) is not handled:
only `export default function name` is (src/tsbundler.ts:684-692).

Command (in this folder):
  deno run dflt.ts                 -> 12
  W tsbundle dflt.ts ; type dflt.bundled.ts
  W wasic dflt.ts

Expected: 12 (or a refusal naming the unsupported form).
Observed: tsbundle exit 0, the bundle keeps `export default triple;` mid-file and calls the
undeclared `dflt_lib_default(4)`. wasic: "Unsupported statement: export default triple;" exit 1.

Root: src/tsbundler.ts:684-692 (default export regex needs `function`); :610 falls back to
`${childPrefix}_default`, a name never declared.
