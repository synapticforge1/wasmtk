// H12 (2026-09-30): an expression inside console.log that console_log.ts's own emitter has no
// handler for is delegated to wasic's emitExpr instead of becoming a silent `0`.
//   sw04: Math.abs(s.charCodeAt(0) - 100) printed 100 (the charCodeAt operand became 0)
//   sw27: "v=" + (x ?? 5) printed v=0
// What neither emitter can produce is now a compile error, never a 0 (see the round-1 repros).
import { i32, f64 } from "../../../src/wasmath.ts";

const s: string = "abc";
console.log(Math.abs(s.charCodeAt(0) - 100));
console.log(s.charCodeAt(2) - s.charCodeAt(0));
console.log("code:", s.charCodeAt(1) * 2);

const x: i32 | null = 3;
const y: i32 | null = null;
console.log("v=" + (x ?? 5));
console.log("w=" + (y ?? 7));

const f: f64 = 2.5;
console.log(Math.abs(s.charCodeAt(0) - 100) + f);
