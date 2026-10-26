import { add } from "./util.ts";
interface Op {
  add: number;
  mul: number;
}
const o: Op = { add: 10, mul: 20 };
console.log(add(2, 3));
console.log(o.add);
