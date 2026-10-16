type i32 = number;
import { get } from "./plib2.wasm";
const g: i32 = get();
console.log(g);
