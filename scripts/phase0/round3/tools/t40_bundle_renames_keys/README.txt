t40 SILENT-WRONG (tsbundle) / LOUD with a misleading message (wasic)

The bundler renames an imported name EVERYWHERE in code, including an interface field and an
object-literal key that merely share its spelling; a `.add` member access is not renamed.

Command (in this folder; W = deno run -A --config BASE/deno.json BASE/main.ts):
  deno run main.ts                      -> 5 / 10
  W tsbundle main.ts ; deno run main.bundled.ts
  W wasic main.ts

Expected: the bundle prints 5 / 10 (as the source does); wasic compiles it.
Observed: main.bundled.ts has `interface Op { util_add: number; ... }` and
`{ util_add: 10, mul: 20 }` but `o.add` unchanged -> prints `5` / `undefined`, tsbundle exit 0.
wasic refuses: "console argument: cannot emit the expression 'o.add' as i32" (exit 1), pointing
at correct user code.

Root: src/tsbundler.ts:204-217 applyRenames (used for localRewrites at :735 and a non-entry
file's own exports at :729) renames every code-position match; `(?<![\w.])` keeps member
accesses but not property keys / interface fields.
