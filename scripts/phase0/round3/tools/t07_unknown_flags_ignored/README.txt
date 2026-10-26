t07 LOUD-class per ld90's precedent (silent by the tally definition)  unknown flags and a bad --lang value are ignored
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  wat2wasm lib.wat -o lib.wasm
  W wasmbundle lib.wasm --on-conflit=prefix -o b1.wasm   (typo of --on-conflict)
  W wasic prog.ts --outdir=foo                           (no such flag)
  W run prog.ts --lang=pyhton                            (not a language)
  W run lib.wasm --verbose add 2 3                       (--verbose belongs to wast)

Expected: exit 1 naming the flag or value, as ld90 does for --runtime / --any-policy /
--on-conflict / --go-runtime / --go-target values.
Observed: every one runs and exits 0: the bundle is built with the default conflict policy
(an interactive prompt when a conflict exists), prog.wasm is written beside prog.ts, prog.ts is
run, and `5` is printed.

Root cause: main.ts:93-112 parseArgs has no `unknown` handler; main.ts:138-144 FLAG_CHOICES
does not list `lang`, and :257-259 treats an unknown --lang as "not a producer".
