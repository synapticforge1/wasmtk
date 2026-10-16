type i32 = number;
import { get, twice } from "./plib.wasm";
const g: i32 = get();
const t: i32 = twice(21);
console.log(g, t);
