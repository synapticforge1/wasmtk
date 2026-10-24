// @expect-fail: compile
// sw127 (2026-10-22, found with ld45): a whole struct as a console argument printed its ADDRESS,
// `260` for native TS's `{ x: 1, y: 2.5 }`. ld45 (2026-10-24) prints it as Deno does
// (7j_ConsoleObjectWriter); what the writer cannot print exactly is still refused with the reason,
// here a nullable field ("printing a whole struct holding a nullable field (N.next) is not
// supported yet; print its fields").
type i32 = number;
interface N {
  v: i32;
  next: N | null;
}
const n: N = { v: 1, next: null };
console.log(n);
