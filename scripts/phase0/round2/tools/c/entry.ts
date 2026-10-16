type i32 = number;
import { helper } from "./dep.ts";
import { add } from "./x/util.ts";
import { add as add2 } from "./y/util.ts";
const scale: i32 = 100;
console.log(helper(2), scale);
console.log(add(1, 1), add2(1, 1));
