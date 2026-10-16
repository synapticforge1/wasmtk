type i32 = number;
import { getb } from "./dlib.wasm";
const before: i32 = getb(40);
const arr: i32[] = [];
for (let i: i32 = 0; i < 200; i++) {
  arr.push(7);
}
const after: i32 = getb(40);
console.log(before, after, arr.length);
