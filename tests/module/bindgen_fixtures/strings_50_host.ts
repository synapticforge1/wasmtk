
import { loadModule } from "./strings_50.bindings.ts";
const wasmBytes = await Deno.readFile(new URL("./strings_50.wasm", import.meta.url));
const m = await loadModule(wasmBytes);
console.log(m.greet("World"));
console.log(m.shout("hi"));
console.log(m.strLen("hello"));
