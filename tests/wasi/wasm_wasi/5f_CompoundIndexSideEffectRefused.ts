// @expect-fail: compile
// Audit round 2, ld72 (2026-10-22): a compound assignment to an element is written out as
// `xs[i++] = xs[i++] + 5`, which would evaluate the index twice. An index with a side effect (a
// call, `++` / `--`, an assignment) is refused at compile time ("a compound assignment to an element
// whose index has a side effect is not supported"); native TS prints "1,7,3" and 2.
type i32 = number;
const xs: i32[] = [1, 2, 3];
let i: i32 = 1;
xs[i++] += 5;
console.log(xs.join(","), i);
