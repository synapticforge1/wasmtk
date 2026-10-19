// @expect-fail: compile
// Audit round 2, sw84 (2026-10-19): splice stores its inserted items AFTER the gap is opened, so an
// item that reads the spliced array would read it already changed. That is refused at compile time
// ("an inserted item that reads 'a' itself is not supported"); native TS prints "3,2,3".
type i32 = number;
const a: i32[] = [1, 2, 3];
a.splice(0, 1, a[2]);
console.log(a.join(","));
