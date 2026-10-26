t11 LOUD (at call time; generation is silent)  bindgen binds a declaration inside a `//` comment
W = deno run -A --config BASE/deno.json BASE/main.ts   (run from this directory)

Command:
  W bindgen cm.wit

cm.wit:
  // export old-add: func(a: s32, b: s32) -> s32;
  export add: func(a: s32, b: s32) -> s32;

Expected: only add() in the binding (a WIT comment is not a declaration).
Observed: exit 0; cm.bindings.ts declares and implements oldAdd(a, b), which calls _ex("oldAdd"),
undefined in the module: "is not a function" when called.

Root cause: src/bindgen.ts:160-173 parseWit runs its regexes over the raw text; comments
(`//`, `/* */`) are never stripped.
