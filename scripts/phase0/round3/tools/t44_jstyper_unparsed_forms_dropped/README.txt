t44 SILENT-WRONG (jstyper)

A JS function in a form the parser does not recognise is dropped with no warning, even when the
.d.ts declares it: here `export const sq = x => x * x;` (arrow without parentheses). The same
applies to `function*`, `const f = function (…) {…}`, `export default function`, by the regexes.

Command (in this folder):
  W jstyper calc.js ; type calc.ts

Expected: `sq` in calc.ts, or a warning "'sq' is declared in calc.d.ts but not found in calc.js".
Observed: exit 0, calc.ts has no `sq`, nothing printed about it.

Root: src/jstyper.ts:97 / :111 (only `function name(` and `const name = (…) =>`), and
generateTypedTs (:232-243) warns only for JS functions missing from the .d.ts, never for .d.ts
declarations with no JS function.
