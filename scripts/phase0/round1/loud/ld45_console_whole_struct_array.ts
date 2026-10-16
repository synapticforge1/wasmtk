// A whole struct array in console.log is refused (2026-10-15); before, it printed its element
// pointers (sw74). Deno prints [ { x: 1 }, { x: 2 } ].
type i32 = number;
interface P {
  x: i32;
}
const ps: P[] = [{ x: 1 }, { x: 2 }];
console.log(ps);
