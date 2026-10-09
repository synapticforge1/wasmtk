// A null nullable local printed `null` only as console.log's ONLY argument; beside another
// argument, in a template, or built into a string it printed `0`.
type i32 = number;
const w: i32 | null = null;
console.log(w, 1);
console.log(`w=${w}`);
const s: string = "w=" + w;
console.log(s);
