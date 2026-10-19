// @expect-fail: compile
// sw98 / sw120 (2026-10-19): a `string | null` FIELD has no null representation yet (null is
// stored as the text "null"), so `q.s ?? "none"` cannot be tested. It printed the field's POINTER
// (`268`); it is now refused at compile time until null string fields are modelled. Native TS
// prints "hi none".
interface Q { s: string | null }
const q: Q = { s: "hi" };
const r: Q = { s: null };
console.log(q.s ?? "none", r.s ?? "none");
