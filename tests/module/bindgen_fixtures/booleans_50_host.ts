
import { loadModule } from "./booleans_50.bindings.ts";
const wasmBytes = await Deno.readFile(new URL("./booleans_50.wasm", import.meta.url));
const m = await loadModule(wasmBytes);
console.log(m.isPositive(1.0));
console.log(m.isPositive(-1.0));
console.log(m.inRange(5.0, 1.0, 10.0));
console.log(m.inRange(0.0, 1.0, 10.0));
console.log(m.isEven(4));
console.log(m.isEven(3));
