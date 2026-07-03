
import { loadModule } from "file:///<repo-root>/tests/module/bindgen_fixtures/hostfn_50.bindings.ts";
const wasmBytes = await Deno.readFile(new URL("file:///<repo-root>/tests/module/bindgen_fixtures/hostfn_50.wasm"));
const m = await loadModule(wasmBytes);
console.log(m.applyTwice((n: number) => n + 1, 10));
console.log(m.combine((a: number, b: number) => a * b, 6, 7));
