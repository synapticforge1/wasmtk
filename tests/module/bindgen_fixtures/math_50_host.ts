
// auto-generated host runner for math_50 bindgen test
import { loadModule } from "./math_50.bindings.ts";

const wasmBytes = await Deno.readFile(new URL("./math_50.wasm", import.meta.url));
const m = await loadModule(wasmBytes);
console.log(m.add(3, 4));
console.log(m.multiply(2.5, 4.0));
console.log(m.square(5));
