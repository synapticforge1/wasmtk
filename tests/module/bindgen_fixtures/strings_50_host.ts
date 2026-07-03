
import { loadModule } from "file:///<repo-root>/tests/module/bindgen_fixtures/strings_50.bindings.ts";
const wasmBytes = await Deno.readFile(new URL("file:///<repo-root>/tests/module/bindgen_fixtures/strings_50.wasm"));
const m = await loadModule(wasmBytes);
console.log(m.greet("World"));
console.log(m.shout("hi"));
console.log(m.strLen("hello"));
