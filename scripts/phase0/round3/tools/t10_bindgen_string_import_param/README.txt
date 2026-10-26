t10 SILENT-WRONG  bindgen: a host IMPORT with a `string` parameter receives the raw pointer (a number)
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm imp.wat -o imp.wasm
  wasm-tools component wit imp.wit           (valid WIT, exit 0)
  W bindgen imp.wit
  deno run -A use_imp.ts

imp.wit: import log: func(msg: string);  (the module calls env.log(16, 5), "hello" at 16)

Expected: the host's log("hello"), or bindgen refusing a string import parameter (it refuses
aggregates loudly).
Observed: "log got: 16 number"; exit 0. The generated wrapper is
  env["log"] = (_a0: number) => { imports?.env?.log?.(_a0); };
while ModuleImports declares log?: (msg: string) => void, so the types claim a string.
(wasic's own .wit spells import parameters as s32, so this needs a hand-written or other
producer's .wit; bindgen's header says it handles `string` params.)

Root cause: src/bindgen.ts:315-330 import marshalling knows only bool; string (and any) parameters
and results are passed through as numbers.
