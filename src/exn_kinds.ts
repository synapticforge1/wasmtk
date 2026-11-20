/**
 * What a wasic module threw (sw44): the value of its `$__exn_kind` global. 0 = a string, number or
 * boolean; 1–7 = an Error-family object. One list for the compiler (`wasic.ts`, which sets the
 * global before every throw) and the host (`utils.ts`, which names an uncaught exception from a
 * library — review B4, 2026-11-20). Not a public entrypoint.
 */
export const EXN_KINDS = [
  "",
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "EvalError",
  "ReferenceError",
  "URIError",
];
